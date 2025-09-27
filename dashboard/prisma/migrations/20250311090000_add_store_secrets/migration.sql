-- CreateEnum
CREATE TYPE "public"."SettingsSecretProvider" AS ENUM ('ga4', 'gsc', 'bing', 'mcp');

-- CreateTable
CREATE TABLE "public"."StoreSecret" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" "public"."SettingsSecretProvider" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "maskedValue" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "rotationReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreSecret_storeId_provider_key" ON "public"."StoreSecret"("storeId", "provider");

-- AddForeignKey
ALTER TABLE "public"."StoreSecret" ADD CONSTRAINT "StoreSecret_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
