export type McpResourceType =
  | "ProductRecommendation"
  | "InventorySignal"
  | "SeoOpportunity";

export type McpRequestContext = {
  shopDomain: string;
  resource: McpResourceType;
  params?: Record<string, string | number>;
  dateRange?: { start: string; end: string };
};

export type ProductRecommendation = {
  sku: string;
  title: string;
  rationale: string;
  projectedLift: number;
};

export type InventorySignal = {
  sku: string;
  riskLevel: "low" | "medium" | "high";
  suggestedAction: string;
};

export type SeoOpportunity = {
  handle: string;
  keywordCluster: string[];
  projectedImpact: number;
};

export type McpResponse<T> = {
  data: T;
  generatedAt: string;
  source: string;
  confidence: number;
};
