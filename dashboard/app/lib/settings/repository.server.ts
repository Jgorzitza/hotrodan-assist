import prismaPkg from "@prisma/client";
import type { Prisma } from "@prisma/client";

import {
  getMockSettings,
  recordMockConnectionAttempt,
  updateMockSecret,
  updateMockThresholds,
  updateMockToggles,
} from "../../mocks/settings";
import type {
  ConnectionAttempt,
  ConnectionStatusState,
  FeatureToggles,
  SecretMetadata,
  SettingsConnections,
  SettingsPayload,
  SettingsProvider,
  SettingsSecrets,
  ThresholdSettings,
} from "../../types/settings";
import {
  maskSecret,
} from "../security/secrets.server";
import { getSecretsAdapter } from "../security/secrets-adapter.server";
import { recordAuditEvent } from "../security/audit.server";
import { isMockMode } from "../env.server";
import prisma from "../../db.server";
const { ConnectionEventStatus, IntegrationProvider, SettingsSecretProvider } = prismaPkg;

const PROVIDERS: SettingsProvider[] = ["ga4", "gsc", "bing", "mcp"];

export type McpIntegrationOverrides = {
  endpoint: string | null;
  timeoutMs: number | null;
  maxRetries: number | null;
};

const createDefaultMcpOverrides = (): McpIntegrationOverrides => ({
  endpoint: null,
  timeoutMs: null,
  maxRetries: null,
});

const cloneMcpOverrides = (
  overrides: McpIntegrationOverrides,
): McpIntegrationOverrides => ({
  endpoint: overrides.endpoint,
  timeoutMs: overrides.timeoutMs,
  maxRetries: overrides.maxRetries,
});

