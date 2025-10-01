import { getMcpClient } from "./index";
import { resolveMcpClientConfigForShop } from "./config.server";
import { storeSettingsRepository } from "../settings/repository.server";
import type { ConnectionStatusState, FeatureToggles } from "~/types/settings";

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

export const listConnectors = async (shopDomain: string): Promise<ConnectorStatus[]> => {
  const mcp = await getMcpConnectorStatus(shopDomain);
  return [mcp];
};