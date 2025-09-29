/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from "vitest";

const persistenceMocks = vi.hoisted(() => ({
  createWebhookEvent: vi.fn().mockResolvedValue({ id: "evt-1" }),
  markWebhookEventStatus: vi.fn().mockResolvedValue(undefined),
  persistOrderFlag: vi.fn().mockResolvedValue(undefined),
  persistProductVelocity: vi.fn().mockResolvedValue(undefined),
  cleanupStoreSessions: vi.fn().mockResolvedValue(undefined),
}));

const queueMocks = vi.hoisted(() => ({
  enqueueWebhookJob: vi.fn(),
}));

const idempotencyMocks = vi.hoisted(() => ({
  hasProcessedWebhook: vi.fn().mockReturnValue(false),
  markWebhookProcessed: vi.fn(),
}));

vi.mock("../persistence.server", () => persistenceMocks);
vi.mock("../queue.server", () => queueMocks);
vi.mock("../idempotency.server", () => idempotencyMocks);

import {
  handleAppUninstalled,
  handleOrdersCreate,
  handleProductsUpdate,
  type ShopifyWebhookContext,
} from "../handlers.server";
import {
  cleanupStoreSessions,
  createWebhookEvent,
  markWebhookEventStatus,
  persistOrderFlag,
  persistProductVelocity,
} from "../persistence.server";
import { enqueueWebhookJob } from "../queue.server";
import { hasProcessedWebhook, markWebhookProcessed } from "../idempotency.server";

describe("webhook handlers", () => {
  const baseContext: ShopifyWebhookContext = {
    apiVersion: "2025-07",
    shop: "test-shop.myshopify.com",
    topic: "ORDERS_CREATE",
    webhookId: "wh_123",
    payload: {
      id: "gid://shopify/Order/1",
      total_price: "101.00",
      created_at: "2025-01-01T00:00:00Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    idempotencyMocks.hasProcessedWebhook.mockReturnValue(false);
    persistenceMocks.createWebhookEvent.mockResolvedValue({ id: "evt-1" });
  });

  it("persists order flag and enqueues job for ORDERS_CREATE", async () => {
    await handleOrdersCreate(baseContext);

    expect(hasProcessedWebhook).toHaveBeenCalledWith("wh_123");
    expect(createWebhookEvent).toHaveBeenCalledWith(
      "wh_123",
      "test-shop.myshopify.com",
      "ORDERS_CREATE",
      expect.objectContaining({ id: "gid://shopify/Order/1" }),
    );
    expect(persistOrderFlag).toHaveBeenCalledWith(
      expect.objectContaining({
        shopDomain: "test-shop.myshopify.com",
        flagType: "order_created",
      }),
    );
    expect(enqueueWebhookJob).toHaveBeenCalledWith(
      expect.objectContaining({ topicKey: "ORDERS_CREATE" }),
    );
    expect(markWebhookEventStatus).toHaveBeenCalledWith("wh_123", "PROCESSING");
    expect(markWebhookEventStatus).toHaveBeenCalledWith("wh_123", "SUCCEEDED");
    expect(markWebhookProcessed).toHaveBeenCalledWith("wh_123");
  });

  it("skips processing duplicate webhook deliveries", async () => {
    idempotencyMocks.hasProcessedWebhook.mockReturnValue(true);

    await handleOrdersCreate(baseContext);

    expect(createWebhookEvent).not.toHaveBeenCalled();
    expect(persistOrderFlag).not.toHaveBeenCalled();
    expect(enqueueWebhookJob).not.toHaveBeenCalled();
    expect(markWebhookProcessed).not.toHaveBeenCalled();
  });

  it("updates product velocity on PRODUCTS_UPDATE", async () => {
    await handleProductsUpdate({
      ...baseContext,
      topic: "PRODUCTS_UPDATE",
      payload: {
        id: 999,
        title: "Widget",
        total_inventory: 45,
        variants: [{ sku: "WIDGET-1" }],
      },
    });

    expect(persistProductVelocity).toHaveBeenCalledWith(
      expect.objectContaining({
        shopDomain: "test-shop.myshopify.com",
        sku: "WIDGET-1",
      }),
    );
    expect(enqueueWebhookJob).toHaveBeenCalledWith(
      expect.objectContaining({ topicKey: "PRODUCTS_UPDATE" }),
    );
  });

  it("cleans up store sessions on APP_UNINSTALLED", async () => {
    await handleAppUninstalled({
      ...baseContext,
      topic: "APP_UNINSTALLED",
    });

    expect(cleanupStoreSessions).toHaveBeenCalledWith("test-shop.myshopify.com");
    expect(enqueueWebhookJob).toHaveBeenCalledWith(
      expect.objectContaining({ topicKey: "APP_UNINSTALLED" }),
    );
  });
});
