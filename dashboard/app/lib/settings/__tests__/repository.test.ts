import { beforeEach, describe, expect, it } from "vitest";

import { storeSettingsRepository } from "~/lib/settings/repository.server";
import { resetMockSettings } from "~/mocks/settings";

const SHOP = "unit-test-shop.myshopify.com";

beforeEach(() => {
  resetMockSettings(SHOP);
});

describe("StoreSettingsRepository", () => {
  it("updates threshold values", async () => {
    const updated = await storeSettingsRepository.updateThresholds(SHOP, {
      lowStockMinimum: 12,
      overdueOrderHours: 24,
      overstockPercentage: 45,
    });

    expect(updated.thresholds.lowStockMinimum).toBe(12);
    expect(updated.thresholds.overdueOrderHours).toBe(24);
    expect(updated.thresholds.overstockPercentage).toBe(45);

    const fetched = await storeSettingsRepository.getSettings(SHOP);
    expect(fetched.thresholds.lowStockMinimum).toBe(12);
  });

  it("encrypts and masks newly persisted secrets", async () => {
    const result = await storeSettingsRepository.updateSecret(SHOP, {
      provider: "bing",
      secret: "bing-key-7890",
      rotationReminderAt: "2024-05-01T00:00:00.000Z",
    });

    const metadata = result.secrets.bing;
    expect(metadata).toBeTruthy();
    expect(metadata?.maskedValue).toMatch(/^••••7890$/);
    expect(metadata?.rotationReminderAt).toBe("2024-05-01T00:00:00.000Z");
    expect(metadata?.lastUpdatedAt).toBeTruthy();

    const decrypted = await storeSettingsRepository.getDecryptedSecret(
      SHOP,
      "bing",
    );
    expect(decrypted).toBe("bing-key-7890");
  });

  it("removes secrets and clears metadata", async () => {
    await storeSettingsRepository.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-new-secret",
    });

    const cleared = await storeSettingsRepository.updateSecret(SHOP, {
      provider: "ga4",
      secret: null,
    });

    expect(cleared.secrets.ga4).toBeNull();
    const decrypted = await storeSettingsRepository.getDecryptedSecret(
      SHOP,
      "ga4",
    );
    expect(decrypted).toBeNull();
  });

  it("records connection attempts with capped history", async () => {
    const updated = await storeSettingsRepository.recordConnectionTest(SHOP, {
      provider: "gsc",
      status: "warning",
      durationMs: 1500,
      message: "Slow response",
    });

    const history = updated.connections.gsc.history;
    expect(history[0]?.status).toBe("warning");
    expect(history[0]?.durationMs).toBe(1500);
    expect(history[0]?.message).toBe("Slow response");
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it("updates rotation reminder while preserving existing secret", async () => {
    await storeSettingsRepository.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-initial-secret",
    });

    const existingSecret = await storeSettingsRepository.getDecryptedSecret(
      SHOP,
      "ga4",
    );

    expect(existingSecret).toBeTruthy();

    const updated = await storeSettingsRepository.updateSecret(SHOP, {
      provider: "ga4",
      secret: existingSecret!,
      rotationReminderAt: "2024-06-15T00:00:00.000Z",
    });

    const meta = updated.secrets.ga4;
    expect(meta).toBeTruthy();
    expect(meta?.rotationReminderAt).toBe("2024-06-15T00:00:00.000Z");
    expect(meta?.maskedValue.startsWith("••••")).toBe(true);
  });
});
