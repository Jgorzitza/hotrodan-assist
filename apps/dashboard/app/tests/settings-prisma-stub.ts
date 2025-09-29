import { buildSettingsPrismaSeed, SETTINGS_SEED_ACCESS_TOKEN } from "~/lib/settings/fixtures.server";
import { encryptSecret } from "~/lib/security/secrets.server";
import type { SettingsProvider } from "~/types/settings";

type ThresholdSettingsLike = {
  lowStockMinimum: number | null;
  overdueOrderHours: number | null;
  overstockPercentage: number | null;
};

type PrismaStoreSettingsLike = {
  id: string;
  storeId: string;
  thresholds: ThresholdSettingsLike | null;
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

type StoreRecord = {
  id: string;
  domain: string;
  myShopifyDomain: string | null;
  name?: string | null;
};

type PrismaSeoInsightLike = {
  id: string;
  storeId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  category: string | null;
  resourceUrl: string | null;
  metadata: Record<string, unknown> | null;
  detectedAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SettingsPrismaStub = {
  store: {
    findFirst: (args: any) => Promise<any>;
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
    create: (args: any) => Promise<PrismaStoreSecretLike>;
    upsert: (args: any) => Promise<PrismaStoreSecretLike>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
  connectionEvent: {
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
  };
  seoInsight: {
    findMany: (args: any) => Promise<PrismaSeoInsightLike[]>;
    upsert: (args: any) => Promise<PrismaSeoInsightLike>;
  };
  $transaction: (operations: Promise<unknown>[]) => Promise<unknown[]>;
};

const createIdGenerator = () => {
  let counter = 1;
  return (prefix: string) => `${prefix}_${counter++}`;
};

const clone = <T>(value: T): T =>
  value === undefined || value === null ? (value as T) : structuredClone(value);

export const createSettingsPrismaStub = (): SettingsPrismaStub => {
  const nextId = createIdGenerator();
  const stores = new Map<string, StoreRecord>();
  const storeById = new Map<string, StoreRecord>();
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
  const seoInsights = new Map<string, PrismaSeoInsightLike>();

  const ensureSecretBucket = (storeId: string) => {
    if (!secrets.has(storeId)) {
      secrets.set(storeId, new Map());
    }
    return secrets.get(storeId)!;
  };

  return {
    store: {
      findFirst: async ({ where, include }: any) => {
        const orConditions = where?.OR ?? [];
        const match = Array.from(stores.values()).find((record) => {
          return orConditions.some((condition: any) => {
            if (condition?.domain && record.domain === condition.domain) {
              return true;
            }
            if (
              condition?.myShopifyDomain &&
              record.myShopifyDomain === condition.myShopifyDomain
            ) {
              return true;
            }
            return false;
          });
        });

        if (!match) {
          return null;
        }

        const result: any = { ...clone(match) };
        if (include?.settings) {
          result.settings = clone(settings.get(match.id) ?? null);
        }
        if (include?.secrets) {
          result.secrets = Array.from(ensureSecretBucket(match.id).values()).map(
            clone,
          );
        }
        return result;
      },
      findUnique: async ({ where, select }: any) => {
        const key = where?.domain ?? where?.id;
        if (!key) {
          return null;
        }

        const record =
          typeof key === "string" && stores.has(key)
            ? stores.get(key)!
            : storeById.get(key);
        if (!record) {
          return null;
        }

        if (select) {
          const payload: Record<string, unknown> = {};
          for (const [field, enabled] of Object.entries(select)) {
            if (enabled && field in record) {
              payload[field] = (record as any)[field];
            }
          }
          return payload;
        }

        return clone(record);
      },
      create: async ({ data }: any) => {
        const id = nextId("store");
        const record: StoreRecord = {
          id,
          domain: data.domain,
          myShopifyDomain: data.myShopifyDomain ?? null,
          name: data.name ?? null,
        };
        stores.set(record.domain, record);
        storeById.set(id, record);
        return { id, ...data };
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        const domain = where?.domain;
        if (domain && stores.has(domain)) {
          const record = stores.get(domain)!;
          stores.delete(domain);
          storeById.delete(record.id);
          settings.delete(record.id);
          secrets.delete(record.id);
          for (let index = connectionEvents.length - 1; index >= 0; index--) {
            if (connectionEvents[index].storeId === record.id) {
              connectionEvents.splice(index, 1);
            }
          }
          count = 1;
        }
        return { count };
      },
    },
    storeSettings: {
      findUnique: async ({ where }: any) => {
        const key = where?.storeId ?? where?.id;
        if (!key) {
          return null;
        }
        return clone(settings.get(key) ?? null);
      },
      create: async ({ data }: any) => {
        const id = nextId("settings");
        const record: PrismaStoreSettingsLike = {
          id,
          storeId: data.storeId,
          thresholds: clone(data.thresholds ?? null),
          featureFlags: clone(data.featureFlags ?? null),
          connectionMetadata: clone(data.connectionMetadata ?? null),
          lastRotationAt: data.lastRotationAt ?? null,
          lastInventorySyncAt: data.lastInventorySyncAt ?? null,
          notificationEmails: data.notificationEmails ?? null,
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
        };
        settings.set(record.storeId, record);
        return clone(record);
      },
      update: async ({ where, data }: any) => {
        const id = where?.storeId ?? where?.id;
        if (!id || !settings.has(id)) {
          throw new Error(`StoreSettings missing for ${id}`);
        }
        const current = settings.get(id)!;
        const updated: PrismaStoreSettingsLike = {
          ...current,
          thresholds:
            data.thresholds !== undefined
              ? clone(data.thresholds)
              : current.thresholds,
          featureFlags:
            data.featureFlags !== undefined
              ? clone(data.featureFlags)
              : current.featureFlags,
          connectionMetadata:
            data.connectionMetadata !== undefined
              ? clone(data.connectionMetadata)
              : current.connectionMetadata,
          updatedAt: data.updatedAt ?? new Date(),
        };
        settings.set(id, updated);
        return clone(updated);
      },
    },
    storeSecret: {
      findMany: async ({ where }: any) => {
        const storeId = where?.storeId;
        if (!storeId) {
          return [];
        }
        const bucket = ensureSecretBucket(storeId);
        const providers = where?.provider?.in;
        const results = providers
          ? providers
              .map((provider: SettingsProvider) => bucket.get(provider))
              .filter(Boolean)
          : Array.from(bucket.values());
        return results.map(clone);
      },
      findUnique: async ({ where }: any) => {
        const storeId = where?.storeId_provider?.storeId ?? where?.storeId;
        const provider =
          where?.storeId_provider?.provider ?? where?.provider ?? undefined;
        if (!storeId || !provider) {
          return null;
        }
        const bucket = ensureSecretBucket(storeId);
        return clone(bucket.get(provider as SettingsProvider) ?? null);
      },
      update: async ({ where, data }: any) => {
        const id = where?.id;
        if (!id) {
          throw new Error("Missing secret id for update");
        }

        let targetStoreId: string | null = null;
        let targetProvider: SettingsProvider | null = null;

        for (const [storeId, bucket] of secrets.entries()) {
          for (const [provider, record] of bucket.entries()) {
            if (record.id === id) {
              targetStoreId = storeId;
              targetProvider = provider;
              break;
            }
          }
          if (targetStoreId) {
            break;
          }
        }

        if (!targetStoreId || !targetProvider) {
          throw new Error(`Secret ${id} not found`);
        }

        const bucket = ensureSecretBucket(targetStoreId);
        const current = bucket.get(targetProvider)!;
        const updated: PrismaStoreSecretLike = {
          ...current,
          ciphertext: data.ciphertext ?? current.ciphertext,
          maskedValue: data.maskedValue ?? current.maskedValue,
          lastVerifiedAt: data.lastVerifiedAt ?? current.lastVerifiedAt,
          rotationReminderAt: data.rotationReminderAt ?? current.rotationReminderAt,
          updatedAt: data.updatedAt ?? new Date(),
        };

        bucket.set(targetProvider, updated);
        return clone(updated);
      },
      create: async ({ data }: any) => {
        const storeId = data.storeId;
        const provider = data.provider as SettingsProvider;
        if (!storeId || !provider) {
          throw new Error("Missing storeId or provider for secret create");
        }
        const bucket = ensureSecretBucket(storeId);
        const record: PrismaStoreSecretLike = {
          id: nextId("secret"),
          storeId,
          provider,
          ciphertext: data.ciphertext,
          maskedValue: data.maskedValue,
          lastVerifiedAt: data.lastVerifiedAt ?? null,
          rotationReminderAt: data.rotationReminderAt ?? null,
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
        };
        bucket.set(provider, record);
        return clone(record);
      },
      upsert: async ({ where, update, create }: any) => {
        const storeId = where?.storeId_provider?.storeId;
        const provider = where?.storeId_provider?.provider as SettingsProvider;
        if (!storeId || !provider) {
          throw new Error("Missing storeId or provider for secret upsert");
        }
        const bucket = ensureSecretBucket(storeId);
        const existing = bucket.get(provider);
        const payload = existing ? update : create;
        const record: PrismaStoreSecretLike = {
          id: existing?.id ?? nextId("secret"),
          storeId,
          provider,
          ciphertext: payload.ciphertext,
          maskedValue: payload.maskedValue,
          lastVerifiedAt: payload.lastVerifiedAt ?? null,
          rotationReminderAt: payload.rotationReminderAt ?? null,
          createdAt: existing?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        bucket.set(provider, record);
        return clone(record);
      },
      deleteMany: async ({ where }: any) => {
        const storeId = where?.storeId;
        const provider = where?.provider;
        if (!storeId || !provider) {
          return { count: 0 };
        }
        const bucket = ensureSecretBucket(storeId);
        const count = bucket.delete(provider as SettingsProvider) ? 1 : 0;
        return { count };
      },
    },
    connectionEvent: {
      findMany: async ({ where, orderBy, take, select }: any) => {
        const storeId = where?.storeId;
        const integrationFilter = (() => {
          if (!where?.integration) {
            return null;
          }

          const value = where.integration;
          if (Array.isArray(value?.in)) {
            return value.in as string[];
          }

          if (typeof value === "string") {
            return [value];
          }

          return null;
        })();
        let results = connectionEvents.filter((event) => {
          return (
            (!storeId || event.storeId === storeId) &&
            (!integrationFilter || integrationFilter.includes(event.integration))
          );
        });

        if (orderBy?.createdAt === "desc") {
          results = results.sort(
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
    seoInsight: {
      findMany: async ({ where }: any) => {
        let results = Array.from(seoInsights.values());
        if (where?.storeId) {
          results = results.filter((insight) => insight.storeId === where.storeId);
        }

        const idFilter = where?.id;
        if (idFilter?.in) {
          const allowed = new Set(idFilter.in as string[]);
          results = results.filter((insight) => allowed.has(insight.id));
        } else if (typeof idFilter === "string") {
          results = results.filter((insight) => insight.id === idFilter);
        }

        return results.map(clone);
      },
      upsert: async ({ where, update, create }: any) => {
        const id = where?.id;
        if (!id) {
          throw new Error("seoInsight upsert requires an id");
        }

        const existing = seoInsights.get(id);
        const now = new Date();

        if (existing) {
          const record: PrismaSeoInsightLike = {
            ...existing,
            ...clone(update ?? {}),
            metadata:
              update?.metadata !== undefined
                ? (clone(update.metadata) as Record<string, unknown> | null)
                : existing.metadata,
            dueAt:
              update?.dueAt === null
                ? null
                : update?.dueAt
                  ? new Date(update.dueAt)
                  : existing.dueAt,
            completedAt:
              update?.completedAt === null
                ? null
                : update?.completedAt
                  ? new Date(update.completedAt)
                  : existing.completedAt,
            updatedAt: now,
          };
          seoInsights.set(id, record);
          return clone(record);
        }

        const record: PrismaSeoInsightLike = {
          id,
          storeId: create.storeId,
          title: create.title,
          description: create.description,
          severity: create.severity,
          status: create.status,
          category: create.category ?? null,
          resourceUrl: create.resourceUrl ?? null,
          metadata: create.metadata ? clone(create.metadata) : null,
          detectedAt: create.detectedAt ? new Date(create.detectedAt) : now,
          dueAt: create.dueAt ? new Date(create.dueAt) : null,
          completedAt: create.completedAt ? new Date(create.completedAt) : null,
          createdAt: create.createdAt ? new Date(create.createdAt) : now,
          updatedAt: now,
        };
        seoInsights.set(id, record);
        return clone(record);
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } satisfies SettingsPrismaStub;
};

export const seedSettingsStore = async (
  prismaStub: SettingsPrismaStub,
  shopDomain: string,
  options?: { now?: Date },
): Promise<string> => {
  const now = options?.now ?? new Date();

  await prismaStub.store.deleteMany({ where: { domain: shopDomain } });

  const created = await prismaStub.store.create({
    data: {
      domain: shopDomain,
      myShopifyDomain: shopDomain,
      name: "Prisma Seed Shop",
      accessTokenCipher: encryptSecret(SETTINGS_SEED_ACCESS_TOKEN),
      planLevel: "pro",
      status: "ACTIVE",
    },
  });

  const seedPayload = buildSettingsPrismaSeed({
    storeId: created.id as string,
    shopDomain,
    now,
  });

  await prismaStub.storeSettings.create({
    data: {
      storeId: created.id,
      thresholds: seedPayload.storeSettings.thresholds,
      featureFlags: seedPayload.storeSettings.featureFlags,
      connectionMetadata: seedPayload.storeSettings.connectionMetadata,
      notificationEmails: seedPayload.storeSettings.notificationEmails,
      lastRotationAt: seedPayload.storeSettings.lastRotationAt,
      lastInventorySyncAt: seedPayload.storeSettings.lastInventorySyncAt,
      createdAt: now,
      updatedAt: now,
    },
  });

  for (const secret of seedPayload.storeSecrets) {
    await prismaStub.storeSecret.create({
      data: {
        storeId: created.id,
        provider: secret.provider,
        ciphertext: secret.ciphertext,
        maskedValue: secret.maskedValue,
        lastVerifiedAt: secret.lastVerifiedAt,
        rotationReminderAt: secret.rotationReminderAt,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  for (const event of seedPayload.connectionEvents) {
    await prismaStub.connectionEvent.create({
      data: {
        id: event.id,
        storeId: created.id,
        integration: event.integration,
        status: event.status,
        message: event.message,
        metadata: event.metadata,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  }

  return created.id as string;
};
