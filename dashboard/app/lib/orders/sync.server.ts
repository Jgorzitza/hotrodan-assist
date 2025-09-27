import type {
  CurrencyCode,
  InventoryHold,
  Money,
  Order,
  OrdersDataset,
  OrdersMetrics,
  ReturnEntry,
  ReturnsPanel,
  ShipmentsPanel,
} from "~/types/dashboard";

export type FetchOrdersFromSyncParams = {
  baseUrl?: string;
  shopDomain?: string | null;
  signal?: AbortSignal;
  search: {
    tab: OrdersDataset["tab"];
    pageSize: number;
    cursor: string | null;
    direction: "after" | "before";
    status?: string;
    priority?: string;
    assigned_to?: string;
    date_start?: string;
    date_end?: string;
  };
};

type SyncOrdersResponse = {
  period: OrdersDataset["period"];
  metrics: {
    total_orders: number;
    awaiting_fulfillment: number;
    awaiting_tracking: number;
    overdue: number;
    overdue_pct: number;
    avg_fulfillment_hours: number;
    breaches: number;
  };
  orders: {
    items: SyncOrderItem[];
    page_info: SyncPageInfo;
  };
  shipments: SyncShipments;
  returns: SyncReturns;
  inventory_blocks: SyncInventoryBlock[];
  alerts: string[];
  data_gaps: string[];
};

type SyncOrderItem = {
  id: string;
  order_number: string;
  placed_at: string;
  ship_by?: string | null;
  status?: string | null;
  priority?: string | null;
  value_usd?: number | null;
  issue?: string | null;
  assigned_to?: string | null;
  age_hours?: number | null;
  support_thread?: string | null;
  timeline?: Array<{ ts: string; event: string; details?: string | null }>;
};

type SyncPageInfo = {
  startCursor: string | null;
  endCursor: string | null;
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  shopifyCursor?: string | null;
};

type SyncShipments = {
  tracking_pending?: Array<{
    order_number: string;
    expected_ship_date?: string | null;
    owner?: string | null;
  }>;
  delayed?: Array<{
    order_number: string;
    carrier?: string | null;
    delay_hours?: number | null;
    last_update?: string | null;
  }>;
  delivered_today?: number;
};

type SyncReturns = {
  pending?: Array<{
    order_number: string;
    stage: string;
    state?: string;
    reason?: string | null;
    age_days?: number | null;
    refund_amount?: number | null;
  }>;
  refunds_due?: number;
  refund_value_usd?: number;
};

type SyncInventoryBlock = {
  sku: string;
  name: string;
  orders_waiting: number;
  on_hand: number;
  eta?: string | null;
};

const DEFAULT_CURRENCY: CurrencyCode = "USD";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toMoney = (amount: number | null | undefined, currency: CurrencyCode = DEFAULT_CURRENCY): Money => {
  const safeAmount = Number.isFinite(amount) ? Number(amount) : 0;
  return {
    amount: safeAmount,
    currency,
    formatted: moneyFormatter.format(safeAmount),
  };
};

const resolveStatus = (status?: string | null): Order["status"] => {
  switch (status) {
    case "fulfilled":
    case "closed":
      return "fulfilled";
    case "refunded":
      return "refunded";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "paid":
      return "paid";
    default:
      return "processing";
  }
};

const resolveFulfillmentStatus = (status?: string | null): Order["fulfillmentStatus"] => {
  switch (status) {
    case "fulfilled":
      return "fulfilled";
    case "awaiting_tracking":
    case "in_transit":
      return "partial";
    default:
      return "unfulfilled";
  }
};

const resolveIssue = (issue?: string | null): Order["issue"] => {
  if (!issue) return "none";
  if (
    issue === "inventory" ||
    issue === "payment" ||
    issue === "address" ||
    issue === "carrier" ||
    issue === "manual_check"
  ) {
    return issue;
  }
  return "manual_check";
};

const resolveTimelineType = (event: string): Order["timeline"][number]["type"] => {
  if (event.startsWith("payment")) return "payment";
  if (event.startsWith("fulfillment")) return "fulfillment";
  if (event.includes("support")) return "note";
  return "status";
};

const mapOrders = (items: SyncOrderItem[]): Order[] =>
  items.map((item, index) => {
    const total = toMoney(item.value_usd ?? 0);
    return {
      id: item.id ?? `order-${index}`,
      name: item.order_number ?? `#${1000 + index}`,
      status: resolveStatus(item.status),
      paymentStatus: "paid",
      fulfillmentStatus: resolveFulfillmentStatus(item.status),
      placedAt: item.placed_at ?? new Date().toISOString(),
      fulfillmentDueAt: item.ship_by ?? undefined,
      shipBy: item.ship_by ?? undefined,
      ageHours: Number.isFinite(item.age_hours) ? Number(item.age_hours) : 0,
      priority: (item.priority as Order["priority"]) ?? "standard",
      issue: resolveIssue(item.issue),
      assignedTo: item.assigned_to ?? "unassigned",
      channel: "online",
      total,
      subtotal: total,
      shipping: toMoney(0),
      customer: {
        id: `${item.order_number ?? index}-customer`,
        name: `Customer ${item.order_number ?? index}`,
        email: "",
        firstOrderAt: item.placed_at ?? new Date().toISOString(),
        lastOrderAt: item.placed_at ?? new Date().toISOString(),
        location: "",
        lifetimeValue: total,
      },
      lineItems: [
        {
          id: `${item.id ?? index}-line-0`,
          title: "Order item",
          sku: "",
          quantity: 1,
          price: total,
          total,
        },
      ],
      tags: [],
      timeline: (item.timeline ?? []).map((entry, timelineIndex) => ({
        id: `${item.id ?? index}-timeline-${timelineIndex}`,
        type: resolveTimelineType(entry.event ?? "status"),
        message: entry.details ?? entry.event ?? "",
        occurredAt: entry.ts,
      })),
      supportThread: item.support_thread ?? undefined,
    };
  });

