import type { Session } from "@shopify/shopify-api";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { resolveWebhookKey, type WebhookTopicKey } from "./constants";
import {
  cleanupStoreSessions,
  createWebhookEvent,
  markWebhookEventStatus,
  persistOrderFlag,
  persistProductVelocity,
} from "./persistence.server";
import { enqueueWebhookJob } from "./queue.server";
import { hasProcessedWebhook, markWebhookProcessed } from "./idempotency.server";

export type ShopifyWebhookContext = {
  apiVersion: string;
  shop: string;
  topic: string;
  webhookId: string;
  payload: unknown;
  session?: Session;
  admin?: AdminApiContext | undefined;
  subTopic?: string;
};

type HandlerResult = {
  duplicate?: boolean;
  enqueued?: boolean;
};

type HandlerImplementation = (
  params: ShopifyWebhookContext & {
    payloadObject: Record<string, any>;
    topicKey: WebhookTopicKey;
    webhookEventId?: string;
  },
) => Promise<void>;

const ensurePayloadObject = (payload: unknown): Record<string, any> => {
  if (payload && typeof payload === "object") {
    return payload as Record<string, any>;
  }
  return {};
};

const withWebhookProcessing = async (
  context: ShopifyWebhookContext,
  impl: HandlerImplementation,
): Promise<HandlerResult> => {
  if (!context.webhookId) {
    throw new Error("Webhook context missing webhookId");
  }

  if (hasProcessedWebhook(context.webhookId)) {
    return { duplicate: true };
  }

  const topicKey = resolveWebhookKey(context.topic);
  if (!topicKey) {
    throw new Error(`Unsupported webhook topic: ${context.topic}`);
  }

  const payloadObject = ensurePayloadObject(context.payload);

  const eventRecord = await createWebhookEvent(
    context.webhookId,
    context.shop,
    context.topic,
    payloadObject,
  );

  const webhookEventId = eventRecord?.id;

  await markWebhookEventStatus(context.webhookId, "PROCESSING");

  try {
    await impl({
      ...context,
      topicKey,
      payloadObject,
      webhookEventId,
    });
    await markWebhookEventStatus(context.webhookId, "SUCCEEDED");
    markWebhookProcessed(context.webhookId);
    return { enqueued: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markWebhookEventStatus(context.webhookId, "FAILED", message);
    throw error;
  }
};

const extractOrderId = (payload: Record<string, any>) =>
  payload?.admin_graphql_api_id || payload?.id || payload?.order_id || payload?.legacyResourceId;

const extractSku = (payload: Record<string, any>): string => {
  const firstVariant = Array.isArray(payload?.variants) ? payload.variants[0] : undefined;
  if (firstVariant?.sku) return String(firstVariant.sku);
  if (payload?.sku) return String(payload.sku);
  if (payload?.id) return `product-${payload.id}`;
  return `product-${Date.now()}`;
};

const estimateAverageDailySales = (payload: Record<string, any>): number => {
  const velocity = Number(payload?.velocity ?? payload?.average_daily_sales ?? 0);
  if (Number.isFinite(velocity) && velocity > 0) return velocity;
  const totalSales = Number(payload?.total_sales ?? payload?.totalOrdered ?? 0);
  if (Number.isFinite(totalSales) && totalSales > 0) {
    const days = Number(payload?.days ?? 30) || 30;
    return Number((totalSales / days).toFixed(2));
  }
  return 0;
};

const handleOrdersCreateImpl: HandlerImplementation = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey,
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "order_created",
    status: "OPEN",
    metadata: {
      webhookId,
      financialStatus: payloadObject?.financial_status,
      fulfillmentStatus: payloadObject?.fulfillment_status,
      totalPrice: payloadObject?.total_price,
    },
  });

  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "order_created",
      placedAt: payloadObject?.created_at,
    },
  });
};

const handleOrdersFulfilledImpl: HandlerImplementation = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey,
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "order_fulfilled",
    status: "RESOLVED",
    metadata: {
      webhookId,
      fulfilledAt: payloadObject?.fulfilled_at ?? payloadObject?.processed_at,
      locationId: payloadObject?.location_id,
    },
  });

  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "order_fulfilled",
      fulfillmentStatus: payloadObject?.fulfillment_status,
    },
  });
};

const handleFulfillmentsUpdateImpl: HandlerImplementation = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey,
}) => {
  const orderId = extractOrderId(payloadObject);
  await persistOrderFlag({
    shopDomain: shop,
    webhookEventId,
    orderId,
    flagType: "fulfillment_update",
    status: "OPEN",
    metadata: {
      webhookId,
      status: payloadObject?.status,
      trackingCompany: payloadObject?.tracking_company,
      trackingNumbers: payloadObject?.tracking_numbers,
    },
  });

  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      orderId,
      reason: "fulfillment_update",
      status: payloadObject?.status,
    },
  });
};

const handleProductsUpdateImpl: HandlerImplementation = async ({
  shop,
  webhookId,
  payloadObject,
  webhookEventId,
  topicKey,
}) => {
  const sku = extractSku(payloadObject);
  const averageDailySales = estimateAverageDailySales(payloadObject);
  const currentInventory = Number(payloadObject?.total_inventory ?? payloadObject?.inventory_quantity ?? 0);
  await persistProductVelocity({
    shopDomain: shop,
    webhookEventId,
    sku,
    averageDailySales,
    currentInventory,
    metadata: {
      webhookId,
      productId: payloadObject?.id,
      title: payloadObject?.title,
    },
  });

  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      sku,
      averageDailySales,
      currentInventory,
    },
  });
};

const handleAppUninstalledImpl: HandlerImplementation = async ({
  shop,
  webhookId,
  topicKey,
}) => {
  await cleanupStoreSessions(shop);
  await enqueueWebhookJob({
    webhookId,
    topicKey,
    shopDomain: shop,
    payload: {
      action: "cleanup",
    },
  });
};

export const handleOrdersCreate = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleOrdersCreateImpl);

export const handleOrdersFulfilled = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleOrdersFulfilledImpl);

export const handleFulfillmentsUpdate = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleFulfillmentsUpdateImpl);

export const handleProductsUpdate = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleProductsUpdateImpl);

export const handleAppUninstalled = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleAppUninstalledImpl);


// Inventory Levels Update handler implementation
const handleInventoryLevelsUpdateImpl: HandlerImplementation = async (params) => {
  const { shop } = params;
  
  console.log(`📦 Inventory levels updated for ${shop}`);
  
  // Clear cache to ensure fresh data on next fetch
  const { shopifyCache } = await import("~/lib/shopify/cache.server");
  shopifyCache.clear();
  
  console.log(`✅ Inventory cache cleared for ${shop}`);
};

export const handleInventoryLevelsUpdate = (context: ShopifyWebhookContext) =>
  withWebhookProcessing(context, handleInventoryLevelsUpdateImpl);
