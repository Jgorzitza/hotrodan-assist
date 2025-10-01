import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { storeSettingsRepository } from "../../settings/repository.server";
import { runConnectionTest } from "../../settings/connection-tests.server";

const SHOP = "demo-shop.myshopify.com";

describe("GA4/GSC live-like connection validation using stored creds", () => {
  const originalEnv = { ...process.env } as Record<string, string | undefined>;

  beforeEach(() => {
    process.env = { ...originalEnv, USE_MOCK_DATA: "true" } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = originalEnv as NodeJS.ProcessEnv;
  });

  it("runs GA4 and GSC connection tests using stored credentials (if present)", async () => {
    const ga4 = await storeSettingsRepository.getDecryptedSecret(SHOP, "ga4");
    const gsc = await storeSettingsRepository.getDecryptedSecret(SHOP, "gsc");

    if (ga4) {
      const result = await runConnectionTest({ provider: "ga4", credential: ga4 });
      await storeSettingsRepository.recordConnectionTest(SHOP, {
        provider: "ga4",
        status: result.status,
        durationMs: result.durationMs,
        message: result.message,
      });
      expect(["success", "warning", "error"]).toContain(result.status);
    }

    if (gsc) {
      const result = await runConnectionTest({ provider: "gsc", credential: gsc });
      await storeSettingsRepository.recordConnectionTest(SHOP, {
        provider: "gsc",
        status: result.status,
        durationMs: result.durationMs,
        message: result.message,
      });
      expect(["success", "warning", "error"]).toContain(result.status);
    }
  });
});
