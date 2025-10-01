import type { SettingsPayload } from "./settings";
import type { SyncOrdersActionUpdate } from "./orders-sync";

export type MockScenario = "base" | "empty" | "warning" | "error";

export type DatasetState = "ok" | "empty" | "warning" | "error";

export type DashboardRangeKey = "today" | "7d" | "14d" | "28d" | "90d";

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

export type SalesBreadcrumb = {
  label: string;
  href?: string;
};

export type SalesCollectionPerformance = {
  id: string;
  title: string;
  handle: string;
  gmv: Money;
  orders: number;
  conversionRate: number;
  returningRate: number;
  attachRate: number;
  deltaPercentage: number;
};

export type SalesProductPerformance = {
  id: string;
  title: string;
  gmv: Money;
  orders: number;
  attachRate: number;
  returningRate: number;
  refundRate: number;
  skuCount: number;
  inventoryStatus: "healthy" | "overstock" | "stockout_risk";
};

export type SalesVariantPerformance = {
  id: string;
  sku: string;
  title: string;
  gmv: Money;
  unitsSold: number;
  inventoryOnHand: number;
  attachRate: number;
  backorderRisk: "none" | "low" | "medium" | "high";
};

export type SalesAttachRateInsight = {
  id: string;
  primaryProduct: string;
  attachmentProduct: string;
  attachRate: number;
  opportunity: string;
};

export type SalesInventoryRisk = {
  id: string;
  productId: string;
  title: string;
  status: "overstock" | "healthy" | "stockout_risk";
  daysOnHand: number;
  recommendedAction: string;
};

export type SalesCohortHighlight = {
  id: string;
  title: string;
  value: string;
  description: string;
};

export type SalesTopCustomer = {
  id: string;
  name: string;
  email: string;
  orders: number;
  lifetimeValue: Money;
  lastOrderAt: string;
  firstOrderAt: string;
};

export type SalesDrilldownMetrics = {
  gmv: Money;
  orders: number;
  attachRate: number;
  returningRate: number;
};

export type SalesDrilldownCollections = {
  level: "collections";
  breadcrumbs: SalesBreadcrumb[];
  metrics: SalesDrilldownMetrics;
  rows: SalesCollectionPerformance[];
  nextLevel: "products";
};

export type SalesDrilldownProducts = {
  level: "products";
  breadcrumbs: SalesBreadcrumb[];
  metrics: SalesDrilldownMetrics;
  rows: SalesProductPerformance[];
  nextLevel: "variants";
  selectedCollection: SalesCollectionPerformance;
};

export type SalesDrilldownVariants = {
  level: "variants";
  breadcrumbs: SalesBreadcrumb[];
  metrics: SalesDrilldownMetrics;
  rows: SalesVariantPerformance[];
  nextLevel: null;
  selectedCollection?: SalesCollectionPerformance;
  selectedProduct: SalesProductPerformance;
};

export type SalesDrilldown =
  | SalesDrilldownCollections
  | SalesDrilldownProducts
  | SalesDrilldownVariants;

export type SalesDataset = {
  scenario: MockScenario;
  state: DatasetState;
  granularity: SalesGranularity;
  range: DateRange;
  totals: SalesTotals;
  trend: SalesTrendPoint[];
  channelBreakdown: SalesChannelBreakdown[];
  forecast: SalesForecast | null;
  collections: SalesCollectionPerformance[];
  productsByCollection: Record<string, SalesProductPerformance[]>;
  variantsByProduct: Record<string, SalesVariantPerformance[]>;
  bestSellers: SalesProductPerformance[];
  laggards: SalesProductPerformance[];
  attachRateInsights: SalesAttachRateInsight[];
  overstockRisks: SalesInventoryRisk[];
  cohortHighlights: SalesCohortHighlight[];
  topCustomers: SalesTopCustomer[];
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
  orderId: string;
  orderNumber: string;
  expectedShipDate: string;
  owner: OrderOwner;
};