const toJson = <T>(value: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

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

type SettingsRepositoryContract = {
  getSettings(shopDomain: string): Promise<SettingsPayload>;
  updateThresholds(
    shopDomain: string,
    thresholds: ThresholdSettings,
  ): Promise<SettingsPayload>;
  updateToggles(
    shopDomain: string,
    toggles: FeatureToggles,
  ): Promise<SettingsPayload>;
  updateSecret(
    shopDomain: string,
    input: UpdateSecretInput,
  ): Promise<SettingsPayload>;
  getDecryptedSecret(
    shopDomain: string,
    provider: SettingsProvider,
  ): Promise<string | null>;
  getMcpIntegrationOverrides(
    shopDomain: string,
  ): Promise<McpIntegrationOverrides>;
  updateMcpIntegrationOverrides(
    shopDomain: string,
    input: Partial<McpIntegrationOverrides>,
  ): Promise<McpIntegrationOverrides>;
  recordConnectionTest(
    shopDomain: string,
    input: RecordConnectionTestInput,
  ): Promise<SettingsPayload>;
};

// Mock-backed implementation retained for USE_MOCK_DATA flows and tests.
const defaultSecretSeeds: Record<SettingsProvider, string | null> = {
  ga4: "mock-ga4-service-account-1234",
  gsc: "mock-gsc-credentials-5678",
  bing: null,
  mcp: null,
};

const encryptedSecretsStore = new Map<
  string,
  Record<SettingsProvider, string | null>
>();

const mcpOverridesStore = new Map<string, McpIntegrationOverrides>();

const ensureEncryptedSecrets = (
  shopDomain: string,
): Record<SettingsProvider, string | null> => {
  const adapter = getSecretsAdapter();
  if (!encryptedSecretsStore.has(shopDomain)) {
    const seeds: Record<SettingsProvider, string | null> = {
      ga4: null,
      gsc: null,
      bing: null,
      mcp: null,
    };

    PROVIDERS.forEach((provider) => {
      const seed = defaultSecretSeeds[provider];
      seeds[provider] = seed ? adapter.encrypt(seed) : null;
    });

    encryptedSecretsStore.set(shopDomain, seeds);
  }

  return encryptedSecretsStore.get(shopDomain)!;
};

const ensureMcpOverrides = (shopDomain: string): McpIntegrationOverrides => {
  if (!mcpOverridesStore.has(shopDomain)) {
    mcpOverridesStore.set(shopDomain, createDefaultMcpOverrides());
  }

  return mcpOverridesStore.get(shopDomain)!;
};

class MockStoreSettingsRepository implements SettingsRepositoryContract {
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
    const adapter = getSecretsAdapter();
    const bucket = ensureEncryptedSecrets(shopDomain);

    if (!input.secret) {
      bucket[input.provider] = null;
      recordAuditEvent({ actor: shopDomain, action: "update_secret", resource: input.provider, details: { masked: null } });
      return updateMockSecret(shopDomain, input.provider, null);
    }

    // Basic validation for MCP secret quality
    if (
      input.provider === "mcp" &&
      (input.secret.length < 8 || /\s/.test(input.secret))
    ) {
      throw new Error("Invalid MCP secret: must be >= 8 chars and contain no whitespace");
    }

    bucket[input.provider] = adapter.encrypt(input.secret);
    const current = getMockSettings(shopDomain);
    const existingMetadata = current.secrets[input.provider];
    const verifiedAt =
      input.verifiedAt !== undefined
        ? input.verifiedAt
        : existingMetadata?.lastVerifiedAt ?? null;
    const rotationReminderAt =
      input.rotationReminderAt === null
        ? null
        : input.rotationReminderAt ?? existingMetadata?.rotationReminderAt ?? null;
    const metadata = this.buildSecretMetadata(
      input.provider,
      input.secret,
      verifiedAt,
      rotationReminderAt,
    );

    const result = await updateMockSecret(shopDomain, input.provider, metadata);
    recordAuditEvent({
      actor: shopDomain,
      action: "update_secret",
      resource: input.provider,
      details: { masked: metadata.maskedValue },
    });
    return result;
  }

  private buildSecretMetadata(
    provider: SettingsProvider,
    secret: string,
    verifiedAt?: string | null,
    rotationReminderAt?: string | null,
  ): SecretMetadata {
    return {
      provider,
      maskedValue: maskSecret(secret),
      lastUpdatedAt: new Date().toISOString(),
      lastVerifiedAt: verifiedAt ?? undefined,
      rotationReminderAt: rotationReminderAt ?? undefined,
    };
  }

  async getDecryptedSecret(
    shopDomain: string,
    provider: SettingsProvider,
  ): Promise<string | null> {
    const bucket = ensureEncryptedSecrets(shopDomain);
    return getSecretsAdapter().decrypt(bucket[provider] ?? null);
  }

  async getMcpIntegrationOverrides(
    shopDomain: string,
  ): Promise<McpIntegrationOverrides> {
    const overrides = ensureMcpOverrides(shopDomain);
    return cloneMcpOverrides(overrides);
  }

  async updateMcpIntegrationOverrides(
    shopDomain: string,
    input: Partial<McpIntegrationOverrides>,
  ): Promise<McpIntegrationOverrides> {
    recordAuditEvent({
      actor: shopDomain,
      action: "update_mcp_overrides",
      resource: "mcp",
      details: {
        endpoint: input.endpoint ?? undefined,
        timeoutMs: input.timeoutMs ?? undefined,
        maxRetries: input.maxRetries ?? undefined,
      },
    });
    const overrides = ensureMcpOverrides(shopDomain);

    if (Object.prototype.hasOwnProperty.call(input, "endpoint")) {
      overrides.endpoint =
        input.endpoint === undefined ? overrides.endpoint : input.endpoint;
    }

    if (Object.prototype.hasOwnProperty.call(input, "timeoutMs")) {
      overrides.timeoutMs =
        input.timeoutMs === undefined ? overrides.timeoutMs : input.timeoutMs;
    }

    if (Object.prototype.hasOwnProperty.call(input, "maxRetries")) {
      overrides.maxRetries =
        input.maxRetries === undefined ? overrides.maxRetries : input.maxRetries;
    }

    return cloneMcpOverrides(overrides);
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

// Prisma-backed implementation for live persistence.
const DEFAULT_THRESHOLDS: ThresholdSettings = {
  lowStockMinimum: 8,
  overdueOrderHours: 12,
  overstockPercentage: 35,
};

const DEFAULT_TOGGLES: FeatureToggles = {
  enableMcpIntegration: true,
  enableExperimentalWidgets: false,
  enableBetaWorkflows: false,
  enableAssistantsProvider: false,
};

const createDefaultConnections = (): SettingsConnections => ({
  ga4: {
    provider: "ga4",
    status: "warning",
    message: "No GA4 checks recorded yet.",
    history: [],
  },
  gsc: {
    provider: "gsc",
    status: "warning",
    message: "No GSC checks recorded yet.",
    history: [],
  },
  bing: {
    provider: "bing",
    status: "warning",
    message: "No Bing checks recorded yet.",
    history: [],
  },
  mcp: {
    provider: "mcp",
    status: "warning",
    message: "No MCP checks recorded yet.",
    history: [],
  },
});

const SECRET_PROVIDER_MAP: Record<SettingsProvider, SettingsSecretProvider> = {
  ga4: SettingsSecretProvider.ga4,
  gsc: SettingsSecretProvider.gsc,
  bing: SettingsSecretProvider.bing,
  mcp: SettingsSecretProvider.mcp,
};

const INTEGRATION_PROVIDER_MAP: Record<SettingsProvider, IntegrationProvider> = {
  ga4: IntegrationProvider.GA4,
  gsc: IntegrationProvider.GSC,
  bing: IntegrationProvider.BING,
  mcp: IntegrationProvider.MCP,
};

const EVENT_STATUS_TO_CONNECTION_STATUS: Record<
  ConnectionEventStatus,
  ConnectionStatusState
> = {
  [ConnectionEventStatus.SUCCESS]: "success",
  [ConnectionEventStatus.WARNING]: "warning",
  [ConnectionEventStatus.FAILURE]: "error",
  [ConnectionEventStatus.INFO]: "success",
};

const CONNECTION_STATUS_TO_EVENT_STATUS: Record<
  ConnectionStatusState,
  ConnectionEventStatus
> = {
  success: ConnectionEventStatus.SUCCESS,
  warning: ConnectionEventStatus.WARNING,
  error: ConnectionEventStatus.FAILURE,
};

type StoreWithRelations = Prisma.StoreGetPayload<{
  include: {
    settings: true;
    secrets: true;
  };
}>;

type ConnectionEventWithMetadata = Prisma.ConnectionEventGetPayload<{
  select: {
    id: true;
    integration: true;
    status: true;
    message: true;
    metadata: true;
    createdAt: true;
  };
}>;

type ParsedConnectionMetadata = {
  connections: Partial<SettingsConnections>;
  overrides: McpIntegrationOverrides;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
};

const parseConnectionStatus = (
  value: unknown,
  fallback: ConnectionStatusState,
): ConnectionStatusState => {
  if (value === "success" || value === "warning" || value === "error") {
    return value;
  }

  return fallback;
};

const parseHistory = (value: unknown): ConnectionAttempt[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const attempts: ConnectionAttempt[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const candidate = entry as Record<string, unknown>;
    const provider = candidate.provider;
    if (
      provider !== "ga4" &&
      provider !== "gsc" &&
      provider !== "bing" &&
      provider !== "mcp"
    ) {
      continue;
    }

    const timestamp = candidate.timestamp;
    if (typeof timestamp !== "string") {
      continue;
    }

    const duration = Number(candidate.durationMs);
    if (!Number.isFinite(duration)) {
      continue;
    }

    const status = parseConnectionStatus(candidate.status, "warning");

    attempts.push({
      id: typeof candidate.id === "string" ? candidate.id : `${provider}-${timestamp}`,
      provider,
      status,
      timestamp,
      durationMs: duration,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
    });

    if (attempts.length >= 5) {
      break;
    }
  }

  return attempts;
};

const parseConnections = (
  value: unknown,
  defaults: SettingsConnections,
): Partial<SettingsConnections> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const output: Partial<SettingsConnections> = {};

  for (const provider of PROVIDERS) {
    const entry = record[provider];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const candidate = entry as Record<string, unknown>;
    const status = parseConnectionStatus(
      candidate.status,
      defaults[provider].status,
    );
    const lastCheckedAt =
      typeof candidate.lastCheckedAt === "string"
        ? candidate.lastCheckedAt
        : defaults[provider].lastCheckedAt;
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : defaults[provider].message;

    const history = parseHistory(candidate.history);

    output[provider] = {
      provider,
      status,
      lastCheckedAt,
      message,
      history,
    };
  }

  return output;
};

const parseOverrides = (value: unknown): McpIntegrationOverrides => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultMcpOverrides();
  }

  const record = value as Record<string, unknown>;
  const endpoint =
    typeof record.endpoint === "string" && record.endpoint.trim().length > 0
      ? record.endpoint.trim()
      : null;
  const timeoutValue = record.timeoutMs;
  let timeout: number | null = null;
  if (typeof timeoutValue === "number") {
    timeout = Number.isFinite(timeoutValue) ? timeoutValue : null;
  } else if (
    typeof timeoutValue === "string" &&
    timeoutValue.trim().length > 0 &&
    Number.isFinite(Number(timeoutValue))
  ) {
    timeout = Number(timeoutValue);
  }

  const maxRetriesValue = record.maxRetries;
  let maxRetries: number | null = null;
  if (typeof maxRetriesValue === "number") {
    maxRetries = Number.isFinite(maxRetriesValue) ? maxRetriesValue : null;
  } else if (
    typeof maxRetriesValue === "string" &&
    maxRetriesValue.trim().length > 0 &&
    Number.isFinite(Number(maxRetriesValue))
  ) {
    maxRetries = Number(maxRetriesValue);
  }

  return {
    endpoint,
    timeoutMs: timeout,
    maxRetries,
  } satisfies McpIntegrationOverrides;
};

