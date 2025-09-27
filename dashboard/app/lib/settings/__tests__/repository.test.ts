import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { encryptSecret } from "~/lib/security/secrets.server";
import { resetMockSettings } from "~/mocks/settings";
import type {
  SettingsProvider,
  ThresholdSettings,
} from "~/types/settings";

const loadRepository = async () => {
  const module = await import("~/lib/settings/repository.server");
  return module.storeSettingsRepository;
};

type PrismaStoreSettingsLike = {
  id: string;
  storeId: string;
  thresholds: ThresholdSettings | null;
  featureFlags: Record<string, unknown> | null;
  connectionMetadata: Record<string, unknown> | null;
  lastRotationAt: Date | null;
  lastInventorySyncAt: Date | null;
  notificationEmails: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaStoreSecretLike = {
  id: string;
  storeId: string;
  provider: SettingsProvider;
  ciphertext: string;
  maskedValue: string;
  lastVerifiedAt: Date | null;
  rotationReminderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaStub = {
  store: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  storeSettings: {
    findUnique: (args: any) => Promise<PrismaStoreSettingsLike | null>;
    create: (args: any) => Promise<PrismaStoreSettingsLike>;
    update: (args: any) => Promise<PrismaStoreSettingsLike>;
  };
  storeSecret: {
    findMany: (args: any) => Promise<PrismaStoreSecretLike[]>;
    findUnique: (args: any) => Promise<PrismaStoreSecretLike | null>;
    upsert: (args: any) => Promise<PrismaStoreSecretLike>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  connectionEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (operations: Promise<unknown>[]) => Promise<unknown[]>;
};

type StoreRecord = {
  id: string;
  domain: string;
  myShopifyDomain: string | null;
  name?: string | null;
};

const createPrismaStub = (): PrismaStub => {
  let idCounter = 1;
  const stores = new Map<string, StoreRecord>();
  const settings = new Map<string, PrismaStoreSettingsLike>();
  const secrets = new Map<string, Map<SettingsProvider, PrismaStoreSecretLike>>();
  const connectionEvents: Array<{
    id: string;
    storeId: string;
    integration: string;
    status: string;
    metadata: unknown;
    message?: string | null;
    createdAt: Date;
  }> = [];

  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  const clone = <T>(value: T): T =>
    value === undefined || value === null
      ? (value as T)
      : structuredClone(value);

  const ensureSecretBucket = (storeId: string) => {
    if (!secrets.has(storeId)) {
      secrets.set(storeId, new Map());
    }
    return secrets.get(storeId)!;
  };

  return {
    store: {
      findFirst: async ({ where, include }: any) => {
        const match = Array.from(stores.values()).find((record) => {
          const byDomain = record.domain === where?.OR?.[0]?.domain;
          const byMyShopify =
            record.myShopifyDomain === where?.OR?.[1]?.myShopifyDomain;
          return Boolean(byDomain || byMyShopify);
        });

        if (!match) {
          return null;
        }

        return {
          ...clone(match),
          settings: include?.settings
            ? clone(settings.get(match.id) ?? null)
            : undefined,
          secrets: include?.secrets
            ? Array.from(ensureSecretBucket(match.id).values()).map(clone)
            : undefined,
        };
      },
      findUnique: async ({ where, select }: any) => {
        const record = where?.domain ? stores.get(where.domain) : undefined;
        if (!record) {
          return null;
        }
        if (select && select.id) {
          return { id: record.id };
        }
        return clone(record);
      },
      create: async ({ data }: any) => {
        const id = nextId("store");
        stores.set(data.domain, {
          id,
          domain: data.domain,
          myShopifyDomain: data.myShopifyDomain ?? null,
          name: data.name ?? null,
        });
        return { id, ...data };
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        if (where?.domain) {
          const record = stores.get(where.domain);
          if (record) {
            stores.delete(where.domain);
            settings.delete(record.id);
            secrets.delete(record.id);
            count = 1;
          }
        }
        return { count };
      },
    },
    storeSettings: {
      findUnique: async ({ where }: any) => {
        const record = settings.get(where.storeId);
        return record ? clone(record) : null;
      },
      create: async ({ data }: any) => {
        const record: PrismaStoreSettingsLike = {
          id: nextId("settings"),
          storeId: data.storeId,
          thresholds: clone(data.thresholds ?? null),
          featureFlags: clone(data.featureFlags ?? null),
          connectionMetadata: clone(data.connectionMetadata ?? null),
          lastRotationAt: data.lastRotationAt ?? null,
          lastInventorySyncAt: data.lastInventorySyncAt ?? null,
          notificationEmails: data.notificationEmails ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        settings.set(data.storeId, record);
        return clone(record);
      },
      update: async ({ where, data }: any) => {
        const record = settings.get(where.storeId);
        if (!record) {
          throw new Error(`StoreSettings missing for ${where.storeId}`);
        }
        if (data.thresholds !== undefined) {
          record.thresholds = clone(data.thresholds);
        }
        if (data.featureFlags !== undefined) {
          record.featureFlags = clone(data.featureFlags);
        }
        if (data.connectionMetadata !== undefined) {
          record.connectionMetadata = clone(data.connectionMetadata);
        }
        record.updatedAt = new Date();
        return clone(record);
      },
    },
    storeSecret: {
      create: async ({ data }: any) => {
        const bucket = ensureSecretBucket(data.storeId);
        const record: PrismaStoreSecretLike = {
          id: nextId("secret"),
          storeId: data.storeId,
          provider: data.provider,
          ciphertext: data.ciphertext,
          maskedValue: data.maskedValue,
          lastVerifiedAt: data.lastVerifiedAt ?? null,
          rotationReminderAt: data.rotationReminderAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        bucket.set(data.provider, record);
        return clone(record);
      },
      findMany: async ({ where }: any) => {
        const bucket = ensureSecretBucket(where.storeId);
        return Array.from(bucket.values()).map(clone);
      },
      findUnique: async ({ where }: any) => {
        const bucket = ensureSecretBucket(where.storeId_provider.storeId);
        const record = bucket.get(
          where.storeId_provider.provider as SettingsProvider,
        );
        return record ? clone(record) : null;
      },
      upsert: async ({ where, create, update }: any) => {
        const storeId = where.storeId_provider.storeId;
        const provider = where.storeId_provider.provider as SettingsProvider;
        const bucket = ensureSecretBucket(storeId);
        const now = new Date();
        const existing = bucket.get(provider);
        const payload = existing ? update : create;
        const base = existing ?? {
          id: nextId("secret"),
          storeId,
          provider,
          ciphertext: payload.ciphertext,
          maskedValue: payload.maskedValue,
          lastVerifiedAt: payload.lastVerifiedAt ?? null,
          rotationReminderAt: payload.rotationReminderAt ?? null,
          createdAt: now,
          updatedAt: now,
        };

        base.ciphertext = payload.ciphertext;
        base.maskedValue = payload.maskedValue;
        base.lastVerifiedAt = payload.lastVerifiedAt ?? null;
        base.rotationReminderAt = payload.rotationReminderAt ?? null;
        base.updatedAt = now;

        bucket.set(provider, { ...base });
        return clone(base);
      },
      update: async ({ where, data }: any) => {
        for (const bucket of secrets.values()) {
          for (const record of bucket.values()) {
            if (record.id === where.id) {
              record.ciphertext = data.ciphertext ?? record.ciphertext;
              record.maskedValue = data.maskedValue ?? record.maskedValue;
              record.lastVerifiedAt =
                data.lastVerifiedAt ?? record.lastVerifiedAt;
              record.rotationReminderAt =
                data.rotationReminderAt ?? record.rotationReminderAt;
              record.updatedAt = new Date();
              return clone(record);
            }
          }
        }
        throw new Error(`Secret with id ${where.id} not found`);
      },
      deleteMany: async ({ where }: any) => {
        const bucket = ensureSecretBucket(where.storeId);
        let count = 0;
        if (where.provider) {
          count = bucket.delete(where.provider as SettingsProvider) ? 1 : 0;
        } else {
          count = bucket.size;
          bucket.clear();
        }
        return { count };
      },
    },
    connectionEvent: {
      findMany: async ({ where, orderBy, take, select }: any) => {
        let results = connectionEvents.filter((event) => {
          if (where.storeId && event.storeId !== where.storeId) {
            return false;
          }
          const integrationFilter = where.integration;
          if (integrationFilter) {
            if (
              integrationFilter.in &&
              Array.isArray(integrationFilter.in) &&
              !integrationFilter.in.includes(event.integration)
            ) {
              return false;
            }

            if (
              typeof integrationFilter === "string" &&
              integrationFilter !== event.integration
            ) {
              return false;
            }
          }
          return true;
        });

        if (orderBy?.createdAt === "desc") {
          results = [...results].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }

        if (typeof take === "number") {
          results = results.slice(0, take);
        }

        if (select) {
          return results.map((event) => {
            const picked: Record<string, unknown> = {};
            for (const key of Object.keys(select)) {
              if (select[key]) {
                picked[key] = clone((event as any)[key]);
              }
            }
            return picked;
          });
        }

        return results.map(clone);
      },
      create: async ({ data }: any) => {
        const record = {
          id: nextId("event"),
          ...clone(data),
        } as {
          id: string;
          storeId: string;
          integration: string;
          status: string;
          metadata: unknown;
          message?: string | null;
          createdAt: Date;
        };
        connectionEvents.push(record);
        return clone(record);
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } satisfies PrismaStub;
};

const loadRepositoryWithStub = async (prismaStub: PrismaStub) => {
  vi.resetModules();
  vi.doMock("~/db.server", () => ({
    __esModule: true,
    default: prismaStub,
  }));

  const { storeSettingsRepository } = await import("~/lib/settings/repository.server");
  return storeSettingsRepository;
};

describe("StoreSettingsRepository (mock mode)", () => {
  const SHOP = "unit-test-shop.myshopify.com";

  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetMockSettings(SHOP);
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
  });

  it("updates threshold values", async () => {
    const repo = await loadRepository();

    const updated = await repo.updateThresholds(SHOP, {
      lowStockMinimum: 12,
      overdueOrderHours: 24,
      overstockPercentage: 45,
    });

    expect(updated.thresholds.lowStockMinimum).toBe(12);
    expect(updated.thresholds.overdueOrderHours).toBe(24);
    expect(updated.thresholds.overstockPercentage).toBe(45);

    const fetched = await repo.getSettings(SHOP);
    expect(fetched.thresholds.lowStockMinimum).toBe(12);
  });

  it("encrypts and masks newly persisted secrets", async () => {
    const repo = await loadRepository();

    const result = await repo.updateSecret(SHOP, {
      provider: "bing",
      secret: "bing-key-7890",
      rotationReminderAt: "2024-05-01T00:00:00.000Z",
    });

    const metadata = result.secrets.bing;
    expect(metadata).toBeTruthy();
    expect(metadata?.maskedValue).toMatch(/^••••7890$/);
    expect(metadata?.rotationReminderAt).toBe("2024-05-01T00:00:00.000Z");
    expect(metadata?.lastUpdatedAt).toBeTruthy();

    const decrypted = await repo.getDecryptedSecret(SHOP, "bing");
    expect(decrypted).toBe("bing-key-7890");
  });

  it("removes secrets and clears metadata", async () => {
    const repo = await loadRepository();

    await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-new-secret",
    });

    const cleared = await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: null,
    });

    expect(cleared.secrets.ga4).toBeNull();
    const decrypted = await repo.getDecryptedSecret(SHOP, "ga4");
    expect(decrypted).toBeNull();
  });

  it("records connection attempts with capped history", async () => {
    const repo = await loadRepository();

    const updated = await repo.recordConnectionTest(SHOP, {
      provider: "gsc",
      status: "warning",
      durationMs: 1500,
      message: "Slow response",
    });

    const history = updated.connections.gsc.history;
    expect(history[0]?.status).toBe("warning");
    expect(history[0]?.durationMs).toBe(1500);
    expect(history[0]?.message).toBe("Slow response");
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it("updates MCP integration overrides", async () => {
    const repo = await loadRepository();

    const overrides = await repo.updateMcpIntegrationOverrides(SHOP, {
      endpoint: "https://mock-api.test",
      timeoutMs: 1500,
      maxRetries: 7,
    });

    expect(overrides).toMatchObject({
      endpoint: "https://mock-api.test",
      timeoutMs: 1500,
      maxRetries: 7,
    });

    const refreshed = await repo.getMcpIntegrationOverrides(SHOP);
    expect(refreshed).toEqual(overrides);
  });

  it("updates rotation reminder while preserving existing secret", async () => {
    const repo = await loadRepository();

    await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-initial-secret",
    });

    const existingSecret = await repo.getDecryptedSecret(SHOP, "ga4");
    expect(existingSecret).toBeTruthy();

    const updated = await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: existingSecret!,
      rotationReminderAt: "2024-06-15T00:00:00.000Z",
    });

    const meta = updated.secrets.ga4;
    expect(meta).toBeTruthy();
    expect(meta?.rotationReminderAt).toBe("2024-06-15T00:00:00.000Z");
    expect(meta?.maskedValue.startsWith("••••")).toBe(true);
  });
});

