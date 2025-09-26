import {
  getMockSettings,
  recordMockConnectionAttempt,
  updateMockSecret,
  updateMockThresholds,
  updateMockToggles,
} from "../../mocks/settings";
import type {
  ConnectionStatusState,
  SecretMetadata,
  SettingsPayload,
  SettingsProvider,
  ThresholdSettings,
  FeatureToggles,
} from "../../types/settings";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "../security/secrets.server";

const defaultSecretSeeds: Record<SettingsProvider, string | null> = {
  ga4: "mock-ga4-service-account-1234",
  gsc: "mock-gsc-credentials-5678",
  bing: null,
};

const encryptedSecretsStore = new Map<
  string,
  Record<SettingsProvider, string | null>
>();

const ensureEncryptedSecrets = (
  shopDomain: string,
): Record<SettingsProvider, string | null> => {
  if (!encryptedSecretsStore.has(shopDomain)) {
    const seeds: Record<SettingsProvider, string | null> = {
      ga4: null,
      gsc: null,
      bing: null,
    };

    (Object.keys(defaultSecretSeeds) as SettingsProvider[]).forEach(
      (provider) => {
        const seed = defaultSecretSeeds[provider];
        seeds[provider] = seed ? encryptSecret(seed) : null;
      },
    );

    encryptedSecretsStore.set(shopDomain, seeds);
  }

  return encryptedSecretsStore.get(shopDomain)!;
};

type UpdateSecretInput = {
  provider: SettingsProvider;
  secret: string | null;
  verifiedAt?: string | null;
  rotationReminderAt?: string | null;
};

type RecordConnectionTestInput = {
  provider: SettingsProvider;
  status: ConnectionStatusState;
  durationMs: number;
  message?: string;
  timestamp?: string;
};

const buildSecretMetadata = (
  provider: SettingsProvider,
  secret: string,
  verifiedAt?: string | null,
  rotationReminderAt?: string | null,
): SecretMetadata => ({
  provider,
  maskedValue: maskSecret(secret),
  lastUpdatedAt: new Date().toISOString(),
  lastVerifiedAt: verifiedAt ?? undefined,
  rotationReminderAt: rotationReminderAt ?? undefined,
});

export class StoreSettingsRepository {
  async getSettings(shopDomain: string): Promise<SettingsPayload> {
    ensureEncryptedSecrets(shopDomain);
    return getMockSettings(shopDomain);
  }

  async updateThresholds(
    shopDomain: string,
    thresholds: ThresholdSettings,
  ): Promise<SettingsPayload> {
    return updateMockThresholds(shopDomain, thresholds);
  }

  async updateToggles(
    shopDomain: string,
    toggles: FeatureToggles,
  ): Promise<SettingsPayload> {
    return updateMockToggles(shopDomain, toggles);
  }

  async updateSecret(
    shopDomain: string,
    input: UpdateSecretInput,
  ): Promise<SettingsPayload> {
    const bucket = ensureEncryptedSecrets(shopDomain);

    if (!input.secret) {
      bucket[input.provider] = null;
      return updateMockSecret(shopDomain, input.provider, null);
    }

    bucket[input.provider] = encryptSecret(input.secret);
    const metadata = buildSecretMetadata(
      input.provider,
      input.secret,
      input.verifiedAt,
      input.rotationReminderAt,
    );

    return updateMockSecret(shopDomain, input.provider, metadata);
  }

  async getDecryptedSecret(
    shopDomain: string,
    provider: SettingsProvider,
  ): Promise<string | null> {
    const bucket = ensureEncryptedSecrets(shopDomain);
    return decryptSecret(bucket[provider] ?? null);
  }

  async recordConnectionTest(
    shopDomain: string,
    input: RecordConnectionTestInput,
  ): Promise<SettingsPayload> {
    const timestamp = input.timestamp ?? new Date().toISOString();
    return recordMockConnectionAttempt(shopDomain, {
      id: `${input.provider}-${timestamp}`,
      provider: input.provider,
      status: input.status,
      timestamp,
      durationMs: input.durationMs,
      message: input.message,
    });
  }
}

export const storeSettingsRepository = new StoreSettingsRepository();
