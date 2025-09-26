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

export type OrdersMetrics = {
  totalOrders: number;
  awaitingFulfillment: number;
  awaitingTracking: number;
  overdue: number;
  overduePercentage: number;
  averageFulfillmentHours: number;
  slaBreaches: number;
};

export type OrderPriority = "vip" | "rush" | "standard";

export type OrderIssue =
  | "inventory"
  | "payment"
  | "address"
  | "carrier"
  | "manual_check"
  | "none";

export type OrderOwner = "assistant" | "unassigned" | string;

export type ShipmentTrackingPending = {
  id: string;
  orderNumber: string;
  expectedShipDate: string;
  owner: OrderOwner;
};

export type ShipmentDelayed = {
  id: string;
  orderNumber: string;
  carrier: string;
  delayHours: number;
  lastUpdate: string;
};

export type ShipmentsPanel = {
  trackingPending: ShipmentTrackingPending[];
  delayed: ShipmentDelayed[];
  deliveredToday: number;
};

export type ReturnStage = "awaiting_label" | "in_transit" | "inspection";

export type ReturnEntry = {
  id: string;
  orderNumber: string;
  reason: string;
  stage: ReturnStage;
  ageDays: number;
  refundAmount: Money;
};

export type ReturnsPanel = {
  pending: ReturnEntry[];
  refundsDue: number;
  refundValue: Money;
};

export type InventoryHold = {
  sku: string;
  title: string;
  ordersWaiting: number;
  onHand: number;
  eta?: string;
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
  shipBy?: string;
  ageHours: number;
  priority: OrderPriority;
  issue: OrderIssue;
  assignedTo: OrderOwner;
  channel: "online" | "pos" | "draft";
  total: Money;
  subtotal: Money;
  shipping: Money;
  customer: OrderCustomer;
  lineItems: OrderLineItem[];
  tags: string[];
  timeline: OrderTimelineEvent[];
  supportThread?: string;
};

export type OrdersDataset = {
  scenario: MockScenario;
  state: DatasetState;
  tab: "all" | "unfulfilled" | "overdue" | "refunded";
  period: DateRange;
  orders: Order[];
  count: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  metrics: OrdersMetrics;
  shipments: ShipmentsPanel;
  returns: ReturnsPanel;
  inventory: InventoryHold[];
  alerts: string[];
  dataGaps: string[];
  alert?: string;
  error?: string;
};

export type OrdersActionResponse = {
  success: boolean;
  message: string;
  updatedOrders: Order[];
};

export type InboxTicketStatus = "open" | "snoozed" | "resolved" | "escalated";
export type InboxTicketPriority = "low" | "medium" | "high" | "urgent";

export type InboxProvider = "email" | "shopify" | "instagram" | "tiktok";

export type InboxTicket = {
  id: string;
  subject: string;
  status: InboxTicketStatus;
  priority: InboxTicketPriority;
  sentiment: "positive" | "neutral" | "negative";
  updatedAt: string;
  createdAt: string;
  channel: InboxProvider;
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

export type InboxMetrics = {
  outstanding: number;
  overdue: number;
  closedToday: number;
  approvalsPending: number;
  ideaCandidates: number;
};

export type InboxConversation = {
  id: string;
  subject: string;
  customer: string;
  status: InboxTicketStatus;
  channel: InboxProvider;
  sentiment: InboxTicket["sentiment"];
  receivedAt: string;
};

export type InboxData = {
  dataset: InboxDataset;
  metrics: InboxMetrics;
  conversations: InboxConversation[];
};

export type InventoryStatus = "healthy" | "low" | "backorder" | "preorder";

export type InventoryBucketId = "urgent" | "air" | "sea" | "overstock";

export type InventoryVelocity = {
  turnoverDays: number;
  sellThroughRate: number;
  lastWeekUnits: number;
};

export type InventoryDemandTrendPoint = {
  label: string;
  units: number;
};

export type InventorySkuDemand = {
  id: string;
  title: string;
  sku: string;
  vendorId: string;
  vendorName: string;
  status: InventoryStatus;
  bucketId: InventoryBucketId;
  onHand: number;
  inbound: number;
  committed: number;
  coverDays: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrder: number;
  stockoutDate: string;
  unitCost: Money;
  velocity: InventoryVelocity;
  trend: InventoryDemandTrendPoint[];
};

export type InventoryBucketSummary = {
  id: InventoryBucketId;
  label: string;
  description: string;
  leadTimeDays: number;
  skuCount: number;
  valueAtRisk: Money;
};

export type InventoryDashboardSummary = {
  skusAtRisk: number;
  averageCoverDays: number;
  openPoBudget: Money;
};

export type PurchaseOrderDraftItem = {
  skuId: string;
  sku: string;
  title: string;
  recommendedOrder: number;
  draftQuantity: number;
  unitCost: Money;
};

export type PurchaseOrderDraft = {
  vendorId: string;
  vendorName: string;
  leadTimeDays: number;
  budgetRemaining: Money;
  lastOrderAt?: string;
  notes?: string;
  items: PurchaseOrderDraftItem[];
};

export type InventoryDashboardPayload = {
  scenario: MockScenario;
  state: DatasetState;
  summary: InventoryDashboardSummary;
  buckets: InventoryBucketSummary[];
  skus: InventorySkuDemand[];
  vendors: PurchaseOrderDraft[];
  alert?: string;
  error?: string;
};

export type InventoryOverviewBucket = {
  id: InventoryBucketId;
  label: string;
  description: string;
  skuCount: number;
  href: string;
};

export type InventoryVelocityTrend = {
  label: string;
  currentStock: number;
  projectedDays: number;
};

export type InventoryOverview = {
  scenario: MockScenario;
  state: DatasetState;
  buckets: InventoryOverviewBucket[];
  trends: InventoryVelocityTrend[];
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
  inventory: InventoryDashboardPayload;
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
