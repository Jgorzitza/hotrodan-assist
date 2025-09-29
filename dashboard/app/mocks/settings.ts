import type {
  ConnectionAttempt,
  ConnectionHealth,
  FeatureToggles,
  SecretMetadata,
  SettingsPayload,
  SettingsProvider,
  ThresholdSettings,
} from "../types/settings";

import { clone } from "./shared";

export const BASE_SHOP_DOMAIN = "demo-shop.myshopify.com";
const HISTORY_LIMIT = 5;

const baseThresholds: ThresholdSettings = {
  lowStockMinimum: 8,
  overdueOrderHours: 12,
  overstockPercentage: 35,
};

const baseToggles: FeatureToggles = {
  enableMcpIntegration: true,
  enableExperimentalWidgets: false,
  enableBetaWorkflows: false,
  enableAssistantsProvider: false,
  useMockData: true,
  enableMcp: false,
  enableSeo: false,
  enableInventory: false,
};

const baseSecretMetadata: Record<SettingsProvider, SecretMetadata | null> = {
  ga4: {
    provider: "ga4",
    maskedValue: "••••1234",
    lastUpdatedAt: "2024-01-12T12:00:00.000Z",
    lastVerifiedAt: "2024-02-02T09:15:00.000Z",
  },
  gsc: {
    provider: "gsc",
    maskedValue: "••••5678",
    lastUpdatedAt: "2023-12-20T15:30:00.000Z",
    lastVerifiedAt: "2024-01-05T18:20:00.000Z",
    rotationReminderAt: "2024-03-01T00:00:00.000Z",
  },
  bing: null,
  mcp: null,
};

const baseConnections: Record<SettingsProvider, ConnectionHealth> = {
  ga4: {
    provider: "ga4",
    status: "success",
    lastCheckedAt: "2024-02-05T14:10:00.000Z",
    message: "GA4 responded in 420ms",
    history: [
      {
        id: "ga4-20240130",
        provider: "ga4",
        status: "success",
        timestamp: "2024-01-30T11:10:00.000Z",
        durationMs: 410,
        message: "HTTP 200",
      },
      {
        id: "ga4-20240205",
        provider: "ga4",
        status: "success",
        timestamp: "2024-02-05T14:10:00.000Z",
        durationMs: 420,
        message: "HTTP 200",
      },
    ],
  },
  gsc: {
    provider: "gsc",
    status: "warning",
    lastCheckedAt: "2024-02-04T08:50:00.000Z",
    message: "Slow response (1.2s). Retry suggested.",
    history: [
      {
        id: "gsc-20240118",
        provider: "gsc",
        status: "success",
        timestamp: "2024-01-18T10:05:00.000Z",
        durationMs: 520,
        message: "HTTP 200",
      },
      {
        id: "gsc-20240204",
        provider: "gsc",
        status: "warning",
        timestamp: "2024-02-04T08:50:00.000Z",
        durationMs: 1200,
        message: "Response exceeded SLA",
      },
    ],
  },
  bing: {
    provider: "bing",
    status: "error",
    lastCheckedAt: "2024-02-02T13:40:00.000Z",
    message: "API key missing. Add credential to enable tests.",
    history: [
      {
        id: "bing-20240202",
        provider: "bing",
        status: "error",
        timestamp: "2024-02-02T13:40:00.000Z",
        durationMs: 0,
        message: "Credential not provided",
      },
    ],
  },
  mcp: {
    provider: "mcp",
    status: "warning",
    lastCheckedAt: "2024-02-06T10:00:00.000Z",
    message: "Mock MCP client active. Supply live credentials to enable ping tests.",
    history: [
      {
        id: "mcp-20240206",
        provider: "mcp",
        status: "warning",
        timestamp: "2024-02-06T10:00:00.000Z",
        durationMs: 250,
        message: "Using mock transport",
      },
    ],
  },
};

const settingsByShop = new Map<string, SettingsPayload>();

const createBaseSettings = (shopDomain: string): SettingsPayload => ({
  shopDomain,
  thresholds: clone(baseThresholds),
  toggles: clone(baseToggles),
  secrets: clone(baseSecretMetadata),
  connections: clone(baseConnections),
});

const ensureSettings = (shopDomain: string): SettingsPayload => {
  if (!settingsByShop.has(shopDomain)) {
    const initial = createBaseSettings(shopDomain);
    settingsByShop.set(shopDomain, initial);
  }

  return settingsByShop.get(shopDomain)!;
};

export const resetMockSettings = (shopDomain: string = BASE_SHOP_DOMAIN) => {
  settingsByShop.set(shopDomain, createBaseSettings(shopDomain));
};

export const getMockSettings = (
  shopDomain: string = BASE_SHOP_DOMAIN,
): SettingsPayload => {
  const current = ensureSettings(shopDomain);
  return clone(current);
};

export const updateMockThresholds = (
  shopDomain: string,
  thresholds: ThresholdSettings,
): SettingsPayload => {
  const current = ensureSettings(shopDomain);
  current.thresholds = { ...thresholds };
  return clone(current);
};

export const updateMockToggles = (
  shopDomain: string,
  toggles: FeatureToggles,
): SettingsPayload => {
  const current = ensureSettings(shopDomain);
  current.toggles = { ...toggles };
  return clone(current);
};

export const updateMockSecret = (
  shopDomain: string,
  provider: SettingsProvider,
  secret: SecretMetadata | null,
): SettingsPayload => {
  const current = ensureSettings(shopDomain);
  current.secrets[provider] = secret ? { ...secret } : null;
  return clone(current);
};

export const recordMockConnectionAttempt = (
  shopDomain: string,
  attempt: ConnectionAttempt,
): SettingsPayload => {
  const current = ensureSettings(shopDomain);
  const connection = current.connections[attempt.provider] ?? {
    provider: attempt.provider,
    status: attempt.status,
    history: [],
  };

  const history = [clone(attempt), ...connection.history];
  connection.status = attempt.status;
  connection.lastCheckedAt = attempt.timestamp;
  connection.message = attempt.message;
  connection.history = history.slice(0, HISTORY_LIMIT);
  current.connections[attempt.provider] = connection as ConnectionHealth;

  return clone(current);
};

resetMockSettings();
