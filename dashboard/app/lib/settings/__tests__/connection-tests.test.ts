import { afterEach, describe, expect, it } from "vitest";

import { runConnectionTest } from "../connection-tests.server";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("runConnectionTest", () => {
  it("returns success for GA4 when conversions are recorded", async () => {
    const result = await runConnectionTest({
      provider: "ga4",
      credential: "mock-property",
    });

    expect(result.status).toBe("success");
    expect(result.durationMs).toBe(360);
    expect(result.message).toContain("GA4 responded with");
  });

  it("surfaces warnings for GSC when critical issues exist", async () => {
    const result = await runConnectionTest({
      provider: "gsc",
      credential: "https://demo-shop.myshopify.com",
    });

    expect(result.status).toBe("warning");
    expect(result.durationMs).toBe(920);
    expect(result.message).toContain("critical issue");
  });

  it("returns success for Bing when metrics are available", async () => {
    const result = await runConnectionTest({
      provider: "bing",
      credential: "https://demo-shop.myshopify.com",
    });

    expect(result.status).toBe("success");
    expect(result.durationMs).toBe(480);
    expect(result.message).toContain("Bing returned");
  });

  it("returns warning for MCP when running in mock mode", async () => {
    delete process.env.MCP_API_URL;

    const result = await runConnectionTest({
      provider: "mcp",
      credential: "mock-mcp-api-key",
    });

    expect(result.status).toBe("warning");
    expect(result.durationMs).toBe(250);
    expect(result.message).toContain("mock mode");
  });
});
