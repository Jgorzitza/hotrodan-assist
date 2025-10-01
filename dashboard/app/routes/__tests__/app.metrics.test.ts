import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { inc, resetAll } from "~/lib/metrics/metrics.server";

const authenticateAdminMock = vi.fn();
vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: { admin: authenticateAdminMock },
}));

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
});