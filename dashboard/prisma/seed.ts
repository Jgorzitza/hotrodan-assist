import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import {
  OrderFlagStatus,
  PrismaClient,
  PurchaseOrderStatus,
  SeoInsightSeverity,
  SeoInsightStatus,
  SettingsSecretProvider,
  StoreStatus,
  TicketAuthorType,
  TicketPriority,
  TicketStatus,
  WebhookProcessingStatus,
} from "@prisma/client";

import { buildDashboardRangeSelection } from "../app/lib/date-range";
import { mapAnalyticsResponse } from "../app/lib/sales/analytics.server";
import { encryptSecret, maskSecret } from "../app/lib/security/secrets.server";
import { BASE_SHOP_DOMAIN, getMockSettings } from "../app/mocks/settings";
import { analyticsSalesBase } from "../app/mocks/fixtures/analytics.sales";
import {
  SETTINGS_SEED_ACCESS_TOKEN,
  SETTINGS_SECRET_SEEDS,
  buildSettingsPrismaSeed,
} from "../app/lib/settings/fixtures.server";

const prisma = new PrismaClient();

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

async function seedStore() {
  const accessTokenCipher = encryptSecret(SETTINGS_SEED_ACCESS_TOKEN);

  const store = await prisma.store.upsert({
    where: { domain: BASE_SHOP_DOMAIN },
    update: {
      name: "Demo Seed Shop",
      planLevel: "pro",
      timezone: "America/Toronto",
      accessTokenCipher,
      status: StoreStatus.ACTIVE,
      lastSyncedAt: now,
    },
    create: {
      domain: BASE_SHOP_DOMAIN,
      myShopifyDomain: BASE_SHOP_DOMAIN,
      name: "Demo Seed Shop",
      planLevel: "pro",
      timezone: "America/Toronto",
      accessTokenCipher,
      status: StoreStatus.ACTIVE,
      onboardingCompletedAt: now,
      lastSyncedAt: now,
    },
  });

  const settings = getMockSettings(BASE_SHOP_DOMAIN);
  const seedPayload = buildSettingsPrismaSeed({
    storeId: store.id,
    shopDomain: store.domain,
    now,
  });

  const connectionMetadata = seedPayload.storeSettings.connectionMetadata;

  await prisma.storeSettings.upsert({
    where: { storeId: store.id },
    update: {
      thresholds: seedPayload.storeSettings.thresholds as unknown as Prisma.InputJsonValue,
      featureFlags: seedPayload.storeSettings.featureFlags as unknown as Prisma.InputJsonValue,
      connectionMetadata: connectionMetadata as unknown as Prisma.InputJsonValue,
      notificationEmails: seedPayload.storeSettings.notificationEmails,
      lastRotationAt: seedPayload.storeSettings.lastRotationAt,
      lastInventorySyncAt: seedPayload.storeSettings.lastInventorySyncAt,
    },
    create: {
      storeId: store.id,
      thresholds: seedPayload.storeSettings.thresholds as unknown as Prisma.InputJsonValue,
      featureFlags: seedPayload.storeSettings.featureFlags as unknown as Prisma.InputJsonValue,
      connectionMetadata: connectionMetadata as unknown as Prisma.InputJsonValue,
      notificationEmails: seedPayload.storeSettings.notificationEmails,
      lastRotationAt: seedPayload.storeSettings.lastRotationAt,
      lastInventorySyncAt: seedPayload.storeSettings.lastInventorySyncAt,
    },
  });

  await Promise.all(
    (Object.values(SettingsSecretProvider) as SettingsSecretProvider[]).map(
      async (provider) => {
        const plaintext = SETTINGS_SECRET_SEEDS[provider];
        const metadata = settings.secrets[provider as keyof typeof settings.secrets];
        const seedEntry = seedPayload.storeSecrets.find(
          (secret) => secret.provider === provider,
        );

        if (!plaintext) {
          await prisma.storeSecret.deleteMany({
            where: { storeId: store.id, provider },
          });
          return;
        }

        const ciphertext = seedEntry?.ciphertext ?? encryptSecret(plaintext);
        const maskedValue =
          seedEntry?.maskedValue ?? metadata?.maskedValue ?? maskSecret(plaintext);
        const lastVerifiedAt = seedEntry?.lastVerifiedAt
          ? new Date(seedEntry.lastVerifiedAt)
          : metadata?.lastVerifiedAt
            ? new Date(metadata.lastVerifiedAt)
            : null;
        const rotationReminderAt = seedEntry?.rotationReminderAt
          ? new Date(seedEntry.rotationReminderAt)
          : metadata?.rotationReminderAt
            ? new Date(metadata.rotationReminderAt)
            : null;

        await prisma.storeSecret.upsert({
          where: {
            storeId_provider: {
              storeId: store.id,
              provider,
            },
          },
          update: {
            ciphertext,
            maskedValue,
            lastVerifiedAt,
            rotationReminderAt,
          },
          create: {
            storeId: store.id,
            provider,
            ciphertext,
            maskedValue,
            lastVerifiedAt,
            rotationReminderAt,
          },
        });
      },
    ),
  );

  const salesRange = buildDashboardRangeSelection("28d", now);
  const rangeStartDate = new Date(salesRange.start);
  const rangeEndDate = new Date(salesRange.end);

  const normalizedSalesSearch = {
    period: "28d",
    compare: "previous_period",
    granularity: "daily",
    bucketDate: null,
    collectionId: null,
    productId: null,
    variantId: null,
    days: salesRange.days,
  } as const;

  const metricKey = `sales_analytics:${createHash("sha1")
    .update(JSON.stringify(normalizedSalesSearch))
    .digest("hex")}`;

  const salesDataset = (() => {
    const mapped = mapAnalyticsResponse(analyticsSalesBase);
    return {
      ...mapped,
      granularity: normalizedSalesSearch.granularity,
      range: {
        ...mapped.range,
        label: salesRange.label,
        start: salesRange.start,
        end: salesRange.end,
      },
    };
  })();

  const cacheExpiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const cachedPayload = {
    dataset: salesDataset,
    search: normalizedSalesSearch,
    storedAt: now.toISOString(),
  };

  await prisma.kpiCache.upsert({
    where: {
      storeId_metricKey_rangeStart_rangeEnd: {
        storeId: store.id,
        metricKey,
        rangeStart: rangeStartDate,
        rangeEnd: rangeEndDate,
      },
    },
    update: {
      payload: cachedPayload,
      refreshedAt: now,
      expiresAt: cacheExpiresAt,
    },
    create: {
      storeId: store.id,
      metricKey,
      rangeStart: rangeStartDate,
      rangeEnd: rangeEndDate,
      payload: cachedPayload,
      refreshedAt: now,
      expiresAt: cacheExpiresAt,
    },
  });

  const webhookEvent = await prisma.webhookEvent.upsert({
    where: { webhookId: "seed-order-flag-event" },
    update: {
      storeId: store.id,
      status: WebhookProcessingStatus.SUCCEEDED,
      payload: { topic: "orders/updated", sample: true },
      processedAt: now,
      receivedAt: now,
    },
    create: {
      webhookId: "seed-order-flag-event",
      storeId: store.id,
      topic: "orders/updated",
      shopDomain: store.domain,
      status: WebhookProcessingStatus.SUCCEEDED,
      payload: { topic: "orders/updated", sample: true },
      processedAt: now,
      receivedAt: now,
    },
  });

  await prisma.orderFlag.upsert({
    where: {
      storeId_shopifyOrderId_flagType: {
        storeId: store.id,
        shopifyOrderId: "1001",
        flagType: "delayed-shipment",
      },
    },
    update: {
      status: OrderFlagStatus.OPEN,
      notes: "Order requires manual fulfillment review.",
      metadata: { slaHours: 24 },
      webhookEventId: webhookEvent.id,
    },
    create: {
      storeId: store.id,
      shopifyOrderId: "1001",
      flagType: "delayed-shipment",
      status: OrderFlagStatus.OPEN,
      notes: "Order requires manual fulfillment review.",
      metadata: { slaHours: 24 },
      webhookEventId: webhookEvent.id,
    },
  });

  await prisma.productVelocity.upsert({
    where: {
      storeId_sku_recordedFor: {
        storeId: store.id,
        sku: "SKU-RED-MUG",
        recordedFor: thirtyDaysAgo,
      },
    },
    update: {
      averageDailySales: 8.2,
      currentInventory: 96,
      sellThroughRate: 0.42,
      daysOfSupply: 11.5,
      projectedStockoutDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      recommendedReorderQuantity: 120,
      metadata: { category: "Drinkware" },
      webhookEventId: webhookEvent.id,
    },
    create: {
      storeId: store.id,
      sku: "SKU-RED-MUG",
      variantId: "gid://shopify/ProductVariant/123456",
      productTitle: "Signature Red Mug",
      recordedFor: thirtyDaysAgo,
      averageDailySales: 8.2,
      velocityWindowDays: 30,
      currentInventory: 96,
      sellThroughRate: 0.42,
      daysOfSupply: 11.5,
      projectedStockoutDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      recommendedReorderQuantity: 120,
      metadata: { category: "Drinkware" },
      webhookEventId: webhookEvent.id,
    },
  });

  const ticket = await prisma.ticket.upsert({
    where: { id: "seed-ticket" },
    update: {
      storeId: store.id,
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      subject: "VIP order missing tracking",
      assignee: "support@seed-demo.test",
      customerEmail: "vip@example.com",
      customerName: "Alex Johnson",
      shopifyOrderId: "1001",
      tags: ["vip", "fulfillment"],
      metadata: { channel: "email" },
      lastMessageAt: now,
    },
    create: {
      id: "seed-ticket",
      storeId: store.id,
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      subject: "VIP order missing tracking",
      assignee: "support@seed-demo.test",
      customerEmail: "vip@example.com",
      customerName: "Alex Johnson",
      shopifyOrderId: "1001",
      tags: ["vip", "fulfillment"],
      metadata: { channel: "email" },
      lastMessageAt: now,
    },
  });

  const ticketMessage = await prisma.ticketMessage.upsert({
    where: { id: "seed-ticket-message" },
    update: {
      ticketId: ticket.id,
      bodyRichText: "<p>We're expediting this shipment and will send tracking shortly.</p>",
      bodyPlainText: "We're expediting this shipment and will send tracking shortly.",
      authorType: TicketAuthorType.STAFF,
      authorLabel: "Support Agent",
      isDraft: false,
      sentAt: now,
    },
    create: {
      id: "seed-ticket-message",
      ticketId: ticket.id,
      bodyRichText: "<p>We're expediting this shipment and will send tracking shortly.</p>",
      bodyPlainText: "We're expediting this shipment and will send tracking shortly.",
      authorType: TicketAuthorType.STAFF,
      authorLabel: "Support Agent",
      isDraft: false,
      sentAt: now,
    },
  });

  await prisma.aiDraft.upsert({
    where: { id: "seed-ai-draft" },
    update: {
      storeId: store.id,
      ticketMessageId: ticketMessage.id,
      modelKey: "gpt-4o-mini",
      modelVersion: "2025-02-15",
      content: "Hi Alex — thanks for your patience. We're expediting your order and will share tracking as soon as it's available.",
      approved: true,
      approvedAt: now,
      rewardScore: 0.92,
      feedback: { tone: "empathetic" },
    },
    create: {
      id: "seed-ai-draft",
      storeId: store.id,
      ticketMessageId: ticketMessage.id,
      modelKey: "gpt-4o-mini",
      modelVersion: "2025-02-15",
      content: "Hi Alex — thanks for your patience. We're expediting your order and will share tracking as soon as it's available.",
      approved: true,
      approvedAt: now,
      rewardScore: 0.92,
      feedback: { tone: "empathetic" },
    },
  });

  await prisma.seoInsight.upsert({
    where: { id: "seed-seo-insight" },
    update: {
      storeId: store.id,
      title: "Optimize winter landing page",
      description: "Improve hero copy for seasonal campaign and add structured data snippets.",
      severity: SeoInsightSeverity.HIGH,
      status: SeoInsightStatus.IN_PROGRESS,
      category: "Content",
      resourceUrl: "https://example.com/playbook/seo-winter",
      metadata: { lighthouseScore: 78 },
      dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: "seed-seo-insight",
      storeId: store.id,
      title: "Optimize winter landing page",
      description: "Improve hero copy for seasonal campaign and add structured data snippets.",
      severity: SeoInsightSeverity.HIGH,
      status: SeoInsightStatus.IN_PROGRESS,
      category: "Content",
      resourceUrl: "https://example.com/playbook/seo-winter",
      metadata: { lighthouseScore: 78 },
      dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const purchaseOrder = await prisma.purchaseOrder.upsert({
    where: { id: "seed-po" },
    update: {
      storeId: store.id,
      vendorName: "Acme Suppliers",
      status: PurchaseOrderStatus.SUBMITTED,
      expectedAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      metadata: { notes: "Rush replenishment for spring" },
    },
    create: {
      id: "seed-po",
      storeId: store.id,
      vendorName: "Acme Suppliers",
      status: PurchaseOrderStatus.SUBMITTED,
      expectedAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      metadata: { notes: "Rush replenishment for spring" },
    },
  });

  await prisma.purchaseOrderItem.upsert({
    where: { id: "seed-po-item" },
    update: {
      purchaseOrderId: purchaseOrder.id,
      sku: "SKU-RED-MUG",
      productTitle: "Signature Red Mug",
      quantity: 200,
      unitCost: 8.75,
    },
    create: {
      id: "seed-po-item",
      purchaseOrderId: purchaseOrder.id,
      sku: "SKU-RED-MUG",
      productTitle: "Signature Red Mug",
      quantity: 200,
      unitCost: 8.75,
    },
  });

  for (const event of seedPayload.connectionEvents) {
    await prisma.connectionEvent.upsert({
      where: { id: event.id },
      update: {
        storeId: store.id,
        integration: event.integration,
        status: event.status,
        message: event.message,
        metadata: event.metadata,
      },
      create: {
        id: event.id,
        storeId: store.id,
        integration: event.integration,
        status: event.status,
        message: event.message,
        metadata: event.metadata,
      },
    });
  }

  await prisma.session.updateMany({
    where: { shop: store.domain },
    data: { storeId: store.id },
  });
}

async function main() {
  await seedStore();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
