import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getMcpClientOverridesForShop } from "../config.server";
import { storeSettingsRepository } from "~/lib/settings/repository.server";
import { resetMockSettings } from "~/mocks/settings";

const SHOP_DOMAIN = "demo-shop.myshopify.com";

const resetOverrides = async () => {
  await storeSettingsRepository.updateMcpIntegrationOverrides(SHOP_DOMAIN, {
    endpoint: null,
    timeoutMs: null,
    maxRetries: null,
  });
  await storeSettingsRepository.updateSecret(SHOP_DOMAIN, {
    provider: "mcp",
    secret: null,
  });
};

describe("getMcpClientOverridesForShop", () => {
  beforeEach(async () => {
    resetMockSettings(SHOP_DOMAIN);
    await resetOverrides();
  });

  afterEach(async () => {
    await resetOverrides();
  });

  it("returns decrypted secrets and stored overrides", async () => {
    await storeSettingsRepository.updateSecret(SHOP_DOMAIN, {
      provider: "mcp",
      secret: "live-mcp-key",
    });

    await storeSettingsRepository.updateMcpIntegrationOverrides(SHOP_DOMAIN, {
      endpoint: "https://override-mcp.example.com",
      timeoutMs: 12_000,
      maxRetries: 4,
    });

    const overrides = await getMcpClientOverridesForShop(SHOP_DOMAIN);

    expect(overrides.apiKey).toBe("live-mcp-key");
    expect(overrides.endpoint).toBe("https://override-mcp.example.com");
    expect(overrides.timeoutMs).toBe(12_000);
    expect(overrides.maxRetries).toBe(4);
  });

  it("omits empty secrets and null overrides", async () => {
    const overrides = await getMcpClientOverridesForShop(SHOP_DOMAIN);

    expect(overrides.apiKey).toBeUndefined();
    expect(overrides.endpoint).toBeUndefined();
    expect(overrides.timeoutMs).toBeUndefined();
    expect(overrides.maxRetries).toBeUndefined();
  });
});
