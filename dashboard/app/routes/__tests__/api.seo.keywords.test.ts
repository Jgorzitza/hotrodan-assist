import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  default: {},
  authenticate: { admin: vi.fn(async () => ({ session: { shop: "seo-keywords.myshopify.com" } })) },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env.USE_MOCK_DATA;
});

describe("api.seo.keywords", () => {
  it("filters by intent and search query in mock mode", async () => {
    process.env.USE_MOCK_DATA = "true";
    const module = await import("../api/seo/keywords");

    const response = await module.loader({
      request: new Request("https://app.example.com/api/seo/keywords?mockState=base&intent=transactional&q=hot"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();
    expect(payload.scenario).toBe("base");
    expect(typeof payload.total).toBe("number");
    expect(Array.isArray(payload.rows)).toBe(true);
    if (payload.rows.length > 0) {
      expect(payload.rows[0].intent).toBe("transactional");
      expect(payload.rows[0].query.toLowerCase()).toContain("hot");
    }
  });
});