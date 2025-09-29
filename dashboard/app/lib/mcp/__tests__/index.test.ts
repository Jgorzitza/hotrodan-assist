import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getMcpClient, isMcpFeatureEnabled } from "../index";

const originalEnv = process.env;

describe("MCP environment helpers", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });
  const togglesOn = {

    enableMcpIntegration: true,
    enableBetaWorkflows: false,
    enableExperimentalWidgets: false,
    enableAssistantsProvider: false,
    useMockData: false,
    enableMcp: true,
    enableSeo: false,
    enableInventory: false,
  } as const;

  const togglesOff = {
    enableMcpIntegration: false,
    enableBetaWorkflows: false,
    enableExperimentalWidgets: false,
    enableAssistantsProvider: false,
    useMockData: false,
    enableMcp: false,
    enableSeo: false,
    enableInventory: false,
  } as const;

  it("should return mcp environment when enabled", () => {
    const client = getMcpClient(togglesOn);
    expect(client).toBeDefined();
    expect(typeof client.ping).toBe("function");
  });

  it("should return disabled environment when toggles are off", () => {
    const client = getMcpClient(togglesOff);
    expect(client).toBeDefined();
    expect(typeof client.ping).toBe("function");
  });

  it("should check if MCP is enabled correctly", () => {
    expect(isMcpFeatureEnabled(togglesOn)).toBe(true);
    expect(isMcpFeatureEnabled(togglesOff)).toBe(false);
  });

  it("should handle environment variables", () => {
    process.env.MCP_INTEGRATION_ENABLED = "true";
    const client = getMcpClient(togglesOn);
    expect(client).toBeDefined();
  });

  it("should respect feature toggles over environment", () => {
    process.env.MCP_INTEGRATION_ENABLED = "false";
    const client = getMcpClient(togglesOn);
    expect(client).toBeDefined();
  });
});
