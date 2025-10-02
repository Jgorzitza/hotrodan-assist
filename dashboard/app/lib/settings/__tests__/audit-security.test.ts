import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storeSettingsRepository } from "../../settings/repository.server";
import { listAuditEvents, resetAuditEvents } from "../../security/audit.server";

const SHOP = "demo-shop.myshopify.com";

describe("Audit & secret security", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, USE_MOCK_DATA: "true" };
    resetAuditEvents();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetAuditEvents();
  });

  it("records masked audit when updating MCP secret (no plaintext)", async () => {
    const secret = "super-secret-key";
    await storeSettingsRepository.updateSecret(SHOP, { provider: "mcp", secret });

    const events = listAuditEvents();
    expect(events.length).toBeGreaterThan(0);
    const evt = events.find((e) => e.action === "update_secret" && e.resource === "mcp");
    expect(evt).toBeDefined();
    const masked = (evt!.details as any)?.masked as string | null;
    expect(masked).toBeTruthy();
    expect(masked).not.toMatch(/super-secret-key/);
    expect(masked).not.toMatch(/[A-Za-z0-9]{4,}/);
    expect(masked).not.toContain("super-secret-key");
  });

  it("rejects invalid MCP secrets", async () => {
    await expect(
      storeSettingsRepository.updateSecret(SHOP, { provider: "mcp", secret: "short" }),
    ).rejects.toThrow();
    await expect(
      storeSettingsRepository.updateSecret(SHOP, { provider: "mcp", secret: "bad key" }),
    ).rejects.toThrow();
  });

  it("audits override updates", async () => {
    const overrides = await storeSettingsRepository.updateMcpIntegrationOverrides(SHOP, {
      endpoint: "https://mcp.example.com",
      timeoutMs: 8000,
      maxRetries: 3,
    });
    expect(overrides.endpoint).toBe("https://mcp.example.com");
    const events = listAuditEvents();
    const evt = events.find((e) => e.action === "update_mcp_overrides");
    expect(evt).toBeDefined();
  });
});