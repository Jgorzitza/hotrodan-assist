import { randomUUID } from "node:crypto";
import type { Job, QueueOptions, QueueEventsOptions, WorkerOptions } from "bullmq";
import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis, { type RedisOptions as IORedisOptions } from "ioredis";
import type { WebhookTopicKey } from "./constants";

export type WebhookQueueStatus = "pending" | "processing" | "completed" | "failed";

export type WebhookQueueJob = {
  id: string;
  webhookId?: string;
  topicKey: WebhookTopicKey | string;
  shopDomain: string;
  payloadDigest?: string;
  attempts: number;
  status: WebhookQueueStatus;
  enqueuedAt: string;
  updatedAt: string;
  error?: string;
};

export type EnqueueWebhookJobInput = {
  webhookId?: string;
  topicKey: WebhookTopicKey | string;
  shopDomain: string;
  payload?: unknown;
};

export type BullWebhookJobData = {
  webhookId?: string;
  topicKey: WebhookTopicKey | string;
  shopDomain: string;
  payload?: unknown;
  payloadDigest?: string;
  enqueuedAt: string;
};

type QueueDriver = {
  enqueue(job: EnqueueWebhookJobInput): Promise<WebhookQueueJob>;
  mark(jobId: string, status: WebhookQueueStatus, error?: string): Promise<WebhookQueueJob | undefined>;
  snapshot(): Promise<WebhookQueueJob[]>;
  clear(): Promise<void>;
  purge(shopDomain: string): Promise<number>;
};

const parseBoolean = (value: string | undefined | null, fallback = false): boolean => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const queueName = process.env.WEBHOOK_QUEUE_NAME ?? "sync:webhooks";
const redisUrl = process.env.WEBHOOK_QUEUE_REDIS_URL ?? process.env.UPSTASH_REDIS_URL ?? "";
const driverPreference = process.env.WEBHOOK_QUEUE_DRIVER?.toLowerCase();
const bullFlag = driverPreference === "bullmq" || (!driverPreference && parseBoolean(process.env.WEBHOOK_QUEUE_USE_BULLMQ));
const bullConfigAvailable = Boolean(redisUrl);
const BULL_QUEUE_ENABLED = bullFlag && bullConfigAvailable;

let driver: QueueDriver | null = null;
let bullQueueInstance: Queue<BullWebhookJobData> | null = null;

const truncatePayload = (payload: unknown): string | undefined => {
  if (payload == null) return undefined;
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length <= 512) return serialized;
    return `${serialized.slice(0, 509)}...`;
  } catch (_error) {
    return undefined;
  }
};

const nowIso = () => new Date().toISOString();

const createMemoryDriver = (): QueueDriver => {
  const queue: WebhookQueueJob[] = [];

  return {
    async enqueue(job) {
      const timestamp = nowIso();
      const record: WebhookQueueJob = {
        id: randomUUID(),
        webhookId: job.webhookId,
        topicKey: job.topicKey,
        shopDomain: job.shopDomain,
        payloadDigest: truncatePayload(job.payload),
        attempts: 0,
        status: "pending",
        enqueuedAt: timestamp,
        updatedAt: timestamp,
      };
      queue.push(record);
      return record;
    },
    async mark(jobId, status, error) {
      const record = queue.find((job) => job.id === jobId);
      if (!record) return undefined;
      record.status = status;
      record.updatedAt = nowIso();
      record.error = error;
      if (status === "failed" && error) {
        record.attempts += 1;
      }
      return record;
    },
    async snapshot() {
      return queue.map((job) => ({ ...job }));
    },
    async clear() {
      queue.splice(0, queue.length);
    },
    async purge(shopDomain) {
      const normalized = shopDomain.toLowerCase();
      let removed = 0;
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        const item = queue[index];
        if (item.shopDomain.toLowerCase() === normalized) {
          queue.splice(index, 1);
          removed += 1;
        }
      }
      return removed;
    },
  };
};

