import { createMcpClient, type McpClientConfig } from "./client.server";
import {
  createMockMcpClient,
  DEFAULT_RESOURCE_PATHS,
  mockInventorySignals,
  mockProductRecommendations,
  mockSeoOpportunities,
} from "./mocks";
import {
  McpResourceType,
  type InventorySignal,
  type McpRequestContext,
  type McpResponse,
  type ProductRecommendation,
  type SeoOpportunity,
} from "./types";
import type { FeatureToggles } from "~/types/settings";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") {
    return fallback;
  }

  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const envMcpEnabled = () => parseBoolean(process.env.ENABLE_MCP, false);
const envUseMocks = () => parseBoolean(process.env.USE_MOCK_DATA, true);

export const resolveMcpConfigFromEnv = (): McpClientConfig => ({
  apiKey: process.env.MCP_API_KEY,
  endpoint: process.env.MCP_API_URL,
  maxRetries: parseNumber(process.env.MCP_MAX_RETRIES),
  timeoutMs: parseNumber(process.env.MCP_TIMEOUT_MS),
});

export const isMcpFeatureEnabled = (toggles?: FeatureToggles | null) =>
  envMcpEnabled() && Boolean(toggles?.enableMcpIntegration);

export const shouldUseMcpMocks = (toggles?: FeatureToggles | null) =>
  envUseMocks() || !isMcpFeatureEnabled(toggles);

export const getMcpClient = (
  toggles?: FeatureToggles | null,
  overrides?: McpClientConfig,
) => {
  if (shouldUseMcpMocks(toggles)) {
    return createMockMcpClient();
  }

  return createMcpClient({
    ...resolveMcpConfigFromEnv(),
    useMocks: false,
    ...overrides,
  });
};

export const getMcpProductRecommendations = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
): Promise<McpResponse<ProductRecommendation[]>> => {
  const client = getMcpClient(toggles);
  return client.getProductRecommendations({
    ...context,
    resource: McpResourceType.ProductRecommendation,
  });
};

export const getMcpInventorySignals = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
): Promise<McpResponse<InventorySignal[]>> => {
  const client = getMcpClient(toggles);
  return client.getInventorySignals({
    ...context,
    resource: McpResourceType.InventorySignal,
  });
};

export const getMcpSeoOpportunities = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
): Promise<McpResponse<SeoOpportunity[]>> => {
  const client = getMcpClient(toggles);
  return client.getSeoOpportunities({
    ...context,
    resource: McpResourceType.SeoOpportunity,
  });
};

export {
  McpClientConfig,
  McpResourceType,
  DEFAULT_RESOURCE_PATHS,
  mockInventorySignals,
  mockProductRecommendations,
  mockSeoOpportunities,
  type McpRequestContext,
  type ProductRecommendation,
  type InventorySignal,
  type SeoOpportunity,
  type McpResponse,
};
