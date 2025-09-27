import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOrdersFromSync } from "../sync.server";

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
    expect(dataset.orders).toHaveLength(1);
    expect(dataset.pageInfo.startCursor).toBe("ofs:0");
    expect(dataset.shipments.trackingPending).toHaveLength(1);
    expect(dataset.returns.pending[0].refundAmount.amount).toBe(45);
  });
});

