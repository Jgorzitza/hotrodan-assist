import type { SettingsPayload } from "./settings";

export type MockScenario = "base" | "empty" | "warning" | "error";

export type DatasetState = "ok" | "empty" | "warning" | "error";

export type CurrencyCode = "USD" | "CAD" | "EUR" | "GBP";

export type Money = {
  amount: number;
  currency: CurrencyCode;
  formatted: string;
};

export type DateRange = {
  label: string;
  start: string;
  end: string;
};

export type SalesGranularity = "daily" | "weekly" | "monthly";

export type SalesTrendPoint = {
  date: string;
  total: Money;
  orders: number;
};

export type SalesChannelBreakdown = {
  channel: string;
  total: Money;
  percentage: number;
};

export type SalesTotals = {
  currentTotal: Money;
  previousTotal: Money;
  deltaPercentage: number;
  averageOrderValue: Money;
  conversionRate: number;
};

export type SalesForecast = {
  projectedTotal: Money;
  variancePercentage: number;
  varianceLabel: "ahead" | "behind" | "on_track";
};

export type SalesDataset = {
  scenario: MockScenario;
  state: DatasetState;
  granularity: SalesGranularity;
  range: DateRange;
  totals: SalesTotals;
  trend: SalesTrendPoint[];
  channelBreakdown: SalesChannelBreakdown[];
  forecast: SalesForecast | null;
  alert?: string;
  error?: string;
};

export type OrderStatus = "paid" | "processing" | "fulfilled" | "refunded" | "cancelled";
export type OrderFulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";
export type OrderPaymentStatus = "paid" | "pending" | "refunded";

export type OrderLineItem = {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  price: Money;
  total: Money;
};

export type OrderTimelineEvent = {
  id: string;
  type: "status" | "note" | "fulfillment" | "payment";
  message: string;
  occurredAt: string;
  state?: OrderStatus;
};

export type OrderCustomer = {
  id: string;
  name: string;
  email: string;
  firstOrderAt: string;
  lastOrderAt: string;
  location: string;
  lifetimeValue: Money;
};

export type Order = {
  id: string;
  name: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  placedAt: string;
  fulfillmentDueAt?: string;
  total: Money;
  subtotal: Money;
  shipping: Money;
  customer: OrderCustomer;
  lineItems: OrderLineItem[];
  tags: string[];
  timeline: OrderTimelineEvent[];
};

export type OrdersDataset = {
  scenario: MockScenario;
  state: DatasetState;
  tab: "all" | "unfulfilled" | "overdue" | "refunded";
  orders: Order[];
  count: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  alert?: string;
  error?: string;
};

export type InboxTicketStatus = "open" | "snoozed" | "resolved" | "escalated";
export type InboxTicketPriority = "low" | "medium" | "high" | "urgent";

export type InboxTicket = {
  id: string;
  subject: string;
  status: InboxTicketStatus;
  priority: InboxTicketPriority;
  sentiment: "positive" | "neutral" | "negative";
  updatedAt: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  orderId?: string;
  assignedTo?: string;
  lastMessagePreview: string;
  slaBreached?: boolean;
};

export type InboxDataset = {
  scenario: MockScenario;
  state: DatasetState;
  filter: "all" | "unassigned" | "priority" | "overdue";
  tickets: InboxTicket[];
  count: number;
  alert?: string;
  error?: string;
};

export type InventoryStatus = "healthy" | "low" | "backorder" | "preorder";

export type InventoryVelocity = {
  turnoverDays: number;
  sellThroughRate: number;
  lastWeekUnits: number;
};

export type InventoryItem = {
  id: string;
  title: string;
  sku: string;
  status: InventoryStatus;
  available: number;
  incoming: number;
  committed: number;
  backordered: number;
  velocity: InventoryVelocity;
  restockEta?: string;
};

export type InventoryDataset = {
  scenario: MockScenario;
  state: DatasetState;
  summary: {
    totalSkus: number;
    healthy: number;
    low: number;
    backorder: number;
    preorder: number;
  };
  items: InventoryItem[];
  alert?: string;
  error?: string;
};

export type KpiState = "ok" | "warning" | "critical";

export type KpiMetric = {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  delta: number;
  deltaLabel: string;
  state: KpiState;
  unit: "currency" | "percentage" | "count";
};

export type KpiDataset = {
  scenario: MockScenario;
  state: DatasetState;
  range: DateRange;
  metrics: KpiMetric[];
};

export type SeoSource = "ga4" | "gsc" | "bing";
export type SeoSeverity = "info" | "warning" | "critical";

export type SeoInsight = {
  id: string;
  source: SeoSource;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  delta?: string;
  severity: SeoSeverity;
  url?: string;
  detectedAt: string;
};

export type SeoScorecard = {
  coreWebVitals: number;
  clickThroughRate: number;
  crawlSuccessRate: number;
  keywordRankings: number;
};

export type SeoDataset = {
  scenario: MockScenario;
  state: DatasetState;
  range: DateRange;
  scorecard: SeoScorecard;
  insights: SeoInsight[];
  alert?: string;
  error?: string;
};

export type DashboardMocks = {
  sales: SalesDataset;
  orders: OrdersDataset;
  inbox: InboxDataset;
  inventory: InventoryDataset;
  kpis: KpiDataset;
  seo: SeoDataset;
  settings: SettingsPayload;
};

export type ScenarioOptions = {
  scenario?: MockScenario;
  seed?: number;
};

export type ScenarioRequest = ScenarioOptions & {
  searchParams?: URLSearchParams;
};