const parseConnectionMetadata = (
  value: Prisma.JsonValue | null | undefined,
): ParsedConnectionMetadata => {
  const defaults = createDefaultConnections();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      connections: {},
      overrides: createDefaultMcpOverrides(),
    } satisfies ParsedConnectionMetadata;
  }

  const record = value as Record<string, unknown>;

  if ("connections" in record || "mcpOverrides" in record) {
    return {
      connections: parseConnections(record.connections, defaults),
      overrides: parseOverrides(record.mcpOverrides),
    } satisfies ParsedConnectionMetadata;
  }

  return {
    connections: parseConnections(record, defaults),
    overrides: createDefaultMcpOverrides(),
  } satisfies ParsedConnectionMetadata;
};

const mapIntegrationToSettingsProvider = (
  integration: IntegrationProvider,
): SettingsProvider | null => {
  switch (integration) {
    case IntegrationProvider.GA4:
      return "ga4";
    case IntegrationProvider.GSC:
      return "gsc";
    case IntegrationProvider.BING:
      return "bing";
    case IntegrationProvider.MCP:
      return "mcp";
    default:
      return null;
  }
};

const extractDuration = (metadata: Prisma.JsonValue | null): number => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const record = metadata as Record<string, unknown>;
  const duration = Number(record.durationMs);
  return Number.isFinite(duration) ? duration : 0;
};