const createRedisOptions = (): IORedisOptions => {
  const options: IORedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (redisUrl.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
};

const createRedisConnection = () => {
  if (!redisUrl) {
    throw new Error("WEBHOOK_QUEUE_REDIS_URL or UPSTASH_REDIS_URL must be set when BullMQ driver is enabled");
  }
  return new IORedis(redisUrl, createRedisOptions());
};

const ensureBullQueue = (): Queue<BullWebhookJobData> => {
  if (!bullQueueInstance) {
    if (!BULL_QUEUE_ENABLED) {
      throw new Error("BullMQ queue requested but feature flag is disabled");
    }
    const queueOptions: QueueOptions = {
      connection: createRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { age: 60 * 60, count: 500 },
        removeOnFail: { age: 24 * 60 * 60, count: 1000 },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    };
    bullQueueInstance = new Queue<BullWebhookJobData>(queueName, queueOptions);
  }
  return bullQueueInstance;
};

const mapJobStatus = (job: Job<BullWebhookJobData>): WebhookQueueStatus => {
  if (job.finishedOn) return "completed";
  if (job.failedReason) return "failed";
  if (job.processedOn) return "processing";
  return "pending";
};

const toQueueJob = (job: Job<BullWebhookJobData>): WebhookQueueJob => {
  const enqueuedAt = job.data?.enqueuedAt ?? new Date(job.timestamp ?? Date.now()).toISOString();
  const updatedAtMs = job.finishedOn ?? job.processedOn ?? job.timestamp ?? Date.now();
  return {
    id: String(job.id ?? job.name ?? randomUUID()),
    webhookId: job.data?.webhookId,
    topicKey: job.data?.topicKey ?? job.name,
    shopDomain: job.data?.shopDomain ?? "",
    payloadDigest: job.data?.payloadDigest ?? truncatePayload(job.data?.payload),
    attempts: job.attemptsMade ?? 0,
    status: mapJobStatus(job),
    enqueuedAt,
    updatedAt: new Date(updatedAtMs).toISOString(),
    error: job.failedReason ?? undefined,
  };
};

const createBullDriver = (): QueueDriver => {
  const queue = ensureBullQueue();

  return {
    async enqueue(job) {
      const enqueuedAt = nowIso();
      const payloadDigest = truncatePayload(job.payload);
      const data: BullWebhookJobData = {
        webhookId: job.webhookId,
        topicKey: job.topicKey,
        shopDomain: job.shopDomain,
        payload: job.payload,
        payloadDigest,
        enqueuedAt,
      };

      const bullJob = await queue.add(job.topicKey ?? "webhook", data);
      return toQueueJob(bullJob);
    },
    async mark() {
      throw new Error("Manual queue status overrides are disabled when BullMQ is active");
    },
    async snapshot() {
      const jobs = await queue.getJobs(["waiting", "delayed", "active", "completed", "failed"], 0, 50, false);
      return jobs.map((job) => toQueueJob(job));
    },
    async clear() {
      await queue.drain(true);
      await queue.clean(0, 1000, "completed");
      await queue.clean(0, 1000, "failed");
      await queue.clean(0, 1000, "delayed");
    },
    async purge(shopDomain) {
      const normalized = shopDomain.toLowerCase();
      const targetStatuses = ["waiting", "delayed", "paused", "waiting-children"] as const; // BullMQ job types we can safely remove
      const jobs = await queue.getJobs(targetStatuses as any, 0, -1, false);
      let removed = 0;
      for (const job of jobs) {
        const domain = (job.data?.shopDomain ?? job.data?.shop ?? "").toLowerCase();
        if (domain === normalized) {
          await job.remove();
          removed += 1;
        }
      }
      return removed;
    },
  };
};

const getDriver = (): QueueDriver => {
  if (!driver) {
    driver = BULL_QUEUE_ENABLED ? createBullDriver() : createMemoryDriver();
  }
  return driver;
};

export const isBullQueueEnabled = () => BULL_QUEUE_ENABLED;

export const enqueueWebhookJob = (job: EnqueueWebhookJobInput) => getDriver().enqueue(job);

export const markJobStatus = (jobId: string, status: WebhookQueueStatus, error?: string) =>
  getDriver().mark(jobId, status, error);

export const snapshotQueue = () => getDriver().snapshot();

export const clearQueue = () => getDriver().clear();

export const purgeShopJobs = (shopDomain: string) => getDriver().purge(shopDomain);

export const createWebhookQueueWorker = (
  processor: (job: Job<BullWebhookJobData>) => Promise<unknown>,
  options?: WorkerOptions,
) => {
  if (!BULL_QUEUE_ENABLED) {
    throw new Error("Cannot create webhook worker: BullMQ driver is disabled");
  }
  return new Worker<BullWebhookJobData>(queueName, processor, {
    connection: createRedisConnection(),
    ...options,
  });
};

export const createWebhookQueueEvents = (options?: QueueEventsOptions) => {
  if (!BULL_QUEUE_ENABLED) {
    throw new Error("Cannot create queue events: BullMQ driver is disabled");
  }
  return new QueueEvents(queueName, {
    connection: createRedisConnection(),
    ...options,
  });
};

export const WEBHOOK_QUEUE_NAME = queueName;
