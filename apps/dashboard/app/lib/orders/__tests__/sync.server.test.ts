import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOrdersFromSync, postOrdersSyncAction } from "../sync.server";
import type {
  SyncOrdersAssignResponse,
  SyncOrdersReturnsResponse,
  SyncOrdersSupportResponse,
} from "~/types/orders-sync";

const mockPayload = {
  period: { label: "Last 7 days", start: "2025-09-20T00:00:00Z", end: "2025-09-27T00:00:00Z" },
  metrics: {
    total_orders: 2,
    awaiting_fulfillment: 1,
    awaiting_tracking: 1,
    overdue: 0,
    overdue_pct: 0,
    avg_fulfillment_hours: 10,
    breaches: 0,
  },
  orders: {
    items: [
      {
        id: "gid://shopify/Order/1",
        order_number: "#1001",
        placed_at: "2025-09-26T12:00:00Z",
        ship_by: "2025-09-28T12:00:00Z",
        status: "awaiting_fulfillment",
        priority: "vip",
        value_usd: 220,
        issue: "inventory",
        assigned_to: "assistant",
        age_hours: 6,
        support_thread: "conversation:abc",
        timeline: [
          { ts: "2025-09-26T12:00:00Z", event: "payment_captured", details: "Payment captured" },
        ],
      },
    ],
    page_info: {
      startCursor: "ofs:0",
      endCursor: "ofs:0",
      nextCursor: null,
      previousCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      shopifyCursor: "c3RhcnQ=",
    },
  },
  shipments: {
    tracking_pending: [
      {
        order_number: "#1001",
        expected_ship_date: "2025-09-27T12:00:00Z",
        owner: "assistant",
      },
    ],
    delayed: [],
    delivered_today: 0,
  },
  returns: {
    pending: [
      {
        order_number: "#1001",
        stage: "inspection",
        reason: "damaged",
        age_days: 1,
        refund_amount: 45,
      },
    ],
    refunds_due: 1,
    refund_value_usd: 45,
  },
  inventory_blocks: [
    { sku: "AN8-KIT", name: "AN-8 Hose Kit", orders_waiting: 3, on_hand: 0, eta: "2025-09-29T00:00:00Z" },
  ],
  alerts: ["Tracking sync skipped"],
  data_gaps: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof vi.unstubAllGlobals === "function") {
    vi.unstubAllGlobals();
  }
});

describe("fetchOrdersFromSync", () => {
  it("maps sync response into OrdersDataset", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const dataset = await fetchOrdersFromSync({
      baseUrl: "https://sync.test",
      shopDomain: "test-shop",
      search: {
        tab: "all",
        pageSize: 12,
        cursor: null,
        direction: "after",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.test/sync/orders?tab=all&pageSize=12",
      expect.objectContaining({ headers: { "X-Shop-Domain": "test-shop" } }),
    );
    expect(dataset.orders.items).toHaveLength(1);
    expect(dataset.orders.count).toBe(2);
    expect(dataset.orders.pageInfo.startCursor).toBe("ofs:0");
    expect(dataset.shipments.trackingPending).toHaveLength(1);
    expect(dataset.shipments.trackingPending[0]?.orderId).toBe("gid://shopify/Order/1");
    expect(dataset.shipments.trackingPending[0]?.owner).toBe("assistant");
    expect(dataset.returns.pending[0].refundAmount.amount).toBe(45);
    expect(dataset.returns.pending[0].orderId).toBe("gid://shopify/Order/1");
    expect(dataset.returns.pending[0].orderNumber).toBe("#1001");
  });

  it("hydrates shipment and return order IDs from numeric references", async () => {
    const payload = JSON.parse(JSON.stringify(mockPayload));
    payload.shipments.tracking_pending = [];
    payload.shipments.delayed = [
      {
        order_id: "1",
        order_number: "1001",
        carrier: "UPS",
        delay_hours: 26,
        last_update: "2025-09-27T09:00:00Z",
      },
    ];
    payload.returns.pending = [
      {
        order_number: "1001",
        stage: "inspection",
        reason: "damaged",
        age_days: 1,
        refund_amount: 45,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const dataset = await fetchOrdersFromSync({
      baseUrl: "https://sync.test",
      shopDomain: "test-shop",
      search: {
        tab: "all",
        pageSize: 12,
        cursor: null,
        direction: "after",
      },
    });

    expect(dataset.shipments.delayed[0]?.orderId).toBe("gid://shopify/Order/1");
    expect(dataset.shipments.delayed[0]?.orderNumber).toBe("#1001");
    expect(dataset.returns.pending[0]?.orderId).toBe("gid://shopify/Order/1");
    expect(dataset.returns.pending[0]?.orderNumber).toBe("#1001");
  });
});

describe("postOrdersSyncAction", () => {
  it("posts payload with shop domain and parses JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        success: true,
        toast: { status: "success", message: "Assigned" },
        updatedOrders: [{ id: "gid://shopify/Order/1" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postOrdersSyncAction({
      baseUrl: "https://sync.test",
      path: "/sync/orders/assign",
      payload: { orderIds: ["gid://shopify/Order/1"], assignee: "assistant" },
      shopDomain: "test-shop",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.test/sync/orders/assign",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Shop-Domain": "test-shop",
        }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      orderIds: ["gid://shopify/Order/1"],
      assignee: "assistant",
      shop_domain: "test-shop",
    });
    expect(result).toEqual({
      success: true,
      toast: { status: "success", message: "Assigned" },
      updatedOrders: [{ id: "gid://shopify/Order/1" }],
    });
  });

  it("applies transformPayload before sending request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await postOrdersSyncAction({
      baseUrl: "https://sync.test",
      path: "/sync/orders/support",
      payload: { orderId: "gid://shopify/Order/2" },
      transformPayload: (input) => ({ ...input, note: "Escalate" }),
    });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      orderId: "gid://shopify/Order/2",
      note: "Escalate",
    });
  });

  it("returns empty result when response lacks JSON content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      headers: new Headers({ "content-type": "text/plain" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postOrdersSyncAction({
      baseUrl: "https://sync.test",
      path: "/sync/orders/returns",
      payload: { orderId: "gid://shopify/Order/3", action: "approve_refund" },
    });

    expect(result).toEqual({});
  });

  it("throws an error when Sync responds with non-2xx status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "Internal failure",
      headers: new Headers({ "content-type": "text/plain" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postOrdersSyncAction({
        baseUrl: "https://sync.test",
        path: "/sync/orders/assign",
        payload: { orderIds: [], assignee: "assistant" },
      }),
    ).rejects.toThrow(/Sync orders action failed/);
  });
});
