import type {
  DashboardMocks,
  MockScenario,
  OrdersDataset,
  SalesDataset,
} from "~/types/dashboard";

import { buildDashboardMocks } from "./builder";
import { createMoney, percentage } from "./shared";

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

const FALLBACK_RANGE = "28d";

const RANGE_CONFIG: Record<string, { deltaPeriod: DashboardMetric["deltaPeriod"]; label: string }> = {
  today: { deltaPeriod: "WoW", label: "today" },
  "7d": { deltaPeriod: "WoW", label: "7d" },
  "28d": { deltaPeriod: "MoM", label: "28d" },
  "90d": { deltaPeriod: "YoY", label: "90d" },
};

const scenarioMessages: Record<MockScenario, string> = {
  base: "Feature the Camaro Stage 3 kit to capitalize on search lift.",
  empty: "No dataset connected yet—enable integrations in settings.",
  warning: "Sales are lagging forecast. Target inventory velocity campaigns.",
  error: "Mock services offline. Retry after mock data refresh.",
};

const toMetrics = (
  mocks: DashboardMocks,
  deltaPeriod: DashboardMetric["deltaPeriod"],
): DashboardMetric[] => {
  const sales = mocks.sales;
  const orders = mocks.orders;
  const refundedTotal = orders.orders
    .filter((order) => order.status === "refunded")
    .reduce((total, order) => total + order.total.amount, 0);

  return [
    {
      id: "gmv",
      label: "GMV",
      value: sales.totals.currentTotal.formatted,
      delta: sales.totals.deltaPercentage,
      deltaPeriod,
    },
    {
      id: "orders",
      label: "Orders",
      value: orders.count.toLocaleString("en-US"),
      delta: sales.totals.deltaPercentage * 0.75,
      deltaPeriod,
    },
    {
      id: "aov",
      label: "AOV",
      value: sales.totals.averageOrderValue.formatted,
      delta: sales.totals.deltaPercentage * 0.35,
      deltaPeriod,
    },
    {
      id: "refunds",
      label: "Refunds",
      value: createMoney(refundedTotal).formatted,
      delta: -Math.abs(sales.totals.deltaPercentage * 0.25),
      deltaPeriod,
    },
  ];
};

const toOrderBuckets = ({ orders }: DashboardMocks): OrdersBucket[] => {
  const unfulfilled = orders.orders.filter(
    (order) => order.fulfillmentStatus !== "fulfilled",
  ).length;
  const stalled = orders.orders.filter(
    (order) => order.fulfillmentStatus === "partial",
  ).length;
  const issues = orders.orders.filter(
    (order) => order.status === "refunded" || order.status === "cancelled",
  ).length;

  return [
    {
      id: "unfulfilled",
      label: "Open & Unfulfilled",
      count: unfulfilled,
      description: "Orders waiting on pick/pack",
      href: "/app/orders?tab=unfulfilled",
    },
    {
      id: "tracking",
      label: "Tracking stalled",
      count: stalled,
      description: "No carrier movement in 48h",
      href: "/app/orders?tab=tracking",
    },
    {
      id: "issues",
      label: "Delivery issues",
      count: issues,
      description: "Customer reported problems",
      href: "/app/orders?tab=issues",
    },
  ];
};

const toInboxSnapshot = ({ inbox }: DashboardMocks): InboxSnapshot => {
  const outstanding = inbox.tickets.filter(
    (ticket) => ticket.status !== "resolved",
  ).length;
  const breached = inbox.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvals = inbox.tickets.filter(
    (ticket) => ticket.status === "open" && ticket.priority !== "low",
  ).length;

  return {
    outstanding,
    overdueHours: breached * 3,
    approvalsPending: approvals,
  };
};

const toInventorySnapshot = ({ inventory }: DashboardMocks): InventorySnapshot => ({
  lowStock: inventory.summary.low,
  purchaseOrdersInFlight: inventory.summary.backorder + inventory.summary.preorder,
  overstock: inventory.summary.preorder,
});

const toSeoHighlight = ({ seo }: DashboardMocks): SeoHighlight => {
  const risingQueries = seo.insights.filter(
    (insight) => insight.severity !== "critical",
  ).length;
  const criticalIssues = seo.insights.filter(
    (insight) => insight.severity === "critical",
  ).length;

  const summary = seo.alert
    ? seo.alert
    : seo.insights
        .slice(0, 2)
        .map((insight) => insight.title)
        .join(" · ") || "Search performance steady.";

  return {
    trafficDelta: seo.scorecard.clickThroughRate,
    risingQueries,
    criticalIssues,
    summary,
  };
};

const toSparkline = (sales: SalesDataset): number[] => {
  return sales.trend.map((point) => Number.parseFloat(point.total.amount.toFixed(2)));
};

export const getDashboardOverview = async (
  range: string,
  scenario: MockScenario = "base",
): Promise<DashboardOverview> => {
  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG[FALLBACK_RANGE];
  const mocks = buildDashboardMocks({ scenario });

  return {
    range: config.label,
    metrics: toMetrics(mocks, config.deltaPeriod),
    sparkline: toSparkline(mocks.sales),
    orders: toOrderBuckets(mocks),
    inbox: toInboxSnapshot(mocks),
    inventory: toInventorySnapshot(mocks),
    seo: toSeoHighlight(mocks),
    mcpRecommendation: scenarioMessages[scenario],
  };
};

export const getOrderFulfillmentRatio = (orders: OrdersDataset): number => {
  if (!orders.orders.length) {
    return 0;
  }
  const fulfilled = orders.orders.filter(
    (order) => order.fulfillmentStatus === "fulfilled",
  ).length;
  return percentage(fulfilled, orders.orders.length, 0);
};

export const getSalesToOrderRatio = (sales: SalesDataset, orders: OrdersDataset) => {
  if (!orders.orders.length) {
    return 0;
  }
  return sales.totals.currentTotal.amount / orders.orders.length;
};
