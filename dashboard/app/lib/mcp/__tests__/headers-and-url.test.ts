import { describe, expect, it } from "vitest";
import { createMcpClient } from "../client.server";
import { McpResourceType } from "../types";

const baseContext = {
  shopDomain: "unit-shop.myshopify.com",
  params: {},
};

describe("McpClient headers and URL formatting", () => {
  it("adds version and feature headers and normalizes paths", async () => {
    const calls: any[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ data: [], generatedAt: "", source: "", confidence: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const client = createMcpClient({
      endpoint: "https://api.example.com/",
      useMocks: false,
      fetchFn,
      rateLimitRps: 5,
      breaker: { failureThreshold: 2, cooldownMs: 1000, halfOpenMax: 1 },
      cacheTtlMs: 1000,
      cacheSize: 10,
    });

    await client.getProductRecommendations({ ...baseContext, resource: McpResourceType.ProductRecommendation });

    expect(calls.length).toBe(1);
    const { url, init } = calls[0]!;
    expect(url).toBe("https://api.example.com/recommendations");
    const headers = init!.headers as Record<string, string>;
    expect(headers["X-MCP-Client-Version"]).toBeDefined();
    expect(headers["X-MCP-Features"]).toMatch(/breaker/);
  });
});