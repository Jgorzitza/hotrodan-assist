import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getMcpConnectorStatus, listConnectors } from "../connectors.server";

const originalEnv = process.env;

describe("MCP connectors", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, USE_MOCK_DATA: "true" };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("lists MCP connector and returns status via ping", async () => {
    const status = await getMcpConnectorStatus("demo-shop.myshopify.com");
    expect(status.key).toBe("mcp");
    expect(["success", "error"]).toContain(status.status);
    const all = await listConnectors("demo-shop.myshopify.com");
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]?.key).toBe("mcp");
  });
});