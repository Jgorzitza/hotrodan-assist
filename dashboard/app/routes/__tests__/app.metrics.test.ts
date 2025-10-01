import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { inc, resetAll } from "~/lib/metrics/metrics.server";

const authenticateAdminMock = vi.fn();
vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: { admin: authenticateAdminMock },
}));

import { resetAll } from "~/lib/metrics/metrics.server";

describe("app.metrics route", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetAll();
    authenticateAdminMock.mockReset();
    authenticateAdminMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetAll();
    delete process.env.USE_MOCK_DATA;
  });

  it("returns prometheus counters in mock mode without auth", async () => {
    const { loader } = await import("../app.metrics");
    inc("test_counter", "example");

    const res = await loader({ request: new Request("http://localhost/app/metrics"), params: {}, context: {} as never });
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain("# TYPE test_counter counter");
  });

  it("exports counters for API hit metrics", async () => {
    process.env.USE_MOCK_DATA = "true";
    resetAll();

    const { loader: healthLoader } = await import("../api/mcp/health");
    const { loader: connectionsLoader } = await import("../api/settings/connections");
    const { loader: metricsLoader } = await import("../app.metrics");

    // invoke endpoints to increment counters
    await healthLoader({ request: new Request("http://localhost/api/mcp/health"), params: {}, context: {} as never });
    await connectionsLoader({ request: new Request("http://localhost/api/settings/connections?shop=demo-shop.myshopify.com"), params: {}, context: {} as never });

    const res = await metricsLoader({ request: new Request("http://localhost/app/metrics"), params: {}, context: {} as never });
    const text = await res.text();
    expect(text).toContain("api_mcp_health_hits_total");
    expect(text).toContain("api_settings_connections_hits_total");
  });
});