describe("StoreSettingsRepository (Prisma)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "false";
  });

  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
    vi.resetModules();
    vi.doUnmock("~/db.server");
  });

  const seedStore = async (
    prismaStub: PrismaStub,
    shopDomain: string,
  ): Promise<string> => {
    await prismaStub.store.deleteMany({ where: { domain: shopDomain } });
    const record = await prismaStub.store.create({
      data: {
        domain: shopDomain,
        myShopifyDomain: shopDomain,
        name: "Prisma Test Shop",
        accessTokenCipher: encryptSecret("test-token"),
        planLevel: "pro",
        status: "ACTIVE",
      },
    });
    return record.id as string;
  };

  it("creates settings row on first access and updates thresholds", async () => {
    const prismaStub = createPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-thresholds.myshopify.com";

    await seedStore(prismaStub, shopDomain);

    const initial = await repo.getSettings(shopDomain);
    expect(initial.shopDomain).toBe(shopDomain);

    await repo.updateThresholds(shopDomain, {
      lowStockMinimum: 15,
      overdueOrderHours: 48,
      overstockPercentage: 55,
    });

    const refreshed = await repo.getSettings(shopDomain);
    expect(refreshed.thresholds.lowStockMinimum).toBe(15);
    expect(refreshed.thresholds.overdueOrderHours).toBe(48);
    expect(refreshed.thresholds.overstockPercentage).toBe(55);
  });

  it("persists encrypted secrets and exposes metadata", async () => {
    const prismaStub = createPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-secret.myshopify.com";

    await seedStore(prismaStub, shopDomain);

    await repo.updateSecret(shopDomain, {
      provider: "bing",
      secret: "bing-secret-9999",
      rotationReminderAt: "2025-01-15T00:00:00.000Z",
    });

    const payload = await repo.getSettings(shopDomain);
    const metadata = payload.secrets.bing;
    expect(metadata?.maskedValue).toBe("••••9999");
    expect(metadata?.rotationReminderAt).toBe("2025-01-15T00:00:00.000Z");

    const decrypted = await repo.getDecryptedSecret(shopDomain, "bing");
    expect(decrypted).toBe("bing-secret-9999");
  });

  it("records connection tests and trims history", async () => {
    const prismaStub = createPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-connection.myshopify.com";

    await seedStore(prismaStub, shopDomain);

    for (let i = 0; i < 6; i += 1) {
      await repo.recordConnectionTest(shopDomain, {
        provider: "ga4",
        status: i % 2 === 0 ? "success" : "warning",
        durationMs: 400 + i,
        message: `attempt-${i}`,
        timestamp: `2025-02-0${i + 1}T12:00:00.000Z`,
      });
    }

    const finalState = await repo.getSettings(shopDomain);
    expect(finalState.connections.ga4.history.length).toBeLessThanOrEqual(5);
    expect(finalState.connections.ga4.message).toBe("attempt-5");
    expect(finalState.connections.ga4.status).toBe("warning");
  });

  it("persists MCP overrides in connection metadata", async () => {
    const prismaStub = createPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-overrides.myshopify.com";

    const storeId = await seedStore(prismaStub, shopDomain);

    const overrides = await repo.updateMcpIntegrationOverrides(shopDomain, {
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
    });

    expect(overrides).toEqual({
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
      maxRetries: null,
    });

    const stored = await prismaStub.storeSettings.findUnique({
      where: { storeId },
    });

    const metadata = stored?.connectionMetadata as
      | Record<string, any>
      | undefined;
    expect(metadata?.mcpOverrides).toMatchObject({
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
      maxRetries: null,
    });

    const roundTrip = await repo.getMcpIntegrationOverrides(shopDomain);
    expect(roundTrip).toEqual(overrides);
  });
});
