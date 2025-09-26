export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  delta: number;
  deltaPeriod: "WoW" | "MoM" | "YoY";
};

export type OrdersBucket = {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
};

export type InboxSnapshot = {
  outstanding: number;
  overdueHours: number;
  approvalsPending: number;
};

export type InventorySnapshot = {
  lowStock: number;
  purchaseOrdersInFlight: number;
  overstock: number;
};

export type SeoHighlight = {
  trafficDelta: number;
  risingQueries: number;
  criticalIssues: number;
  summary: string;
};

export type DashboardOverview = {
  range: string;
  metrics: DashboardMetric[];
  sparkline: number[];
  orders: OrdersBucket[];
  inbox: InboxSnapshot;
  inventory: InventorySnapshot;
  seo: SeoHighlight;
  mcpRecommendation: string;
};

const baseSparkline = [42, 48, 52, 51, 60, 58, 64];

const metricsByRange: Record<string, DashboardMetric[]> = {
  today: [
    { id: "gmv", label: "GMV", value: "$24.6K", delta: 8.4, deltaPeriod: "WoW" },
    { id: "orders", label: "Orders", value: "182", delta: 5.2, deltaPeriod: "WoW" },
    { id: "aov", label: "AOV", value: "$135", delta: 2.1, deltaPeriod: "WoW" },
    { id: "refunds", label: "Refunds", value: "$640", delta: -1.4, deltaPeriod: "WoW" },
  ],
  "7d": [
    { id: "gmv", label: "GMV", value: "$162K", delta: 12.5, deltaPeriod: "MoM" },
    { id: "orders", label: "Orders", value: "1,134", delta: 9.3, deltaPeriod: "MoM" },
    { id: "aov", label: "AOV", value: "$143", delta: 1.8, deltaPeriod: "MoM" },
    { id: "refunds", label: "Refunds", value: "$4.2K", delta: -2.6, deltaPeriod: "MoM" },
  ],
  "28d": [
    { id: "gmv", label: "GMV", value: "$602K", delta: 18.2, deltaPeriod: "YoY" },
    { id: "orders", label: "Orders", value: "4,380", delta: 15.7, deltaPeriod: "YoY" },
    { id: "aov", label: "AOV", value: "$137", delta: 2.9, deltaPeriod: "YoY" },
    { id: "refunds", label: "Refunds", value: "$16.4K", delta: -3.1, deltaPeriod: "YoY" },
  ],
  "90d": [
    { id: "gmv", label: "GMV", value: "$1.8M", delta: 9.8, deltaPeriod: "YoY" },
    { id: "orders", label: "Orders", value: "12,240", delta: 7.4, deltaPeriod: "YoY" },
    { id: "aov", label: "AOV", value: "$146", delta: 3.3, deltaPeriod: "YoY" },
    { id: "refunds", label: "Refunds", value: "$48.6K", delta: -4.7, deltaPeriod: "YoY" },
  ],
};

const ordersBuckets: OrdersBucket[] = [
  {
    id: "unfulfilled",
    label: "Open & Unfulfilled",
    count: 37,
    description: "Orders waiting on pick/pack",
    href: "/app/orders?tab=unshipped",
  },
  {
    id: "tracking",
    label: "Tracking stalled",
    count: 12,
    description: "No carrier movement in 48h",
    href: "/app/orders?tab=delivery",
  },
  {
    id: "issues",
    label: "Delivery issues",
    count: 5,
    description: "Customer reported problems",
    href: "/app/orders?tab=issues",
  },
];

const inboxSnapshot: InboxSnapshot = {
  outstanding: 24,
  overdueHours: 6,
  approvalsPending: 9,
};

const inventorySnapshot: InventorySnapshot = {
  lowStock: 14,
  purchaseOrdersInFlight: 3,
  overstock: 5,
};

const seoHighlight: SeoHighlight = {
  trafficDelta: 6.2,
  risingQueries: 7,
  criticalIssues: 2,
  summary: "Collection pages climbing for 'LS swap kits'; two pages blocked by robots.txt.",
};

export const getDashboardOverview = async (
  range: string,
): Promise<DashboardOverview> => {
  const preset = metricsByRange[range] ? range : "28d";

  return {
    range: preset,
    metrics: metricsByRange[preset],
    sparkline: baseSparkline,
    orders: ordersBuckets,
    inbox: inboxSnapshot,
    inventory: inventorySnapshot,
    seo: seoHighlight,
    mcpRecommendation:
      "Feature the Camaro Stage 3 kit in the hero banner this week to capitalize on search lift.",
  };
};
