import { describe, it, expect, vi } from "vitest";
import { loader } from "../api/seo/health";

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: vi.fn(async () => ({ session: { shop: "demo-shop.myshopify.com" } })),
  },
}));

// Server-only loader smoke test for a specific shop domain
// Validates that the health loader returns a structured payload for the given shop

describe("api.seo.health loader (hotrodan.com)", () => {
  it("returns health results for GA4/GSC/Bing/MCP for hotrodan.com in mock-safe mode", async () => {
    // Ensure mock-friendly path that uses the ?shop param instead of requiring auth
    process.env.USE_MOCK_DATA = "true";

    const request = new Request("https://app.example.com/api/seo/health?shop=hotrodan.com");
    const res = await loader({ request, params: {}, context: {} as never });
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload).toBeTruthy();
    expect(payload).toHaveProperty("shopDomain");
    expect(payload).toHaveProperty("results");
    expect(payload.results).toHaveProperty("ga4");
    expect(payload.results).toHaveProperty("gsc");
    expect(payload.results).toHaveProperty("bing");
    expect(payload.results).toHaveProperty("mcp");
  });
});