import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import { createHmac } from "node:crypto";

import type { BullWebhookJobData } from "../queue.server";
import { processWebhookJob } from "../processors.server";

const loadWebhookEventMock = vi.fn();
const purgeShopJobsMock = vi.fn();

vi.mock("../persistence.server", () => ({
  loadWebhookEvent: (args: unknown) => loadWebhookEventMock(args),
}));

vi.mock("../queue.server", async () => {
  const actual = await vi.importActual<typeof import("../queue.server")>("../queue.server");
  return {
    ...actual,
    purgeShopJobs: (shop: string) => purgeShopJobsMock(shop),
  };
});

type MinimalJob = Pick<Job<BullWebhookJobData>, "id" | "data">;

const buildJob = (data: Partial<BullWebhookJobData>): MinimalJob => ({
  id: "job-1",
  data: {
    topicKey: "ORDERS_CREATE",
    shopDomain: "demo-shop.myshopify.com",
    webhookId: "wh_123",
    payload: { sample: true },
    ...data,
  } as BullWebhookJobData,
});

const mockResponse = (overrides: Partial<Response> = {}): Response => ({
  ok: true,
  status: 200,
  statusText: "OK",
  text: vi.fn().mockResolvedValue(""),
  json: vi.fn().mockResolvedValue({}),
  redirected: false,
  type: "basic",
  url: "https://sync.test/mock",
  body: null,
  bodyUsed: false,
  arrayBuffer: vi.fn(),
  blob: vi.fn(),
  formData: vi.fn(),
  headers: undefined,
  clone() {
    return this;
  },
  ...overrides,
}) as unknown as Response;

beforeEach(() => {
  vi.clearAllMocks();
  delete (globalThis as any).fetch;
  delete process.env.SYNC_SERVICE_URL;
  delete process.env.SHOPIFY_WEBHOOK_SECRET;
  delete process.env.ANALYTICS_REFRESH_URL;
  delete process.env.ANALYTICS_SERVICE_URL;
  delete process.env.ANALYTICS_REFRESH_TOKEN;
  loadWebhookEventMock.mockResolvedValue({
    id: "evt-1",
    webhookId: "wh_123",
    shopDomain: "demo-shop.myshopify.com",
    topic: "orders/create",
    payload: { order: 123, total: "55.00" },
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  purgeShopJobsMock.mockResolvedValue(0);
});

describe("processWebhookJob", () => {
  it("relays the webhook payload to the sync service with HMAC headers", async () => {
    process.env.SYNC_SERVICE_URL = "https://sync.test";
    process.env.SHOPIFY_WEBHOOK_SECRET = "secret";

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse());
    (globalThis as any).fetch = fetchSpy;

    const job = buildJob({ topicKey: "ORDERS_CREATE" });
    const result = await processWebhookJob(job as Job<BullWebhookJobData>);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://sync.test/shopify/webhook");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Shopify-Topic": "orders/create",
      "X-Shopify-Shop-Domain": "demo-shop.myshopify.com",
      "X-Shopify-Webhook-Id": "wh_123",
    });

    const expectedBody = JSON.stringify({ order: 123, total: "55.00" });
    expect(init?.body).toBe(expectedBody);

    const expectedSignature = createHmac("sha256", "secret").update(expectedBody).digest("base64");
    expect(init?.headers).toMatchObject({ "X-Shopify-Hmac-Sha256": expectedSignature });

    expect(loadWebhookEventMock).toHaveBeenCalledWith("wh_123");
    expect(result.syncDispatched).toBe(true);
    expect(result.analyticsTriggered).toBe(false);
  });

  it("skips sync dispatch when SYNC_SERVICE_URL is not configured", async () => {
    const fetchSpy = vi.fn();
    (globalThis as any).fetch = fetchSpy;

    const result = await processWebhookJob(buildJob({}) as Job<BullWebhookJobData>);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.syncDispatched).toBe(false);
  });

  it("triggers analytics refresh for eligible topics", async () => {
    process.env.ANALYTICS_REFRESH_URL = "https://analytics.test/refresh";
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse());
    (globalThis as any).fetch = fetchSpy;

    const result = await processWebhookJob(
      buildJob({ topicKey: "PRODUCTS_UPDATE" }) as Job<BullWebhookJobData>,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://analytics.test/refresh");
    expect(result.analyticsTriggered).toBe(true);
  });

  it("purges queued jobs when handling APP_UNINSTALLED", async () => {
    purgeShopJobsMock.mockResolvedValue(3);
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse());
    process.env.SYNC_SERVICE_URL = "https://sync.test";
    (globalThis as any).fetch = fetchSpy;

    const result = await processWebhookJob(
      buildJob({ topicKey: "APP_UNINSTALLED" }) as Job<BullWebhookJobData>,
    );

    expect(purgeShopJobsMock).toHaveBeenCalledWith("demo-shop.myshopify.com");
    expect(result.purgedJobs).toBe(3);
  });
});
