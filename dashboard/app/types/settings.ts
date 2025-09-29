export type SettingsProvider = "ga4" | "gsc" | "bing" | "mcp";

export type ThresholdSettings = {
  lowStockMinimum: number;
  overdueOrderHours: number;
  overstockPercentage: number;
};

export type FeatureToggles = {
  enableMcpIntegration: boolean;
  enableExperimentalWidgets: boolean;
  enableBetaWorkflows: boolean;
  enableAssistantsProvider: boolean;
  useMockData: boolean;
  enableMcp: boolean;
  enableSeo: boolean;
  enableInventory: boolean;
};

export type SecretMetadata = {
  provider: SettingsProvider;
  maskedValue: string;
  lastUpdatedAt: string;
  lastVerifiedAt?: string;
  rotationReminderAt?: string;
};

export type ConnectionStatusState = "success" | "warning" | "error";

export type ConnectionAttempt = {
  id: string;
  provider: SettingsProvider;
  status: ConnectionStatusState;
  timestamp: string;
  durationMs: number;
  message?: string;
};

export type ConnectionHealth = {
  provider: SettingsProvider;
  status: ConnectionStatusState;
  lastCheckedAt?: string;
  message?: string;
  history: ConnectionAttempt[];
};

export type SettingsSecrets = Record<SettingsProvider, SecretMetadata | null>;

export type SettingsConnections = Record<SettingsProvider, ConnectionHealth>;

export type SettingsPayload = {
  shopDomain: string;
  thresholds: ThresholdSettings;
  toggles: FeatureToggles;
  secrets: SettingsSecrets;
  connections: SettingsConnections;
};
