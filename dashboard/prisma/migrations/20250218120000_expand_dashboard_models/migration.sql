-- CreateEnum
CREATE TYPE "public"."StoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISCONNECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."OrderFlagStatus" AS ENUM ('OPEN', 'SNOOZED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TicketAuthorType" AS ENUM ('CUSTOMER', 'STAFF', 'AUTOMATION', 'AI');

-- CreateEnum
CREATE TYPE "public"."SeoInsightSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."SeoInsightStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."IntegrationProvider" AS ENUM ('SHOPIFY', 'GA4', 'GSC', 'BING', 'MCP', 'KLAVIYO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ConnectionEventStatus" AS ENUM ('SUCCESS', 'FAILURE', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "public"."WebhookProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "public"."Session" ADD COLUMN     "storeId" TEXT;

-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "myShopifyDomain" TEXT,
    "name" TEXT,
    "planLevel" TEXT NOT NULL DEFAULT 'free',
    "status" "public"."StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "accessTokenCipher" TEXT NOT NULL,
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "scopeHash" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingNotes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "thresholds" JSONB,
    "featureFlags" JSONB,
    "connectionMetadata" JSONB,
    "lastRotationAt" TIMESTAMP(3),
    "lastInventorySyncAt" TIMESTAMP(3),
    "notificationEmails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KpiCache" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderFlag" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "status" "public"."OrderFlagStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "resolutionNotes" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "source" TEXT NOT NULL DEFAULT 'inbox',
    "assignee" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "shopifyOrderId" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "public"."TicketAuthorType" NOT NULL,
    "authorLabel" TEXT,
    "bodyRichText" TEXT NOT NULL,
    "bodyPlainText" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiDraft" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ticketMessageId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "modelVersion" TEXT,
    "content" TEXT NOT NULL,
    "diff" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "rewardScore" DOUBLE PRECISION,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeoInsight" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "public"."SeoInsightSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."SeoInsightStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "resourceUrl" TEXT,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductVelocity" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "variantId" TEXT,
    "productTitle" TEXT,
    "recordedFor" TIMESTAMP(3) NOT NULL,
    "averageDailySales" DOUBLE PRECISION NOT NULL,
    "velocityWindowDays" INTEGER NOT NULL DEFAULT 30,
    "currentInventory" INTEGER NOT NULL,
    "sellThroughRate" DOUBLE PRECISION,
    "daysOfSupply" DOUBLE PRECISION,
    "projectedStockoutDate" TIMESTAMP(3),
    "recommendedReorderQuantity" INTEGER,
    "metadata" JSONB,
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVelocity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceCode" TEXT,
    "expectedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productTitle" TEXT,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConnectionEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "integration" "public"."IntegrationProvider" NOT NULL,
    "status" "public"."ConnectionEventStatus" NOT NULL DEFAULT 'INFO',
    "correlationId" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "storeId" TEXT,
    "topic" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "status" "public"."WebhookProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_domain_key" ON "public"."Store"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Store_myShopifyDomain_key" ON "public"."Store"("myShopifyDomain");

-- CreateIndex
CREATE INDEX "Store_status_updatedAt_idx" ON "public"."Store"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSettings_storeId_key" ON "public"."StoreSettings"("storeId");

-- CreateIndex
CREATE INDEX "KpiCache_storeId_metricKey_refreshedAt_idx" ON "public"."KpiCache"("storeId", "metricKey", "refreshedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KpiCache_storeId_metricKey_rangeStart_rangeEnd_key" ON "public"."KpiCache"("storeId", "metricKey", "rangeStart", "rangeEnd");

-- CreateIndex
CREATE INDEX "OrderFlag_storeId_status_createdAt_idx" ON "public"."OrderFlag"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderFlag_storeId_shopifyOrderId_idx" ON "public"."OrderFlag"("storeId", "shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFlag_storeId_shopifyOrderId_flagType_key" ON "public"."OrderFlag"("storeId", "shopifyOrderId", "flagType");

-- CreateIndex
CREATE INDEX "Ticket_storeId_status_updatedAt_idx" ON "public"."Ticket"("storeId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Ticket_storeId_shopifyOrderId_idx" ON "public"."Ticket"("storeId", "shopifyOrderId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "public"."TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDraft_storeId_createdAt_idx" ON "public"."AiDraft"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDraft_ticketMessageId_idx" ON "public"."AiDraft"("ticketMessageId");

-- CreateIndex
CREATE INDEX "SeoInsight_storeId_status_severity_idx" ON "public"."SeoInsight"("storeId", "status", "severity");

-- CreateIndex
CREATE INDEX "SeoInsight_storeId_detectedAt_idx" ON "public"."SeoInsight"("storeId", "detectedAt");

-- CreateIndex
CREATE INDEX "ProductVelocity_storeId_recordedFor_idx" ON "public"."ProductVelocity"("storeId", "recordedFor");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVelocity_storeId_sku_recordedFor_key" ON "public"."ProductVelocity"("storeId", "sku", "recordedFor");

-- CreateIndex
CREATE INDEX "PurchaseOrder_storeId_status_updatedAt_idx" ON "public"."PurchaseOrder"("storeId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_storeId_vendorName_idx" ON "public"."PurchaseOrder"("storeId", "vendorName");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_sku_idx" ON "public"."PurchaseOrderItem"("purchaseOrderId", "sku");

-- CreateIndex
CREATE INDEX "ConnectionEvent_storeId_integration_createdAt_idx" ON "public"."ConnectionEvent"("storeId", "integration", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_webhookId_key" ON "public"."WebhookEvent"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookEvent_storeId_status_receivedAt_idx" ON "public"."WebhookEvent"("storeId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_topic_receivedAt_idx" ON "public"."WebhookEvent"("topic", "receivedAt");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "public"."Session"("shop");

-- CreateIndex
CREATE INDEX "Session_storeId_idx" ON "public"."Session"("storeId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoreSettings" ADD CONSTRAINT "StoreSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KpiCache" ADD CONSTRAINT "KpiCache_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderFlag" ADD CONSTRAINT "OrderFlag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderFlag" ADD CONSTRAINT "OrderFlag_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "public"."WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiDraft" ADD CONSTRAINT "AiDraft_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiDraft" ADD CONSTRAINT "AiDraft_ticketMessageId_fkey" FOREIGN KEY ("ticketMessageId") REFERENCES "public"."TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeoInsight" ADD CONSTRAINT "SeoInsight_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVelocity" ADD CONSTRAINT "ProductVelocity_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVelocity" ADD CONSTRAINT "ProductVelocity_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "public"."WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebhookEvent" ADD CONSTRAINT "WebhookEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

