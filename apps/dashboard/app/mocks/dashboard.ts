import type {
  DashboardMocks,
  DashboardRangeKey,
  MockScenario,
  OrdersDataset,
  SalesDataset,
} from "~/types/dashboard";

import { buildDashboardMocks } from "./builder";
import { createMoney, percentage } from "./shared";
import {
  DASHBOARD_RANGE_PRESETS,
  DEFAULT_DASHBOARD_RANGE,
  resolveDashboardRangeKey,
} from "~/lib/date-range";

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
  risingPages: number;
  criticalIssues: number;
  summary: string;
};

export type DashboardOverview = {
  range: DashboardRangeKey;
  rangeLabel: string;
  metrics: DashboardMetric[];
  sparkline: number[];
  orders: OrdersBucket[];
  inbox: InboxSnapshot;
  inventory: InventorySnapshot;
  seo: SeoHighlight;
  mcpRecommendation: string;
};

const RANGE_CONFIG: Record<DashboardRangeKey, { deltaPeriod: DashboardMetric["deltaPeriod"] }> = {
  today: { deltaPeriod: "WoW" },
  "7d": { deltaPeriod: "WoW" },
  "14d": { deltaPeriod: "WoW" },
  "28d": { deltaPeriod: "MoM" },
  "90d": { deltaPeriod: "YoY" },
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
  const orders = mocks.orders.orders.items;
  const refundedTotal = orders
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
      value: mocks.orders.orders.count.toLocaleString("en-US"),
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
  const orderItems = orders.orders.items;
  const unfulfilled = orderItems.filter(
    (order) => order.fulfillmentStatus !== "fulfilled",
  ).length;
  const stalled = orderItems.filter(
    (order) => order.fulfillmentStatus === "partial",
  ).length;
  const issues = orderItems.filter(
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
      label: "Tracking issues",
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
  const outstanding = inbox.tickets.filter((ticket) => ticket.status !== "sent").length;
  const breached = inbox.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvals = inbox.tickets.filter((ticket) => ticket.status === "needs_review").length;

  return {
    outstanding,
    overdueHours: breached * 3,
    approvalsPending: approvals,
  };
};

const toInventorySnapshot = ({ inventory }: DashboardMocks): InventorySnapshot => {
  const purchaseOrdersInFlight = inventory.vendors.reduce((total, vendor) => {
    return total + vendor.items.filter((item) => item.draftQuantity > 0).length;
  }, 0);

  const overstock =
    inventory.buckets.find((bucket) => bucket.id === "overstock")?.skuCount ?? 0;

  return {
    lowStock: inventory.summary.skusAtRisk,
    purchaseOrdersInFlight,
    overstock,
  };
};

const toSeoHighlight = ({ seo }: DashboardMocks): SeoHighlight => {
  const risingKeywordRows = seo.keywords.filter((keyword) => keyword.delta > 0);
  const risingQueries = risingKeywordRows.length;
  const risingPages = risingKeywordRows.reduce((pages, keyword) => {
    if (!keyword.topPage) {
      return pages;
    }
    pages.add(keyword.topPage);
    return pages;
  }, new Set<string>()).size;
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
    risingPages,
    criticalIssues,
    summary,
  };
};

const toSparkline = (sales: SalesDataset): number[] => {
  return sales.trend.map((point) => Number.parseFloat(point.total.amount.toFixed(2)));
};

export const getDashboardOverview = async (
  range: DashboardRangeKey | string,
  scenario: MockScenario = "base",
): Promise<DashboardOverview> => {
  const normalizedRange = resolveDashboardRangeKey(range, DEFAULT_DASHBOARD_RANGE);
  const config = RANGE_CONFIG[normalizedRange] ?? RANGE_CONFIG[DEFAULT_DASHBOARD_RANGE];
  const mocks = buildDashboardMocks({ scenario });

  return {
    range: normalizedRange,
    rangeLabel: DASHBOARD_RANGE_PRESETS[normalizedRange].label,
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
  const items = orders.orders.items;
  if (!items.length) {
    return 0;
  }
  const fulfilled = items.filter(
    (order) => order.fulfillmentStatus === "fulfilled",
  ).length;
  return percentage(fulfilled, items.length, 0);
};

export const getSalesToOrderRatio = (sales: SalesDataset, orders: OrdersDataset) => {
  const items = orders.orders.items;
  if (!items.length) {
    return 0;
  }
  return sales.totals.currentTotal.amount / items.length;
};
