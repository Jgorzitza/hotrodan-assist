import prismaPkg from "@prisma/client";

import { encryptSecret, maskSecret } from "~/lib/security/secrets.server";
import { BASE_SHOP_DOMAIN, getMockSettings } from "~/mocks/settings";
const { ConnectionEventStatus, IntegrationProvider, SettingsSecretProvider, StoreStatus } = prismaPkg;

export const SETTINGS_SEED_NOTIFICATION_EMAIL = "ops@seed-demo.test";

export const SETTINGS_SECRET_SEEDS: Record<SettingsSecretProvider, string | null> = {
  [SettingsSecretProvider.ga4]: null,
  [SettingsSecretProvider.gsc]: "mock-gsc-credentials-5678",
  [SettingsSecretProvider.bing]: null,
  [SettingsSecretProvider.mcp]: null,
};

export const SETTINGS_MCP_OVERRIDES = {
  endpoint: null,
  timeoutMs: null,
  maxRetries: null,
} as const;

export const SETTINGS_SEED_ACCESS_TOKEN = "shpat_seed_123456789";

export type SettingsPrismaSeed = {
  store: {
    name: string;
    planLevel: string;
    timezone: string;
    status: StoreStatus;
    onboardingCompletedAt: Date;
    lastSyncedAt: Date;
    accessTokenCipher: string;
  };
  storeSettings: {
    thresholds: unknown;
    featureFlags: unknown;
    connectionMetadata: unknown;
    notificationEmails: string;
    lastRotationAt: Date;
    lastInventorySyncAt: Date;
  };
  storeSecrets: Array<{
    provider: SettingsSecretProvider;
    ciphertext: string;
    maskedValue: string;
    lastVerifiedAt: Date | null;
    rotationReminderAt: Date | null;
  }>;
  connectionEvents: Array<{
    id: string;
    integration: IntegrationProvider;
    status: ConnectionEventStatus;
    message: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export type BuildSettingsPrismaSeedOptions = {
  storeId: string;
  shopDomain: string;
  now?: Date;
};

export const buildSettingsPrismaSeed = (
  options: BuildSettingsPrismaSeedOptions,
): SettingsPrismaSeed => {
  const now = options.now ?? new Date();
  const settings = getMockSettings(options.shopDomain);

  const thresholds = settings.thresholds;
  const featureFlags = settings.toggles;
  const connectionMetadata = {
    connections: settings.connections,
    mcpOverrides: { ...SETTINGS_MCP_OVERRIDES },
  };

  const secretEntries = (Object.values(SettingsSecretProvider) as SettingsSecretProvider[])
    .map((provider) => {
      const plaintext = SETTINGS_SECRET_SEEDS[provider];
      const metadata = settings.secrets[provider];
      if (!plaintext) {
        return null;
      }

      return {
        provider,
        ciphertext: encryptSecret(plaintext),
        maskedValue: metadata?.maskedValue ?? maskSecret(plaintext),
        lastVerifiedAt: metadata?.lastVerifiedAt ? new Date(metadata.lastVerifiedAt) : null,
        rotationReminderAt: metadata?.rotationReminderAt
          ? new Date(metadata.rotationReminderAt)
          : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const lastRotationAt = settings.secrets.ga4?.lastUpdatedAt
    ? new Date(settings.secrets.ga4.lastUpdatedAt)
    : now;

  const ga4Connection = settings.connections.ga4;
  const ga4SeedTimestamp =
    ga4Connection?.lastCheckedAt ??
    ga4Connection?.history?.[0]?.timestamp ??
    now.toISOString();
  const ga4CreatedAt = new Date(ga4SeedTimestamp);

  return {
    store: {
      name: "Demo Seed Shop",
      planLevel: "pro",
      timezone: "America/Toronto",
      status: StoreStatus.ACTIVE,
      onboardingCompletedAt: now,
      lastSyncedAt: now,
      accessTokenCipher: encryptSecret(SETTINGS_SEED_ACCESS_TOKEN),
    },
    storeSettings: {
      thresholds,
      featureFlags,
      connectionMetadata,
      notificationEmails: SETTINGS_SEED_NOTIFICATION_EMAIL,
      lastRotationAt,
      lastInventorySyncAt: now,
    },
    storeSecrets: secretEntries,
    connectionEvents: [
      {
        id: "seed-connection-ga4",
        integration: IntegrationProvider.GA4,
        status: ConnectionEventStatus.SUCCESS,
        message: "GA4 credentials verified",
        metadata: { latencyMs: 420 },
        createdAt: ga4CreatedAt,
        updatedAt: ga4CreatedAt,
      },
    ],
  };
};

export const buildDefaultSettingsPrismaSeed = (
  storeId: string,
  now = new Date(),
) => buildSettingsPrismaSeed({ storeId, shopDomain: BASE_SHOP_DOMAIN, now });
