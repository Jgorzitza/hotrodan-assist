import { describe, expect, it, vi } from "vitest";

import { createMcpClient } from "../client.server";
import {
  MOCK_INVENTORY_SIGNALS,
  MOCK_PRODUCT_RECOMMENDATIONS,
  MOCK_RESPONSE_META,
  MOCK_SEO_OPPORTUNITIES,
} from "../mocks";
import { McpResourceType, type McpResponse, type ProductRecommendation } from "../types";

describe("McpClient", () => {
  const baseContext = {
    shopDomain: "demo-shop.myshopify.com",
    params: { limit: 3 },
  };

  it("returns mock data when useMocks is true", async () => {
    const client = createMcpClient({ useMocks: true });

    const recommendations = await client.getProductRecommendations({
      ...baseContext,
      resource: McpResourceType.ProductRecommendation,
    });
    const inventory = await client.getInventorySignals({
      ...baseContext,
      resource: McpResourceType.InventorySignal,
    });
    const seo = await client.getSeoOpportunities({
      ...baseContext,
      resource: McpResourceType.SeoOpportunity,
    });

    expect(recommendations.data).toEqual(MOCK_PRODUCT_RECOMMENDATIONS);
    expect(inventory.data).toEqual(MOCK_INVENTORY_SIGNALS);
    expect(seo.data).toEqual(MOCK_SEO_OPPORTUNITIES);
    expect(recommendations.confidence).toBe(MOCK_RESPONSE_META.confidence);
  });

  it("delegates to fetch when mocks disabled", async () => {
    const payload: McpResponse<ProductRecommendation[]> = {
      data: [
        { sku: "test", title: "Test", rationale: "", supportingMetrics: [] },
      ],
      generatedAt: "2024-02-05T00:00:00.000Z",
      source: "test-double",
      confidence: 0.95,
    };

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createMcpClient({
      useMocks: false,
      endpoint: "https://mcp.example.com",
      fetchFn,
    });

    const result = await client.getProductRecommendations({
      ...baseContext,
      resource: McpResourceType.ProductRecommendation,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "https://mcp.example.com/recommendations",
    );
    const requestInit = fetchFn.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe("POST");
    expect(result).toEqual(payload);
  });

  it("falls back to mocks when fetch fails", async () => {
    const onError = vi.fn();
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));

    const client = createMcpClient({
      useMocks: false,
      endpoint: "https://mcp.example.com",
      fetchFn,
      telemetry: { onError },
    });

    const result = await client.getSeoOpportunities({
      ...baseContext,
      resource: McpResourceType.SeoOpportunity,
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result.data).toEqual(MOCK_SEO_OPPORTUNITIES);
    expect(onError).toHaveBeenCalled();
  });
});
