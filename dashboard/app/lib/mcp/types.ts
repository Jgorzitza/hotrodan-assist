export enum McpResourceType {
  ProductRecommendation = "ProductRecommendation",
  InventorySignal = "InventorySignal",
  SeoOpportunity = "SeoOpportunity",
}

export type McpDateRange = {
  start: string;
  end: string;
};

export type McpRequestContext = {
  shopDomain: string;
  resource: McpResourceType;
  params?: Record<string, string | number>;
  dateRange?: McpDateRange;
};

export type MetricDatum = {
  label: string;
  value: number;
  unit?: string;
};

export type ProductRecommendation = {
  sku: string;
  title: string;
  rationale: string;
  supportingMetrics: MetricDatum[];
};

export type InventorySignal = {
  sku: string;
  riskLevel: "low" | "medium" | "high";
  suggestedAction: string;
  demandSignals: MetricDatum[];
};

export type SeoOpportunity = {
  handle: string;
  keywordCluster: string[];
  projectedImpact: number;
  notes?: string;
};

export type McpResponse<T> = {
  data: T;
  generatedAt: string;
  source: string;
  confidence: number;
};

export type McpTelemetryEvent = {
  resource: McpResourceType;
  attempt: number;
  status?: number;
  error?: unknown;
};
