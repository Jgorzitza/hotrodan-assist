import {
  ConnectionEventStatus,
  IntegrationProvider,
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

import { encryptSecret, maskSecret } from "../app/lib/security/secrets.server.ts";
import { BASE_SHOP_DOMAIN, getMockSettings } from "../app/mocks/settings.ts";

const prisma = new PrismaClient();

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

async function seedStore() {
  const accessTokenCipher = encryptSecret("shpat_seed_123456789");

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
  const connectionMetadata = {
    connections: settings.connections,
    mcpOverrides: {
      endpoint: null,
      timeoutMs: null,
      maxRetries: null,
    },
  } as const;

  await prisma.storeSettings.upsert({
    where: { storeId: store.id },
    update: {
      thresholds: settings.thresholds,
      featureFlags: settings.toggles,
      connectionMetadata,
      notificationEmails: "ops@seed-demo.test",
      lastRotationAt: settings.secrets.ga4?.lastUpdatedAt
        ? new Date(settings.secrets.ga4.lastUpdatedAt)
        : now,
      lastInventorySyncAt: now,
    },
    create: {
      storeId: store.id,
      thresholds: settings.thresholds,
      featureFlags: settings.toggles,
      connectionMetadata,
      notificationEmails: "ops@seed-demo.test",
      lastRotationAt: settings.secrets.ga4?.lastUpdatedAt
        ? new Date(settings.secrets.ga4.lastUpdatedAt)
        : now,
      lastInventorySyncAt: now,
    },
  });

  const secretSeeds: Record<SettingsSecretProvider, string | null> = {
    [SettingsSecretProvider.ga4]: "mock-ga4-service-account-1234",
    [SettingsSecretProvider.gsc]: "mock-gsc-credentials-5678",
    [SettingsSecretProvider.bing]: null,
    [SettingsSecretProvider.mcp]: null,
  };

  await Promise.all(
    (Object.values(SettingsSecretProvider) as SettingsSecretProvider[]).map(
      async (provider) => {
        const plaintext = secretSeeds[provider];
        const metadata = settings.secrets[provider as keyof typeof settings.secrets];

        if (!plaintext) {
          await prisma.storeSecret.deleteMany({
            where: { storeId: store.id, provider },
          });
          return;
        }

        const ciphertext = encryptSecret(plaintext);
        const maskedValue = metadata?.maskedValue ?? maskSecret(plaintext);

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
            lastVerifiedAt: metadata?.lastVerifiedAt
              ? new Date(metadata.lastVerifiedAt)
              : null,
            rotationReminderAt: metadata?.rotationReminderAt
              ? new Date(metadata.rotationReminderAt)
              : null,
          },
          create: {
            storeId: store.id,
            provider,
            ciphertext,
            maskedValue,
            lastVerifiedAt: metadata?.lastVerifiedAt
              ? new Date(metadata.lastVerifiedAt)
              : null,
            rotationReminderAt: metadata?.rotationReminderAt
              ? new Date(metadata.rotationReminderAt)
              : null,
          },
        });
      },
    ),
  );

  await prisma.kpiCache.upsert({
    where: {
      storeId_metricKey_rangeStart_rangeEnd: {
        storeId: store.id,
        metricKey: "sales_overview",
        rangeStart: thirtyDaysAgo,
        rangeEnd: now,
      },
    },
    update: {
      payload: {
        totals: { revenue: 18250, orders: 312, returningCustomersRate: 0.34 },
        metrics: [
          { id: "aov", label: "Average order value", value: 168.23 },
          { id: "conversion", label: "Conversion rate", value: 2.7 },
          { id: "refundRate", label: "Refund rate", value: 1.8 },
        ],
      },
      refreshedAt: now,
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    },
    create: {
      storeId: store.id,
      metricKey: "sales_overview",
      rangeStart: thirtyDaysAgo,
      rangeEnd: now,
      payload: {
        totals: { revenue: 18250, orders: 312, returningCustomersRate: 0.34 },
        metrics: [
          { id: "aov", label: "Average order value", value: 168.23 },
          { id: "conversion", label: "Conversion rate", value: 2.7 },
          { id: "refundRate", label: "Refund rate", value: 1.8 },
        ],
      },
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
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

  await prisma.connectionEvent.upsert({
    where: { id: "seed-connection-ga4" },
    update: {
      storeId: store.id,
      integration: IntegrationProvider.GA4,
      status: ConnectionEventStatus.SUCCESS,
      message: "GA4 credentials verified",
      metadata: { latencyMs: 420 },
    },
    create: {
      id: "seed-connection-ga4",
      storeId: store.id,
      integration: IntegrationProvider.GA4,
      status: ConnectionEventStatus.SUCCESS,
      message: "GA4 credentials verified",
      metadata: { latencyMs: 420 },
    },
  });

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
