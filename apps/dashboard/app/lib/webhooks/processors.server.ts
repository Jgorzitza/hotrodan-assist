import { createHmac } from "node:crypto";
import type { Job } from "bullmq";
import { resolveTopicFromKey, type WebhookTopicKey } from "./constants";
import { loadWebhookEvent } from "./persistence.server";
import { purgeShopJobs, type BullWebhookJobData } from "./queue.server";

const SYNC_TIMEOUT_MS = Number(process.env.WEBHOOK_SYNC_TIMEOUT_MS ?? 10000);

const getFetch = () => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch implementation is not available");
  }
  return fetch.bind(globalThis);
};

const safeStringify = (value: unknown): string =>
  JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? val.toString() : val),
  );

const buildShopifySignature = (body: string): string | undefined => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return undefined;
  const hmac = createHmac("sha256", secret);
  hmac.update(Buffer.from(body, "utf-8"));
  return hmac.digest("base64");
};

const resolveTopic = (topicKey: WebhookTopicKey | string, fallback?: string) => {
  if (typeof topicKey === "string") {
    const normalizedKey = topicKey as WebhookTopicKey;
    const resolved = resolveTopicFromKey(normalizedKey);
    if (resolved) return resolved;
  }
  return fallback;
};

type SyncDispatchResult = {
  dispatched: boolean;
  status?: number;
};

const dispatchToSyncService = async (
  job: Job<BullWebhookJobData>,
): Promise<SyncDispatchResult> => {
  const baseUrl = process.env.SYNC_SERVICE_URL;
  if (!baseUrl) {
    console.info("[webhooks:processor] Skipping sync service dispatch (SYNC_SERVICE_URL not set)", {
      topicKey: job.data.topicKey,
      shopDomain: job.data.shopDomain,
    });
    return { dispatched: false };
  }

  const event = job.data.webhookId ? await loadWebhookEvent(job.data.webhookId) : null;
  const payload = event?.payload ?? job.data.payload ?? {};
  let body: string;
  try {
    body = safeStringify(payload ?? {});
  } catch (_error) {
    body = JSON.stringify({ fallback: true });
  }

  const topic = resolveTopic(job.data.topicKey, event?.topic ?? job.data.topicKey);
  const url = new URL("/shopify/webhook", baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (topic) headers["X-Shopify-Topic"] = topic;
  if (job.data.shopDomain) headers["X-Shopify-Shop-Domain"] = job.data.shopDomain;
  if (job.data.webhookId) headers["X-Shopify-Webhook-Id"] = job.data.webhookId;

  const signature = buildShopifySignature(body);
  if (signature) {
    headers["X-Shopify-Hmac-Sha256"] = signature;
  }

  const fetchImpl = getFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url.toString(), {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Sync service webhook relay failed (${response.status} ${response.statusText})` +
        (text ? `: ${text}` : ""),
    );
  }

  return { dispatched: true, status: response.status };
};

type AnalyticsDispatchResult = {
  dispatched: boolean;
  status?: number;
};

const shouldTriggerAnalytics = (topicKey: WebhookTopicKey | string) => {
  const keys: WebhookTopicKey[] = ["PRODUCTS_UPDATE", "ORDERS_FULFILLED", "FULFILLMENTS_UPDATE"];
  return keys.includes(topicKey as WebhookTopicKey);
};

const triggerAnalyticsRefresh = async (
  job: Job<BullWebhookJobData>,
): Promise<AnalyticsDispatchResult> => {
  const refreshUrl = process.env.ANALYTICS_REFRESH_URL ?? process.env.ANALYTICS_SERVICE_URL;
  if (!refreshUrl) {
    return { dispatched: false };
  }
  if (!shouldTriggerAnalytics(job.data.topicKey)) {
    return { dispatched: false };
  }

  const payload = {
    shopDomain: job.data.shopDomain,
    topicKey: job.data.topicKey,
    webhookId: job.data.webhookId,
    dispatchedAt: new Date().toISOString(),
  };

  const fetchImpl = getFetch();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.ANALYTICS_REFRESH_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.ANALYTICS_REFRESH_TIMEOUT_MS ?? 8000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(refreshUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Analytics refresh failed (${response.status} ${response.statusText})` +
        (text ? `: ${text}` : ""),
    );
  }

  return { dispatched: true, status: response.status };
};

export type WebhookProcessorResult = {
  syncDispatched?: boolean;
  analyticsTriggered?: boolean;
  purgedJobs?: number;
};

export const processWebhookJob = async (
  job: Job<BullWebhookJobData>,
): Promise<WebhookProcessorResult> => {
  if (!job.data.topicKey) {
    throw new Error("Webhook job missing topicKey");
  }
  if (!job.data.shopDomain) {
    throw new Error("Webhook job missing shopDomain");
  }

  const result: WebhookProcessorResult = {};
  const topicKey = job.data.topicKey as WebhookTopicKey;

  if (topicKey !== "APP_UNINSTALLED") {
    const syncResult = await dispatchToSyncService(job);
    result.syncDispatched = syncResult.dispatched;

    const analyticsResult = await triggerAnalyticsRefresh(job);
    result.analyticsTriggered = analyticsResult.dispatched;
    return result;
  }

  const syncResult = await dispatchToSyncService(job);
  result.syncDispatched = syncResult.dispatched;

  const removed = await purgeShopJobs(job.data.shopDomain);
  result.purgedJobs = removed;
  return result;
};