const mapMetrics = (metrics: SyncOrdersResponse["metrics"]): OrdersMetrics => ({
  totalOrders: metrics.total_orders,
  awaitingFulfillment: metrics.awaiting_fulfillment,
  awaitingTracking: metrics.awaiting_tracking,
  overdue: metrics.overdue,
  overduePercentage: metrics.overdue_pct,
  averageFulfillmentHours: metrics.avg_fulfillment_hours,
  slaBreaches: metrics.breaches,
});

const mapShipments = (shipments: SyncShipments): ShipmentsPanel => ({
  trackingPending: (shipments.tracking_pending ?? []).map((entry, index) => ({
    id: `${entry.order_number ?? index}-tracking`,
    orderNumber: entry.order_number ?? "",
    expectedShipDate: entry.expected_ship_date ?? undefined,
    owner: (entry.owner as Order["assignedTo"]) ?? "assistant",
  })),
  delayed: (shipments.delayed ?? []).map((entry, index) => ({
    id: `${entry.order_number ?? index}-delay`,
    orderNumber: entry.order_number ?? "",
    carrier: entry.carrier ?? "",
    delayHours: Number.isFinite(entry.delay_hours) ? Number(entry.delay_hours) : 0,
    lastUpdate: entry.last_update ?? new Date().toISOString(),
  })),
  deliveredToday: shipments.delivered_today ?? 0,
});

const mapReturns = (returns: SyncReturns): ReturnsPanel => ({
  pending: (returns.pending ?? []).map((entry, index) => ({
    id: `${entry.order_number ?? index}-return`,
    orderNumber: entry.order_number ?? "",
    reason: entry.reason ?? "",
    stage: (entry.stage as ReturnEntry["stage"]) ?? "inspection",
    ageDays: Number.isFinite(entry.age_days) ? Number(entry.age_days) : 0,
    refundAmount: toMoney(entry.refund_amount ?? 0),
  })),
  refundsDue: returns.refunds_due ?? 0,
  refundValue: toMoney(returns.refund_value_usd ?? 0),
});

const mapInventory = (blocks: SyncInventoryBlock[]): InventoryHold[] =>
  blocks.map((block) => ({
    sku: block.sku,
    title: block.name,
    ordersWaiting: block.orders_waiting,
    onHand: block.on_hand,
    eta: block.eta ?? undefined,
  }));

export const fetchOrdersFromSync = async (
  params: FetchOrdersFromSyncParams,
): Promise<OrdersDataset> => {
  const baseUrl = params.baseUrl ?? process.env.SYNC_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("Missing SYNC_SERVICE_URL environment variable");
  }

  const url = new URL("/sync/orders", baseUrl);
  const search = params.search;
  url.searchParams.set("tab", search.tab);
  url.searchParams.set("pageSize", String(search.pageSize));
  if (search.cursor) url.searchParams.set("cursor", search.cursor);
  if (search.direction === "before") url.searchParams.set("direction", "before");
  if (search.status) url.searchParams.set("status", search.status);
  if (search.priority) url.searchParams.set("priority", search.priority);
  if (search.assigned_to) url.searchParams.set("assigned_to", search.assigned_to);
  if (search.date_start) url.searchParams.set("date_start", search.date_start);
  if (search.date_end) url.searchParams.set("date_end", search.date_end);

  const response = await fetch(url.toString(), {
    signal: params.signal,
    headers: params.shopDomain ? { "X-Shop-Domain": params.shopDomain } : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Sync orders request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as SyncOrdersResponse;
  const orders = mapOrders(payload.orders.items ?? []);

  return {
    scenario: "base",
    state: "ok",
    tab: search.tab,
    period: payload.period,
    orders,
    count: payload.metrics.total_orders,
    pageInfo: {
      hasNextPage: payload.orders.page_info.hasNextPage,
      hasPreviousPage: payload.orders.page_info.hasPreviousPage,
      startCursor: payload.orders.page_info.startCursor ?? null,
      endCursor: payload.orders.page_info.endCursor ?? null,
      nextCursor: payload.orders.page_info.nextCursor ?? null,
      previousCursor: payload.orders.page_info.previousCursor ?? null,
      shopifyCursor: payload.orders.page_info.shopifyCursor ?? null,
      page: payload.orders.page_info.page,
      pageSize: payload.orders.page_info.pageSize,
      totalPages: payload.orders.page_info.totalPages,
    },
    metrics: mapMetrics(payload.metrics),
    shipments: mapShipments(payload.shipments ?? {}),
    returns: mapReturns(payload.returns ?? {}),
    inventory: mapInventory(payload.inventory_blocks ?? []),
    alerts: payload.alerts ?? [],
    dataGaps: payload.data_gaps ?? [],
  };
};
