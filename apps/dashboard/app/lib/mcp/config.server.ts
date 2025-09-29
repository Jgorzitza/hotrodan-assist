import type { McpClientConfig } from "./client.server";
import { resolveMcpConfigFromEnv } from ".";
import { storeSettingsRepository } from "../settings/repository.server";

const coerceString = (value: string | null | undefined) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const coerceNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? undefined : value;

export type McpClientOverrides = Pick<
  McpClientConfig,
  "apiKey" | "endpoint" | "timeoutMs" | "maxRetries"
>;

export const getMcpClientOverridesForShop = async (
  shopDomain: string,
): Promise<McpClientOverrides> => {
  const [apiKey, overrides] = await Promise.all([
    storeSettingsRepository.getDecryptedSecret(shopDomain, "mcp"),
    storeSettingsRepository.getMcpIntegrationOverrides(shopDomain),
  ]);

  return {
    apiKey: coerceString(apiKey),
    endpoint: coerceString(overrides.endpoint),
    timeoutMs: coerceNumber(overrides.timeoutMs),
    maxRetries: coerceNumber(overrides.maxRetries),
  } satisfies McpClientOverrides;
};

export const resolveMcpClientConfigForShop = async (
  shopDomain: string,
): Promise<McpClientConfig> => {
  const overrides = await getMcpClientOverridesForShop(shopDomain);
  return resolveMcpConfigFromEnv(overrides);
};
