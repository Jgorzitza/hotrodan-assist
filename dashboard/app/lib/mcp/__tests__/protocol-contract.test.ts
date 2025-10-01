import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMcpClient } from "..";
import { buildDefaultConnectorRegistry } from "../registry-integrations.server";

describe("MCP protocol & registry contract", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ENABLE_MCP: "true", USE_MOCK_DATA: "true" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("responds to ping in mock mode via client", async () => {
    const client = getMcpClient({ enableMcpIntegration: true, enableAssistantsProvider: false, enableBetaWorkflows: false, enableExperimentalWidgets: false });
    const ok = await client.ping();
    expect(ok).toBe(true);
  });

  it("builds default connector registry with required connectors", async () => {
    const registry = buildDefaultConnectorRegistry();
    const ids = registry.list().map((c) => c.meta.id);
    expect(ids.sort()).toEqual(["bing_wmt", "ga4", "gsc", "shopify", "zoho_mail"].sort());
  });

  it("performs health check using provided checker", async () => {
    const registry = buildDefaultConnectorRegistry();
    const result = await registry.healthCheck("gsc", async () => ({ status: "healthy", message: "ok" }));
    expect(result.health.status).toBe("healthy");
    expect(typeof result.health.lastCheckedAt).toBe("string");
  });
});