class PrismaStoreSettingsRepository implements SettingsRepositoryContract {
  async getSettings(shopDomain: string): Promise<SettingsPayload> {
    const store = await this.ensureStoreWithSettings(shopDomain);
    return this.buildSettingsPayload(store);
  }

  async updateThresholds(
    shopDomain: string,
    thresholds: ThresholdSettings,
  ): Promise<SettingsPayload> {
    const store = await this.ensureStoreWithSettings(shopDomain);

    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { thresholds: toJson(thresholds) },
    });

    return this.getSettings(shopDomain);
  }

  async updateToggles(
    shopDomain: string,
    toggles: FeatureToggles,
  ): Promise<SettingsPayload> {
    const store = await this.ensureStoreWithSettings(shopDomain);

    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { featureFlags: toJson(toggles) },
    });

    return this.getSettings(shopDomain);
  }

  async updateSecret(
    shopDomain: string,
    input: UpdateSecretInput,
  ): Promise<SettingsPayload> {
    const adapter = getSecretsAdapter();
    const store = await this.ensureStoreWithSettings(shopDomain);
    const provider = SECRET_PROVIDER_MAP[input.provider];

    if (!input.secret) {
      await prisma.storeSecret.deleteMany({
        where: { storeId: store.id, provider },
      });

      recordAuditEvent({ actor: shopDomain, action: "update_secret", resource: input.provider, details: { masked: null } });
      return this.getSettings(shopDomain);
    }

    // Basic validation for MCP secret quality
    if (
      input.provider === "mcp" &&
      (input.secret.length < 8 || /\s/.test(input.secret))
    ) {
      throw new Error("Invalid MCP secret: must be >= 8 chars and contain no whitespace");
    }

    const existing = await prisma.storeSecret.findUnique({
      where: {
        storeId_provider: {
          storeId: store.id,
          provider,
        },
      },
    });

    const ciphertext = adapter.encrypt(input.secret);
    const existingPlaintext = existing ? getSecretsAdapter().decrypt(existing.ciphertext) : null;
    const secretChanged = existingPlaintext !== input.secret;
    const maskedValue =
      secretChanged || !existing?.maskedValue
        ? maskSecret(input.secret)
        : existing.maskedValue;

    const rotationReminderAt =
      input.rotationReminderAt === null
        ? null
        : input.rotationReminderAt
        ? new Date(input.rotationReminderAt)
        : existing?.rotationReminderAt ?? null;

    const lastVerifiedAt =
      input.verifiedAt === undefined
        ? existing?.lastVerifiedAt ?? null
        : input.verifiedAt
        ? new Date(input.verifiedAt)
        : null;

    if (existing) {
      await prisma.storeSecret.update({
        where: { id: existing.id },
        data: {
          ciphertext,
          maskedValue,
          rotationReminderAt,
          lastVerifiedAt,
        },
      });
    } else {
      await prisma.storeSecret.create({
        data: {
          storeId: store.id,
          provider,
          ciphertext,
          maskedValue,
          rotationReminderAt,
          lastVerifiedAt,
        },
      });
    }

    const settings = await this.getSettings(shopDomain);
    recordAuditEvent({
      actor: shopDomain,
      action: "update_secret",
      resource: input.provider,
      details: { masked: maskedValue },
    });
    return settings;
  }

  async getDecryptedSecret(
    shopDomain: string,
    provider: SettingsProvider,
  ): Promise<string | null> {
    const store = await this.findStore(shopDomain);
    if (!store) {
      return null;
    }

    const secret = await prisma.storeSecret.findUnique({
      where: {
        storeId_provider: {
          storeId: store.id,
          provider: SECRET_PROVIDER_MAP[provider],
        },
      },
    });

    return secret ? getSecretsAdapter().decrypt(secret.ciphertext) : null;
  }

  async getMcpIntegrationOverrides(
    shopDomain: string,
  ): Promise<McpIntegrationOverrides> {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const metadata = parseConnectionMetadata(store.settings!.connectionMetadata);
    return { ...metadata.overrides };
  }

  async updateMcpIntegrationOverrides(
    shopDomain: string,
    input: Partial<McpIntegrationOverrides>,
  ): Promise<McpIntegrationOverrides> {
    recordAuditEvent({
      actor: shopDomain,
      action: "update_mcp_overrides",
      resource: "mcp",
      details: {
        endpoint: input.endpoint ?? undefined,
        timeoutMs: input.timeoutMs ?? undefined,
        maxRetries: input.maxRetries ?? undefined,
      },
    });
    const store = await this.ensureStoreWithSettings(shopDomain);
    const metadata = parseConnectionMetadata(store.settings!.connectionMetadata);

    const overrides: McpIntegrationOverrides = {
      endpoint:
        input.endpoint === undefined ? metadata.overrides.endpoint : input.endpoint,
      timeoutMs:
        input.timeoutMs === undefined
          ? metadata.overrides.timeoutMs
          : input.timeoutMs,
      maxRetries:
        input.maxRetries === undefined
          ? metadata.overrides.maxRetries
          : input.maxRetries,
    } satisfies McpIntegrationOverrides;

    const payload = this.buildConnectionMetadataPayload(
      metadata.connections,
      overrides,
    );

    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { connectionMetadata: payload },
    });

    return overrides;
  }

  async recordConnectionTest(
    shopDomain: string,
    input: RecordConnectionTestInput,
  ): Promise<SettingsPayload> {
    const store = await this.ensureStoreWithSettings(shopDomain);
    const timestampIso = input.timestamp ?? new Date().toISOString();
    const timestamp = new Date(timestampIso);

    await prisma.connectionEvent.create({
      data: {
        storeId: store.id,
        integration: INTEGRATION_PROVIDER_MAP[input.provider],
        status: CONNECTION_STATUS_TO_EVENT_STATUS[input.status],
        message: input.message,
        metadata: toJson({ durationMs: input.durationMs }),
        createdAt: timestamp,
      },
    });

    const metadata = parseConnectionMetadata(store.settings!.connectionMetadata);
    const existing = metadata.connections[input.provider];
    const updatedSummary: ConnectionHealth = {
      ...(existing ?? createDefaultConnections()[input.provider]),
      status: input.status,
      lastCheckedAt: timestampIso,
      message: input.message ?? existing?.message,
      history: existing?.history ?? [],
    };

    metadata.connections = {
      ...metadata.connections,
      [input.provider]: updatedSummary,
    };

    const payload = this.buildConnectionMetadataPayload(
      metadata.connections,
      metadata.overrides,
    );

    await prisma.storeSettings.update({
      where: { storeId: store.id },
      data: { connectionMetadata: payload },
    });

    return this.getSettings(shopDomain);
  }

  private async findStore(
    shopDomain: string,
  ): Promise<StoreWithRelations | null> {
    return prisma.store.findFirst({
      where: {
        OR: [{ domain: shopDomain }, { myShopifyDomain: shopDomain }],
      },
      include: {
        settings: true,
        secrets: true,
      },
    });
  }

  private async ensureStoreWithSettings(
    shopDomain: string,
  ): Promise<StoreWithRelations> {
    const store = await this.findStore(shopDomain);
    if (!store) {
      throw new Error(`Store not found for domain: ${shopDomain}`);
    }

    if (!store.settings) {
      const defaults = createDefaultConnections();
      const created = await prisma.storeSettings.create({
        data: {
          storeId: store.id,
          thresholds: toJson(DEFAULT_THRESHOLDS),
          featureFlags: toJson(DEFAULT_TOGGLES),
          connectionMetadata: this.buildConnectionMetadataPayload(
            defaults,
            createDefaultMcpOverrides(),
          ),
        },
      });

      store.settings = created;
    }

    return store;
  }

  private buildConnectionMetadataPayload(
    connections: Partial<SettingsConnections>,
    overrides: McpIntegrationOverrides,
  ): Prisma.InputJsonValue {
    const payloadConnections: Record<string, unknown> = {};

    for (const provider of PROVIDERS) {
      const entry = connections[provider];
      if (!entry) {
        continue;
      }

      payloadConnections[provider] = {
        provider: entry.provider,
        status: entry.status,
        lastCheckedAt: entry.lastCheckedAt ?? null,
        message: entry.message ?? null,
      };
    }

    const payload: Record<string, unknown> = {};

    if (Object.keys(payloadConnections).length > 0) {
      payload.connections = payloadConnections;
    }

    payload.mcpOverrides = {
      endpoint: overrides.endpoint,
      timeoutMs: overrides.timeoutMs,
      maxRetries: overrides.maxRetries,
    } satisfies McpIntegrationOverrides;

    return toJson(payload);
  }

  private async buildSettingsPayload(
    store: StoreWithRelations,
  ): Promise<SettingsPayload> {
    const settings = store.settings!;
    const thresholds = this.parseThresholds(settings.thresholds);
    const toggles = this.parseFeatureFlags(settings.featureFlags);
    const metadata = parseConnectionMetadata(settings.connectionMetadata);
    const secrets = this.buildSecrets(store.secrets);
    const connections = await this.buildConnections(
      store.id,
      metadata.connections,
    );

    return {
      shopDomain: store.domain,
      thresholds,
      toggles,
      secrets,
      connections,
    } satisfies SettingsPayload;
  }

  private parseThresholds(
    value: Prisma.JsonValue | null | undefined,
  ): ThresholdSettings {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      const lowStock = Number(record.lowStockMinimum);
      const overdue = Number(record.overdueOrderHours);
      const overstock = Number(record.overstockPercentage);

      return {
        lowStockMinimum: Number.isFinite(lowStock)
          ? lowStock
          : DEFAULT_THRESHOLDS.lowStockMinimum,
        overdueOrderHours: Number.isFinite(overdue)
          ? overdue
          : DEFAULT_THRESHOLDS.overdueOrderHours,
        overstockPercentage: Number.isFinite(overstock)
          ? overstock
          : DEFAULT_THRESHOLDS.overstockPercentage,
      } satisfies ThresholdSettings;
    }

    return { ...DEFAULT_THRESHOLDS } satisfies ThresholdSettings;
  }

  private parseFeatureFlags(
    value: Prisma.JsonValue | null | undefined,
  ): FeatureToggles {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;

      return {
        enableMcpIntegration: parseBoolean(
          record.enableMcpIntegration,
          DEFAULT_TOGGLES.enableMcpIntegration,
        ),
        enableAssistantsProvider: parseBoolean(
          record.enableAssistantsProvider,
          DEFAULT_TOGGLES.enableAssistantsProvider,
        ),
        enableExperimentalWidgets: parseBoolean(
          record.enableExperimentalWidgets,
          DEFAULT_TOGGLES.enableExperimentalWidgets,
        ),
        enableBetaWorkflows: parseBoolean(
          record.enableBetaWorkflows,
          DEFAULT_TOGGLES.enableBetaWorkflows,
        ),
      } satisfies FeatureToggles;
    }

    return { ...DEFAULT_TOGGLES } satisfies FeatureToggles;
  }

  private buildSecrets(secrets: StoreWithRelations["secrets"]): SettingsSecrets {
    const base: SettingsSecrets = {
      ga4: null,
      gsc: null,
      bing: null,
      mcp: null,
    };

    for (const secret of secrets) {
      const provider = secret.provider as SettingsProvider;
      if (!PROVIDERS.includes(provider)) {
        continue;
      }

      base[provider] = {
        provider,
        maskedValue: secret.maskedValue,
        lastUpdatedAt: secret.updatedAt.toISOString(),
        lastVerifiedAt: secret.lastVerifiedAt?.toISOString(),
        rotationReminderAt: secret.rotationReminderAt?.toISOString(),
      } satisfies SecretMetadata;
    }

    return base;
  }

  private async buildConnections(
    storeId: string,
    metadataConnections: Partial<SettingsConnections>,
  ): Promise<SettingsConnections> {
    const defaults = createDefaultConnections();
    const base: SettingsConnections = {
      ga4: { ...defaults.ga4, history: [] },
      gsc: { ...defaults.gsc, history: [] },
      bing: { ...defaults.bing, history: [] },
      mcp: { ...defaults.mcp, history: [] },
    };

    for (const provider of PROVIDERS) {
      const summary = metadataConnections[provider];
      if (!summary) {
        continue;
      }

      base[provider] = {
        ...base[provider],
        status: summary.status ?? base[provider].status,
        lastCheckedAt: summary.lastCheckedAt ?? base[provider].lastCheckedAt,
        message: summary.message ?? base[provider].message,
        history: [],
      };
    }

    const events = await prisma.connectionEvent.findMany({
      where: {
        storeId,
        integration: {
          in: PROVIDERS.map((provider) => INTEGRATION_PROVIDER_MAP[provider]),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        integration: true,
        status: true,
        message: true,
        metadata: true,
        createdAt: true,
      },
    });

    const grouped = new Map<SettingsProvider, ConnectionAttempt[]>();

    for (const event of events as ConnectionEventWithMetadata[]) {
      const provider = mapIntegrationToSettingsProvider(event.integration);
      if (!provider) {
        continue;
      }

      const attempt: ConnectionAttempt = {
        id: event.id,
        provider,
        status: EVENT_STATUS_TO_CONNECTION_STATUS[event.status],
        timestamp: event.createdAt.toISOString(),
        durationMs: extractDuration(event.metadata),
        message: event.message ?? undefined,
      };

      const existing = grouped.get(provider) ?? [];
      if (existing.length < 5) {
        existing.push(attempt);
      }

      grouped.set(provider, existing);
    }

    for (const provider of PROVIDERS) {
      const attempts = grouped.get(provider) ?? [];
      if (attempts.length > 0) {
        base[provider] = {
          ...base[provider],
          status: attempts[0]!.status,
          lastCheckedAt: attempts[0]!.timestamp,
          message: attempts[0]!.message ?? base[provider].message,
          history: attempts,
        };
      } else {
        const fallbackHistory = metadataConnections[provider]?.history ?? [];
        base[provider] = {
          ...base[provider],
          history: fallbackHistory.slice(0, 5),
        };
      }
    }

    return base;
  }
}

