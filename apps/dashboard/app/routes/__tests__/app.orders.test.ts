import type { ReactNode } from "react";
import type { Order } from "~/types/dashboard";
import { afterEach, describe, expect, it, vi } from "vitest";

const authenticateAdminMock = vi.fn(async () => ({ session: { shop: "test-shop" } }));

const importAppOrdersModule = () => import("../app.orders");
type AppOrdersModule = Awaited<ReturnType<typeof importAppOrdersModule>>;

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

let cachedModule: AppOrdersModule | null = null;

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

  cachedModule = await importAppOrdersModule();
  return cachedModule;
};

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof vi.unstubAllGlobals === "function") {
    vi.unstubAllGlobals();
  }
  delete process.env.USE_MOCK_DATA;
  delete process.env.SYNC_SERVICE_URL;
  delete process.env.SHOPIFY_APP_URL;
  delete process.env.SHOPIFY_API_KEY;
  delete process.env.SHOPIFY_API_SECRET;
});

describe("orders action (sync mode)", () => {
  it("falls back to mock data and keeps filters when sync fails", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "Sync unavailable",
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await module.loader({
      request: new Request("http://localhost/app/orders?channel=online&tag=vip"),
      params: {},
      context: {} as never,
    });

    expect(fetchMock).toHaveBeenCalledOnce();

    const payload = await response.json();
    expect(payload.dataset.state).toBe("warning");
    expect(payload.dataset.alerts[0]).toMatch(/Sync temporarily unavailable/i);
    const channels = payload.dataset.orders.items.map((order: Order) => order.channel);
    expect(channels.every((channel) => channel === "online")).toBe(true);
    const allHaveTag = payload.dataset.orders.items.every((order: Order) =>
      order.tags.map((tag: string) => tag.toLowerCase()).includes("vip"),
    );
    expect(allHaveTag).toBe(true);
  });

  it("posts assignment requests to sync service", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        toast: { status: "success", message: "ok" },
        updatedOrders: [{ id: "gid://shopify/Order/1", assignedTo: "ops" }],
      }),
      headers: new Headers({ "content-type": "application/json" }),
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
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.orderIds).toEqual(["gid://shopify/Order/1"]);
    expect(body.assignee).toBe("ops");
    expect(body.shop_domain).toBe("test-shop");
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("ok");
    expect(payload.toast).toEqual({ status: "success", message: "ok" });
    expect(payload.updatedOrders).toEqual([{ id: "gid://shopify/Order/1", assignedTo: "ops" }]);
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
    expect(payload.toast).toEqual({ status: "error", message: "Failed to assign orders via Sync." });
  });

  it("posts fulfillment requests with tracking metadata", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        toast: { status: "success", message: "fulfilled" },
        updatedOrders: [
          {
            id: "gid://shopify/Order/2",
            fulfillmentStatus: "fulfilled",
            tracking: { number: "1Z999", carrier: "UPS" },
          },
        ],
      }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new URLSearchParams();
    form.set("intent", "markFulfilled");
    form.set("orderIds", JSON.stringify(["gid://shopify/Order/2", "gid://shopify/Order/3"]));
    form.set(
      "tracking",
      JSON.stringify({
        number: "1Z999",
        carrier: "UPS",
      }),
    );

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
      "https://sync.test/sync/orders/fulfill",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Shop-Domain": "test-shop",
          Accept: "application/json",
        }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.orderIds).toEqual([
      "gid://shopify/Order/2",
      "gid://shopify/Order/3",
    ]);
    expect(body.tracking).toEqual({ number: "1Z999", carrier: "UPS" });
    expect(body.shop_domain).toBe("test-shop");

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("fulfilled");
    expect(payload.toast).toEqual({ status: "success", message: "fulfilled" });
    expect(payload.updatedOrders).toEqual([
      {
        id: "gid://shopify/Order/2",
        fulfillmentStatus: "fulfilled",
        tracking: { number: "1Z999", carrier: "UPS" },
      },
    ]);
  });

  it("requests support across multiple orders", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockImplementation(
      async (url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const isFirst = body.orderId === "gid://shopify/Order/4";
        return {
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return {
              success: true,
              message: isFirst ? "Escalated" : undefined,
              toast: isFirst ? { status: "success", message: "Escalated" } : undefined,
              updatedOrders: [
                {
                  id: body.orderId,
                  supportThread: body.conversationId ?? "conversation:auto",
                },
              ],
            };
          },
        } as Response;
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const supportPayload = {
      orderIds: ["gid://shopify/Order/4", "gid://shopify/Order/5"],
      conversationId: "conversation:c1",
      note: "Please follow up",
    };

    const form = new URLSearchParams();
    form.set("intent", "requestSupport");
    form.set("payload", JSON.stringify(supportPayload));

    const response = await module.action({
      request: new Request("http://localhost/app/orders", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      params: {},
      context: {} as never,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.test/sync/orders/support",
      expect.any(Object),
    );
    const [firstCall, secondCall] = fetchMock.mock.calls as Array<[
      string,
      RequestInit,
    ]>;
    expect(JSON.parse(firstCall[1].body as string).orderId).toBe("gid://shopify/Order/4");
    expect(JSON.parse(secondCall[1].body as string).orderId).toBe("gid://shopify/Order/5");

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Escalated");
    expect(payload.toast).toEqual({ status: "success", message: "Escalated" });
    expect(payload.updatedOrders).toEqual([
      { id: "gid://shopify/Order/4", supportThread: "conversation:c1" },
      { id: "gid://shopify/Order/5", supportThread: "conversation:c1" },
    ]);
  });

  it("updates returns through the sync service", async () => {
    const module = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        success: true,
        toast: { status: "success", message: "Return acknowledged" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = new URLSearchParams();
    form.set("intent", "updateReturn");
    form.set(
      "payload",
      JSON.stringify({
        orderId: "gid://shopify/Order/6",
        action: "approve_refund",
        note: "High priority",
      }),
    );

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
      "https://sync.test/sync/orders/returns",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.orderId).toBe("gid://shopify/Order/6");
    expect(body.action).toBe("approve_refund");
    expect(body.note).toBe("High priority");
    expect(body.shop_domain).toBe("test-shop");

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Return acknowledged");
    expect(payload.toast).toEqual({ status: "success", message: "Return acknowledged" });
    expect(payload.updatedOrders).toEqual([]);
  });
});
