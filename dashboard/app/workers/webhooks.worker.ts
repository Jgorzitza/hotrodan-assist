import process from "node:process";
import type { Job } from "bullmq";
import {
  WEBHOOK_QUEUE_NAME,
  createWebhookQueueWorker,
  isBullQueueEnabled,
  type BullWebhookJobData,
} from "~/lib/webhooks/queue.server";

if (!isBullQueueEnabled()) {
  console.error(
    "[webhooks:worker] BullMQ driver is disabled. Set WEBHOOK_QUEUE_DRIVER=bullmq and configure `UPSTASH_REDIS_URL` before starting the worker.",
  );
  process.exit(1);
}

const worker = createWebhookQueueWorker(async (job: Job<BullWebhookJobData>) => {
  const { webhookId, topicKey, shopDomain } = job.data;
  console.info(
    "[webhooks:worker] Processing webhook job",
    {
      queue: WEBHOOK_QUEUE_NAME,
      jobId: job.id,
      webhookId,
      topicKey,
      shopDomain,
    },
  );

  // TODO: Dispatch to the actual background processors (Zoho, analytics regeneration, etc.).
  // For now we simply log as a stub implementation.
});

worker.on("failed", (job, error) => {
  console.error(
    "[webhooks:worker] Job failed",
    {
      queue: WEBHOOK_QUEUE_NAME,
      jobId: job?.id,
      topicKey: job?.data?.topicKey,
      error: error?.message,
    },
  );
});

worker.on("completed", (job) => {
  console.info(
    "[webhooks:worker] Job completed",
    {
      queue: WEBHOOK_QUEUE_NAME,
      jobId: job.id,
      topicKey: job.data?.topicKey,
    },
  );
});

const shutdown = async (signal: NodeJS.Signals) => {
  console.info(`[webhooks:worker] Received ${signal}, shutting down BullMQ worker`);
  await worker.close();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.info(
  "[webhooks:worker] Worker started",
  {
    queue: WEBHOOK_QUEUE_NAME,
    concurrency: worker.opts?.concurrency ?? 1,
  },
);
