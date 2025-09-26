import {
  type InventorySignal,
  type McpRequestContext,
  type McpResponse,
  type ProductRecommendation,
  type SeoOpportunity,
} from "./types";

const DEFAULT_CONFIDENCE = 0.6;

export type McpClientConfig = {
  apiKey?: string;
  endpoint?: string;
  fetchFn?: typeof fetch;
};

export class McpClient {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly config: McpClientConfig = {}) {
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async getProductRecommendations(
    context: McpRequestContext,
  ): Promise<McpResponse<ProductRecommendation[]>> {
    return mockResponse<ProductRecommendation[]>([
      {
        sku: "CAM-Stage3",
        title: "Camaro Stage 3 Kit",
        rationale: "High search demand with low inventory risk",
        projectedLift: 12.4,
      },
    ]);
  }

  async getInventorySignals(
    context: McpRequestContext,
  ): Promise<McpResponse<InventorySignal[]>> {
    return mockResponse<InventorySignal[]>([
      {
        sku: "LS-S2",
        riskLevel: "high",
        suggestedAction: "Expedite PO via air freight to avoid 6d stockout",
      },
    ]);
  }

  async getSeoOpportunities(
    context: McpRequestContext,
  ): Promise<McpResponse<SeoOpportunity[]>> {
    return mockResponse<SeoOpportunity[]>([
      {
        handle: "collections/turbo-kit",
        keywordCluster: ["turbo kit camaro", "camaro turbo install"],
        projectedImpact: 8.1,
      },
    ]);
  }

  async ping(): Promise<boolean> {
    if (!this.config.endpoint) {
      return true;
    }

    try {
      const response = await this.fetchFn(`${this.config.endpoint}/health`, {
        headers: this.headers(),
      });
      return response.ok;
    } catch (error) {
      console.warn("MCP ping failed", error);
      return false;
    }
  }

  private headers() {
    return this.config.apiKey
      ? { Authorization: `Bearer ${this.config.apiKey}` }
      : undefined;
  }
}

const mockResponse = async <T>(data: T): Promise<McpResponse<T>> => ({
  data,
  generatedAt: new Date().toISOString(),
  source: "mock-mcp",
  confidence: DEFAULT_CONFIDENCE,
});

export const createMcpClient = (config?: McpClientConfig) => new McpClient(config);
