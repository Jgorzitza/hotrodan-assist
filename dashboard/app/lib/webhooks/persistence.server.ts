import { randomUUID } from "node:crypto";
import type { DeliveryMethod, RegisterReturn, WebhookOperation } from "@shopify/shopify-api";
import prisma from "~/db.server";
import { SHOPIFY_WEBHOOK_DESCRIPTIONS, type WebhookTopicKey } from "./constants";
import type { Prisma } from "@prisma/client";

type PrismaLikeClient = typeof prisma & Record<string, any>;

const db = prisma as PrismaLikeClient;

const inMemoryRegistrations = new Map<string, Map<WebhookTopicKey, WebhookRegistrationRecord>>();
const inMemoryWebhookEvents = new Map<string, WebhookEventRecord>();
const inMemoryOrderFlags = new Map<string, OrderFlagRecord>();
const inMemoryVelocity = new Map<string, ProductVelocityRecord>();

type WebhookRegistrationRecord = {
  id: string;
  shop: string;
  topicKey: WebhookTopicKey;
  callbackUrl: string;
  deliveryMethod: DeliveryMethod;
  operation: WebhookOperation;
  success: boolean;
  description?: string;
  result?: unknown;
  recordedAt: Date;
};

export type WebhookEventRecord = {
  id: string;
  webhookId: string;
  shopDomain: string;
  topic: string;
  payload: unknown;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrderFlagRecord = {
  id: string;
  storeId?: string;
  shopDomain: string;
  shopifyOrderId: string;
  flagType: string;
  status: string;
  metadata?: Record<string, unknown>;
  webhookEventId?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductVelocityRecord = {
  id: string;
  storeId?: string;
  shopDomain: string;
  sku: string;
  averageDailySales: number;
  recordedFor: Date;
  currentInventory: number;
  metadata?: Record<string, unknown>;
  webhookEventId?: string;
  createdAt: Date;
  updatedAt: Date;
};

const now = () => new Date();

const hasModel = (model: string) => typeof db[model] !== "undefined";

const resolveStoreForDomain = async (shopDomain: string) => {
  if (!hasModel("store")) return null;
  try {
    const normalized = shopDomain.toLowerCase();
    const store = await db.store.findFirst({
      where: {
        OR: [
          { domain: normalized },
          { myShopifyDomain: normalized },
        ],
      },
    });
    return store ?? null;
  } catch (error) {
    console.warn("[webhooks:persistence] Failed to resolve store", { shopDomain, error });
    return null;
  }
};

export const recordWebhookRegistration = async (
  shopDomain: string,
  topicKey: WebhookTopicKey,
  deliveryMethod: DeliveryMethod,
  operation: WebhookOperation,
  success: boolean,
  callbackUrl: string,
  result?: RegisterReturn[string],
): Promise<void> => {
  const recordedAt = now();
  const description = SHOPIFY_WEBHOOK_DESCRIPTIONS[topicKey];
  const normalizedDomain = shopDomain.toLowerCase();
  if (hasModel("webhookRegistry")) {
    try {
      const store = await resolveStoreForDomain(normalizedDomain);
      await db.webhookRegistry.upsert({
        where: {
          shopDomain_topicKey: {
            shopDomain: normalizedDomain,
            topicKey,
          },
        },
        update: {
          deliveryMethod,
          operation,
          success,
          result: (result ?? undefined) as unknown as Prisma.InputJsonValue,
          description,
          callbackUrl,
          shopDomain: normalizedDomain,
          recordedAt,
          updatedAt: recordedAt,
          ...(store ? { storeId: store.id } : {}),
        },
        create: {
          shopDomain: normalizedDomain,
          topicKey,
          deliveryMethod,
          operation,
          success,
          result: (result ?? undefined) as unknown as Prisma.InputJsonValue,
          description,
          callbackUrl,
          recordedAt,
          ...(store ? { storeId: store.id } : {}),
        },
      });
      return;
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to upsert webhookRegistry", { shopDomain, topicKey, error });
    }
  }

  const shopMap = inMemoryRegistrations.get(normalizedDomain) ?? new Map();
  shopMap.set(topicKey, {
    id: randomUUID(),
    shop: normalizedDomain,
    topicKey,
    deliveryMethod,
    operation,
    success,
    callbackUrl,
    description,
    result,
    recordedAt,
  });
  inMemoryRegistrations.set(normalizedDomain, shopMap);
};

export const snapshotWebhookRegistrations = async () => {
  if (hasModel("webhookRegistry")) {
    try {
      const rows = await db.webhookRegistry.findMany({
        orderBy: [{ shopDomain: "asc" }, { topicKey: "asc" }],
      });
      const grouped = rows.reduce<Map<string, WebhookRegistrationRecord[]>>((acc, row) => {
        const current = acc.get(row.shopDomain) ?? [];
        current.push({
          id: row.id,
          shop: row.shopDomain,
          topicKey: row.topicKey as WebhookTopicKey,
          callbackUrl: row.callbackUrl ?? "",
          deliveryMethod: row.deliveryMethod as DeliveryMethod,
          operation: row.operation as WebhookOperation,
          success: row.success,
          description: row.description ?? undefined,
          result: row.result,
          recordedAt: row.recordedAt,
        });
        acc.set(row.shopDomain, current);
        return acc;
      }, new Map());
      return Array.from(grouped.entries()).map(([shop, topics]) => ({
        shop,
        topics: topics.sort((a, b) => a.topicKey.localeCompare(b.topicKey)),
      }));
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to load webhookRegistry snapshot", { error });
    }
  }

  return Array.from(inMemoryRegistrations.entries()).map(([shop, entries]) => ({
    shop,
    topics: Array.from(entries.values()),
  }));
};

export const createWebhookEvent = async (
  webhookId: string,
  shopDomain: string,
  topic: string,
  payload: unknown,
): Promise<{ id: string; storeId?: string | null } | null> => {
  const timestamp = now();
  if (hasModel("webhookEvent")) {
    try {
      const existing = await db.webhookEvent.findUnique({ where: { webhookId } });
      if (existing) {
        return { id: existing.id, storeId: existing.storeId };
      }
      const store = await resolveStoreForDomain(shopDomain);
      const created = await db.webhookEvent.create({
        data: {
          webhookId,
          topic,
          shopDomain,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: "PENDING",
          receivedAt: timestamp,
          ...(store ? { storeId: store.id } : {}),
        },
      });
      return { id: created.id, storeId: created.storeId };
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to create webhookEvent", { webhookId, error });
    }
  }

  const record: WebhookEventRecord = {
    id: randomUUID(),
    webhookId,
    shopDomain,
    topic,
    payload,
    status: "PENDING",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  inMemoryWebhookEvents.set(webhookId, record);
  return { id: record.id, storeId: undefined };
};

export const markWebhookEventStatus = async (
  webhookId: string,
  status: WebhookEventRecord["status"],
  errorMessage?: string,
): Promise<void> => {
  const updatedAt = now();
  if (hasModel("webhookEvent")) {
    try {
      await db.webhookEvent.update({
        where: { webhookId },
        data: {
          status,
          errorMessage,
          processedAt: status === "SUCCEEDED" ? updatedAt : undefined,
          updatedAt,
        },
      });
      return;
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to update webhookEvent status", { webhookId, status, error });
    }
  }

  const record = inMemoryWebhookEvents.get(webhookId);
  if (!record) return;
  record.status = status;
  record.errorMessage = errorMessage;
  record.updatedAt = updatedAt;
  if (status === "SUCCEEDED") {
    if (record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)) {
      record.payload = {
        ...(record.payload as Record<string, unknown>),
        processedAt: updatedAt.toISOString(),
      };
    } else {
      record.payload = { processedAt: updatedAt.toISOString() } as Record<string, unknown>;
    }
  }
};

export const loadWebhookEvent = async (webhookId: string): Promise<WebhookEventRecord | null> => {
  if (!webhookId) return null;

  if (hasModel("webhookEvent")) {
    try {
      const event = await db.webhookEvent.findUnique({ where: { webhookId } });
      if (!event) return null;
      return {
        id: event.id,
        webhookId: event.webhookId,
        shopDomain: event.shopDomain,
        topic: event.topic,
        payload: event.payload,
        status: event.status as WebhookEventRecord["status"],
        errorMessage: event.errorMessage ?? undefined,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      } satisfies WebhookEventRecord;
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to load webhookEvent", { webhookId, error });
    }
  }

  return inMemoryWebhookEvents.get(webhookId) ?? null;
};

const normalizeGid = (value: unknown): string => {
  if (!value) return randomUUID();
  if (typeof value === "string") return value;
  return String(value);
};

export const persistOrderFlag = async (
  params: {
    shopDomain: string;
    webhookEventId?: string;
    orderId: unknown;
    flagType: string;
    status?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  const {
    shopDomain,
    webhookEventId,
    orderId,
    flagType,
    status = "OPEN",
    metadata,
  } = params;

  const timestamp = now();
  const shopifyOrderId = normalizeGid(orderId);
  if (hasModel("orderFlag")) {
    try {
      const store = await resolveStoreForDomain(shopDomain);
      if (!store) {
        console.warn("[webhooks:persistence] Missing Store for order flag", { shopDomain });
        return;
      }
      const existing = await db.orderFlag.findFirst({
        where: {
          storeId: store.id,
          shopifyOrderId,
          flagType,
        },
      });
      if (existing) {
        await db.orderFlag.update({
          where: { id: existing.id },
          data: {
            status: status as any,
            metadata: (metadata ?? undefined) as unknown as Prisma.InputJsonValue,
            webhookEventId,
            updatedAt: timestamp,
          },
        });
      } else {
        await db.orderFlag.create({
          data: {
            storeId: store.id,
            shopifyOrderId,
            flagType,
            status: status as any,
            metadata: (metadata ?? undefined) as unknown as Prisma.InputJsonValue,
            webhookEventId,
          },
        });
      }
      return;
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to persist order flag", {
        shopDomain,
        shopifyOrderId,
        error,
      });
    }
  }

  const key = `${shopDomain}:${shopifyOrderId}:${flagType}`;
  inMemoryOrderFlags.set(key, {
    id: randomUUID(),
    shopDomain,
    shopifyOrderId,
    flagType,
    status,
    metadata,
    webhookEventId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
};

export const persistProductVelocity = async (
  params: {
    shopDomain: string;
    webhookEventId?: string;
    sku: string;
    averageDailySales: number;
    currentInventory: number;
    recordedFor?: Date;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  const {
    shopDomain,
    webhookEventId,
    sku,
    averageDailySales,
    currentInventory,
    recordedFor = now(),
    metadata,
  } = params;
  const timestamp = now();

  if (hasModel("productVelocity")) {
    try {
      const store = await resolveStoreForDomain(shopDomain);
      if (!store) {
        console.warn("[webhooks:persistence] Missing Store for product velocity", { shopDomain });
        return;
      }
      const existing = await db.productVelocity.findFirst({
        where: {
          storeId: store.id,
          sku,
          recordedFor,
        },
      });
      if (existing) {
        await db.productVelocity.update({
          where: { id: existing.id },
          data: {
            averageDailySales,
            currentInventory,
            metadata: (metadata ?? undefined) as unknown as Prisma.InputJsonValue,
            webhookEventId,
            updatedAt: timestamp,
          },
        });
      } else {
        await db.productVelocity.create({
          data: {
            storeId: store.id,
            sku,
            recordedFor,
            averageDailySales,
            currentInventory,
            metadata: (metadata ?? undefined) as unknown as Prisma.InputJsonValue,
            webhookEventId,
          },
        });
      }
      return;
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to persist product velocity", { shopDomain, sku, error });
    }
  }

  const key = `${shopDomain}:${sku}:${recordedFor.toISOString()}`;
  inMemoryVelocity.set(key, {
    id: randomUUID(),
    shopDomain,
    sku,
    averageDailySales,
    recordedFor,
    currentInventory,
    metadata,
    webhookEventId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
};

export const cleanupStoreSessions = async (shopDomain: string): Promise<void> => {
  const normalizedDomain = shopDomain.toLowerCase();
  if (hasModel("session")) {
    try {
      await db.session.deleteMany({ where: { shop: shopDomain } });
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to delete sessions", { shopDomain, error });
    }
  }
  if (hasModel("webhookRegistry")) {
    try {
      await db.webhookRegistry.deleteMany({ where: { shopDomain: normalizedDomain } });
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to delete webhook registrations", { shopDomain, error });
    }
  }
  inMemoryRegistrations.delete(normalizedDomain);
  Array.from(inMemoryOrderFlags.keys())
    .filter((key) => key.startsWith(`${normalizedDomain}:`))
    .forEach((key) => inMemoryOrderFlags.delete(key));
  Array.from(inMemoryVelocity.keys())
    .filter((key) => key.startsWith(`${normalizedDomain}:`))
    .forEach((key) => inMemoryVelocity.delete(key));
};

export const snapshotOrderFlags = async () => {
  if (hasModel("orderFlag")) {
    try {
      const rows = await db.orderFlag.findMany({
        include: {
          store: {
            select: {
              id: true,
              domain: true,
              myShopifyDomain: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      });
      return rows.map((row) => {
        const md = row.metadata as unknown;
        const metadataObj = md && typeof md === "object" && !Array.isArray(md) ? (md as Record<string, unknown>) : undefined;
        return {
          id: row.id,
          storeId: row.storeId,
          shopDomain: row.store?.domain ?? row.store?.myShopifyDomain ?? "",
          shopifyOrderId: row.shopifyOrderId,
          flagType: row.flagType,
          status: row.status,
          metadata: metadataObj,
          webhookEventId: row.webhookEventId ?? undefined,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        } satisfies OrderFlagRecord;
      });
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to load order flag snapshot", { error });
    }
  }
  return Array.from(inMemoryOrderFlags.values());
};

export const snapshotVelocity = async () => {
  if (hasModel("productVelocity")) {
    try {
      const rows = await db.productVelocity.findMany({
        include: {
          store: {
            select: {
              id: true,
              domain: true,
              myShopifyDomain: true,
            },
          },
        },
        orderBy: {
          recordedFor: "desc",
        },
        take: 100,
      });
      return rows.map((row) => {
        const md = row.metadata as unknown;
        const metadataObj = md && typeof md === "object" && !Array.isArray(md) ? (md as Record<string, unknown>) : undefined;
        return {
          id: row.id,
          storeId: row.storeId,
          shopDomain: row.store?.domain ?? row.store?.myShopifyDomain ?? "",
          sku: row.sku,
          averageDailySales: row.averageDailySales,
          currentInventory: row.currentInventory,
          metadata: metadataObj,
          webhookEventId: row.webhookEventId ?? undefined,
          recordedFor: row.recordedFor,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        } satisfies ProductVelocityRecord;
      });
    } catch (error) {
      console.warn("[webhooks:persistence] Failed to load product velocity snapshot", { error });
    }
  }
  return Array.from(inMemoryVelocity.values());
};
