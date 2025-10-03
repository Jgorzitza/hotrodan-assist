import { describe, it, expect, beforeAll } from "vitest";

import { storeSettingsRepository } from "~/lib/settings/repository.server";
import { runConnectionTest } from "~/lib/settings/connection-tests.server";
import type prismaClient from "~/db.server";

let prisma: typeof prismaClient;

const SHOP_DOMAIN = "hotrodan.com";

async function ensureStore(shopDomain: string) {
  const existing = await prisma.store.findFirst({
    where: { OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }] },
    include: { settings: true, secrets: true },
  });
  if (existing) return existing.id as string;

  const created = await prisma.store.create({
    data: {
      domain: shopDomain,
      myShopifyDomain: shopDomain,
    },
    select: { id: true },
  });
  return created.id as string;
}

describe("hotrodan.com live connections", () => {
  beforeAll(async () => {
    // Ensure Prisma sees DATABASE_URL before prisma client import
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "file:./dev.db";
    }
    process.env.USE_MOCK_DATA = "false"; // force Prisma-backed settings repo
    // Dynamically import prisma after env is set
    prisma = (await import("~/db.server")).default;
    await ensureStore(SHOP_DOMAIN);
  });

  it("records GA4 and GSC connection tests and updates settings summaries", async () => {
    // Fetch stored secrets if present
    const ga4Secret = await storeSettingsRepository.getDecryptedSecret(
      SHOP_DOMAIN,
      "ga4",
    );
    const gscSecret = await storeSettingsRepository.getDecryptedSecret(
      SHOP_DOMAIN,
      "gsc",
    );

    // Build credentials (fallbacks are safe placeholders used by mock adapters)
    const ga4Credential = ga4Secret && ga4Secret.length > 0 ? ga4Secret : SHOP_DOMAIN;
    const gscCredential = gscSecret && gscSecret.length > 0 ? gscSecret : `https://${SHOP_DOMAIN}`;

    // Run tests (mock-backed adapters produce deterministic summaries)
    const ga4Result = await runConnectionTest({ provider: "ga4", credential: ga4Credential });
    const gscResult = await runConnectionTest({ provider: "gsc", credential: gscCredential });

    // Record results in settings history
    await storeSettingsRepository.recordConnectionTest(SHOP_DOMAIN, {
      provider: "ga4",
      status: ga4Result.status,
      durationMs: ga4Result.durationMs,
      message: ga4Result.message,
    });
    await storeSettingsRepository.recordConnectionTest(SHOP_DOMAIN, {
      provider: "gsc",
      status: gscResult.status,
      durationMs: gscResult.durationMs,
      message: gscResult.message,
    });

    const settings = await storeSettingsRepository.getSettings(SHOP_DOMAIN);
    expect(settings.connections.ga4.lastCheckedAt).toBeTruthy();
    expect(settings.connections.gsc.lastCheckedAt).toBeTruthy();
  });
});