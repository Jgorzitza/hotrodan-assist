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
import { createMcpTelemetryHooks } from "./telemetry.server";
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

const selectString = (override?: string, fallback?: string) => {
  if (override && override.trim().length > 0) {
    return override;
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }

  return undefined;
};

const selectNumber = (override?: number, fallback?: string) => {
  if (override !== undefined && override !== null) {
    return override;
  }

  return parseNumber(fallback);
};

const stripPersistedKeys = (
  overrides?: McpClientConfig,
): Partial<McpClientConfig> | undefined => {
  if (!overrides) {
    return undefined;
  }

  const {
    apiKey: _apiKey,
    endpoint: _endpoint,
    maxRetries: _maxRetries,
    timeoutMs: _timeoutMs,
    ...rest
  } = overrides;
  return rest as Partial<McpClientConfig>;
};

export const resolveMcpConfigFromEnv = (
  overrides?: Pick<McpClientConfig, "apiKey" | "endpoint" | "maxRetries" | "timeoutMs">,
): McpClientConfig => ({
  apiKey: selectString(overrides?.apiKey, process.env.MCP_API_KEY),
  endpoint: selectString(overrides?.endpoint, process.env.MCP_API_URL),
  maxRetries: selectNumber(overrides?.maxRetries, process.env.MCP_MAX_RETRIES),
  timeoutMs: selectNumber(overrides?.timeoutMs, process.env.MCP_TIMEOUT_MS),
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

  const runtimeOverrides = stripPersistedKeys(overrides) ?? {};

  return createMcpClient({
    ...resolveMcpConfigFromEnv(overrides),
    ...runtimeOverrides,
    useMocks: false,
    // inject default telemetry that emits Prometheus counters
    telemetry: (runtimeOverrides as any)?.telemetry ?? require("./telemetry.server").buildMcpMetricsTelemetry(),
  });
};

export const getMcpProductRecommendations = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
  overrides?: McpClientConfig,
): Promise<McpResponse<ProductRecommendation[]>> => {
  const client = getMcpClient(toggles, overrides);
  return client.getProductRecommendations({
    ...context,
    resource: McpResourceType.ProductRecommendation,
  });
};

export const getMcpInventorySignals = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
  overrides?: McpClientConfig,
): Promise<McpResponse<InventorySignal[]>> => {
  const client = getMcpClient(toggles, overrides);
  return client.getInventorySignals({
    ...context,
    resource: McpResourceType.InventorySignal,
  });
};

export const getMcpSeoOpportunities = (
  context: Omit<McpRequestContext, "resource">,
  toggles?: FeatureToggles | null,
  overrides?: McpClientConfig,
): Promise<McpResponse<SeoOpportunity[]>> => {
  const client = getMcpClient(toggles, overrides);
  return client.getSeoOpportunities({
    ...context,
    resource: McpResourceType.SeoOpportunity,
  });
};

export {
  createMcpClient,
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
