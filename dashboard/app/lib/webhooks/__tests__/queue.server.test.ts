import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadQueueModule = async () => import("../queue.server");

describe("webhook queue driver", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.WEBHOOK_QUEUE_DRIVER;
    delete process.env.WEBHOOK_QUEUE_USE_BULLMQ;
    delete process.env.WEBHOOK_QUEUE_REDIS_URL;
    delete process.env.UPSTASH_REDIS_URL;
  });

  afterEach(async () => {
    vi.doUnmock("bullmq");
    vi.doUnmock("ioredis");
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("defaults to the in-memory queue when BullMQ flag is disabled", async () => {
    const queueModule = await loadQueueModule();

    const job = await queueModule.enqueueWebhookJob({
      topicKey: "TEST_TOPIC",
      shopDomain: "demo-shop.myshopify.com",
      payload: { hello: "world" },
    });

    expect(job.status).toBe("pending");

    const snapshot = await queueModule.snapshotQueue();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].topicKey).toBe("TEST_TOPIC");

    const updated = await queueModule.markJobStatus(job.id, "failed", "boom");
    expect(updated).toMatchObject({ status: "failed", error: "boom", attempts: 1 });

    await queueModule.clearQueue();
    const emptySnapshot = await queueModule.snapshotQueue();
    expect(emptySnapshot).toHaveLength(0);
  });

  it("purges queued jobs for a specific shop using the in-memory driver", async () => {
    const queueModule = await loadQueueModule();

    await queueModule.enqueueWebhookJob({
      topicKey: "ORDERS_CREATE",
      shopDomain: "alpha-shop.myshopify.com",
    });
    await queueModule.enqueueWebhookJob({
      topicKey: "ORDERS_FULFILLED",
      shopDomain: "beta-shop.myshopify.com",
    });
    await queueModule.enqueueWebhookJob({
      topicKey: "FULFILLMENTS_UPDATE",
      shopDomain: "Alpha-Shop.myshopify.com",
    });

    const removed = await queueModule.purgeShopJobs("ALPHA-SHOP.MYSHOPIFY.COM");
    expect(removed).toBe(2);

    const remaining = await queueModule.snapshotQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].shopDomain).toBe("beta-shop.myshopify.com");
  });

  it("routes operations through BullMQ when enabled", async () => {
    process.env.WEBHOOK_QUEUE_DRIVER = "bullmq";
    process.env.UPSTASH_REDIS_URL = "rediss://demo.upstash.io";

    const mockAdd = vi.fn().mockImplementation(async (name: string, data: any) => ({
      id: "job-1",
      name,
      data,
      timestamp: Date.now(),
      attemptsMade: 0,
      failedReason: null,
      processedOn: null,
      finishedOn: null,
      remove: vi.fn().mockResolvedValue(undefined),
    }));
    const mockJobRemove = vi.fn().mockResolvedValue(undefined);
    const mockGetJobs = vi.fn().mockResolvedValue([
      {
        id: "job-1",
        name: "ORDERS_CREATE",
        data: {
          topicKey: "ORDERS_CREATE",
          shopDomain: "demo-shop.myshopify.com",
          enqueuedAt: new Date().toISOString(),
        },
        timestamp: Date.now(),
        attemptsMade: 0,
        failedReason: null,
        processedOn: null,
        finishedOn: null,
        remove: mockJobRemove,
      },
    ]);
    const mockDrain = vi.fn().mockResolvedValue(undefined);
    const mockClean = vi.fn().mockResolvedValue(undefined);

    vi.doMock("bullmq", () => {
      class MockQueue {
        name: string;
        opts: unknown;
        constructor(name: string, opts: unknown) {
          this.name = name;
          this.opts = opts;
        }
        add = mockAdd;
        getJobs = mockGetJobs;
        drain = mockDrain;
        clean = mockClean;
      }

      class MockWorker {
        opts = { concurrency: 1 };
        on() {
          return this;
        }
        async close() {
          return;
        }
      }

      class MockQueueEvents {
      }

      return {
        __esModule: true,
        Queue: MockQueue,
        Worker: MockWorker,
        QueueEvents: MockQueueEvents,
      };
    });

    const mockRedisCtor = vi.fn(() => ({
      on: vi.fn(),
      disconnect: vi.fn(),
    }));

    vi.doMock("ioredis", () => ({
      __esModule: true,
      default: mockRedisCtor,
    }));

    const queueModule = await loadQueueModule();

    expect(queueModule.isBullQueueEnabled()).toBe(true);

    const job = await queueModule.enqueueWebhookJob({
      topicKey: "ORDERS_CREATE",
      shopDomain: "demo-shop.myshopify.com",
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(job.topicKey).toBe("ORDERS_CREATE");

    await expect(queueModule.markJobStatus("job-1", "pending")).rejects.toThrow();

    const snapshot = await queueModule.snapshotQueue();
    expect(mockGetJobs).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveLength(1);

    const purged = await queueModule.purgeShopJobs("demo-shop.myshopify.com");
    expect(mockGetJobs).toHaveBeenCalledTimes(2);
    expect(mockJobRemove).toHaveBeenCalledTimes(1);
    expect(purged).toBe(1);

    await queueModule.clearQueue();
    expect(mockDrain).toHaveBeenCalledTimes(1);
    expect(mockClean).toHaveBeenCalledWith(0, 1000, "completed");
  });
});
