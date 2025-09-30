export type MockState = "base" | "empty" | "warning" | "error";

export interface DashboardPeriod {
  label: "Today" | "Yesterday" | "Last 7 days" | "MTD";
  start: string; // ISO-8601
  end: string; // ISO-8601
}

export interface ChannelMixEntry {
  channel: "shopify" | "assistant" | "marketplace" | "in-store" | string;
  revenue: number;
  deltaPct: number;
}

export interface ProductPerformance {
  sku: string;
  name: string;
  revenue: number;
  deltaPct: number;
}

export interface KpiTrendPoint {
  label: string;
  value: number;
}

export interface KpiCard {
  id: string;
  label: string;
  value: number;
  changePct: number;
  changeDirection: "up" | "down" | "flat";
  target?: number;
  status: "ok" | "warning" | "critical" | string;
  trend: KpiTrendPoint[];
}

export interface SalesOverview {
  period: DashboardPeriod;
  gross: number;
  net: number;
  forecast: number;
  variancePct: number;
  channelMix: ChannelMixEntry[];
  topProducts: ProductPerformance[];
}

export interface OrderLineItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export type OrderStatus = "paid" | "processing" | "fulfilled" | "refunded" | string;

export interface OrderTimelineEvent {
  type: string;
  occurredAt: string;
  note?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  placedAt: string;
  expectedShipAt?: string;
  slaRisk: "none" | "warning" | "breach";
  lineItems: OrderLineItem[];
  timeline: OrderTimelineEvent[];
}

export interface PaginatedOrders {
  nodes: Order[];
  pageInfo: {
    hasNextPage: boolean;
    cursor?: string;
  };
}

export interface InboxThread {
  conversationId: string;
  channel: "email" | "chat" | "sms" | string;
  customer: string;
  lastMessageAt: string;
  slaBreach: boolean;
  subject: string;
  summary: string;
  draftStatus: "proposed" | "edited" | "approved" | string;
  nextActionOwner: "assistant" | "human";
  sentiment?: "positive" | "neutral" | "negative";
  labels?: string[];
  messages?: Array<{
    id: string;
    sender: "assistant" | "human" | "customer";
    sentAt: string;
    preview: string;
  }>;
}

export interface DashboardInboxPayload {
  awaitingReview: number;
  awaitingReviewSlaMinutes: number;
  threads: InboxThread[];
}

export interface CorrectionEntry {
  pattern: string;
  author: string;
  addedAt: string;
}

export interface GoldenRegressionEntry {
  id: string;
  title: string;
  failingSince: string;
}

export interface DashboardLearningPayload {
  editsLast24h: number;
  newCorrections: CorrectionEntry[];
  goldensRegressions: GoldenRegressionEntry[];
}

export interface DashboardSystemHealthPayload {
  ragIndexAgeHours: number | null;
  lastIngest: string | null;
  openaiLatencyP95Ms: number | null;
  errorRatePct: number | null;
}

export interface ProductRequestSignal {
  category: string;
  count: number;
  trend: "up" | "flat" | "down";
}

export interface DashboardHighlightsPayload {
  notableThreads: string[];
  productRequests: ProductRequestSignal[];
}

export interface DashboardHomePayload {
  inbox: DashboardInboxPayload;
  learning: DashboardLearningPayload;
  systemHealth: DashboardSystemHealthPayload;
  highlights: DashboardHighlightsPayload;
  kpis?: KpiCard[];
}

export interface AssistantOpportunity {
  conversationId: string;
  stage: "qualified" | "quote_sent" | "waiting_payment" | string;
  estimatedValue: number;
  lastMessage: string;
  owner: "assistant" | "human";
  blockedReason: string | null;
}

export interface AssistantPipelinePayload {
  openOpportunities: AssistantOpportunity[];
  winsLastPeriod: number;
  winsPreviousPeriod: number;
}

export interface ShopifyMetrics {
  orders: number;
  avgOrderValue: number;
  conversionRatePct: number;
  abandonedCheckouts: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  onHand: number;
  daysOfCover: number;
  status: "critical" | "warning" | "ok" | string;
  reorderPoint?: number;
  velocity?: number;
  incomingShipment?: {
    eta: string;
    quantity: number;
  };
}

export interface DemandSignalPayload {
  productRequests: ProductRequestSignal[];
  faqGaps: Array<{
    topic: string;
    requests: number;
  }>;
}

export interface SalesRoutePayload {
  period: DashboardPeriod;
  revenue: {
    gross: number;
    net: number;
    previousPeriodDeltaPct: number;
    topProducts: ProductPerformance[];
  };
  assistantPipeline: AssistantPipelinePayload;
  shopifyMetrics: ShopifyMetrics;
  inventoryWatch: InventoryItem[];
  demandSignals: DemandSignalPayload;
  kpis?: KpiCard[];
}

export interface SeoKeywordEntry {
  keyword: string;
  position: number;
  delta: number;
  volume: number;
}

export interface SeoCrawlIssue {
  id: string;
  area: string;
  status: "open" | "resolved" | string;
  severity: "low" | "medium" | "high" | string;
}

export interface SeoReport {
  keywords: SeoKeywordEntry[];
  crawlIssues: SeoCrawlIssue[];
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  contentOpportunities: Array<{
    topic: string;
    confidence: number;
  }>;
}

export interface SettingsPayload {
  merchant: {
    id: string;
    name: string;
    plan: string;
    timezone: string;
  };
  team: Array<{
    id: string;
    name: string;
    role: "admin" | "editor" | "viewer" | string;
    lastActiveAt: string | null;
  }>;
  featureFlags: Record<string, boolean>;
  integrations: Array<{
    id: string;
    provider: string;
    status: "connected" | "disconnected" | "pending" | string;
    lastSyncAt: string | null;
  }>;
}

export interface SharedMockMeta {
  schemaVersion: string;
}

export interface MockErrorPayload {
  error: {
    status: number;
    message: string;
    meta?: Record<string, unknown>;
  };
}

export type DashboardHomeScenario = DashboardHomePayload | MockErrorPayload;
export type SalesRouteScenario = SalesRoutePayload | MockErrorPayload;
export type OrdersScenario = PaginatedOrders | MockErrorPayload;
export type InventoryScenario = InventoryItem[] | MockErrorPayload;
export type KpiScenario = KpiCard[] | MockErrorPayload;
export type SeoScenario = SeoReport | MockErrorPayload;
export type SettingsScenario = SettingsPayload | MockErrorPayload;
