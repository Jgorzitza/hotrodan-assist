import {
  McpResourceType,
  type InventorySignal,
  type McpRequestContext,
  type McpResponse,
  type ProductRecommendation,
  type SeoOpportunity,
} from "./types";

const MOCK_CONFIDENCE = 0.68;
const MOCK_GENERATED_AT = "2024-02-05T00:00:00.000Z";
const MOCK_SOURCE = "mock-mcp";

export const MOCK_PRODUCT_RECOMMENDATIONS: ProductRecommendation[] = [
  {
    sku: "CAM-Stage3",
    title: "Camaro Stage 3 Kit",
    rationale: "High intent queries with stock buffer >= 14 days",
    supportingMetrics: [
      { label: "30d CTR", value: 6.1, unit: "%" },
      { label: "Attach rate", value: 2.4, unit: "%" },
    ],
  },
  {
    sku: "MUS-HC",
    title: "Mustang Handling Components",
    rationale: "Cart abandons spike; promo recommended",
    supportingMetrics: [
      { label: "Cart abandons", value: 38 },
      { label: "Inventory days", value: 21 },
    ],
  },
];

export const MOCK_INVENTORY_SIGNALS: InventorySignal[] = [
  {
    sku: "LS-S2",
    riskLevel: "high",
    suggestedAction: "Expedite PO via air freight to avoid 6d stockout",
    demandSignals: [
      { label: "Projected demand", value: 42 },
      { label: "Lead time", value: 18, unit: "days" },
    ],
  },
  {
    sku: "JEEP-LIFT",
    riskLevel: "medium",
    suggestedAction: "Divert 15 units from EU warehouse",
    demandSignals: [
      { label: "Waitlisted", value: 12 },
      { label: "On-hand", value: 24 },
    ],
  },
];

export const MOCK_SEO_OPPORTUNITIES: SeoOpportunity[] = [
  {
    handle: "collections/turbo-kit",
    keywordCluster: [
      "camaro turbo kit",
      "turbo install camaro",
      "camaro forced induction",
    ],
    projectedImpact: 8.1,
    notes: "Optimize PDP meta + add how-to guide snippet.",
  },
  {
    handle: "products/ford-mustang-catback",
    keywordCluster: [
      "mustang catback exhaust",
      "mustang exhaust hp gain",
    ],
    projectedImpact: 5.6,
    notes: "Capture testimonial schema and add dyno results.",
  },
];

const toMockResponse = async <T>(data: T): Promise<McpResponse<T>> => ({
  data,
  generatedAt: MOCK_GENERATED_AT,
  source: MOCK_SOURCE,
  confidence: MOCK_CONFIDENCE,
});

export const mockProductRecommendations = (
  context: McpRequestContext,
): Promise<McpResponse<ProductRecommendation[]>> => {
  void context;
  return toMockResponse(MOCK_PRODUCT_RECOMMENDATIONS);
};

export const mockInventorySignals = (
  context: McpRequestContext,
): Promise<McpResponse<InventorySignal[]>> => {
  void context;
  return toMockResponse(MOCK_INVENTORY_SIGNALS);
};

export const mockSeoOpportunities = (
  context: McpRequestContext,
): Promise<McpResponse<SeoOpportunity[]>> => {
  void context;
  return toMockResponse(MOCK_SEO_OPPORTUNITIES);
};

export const mockPing = async () => true;

export const createMockMcpClient = () => ({
  getProductRecommendations: mockProductRecommendations,
  getInventorySignals: mockInventorySignals,
  getSeoOpportunities: mockSeoOpportunities,
  ping: mockPing,
});

export const MOCK_RESPONSE_META = {
  confidence: MOCK_CONFIDENCE,
  generatedAt: MOCK_GENERATED_AT,
  source: MOCK_SOURCE,
} as const;

export const DEFAULT_RESOURCE_PATHS: Record<McpResourceType, string> = {
  [McpResourceType.ProductRecommendation]: "/recommendations",
  [McpResourceType.InventorySignal]: "/inventory/signals",
  [McpResourceType.SeoOpportunity]: "/seo/opportunities",
};
