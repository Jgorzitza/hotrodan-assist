import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  default: {},
  authenticate: {
    admin: vi.fn(async () => ({ session: { shop: "seo-report.myshopify.com" } })),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env.USE_MOCK_DATA;
});

describe("api.seo.report", () => {
  it("returns consolidated SEO report in mock mode", async () => {
    process.env.USE_MOCK_DATA = "true";
    const module = await import("../api/seo/report");

    const response = await module.loader({
      request: new Request("https://app.example.com/api/seo/report?mockState=base"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();
    expect(payload.scenario).toBe("base");
    expect(payload.scorecard).toBeDefined();
    expect(typeof payload.insightCount).toBe("number");
    expect(typeof payload.keywordCount).toBe("number");
    expect(typeof payload.pageCount).toBe("number");
    expect(typeof payload.actionCount).toBe("number");
    expect(typeof payload.trafficCount).toBe("number");
    expect(payload.mcp).toHaveProperty("usingMocks");
}, 15000);
});
