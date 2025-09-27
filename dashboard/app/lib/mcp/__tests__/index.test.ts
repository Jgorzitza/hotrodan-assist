import { afterEach, describe, expect, it } from "vitest";

import {
  getMcpClient,
  isMcpFeatureEnabled,
  resolveMcpConfigFromEnv,
  shouldUseMcpMocks,
} from "..";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MCP environment helpers", () => {
  const togglesOn = {
    enableMcpIntegration: true,
    enableBetaWorkflows: false,
    enableExperimentalWidgets: false,
  } as const;

  const togglesOff = {
    enableMcpIntegration: false,
    enableBetaWorkflows: false,
    enableExperimentalWidgets: false,
  } as const;

  it("treats feature as disabled when env flag is false", () => {
    process.env.ENABLE_MCP = "false";
    expect(isMcpFeatureEnabled(togglesOn)).toBe(false);
  });

  it("requires settings toggle to be enabled", () => {
    process.env.ENABLE_MCP = "true";
    expect(isMcpFeatureEnabled(togglesOff)).toBe(false);
  });

  it("returns true when both env and toggle enabled", () => {
    process.env.ENABLE_MCP = "true";
    expect(isMcpFeatureEnabled(togglesOn)).toBe(true);
  });

  it("prefers mocks when USE_MOCK_DATA is true", () => {
    process.env.USE_MOCK_DATA = "true";
    process.env.ENABLE_MCP = "true";
    expect(shouldUseMcpMocks(togglesOn)).toBe(true);
  });

  it("uses live client when mocks disabled and feature enabled", () => {
    process.env.USE_MOCK_DATA = "false";
    process.env.ENABLE_MCP = "true";
    process.env.MCP_API_URL = "https://mcp.example.com";

    expect(shouldUseMcpMocks(togglesOn)).toBe(false);

    const client = getMcpClient(togglesOn);
    expect(typeof client.getProductRecommendations).toBe("function");
  });

  it("parses numeric config from env", () => {
    process.env.MCP_TIMEOUT_MS = "8000";
    process.env.MCP_MAX_RETRIES = "5";
    const config = resolveMcpConfigFromEnv();
    expect(config.timeoutMs).toBe(8000);
    expect(config.maxRetries).toBe(5);
  });
});
