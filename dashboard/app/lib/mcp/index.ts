import { createMcpClient, type McpClientConfig } from "./client.server";
import { buildMcpMetricsTelemetry } from "./telemetry.server";
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
  overrides?: Pick<
    McpClientConfig,
    | "apiKey"
    | "endpoint"
    | "maxRetries"
    | "timeoutMs"
    | "maxConcurrent"
    | "rateLimitRps"
    | "breaker"
    | "keepAlive"
    | "cacheTtlMs"
    | "cacheSize"
  >,
): McpClientConfig => {
  const apiKey = selectString(overrides?.apiKey, process.env.MCP_API_KEY);
  const endpoint = selectString(overrides?.endpoint, process.env.MCP_API_URL);
  const maxRetries = selectNumber(overrides?.maxRetries, process.env.MCP_MAX_RETRIES);
  const timeoutMs = selectNumber(overrides?.timeoutMs, process.env.MCP_TIMEOUT_MS);

  const maxConcurrent = selectNumber(overrides?.maxConcurrent, process.env.MCP_MAX_CONCURRENT);
  const rateLimitRps = selectNumber(overrides?.rateLimitRps, process.env.MCP_RATE_LIMIT_RPS);

  const breakerFailureThreshold = selectNumber(
    overrides?.breaker?.failureThreshold,
    process.env.MCP_BREAKER_FAILURE_THRESHOLD,
  );
  const breakerCooldownMs = selectNumber(
    overrides?.breaker?.cooldownMs,
    process.env.MCP_BREAKER_COOLDOWN_MS,
  );
  const breakerHalfOpenMax = selectNumber(
    overrides?.breaker?.halfOpenMax,
    process.env.MCP_BREAKER_HALF_OPEN_MAX,
  );

  const hasBreakerEnv =
    breakerFailureThreshold !== undefined ||
    breakerCooldownMs !== undefined ||
    breakerHalfOpenMax !== undefined;

  const breaker = hasBreakerEnv
    ? {
        failureThreshold: breakerFailureThreshold,
        cooldownMs: breakerCooldownMs,
        halfOpenMax: breakerHalfOpenMax,
      }
    : overrides?.breaker;

  const keepAliveEnv = process.env.MCP_KEEP_ALIVE;
  const keepAlive =
    overrides?.keepAlive !== undefined
      ? overrides.keepAlive
      : keepAliveEnv !== undefined
        ? parseBoolean(keepAliveEnv, false)
        : undefined;

  const cacheTtlMs = selectNumber(overrides?.cacheTtlMs, process.env.MCP_CACHE_TTL_MS);
  const cacheSize = selectNumber(overrides?.cacheSize, process.env.MCP_CACHE_SIZE);

  return {
    apiKey,
    endpoint,
    maxRetries,
    timeoutMs,
    maxConcurrent,
    rateLimitRps,
    breaker,
    keepAlive,
    cacheTtlMs,
    cacheSize,
  } as McpClientConfig;
};

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
    telemetry: (runtimeOverrides as any)?.telemetry ?? buildMcpMetricsTelemetry(),
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

export { createMcpTelemetryHooks } from "./telemetry.server";
