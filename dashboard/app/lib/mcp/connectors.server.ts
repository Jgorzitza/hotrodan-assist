import { getMcpClient } from "./index";
import { resolveMcpClientConfigForShop } from "./config.server";
import { storeSettingsRepository } from "../settings/repository.server";
import type { ConnectionStatusState, FeatureToggles } from "~/types/settings";
import { buildDefaultConnectorRegistry } from "./registry-integrations.server";
import { runConnectionTest } from "~/lib/settings/connection-tests.server";

export type ConnectorStatus = {
  key: string;
  name: string;
  mode: "live" | "mock";
  status: ConnectionStatusState;
  lastCheckedAt: string;
  latencyMs?: number;
};

export const getMcpConnectorStatus = async (shopDomain: string): Promise<ConnectorStatus> => {
  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles: FeatureToggles | null = settings?.toggles ?? null;

  const overrides = await resolveMcpClientConfigForShop(shopDomain);
  const client = getMcpClient(toggles, overrides);

  const started = Date.now();
  const ok = await client.ping();
  const latencyMs = Date.now() - started;
  const status: ConnectionStatusState = ok ? "success" : "error";

  await storeSettingsRepository.recordConnectionTest(shopDomain, {
    provider: "mcp",
    status,
    durationMs: latencyMs,
    message: ok ? "mcp.ping ok" : "mcp.ping failed",
  });

  const mode: "live" | "mock" = (client as any).shouldUseMocks?.() ? "mock" : "live";

  return {
    key: "mcp",
    name: "MCP",
    mode,
    status,
    lastCheckedAt: new Date().toISOString(),
    latencyMs,
  };
};

const coerceMode = (hasCredential: boolean): "live" | "mock" => (hasCredential ? "live" : "mock");

export const listConnectors = async (shopDomain: string): Promise<ConnectorStatus[]> => {
  // Always include MCP first to preserve test expectations
  const results: ConnectorStatus[] = [await getMcpConnectorStatus(shopDomain)];

  const registry = buildDefaultConnectorRegistry();
  const metas = registry
    .list()
    .map((c) => c.meta)
    // Keep a stable order but ensure MCP (already added) is skipped here
    .filter((m) => m.id !== "mcp");

  // Provider id -> settings secret key mapping aligns with storeSettingsRepository
  const providerIds: Array<{ id: string; name: string }> = metas.map((m) => ({ id: m.id, name: m.name }));

  for (const { id, name } of providerIds) {
    // Only run connection tests for supported providers in runConnectionTest
    if (id === "ga4" || id === "gsc" || id === "bing") {
      const secret = await storeSettingsRepository.getDecryptedSecret(shopDomain, id as any);
      const hasSecret = typeof secret === "string" && secret.trim().length > 0;
      try {
        const res = await runConnectionTest({
          provider: id as any,
          credential: hasSecret ? (secret as string) : "",
        });
        // Record the attempt for auditing parity with MCP
        await storeSettingsRepository.recordConnectionTest(shopDomain, {
          provider: id as any,
          status: res.status,
          durationMs: res.durationMs,
          message: res.message,
        });
        results.push({
          key: id,
          name,
          mode: coerceMode(hasSecret),
          status: res.status,
          lastCheckedAt: new Date().toISOString(),
          latencyMs: res.durationMs,
        });
      } catch {
        results.push({
          key: id,
          name,
          mode: coerceMode(hasSecret),
          status: "error",
          lastCheckedAt: new Date().toISOString(),
        });
      }
    } else {
      // Unsupported providers (e.g., shopify, zoho_mail) — report as warning in mock mode
      results.push({
        key: id,
        name,
        mode: "mock",
        status: "warning",
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }

  return results;
};
