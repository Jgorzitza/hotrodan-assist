import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authenticateAdminMock = vi.fn(async () => ({ session: { shop: "test-shop" } }));

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

let cachedModule: typeof import("../app.orders") | null = null;

const loadModule = async () => {
  process.env.USE_MOCK_DATA = "false";
  process.env.SYNC_SERVICE_URL = "https://sync.test";
  process.env.SHOPIFY_APP_URL = "https://example.com";
  process.env.SHOPIFY_API_KEY = "key";
  process.env.SHOPIFY_API_SECRET = "secret";

  if (cachedModule) return cachedModule;

  vi.doMock("d3-scale", () => ({}));
  vi.doMock("@shopify/polaris-viz", () => ({
    __esModule: true,
    PolarisVizProvider: ({ children }: { children: ReactNode }) => children,
  }));
  authenticateAdminMock.mockResolvedValue({ session: { shop: "test-shop" } });

  cachedModule = await import("../app.orders");
  return cachedModule;
};

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof vi.unstubAllGlobals === "function") {
    vi.unstubAllGlobals();
  }
  delete process.env.SYNC_SERVICE_URL;
  delete process.env.SHOPIFY_APP_URL;
  delete process.env.SHOPIFY_API_KEY;
  delete process.env.SHOPIFY_API_SECRET;
});

describe("orders action (sync mode)", () => {
  it("posts assignment requests to sync service", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new URLSearchParams();
    form.set("intent", "assign");
    form.set("orderIds", JSON.stringify(["gid://shopify/Order/1"]));
    form.set("assignee", "ops");

    const response = await module.action({
      request: new Request("http://localhost/app/orders", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      params: {},
      context: {} as never,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.test/sync/orders/assign",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Shop-Domain": "test-shop" }),
      }),
    );
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("ok");
  });

  it("surfaces sync errors when assignment fails", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "failure",
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new URLSearchParams();
    form.set("intent", "assign");
    form.set("orderIds", JSON.stringify(["gid://shopify/Order/1"]));
    form.set("assignee", "ops");

    const response = await module.action({
      request: new Request("http://localhost/app/orders", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();
    expect(response.status).toBe(502);
    expect(payload.success).toBe(false);
  });
});