export type ShipmentDelayed = {
  id: string;
  orderId: string;
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
  orderId: string;
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

export type OrdersPageInfo = {
  cursor: string | null;
  startCursor: string | null;
  endCursor: string | null;
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OrdersCollection = {
  items: Order[];
  count: number;
  pageInfo: OrdersPageInfo;
};

export type OrdersDataset = {
  scenario: MockScenario;
  state: DatasetState;
  tab: "all" | "unfulfilled" | "overdue" | "refunded";
  period: DateRange;
  orders: OrdersCollection;
  metrics: OrdersMetrics;
  shipments: ShipmentsPanel;
  returns: ReturnsPanel;
  inventory: InventoryHold[];
  alerts: string[];
  dataGaps: string[];
  alert?: string;
  error?: string;
};

export type ActionToastStatus = "success" | "error" | "warning" | "info";

export type ActionToast = {
  status: ActionToastStatus;
  message: string;
};

export type OrdersActionResponse = {
  success: boolean;
  message?: string;
  toast?: ActionToast;
  updatedOrders: SyncOrdersActionUpdate[];
};

export type InboxTicketStatus = "open" | "snoozed" | "resolved" | "escalated";
export type InboxTicketPriority = "low" | "medium" | "high" | "urgent";

export type InboxProvider =
  | "email"
  | "shopify"
  | "instagram"
  | "tiktok"
  | "chat"
  | "sms"
  | "social";

export type InboxAttachment = {
  id: string;
  name: string;
  url: string;
};

export type InboxTimelineEntryType =
  | "customer_message"
  | "agent_reply"
  | "note"
  | "system";

export type InboxTimelineEntry = {
  id: string;
  type: InboxTimelineEntryType;
  actor: string;
  timestamp: string;
  body: string;
  attachments?: InboxAttachment[];
};

export type InboxFeedbackVote = "up" | "down";

export type InboxDraftFeedback = {
  id: string;
  draftId: string;
  ticketId: string;
  vote: InboxFeedbackVote;
  comment?: string;
  submittedAt: string;
  submittedBy: string;
};

export type InboxDraft = {
  id: string;
  ticketId: string;
  content: string;
  approved: boolean;
  updatedAt: string;
  updatedBy: string;
  revision: number;
  feedback: InboxDraftFeedback[];
};

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
  aiDraft: InboxDraft;
  timeline: InboxTimelineEntry[];
  attachments?: InboxAttachment[];
};

export type InboxDataset = {
  scenario: MockScenario;
  state: DatasetState;
  filter: "all" | "unassigned" | "priority" | "overdue";
  channelFilter: "all" | InboxProvider;
  statusFilter: "all" | InboxTicketStatus;
  assignedFilter: "all" | "unassigned" | string;
  tickets: InboxTicket[];
  count: number;
  alert?: string;
  error?: string;
  availableFilters: {
    channels: InboxProvider[];
    statuses: InboxTicketStatus[];
    assignees: string[];
  };
};

export type InboxMetrics = {
  outstanding: number;
  overdue: number;
  closedToday: number;
  approvalsPending: number;
  ideaCandidates: number;
  total: number;
  confidenceHistogram: {
    low: number;
    medium: number;
    high: number;
    unscored: number;
  };
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
  availableScenarios?: MockScenario[];
};

export type InboxActionEventType =
  | "draft:approved"
  | "draft:updated"
  | "draft:feedback"
  | "bridge:status";

export type InboxBridgeStatusEventPayload = {
  status: InboxConnectionStatus;
  attempt?: number;
  consecutiveFailures?: number;
  retryDelayMs?: number;
  reason?: string;
};

export type InboxActionResponse = {
  success: boolean;
  message: string;
  ticket?: InboxTicket;
  draft?: InboxDraft;
  feedback?: InboxDraftFeedback;
  event?: {
    type: InboxActionEventType;
    timestamp: string;
    payload: Record<string, unknown>;
  };
};

export type InboxConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type InboxConnectionTelemetryEventType =
  | "connection:attempt"
  | "connection:open"
  | "connection:handshake"
  | "connection:error"
  | "connection:retry"
  | "connection:offline"
  | "connection:manual-retry";

export type InboxConnectionTelemetryPayload = {
  type: InboxConnectionTelemetryEventType;
  status: InboxConnectionStatus;
  attempt: number;
  consecutiveFailures: number;
  retryDelayMs?: number;
  latencyMs?: number;
  scenario: MockScenario;
  useMockData: boolean;
  timestamp: string;
  reason?: string;
};

export type InboxConnectionTelemetryEvent = InboxConnectionTelemetryPayload & {
  id: string;
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

export type SeoKeywordIntent = "transactional" | "informational" | "navigational";

export type SeoKeywordRow = {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  delta: number;
  topPage?: string;
  intent: SeoKeywordIntent;
  source: SeoSource;
};

export type SeoCanonicalStatus = "ok" | "issue";

export type SeoPageRow = {
  id: string;
  url: string;
  title: string;
  entrances: number;
  exits: number;
  conversionRate: number;
  canonicalStatus: SeoCanonicalStatus;
  canonicalIssue?: string;
  source: SeoSource;
};

export type SeoActionPriority = "now" | "soon" | "later";
export type SeoActionStatus = "not_started" | "in_progress" | "done";

export type SeoAction = {
  id: string;
  title: string;
  description: string;
  priority: SeoActionPriority;
  status: SeoActionStatus;
  assignedTo: string;
  source: SeoSource;
  metricLabel?: string;
  metricValue?: string;
  dueAt?: string;
  lastUpdatedAt: string;
};

export type SeoTrafficPoint = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
};

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
  keywords: SeoKeywordRow[];
  pages: SeoPageRow[];
  actions: SeoAction[];
  traffic: SeoTrafficPoint[];
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