export class StoreSettingsRepository implements SettingsRepositoryContract {
  private readonly impl: SettingsRepositoryContract;

  constructor(useMockData: boolean = isMockMode()) {
    this.impl = useMockData
      ? new MockStoreSettingsRepository()
      : new PrismaStoreSettingsRepository();
  }

  getSettings(shopDomain: string) {
    return this.impl.getSettings(shopDomain);
  }

  updateThresholds(shopDomain: string, thresholds: ThresholdSettings) {
    return this.impl.updateThresholds(shopDomain, thresholds);
  }

  updateToggles(shopDomain: string, toggles: FeatureToggles) {
    return this.impl.updateToggles(shopDomain, toggles);
  }

  updateSecret(shopDomain: string, input: UpdateSecretInput) {
    return this.impl.updateSecret(shopDomain, input);
  }

  getDecryptedSecret(shopDomain: string, provider: SettingsProvider) {
    return this.impl.getDecryptedSecret(shopDomain, provider);
  }

  getMcpIntegrationOverrides(shopDomain: string) {
    return this.impl.getMcpIntegrationOverrides(shopDomain);
  }

  updateMcpIntegrationOverrides(
    shopDomain: string,
    input: Partial<McpIntegrationOverrides>,
  ) {
    return this.impl.updateMcpIntegrationOverrides(shopDomain, input);
  }

  recordConnectionTest(shopDomain: string, input: RecordConnectionTestInput) {
    return this.impl.recordConnectionTest(shopDomain, input);
  }
}

export const storeSettingsRepository = new StoreSettingsRepository();
