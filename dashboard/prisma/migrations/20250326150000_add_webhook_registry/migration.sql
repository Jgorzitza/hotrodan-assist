-- CreateTable
CREATE TABLE "public"."WebhookRegistry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "shopDomain" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "description" TEXT,
    "callbackUrl" TEXT,
    "result" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookRegistry_shopDomain_topicKey_key" ON "public"."WebhookRegistry"("shopDomain", "topicKey");

-- CreateIndex
CREATE INDEX "WebhookRegistry_storeId_idx" ON "public"."WebhookRegistry"("storeId");

-- AddForeignKey
ALTER TABLE "public"."WebhookRegistry" ADD CONSTRAINT "WebhookRegistry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
