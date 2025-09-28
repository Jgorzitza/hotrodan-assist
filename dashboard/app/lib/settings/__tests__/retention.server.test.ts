import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IntegrationProvider,
  SettingsSecretProvider,
} from "@prisma/client";

type ConnectionEventRecord = {
  id: string;
  storeId: string;
  integration: IntegrationProvider;
  createdAt: Date;
};

type StoreSecretRecord = {
  id: string;
  storeId: string;
  provider: SettingsSecretProvider;
  maskedValue: string;
  rotationReminderAt: Date | null;
  store: {
    domain: string | null;
    myShopifyDomain: string | null;
    name: string | null;
    settings: {
      notificationEmails: string | null;
    } | null;
  } | null;
};

type KpiCacheRecord = {
  id: string;
  expiresAt: Date | null;
  refreshedAt: Date;
};

const clone = <T>(value: T): T => structuredClone(value);

const createPrismaStub = () => {
  const state = {
    connectionEvents: [] as ConnectionEventRecord[],
    storeSecrets: [] as StoreSecretRecord[],
    kpiCaches: [] as KpiCacheRecord[],
  };

  return {
    reset: () => {
      state.connectionEvents = [];
      state.storeSecrets = [];
      state.kpiCaches = [];
    },
    setConnectionEvents: (events: ConnectionEventRecord[]) => {
      state.connectionEvents = events.map(clone);
    },
    setStoreSecrets: (secrets: StoreSecretRecord[]) => {
      state.storeSecrets = secrets.map(clone);
    },
    setKpiCaches: (caches: KpiCacheRecord[]) => {
      state.kpiCaches = caches.map(clone);
    },
    connectionEvent: {
      findMany: async ({ where, orderBy }: any) => {
        let items = [...state.connectionEvents];
        if (where?.createdAt?.lt instanceof Date) {
          const cutoff = where.createdAt.lt as Date;
          items = items.filter((event) => event.createdAt < cutoff);
        }
        if (orderBy?.createdAt === "asc") {
          items.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        } else if (orderBy?.createdAt === "desc") {
          items.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        return items.map(clone);
      },
      findFirst: async ({ where, orderBy }: any) => {
        let items = state.connectionEvents.filter((event) => {
          const matchesStore =
            !where?.storeId || event.storeId === where.storeId;
          const matchesIntegration =
            !where?.integration || event.integration === where.integration;
          return matchesStore && matchesIntegration;
        });

        if (orderBy?.createdAt === "asc") {
          items = items.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        } else if (orderBy?.createdAt === "desc") {
          items = items.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }

        return items.length > 0 ? clone(items[0]) : null;
      },
      deleteMany: async ({ where }: any) => {
        const ids: string[] = Array.isArray(where?.id?.in)
          ? (where.id.in as string[])
          : [];
        if (ids.length === 0) {
          return { count: 0 };
        }
        const before = state.connectionEvents.length;
        const allowed = new Set(ids);
        state.connectionEvents = state.connectionEvents.filter(
          (event) => !allowed.has(event.id),
        );
        return { count: before - state.connectionEvents.length };
      },
    },
    storeSecret: {
      findMany: async ({ where, orderBy }: any) => {
        let items = state.storeSecrets.filter((secret) => {
          if (!where?.rotationReminderAt) {
            return true;
          }

          const rotation = secret.rotationReminderAt;
          const conditions = where.rotationReminderAt;

          if (conditions.not === null && rotation === null) {
            return false;
          }

          if (rotation === null) {
            return false;
          }

          if (conditions.lte instanceof Date && rotation > conditions.lte) {
            return false;
          }

          return true;
        });

        if (orderBy?.rotationReminderAt === "asc") {
          items = items.sort((a, b) => {
            const left = a.rotationReminderAt?.getTime() ?? 0;
            const right = b.rotationReminderAt?.getTime() ?? 0;
            return left - right;
          });
        } else if (orderBy?.rotationReminderAt === "desc") {
          items = items.sort((a, b) => {
            const left = a.rotationReminderAt?.getTime() ?? 0;
            const right = b.rotationReminderAt?.getTime() ?? 0;
            return right - left;
          });
        }

        return items.map(clone);
      },
    },
    kpiCache: {
      findMany: async ({ where, select }: any) => {
        let items = [...state.kpiCaches];

        if (where?.expiresAt) {
          const expiresAt = where.expiresAt;
          if (expiresAt === null) {
            items = items.filter((item) => item.expiresAt === null);
          } else if (expiresAt.not === null && expiresAt.lt instanceof Date) {
            items = items.filter((item) => {
              if (!item.expiresAt) {
                return false;
              }
              return item.expiresAt < expiresAt.lt;
            });
          }
        }

        if (where?.refreshedAt?.lt instanceof Date) {
          const cutoff = where.refreshedAt.lt as Date;
          items = items.filter((item) => item.refreshedAt < cutoff);
        }

        const results = items.map(clone);

        if (select?.id) {
          return results.map((item) => ({ id: item.id }));
        }

        return results;
      },
      deleteMany: async ({ where }: any) => {
        const ids: string[] = Array.isArray(where?.id?.in)
          ? (where.id.in as string[])
          : [];
        if (ids.length === 0) {
          return { count: 0 };
        }
        const before = state.kpiCaches.length;
        const allowed = new Set(ids);
        state.kpiCaches = state.kpiCaches.filter((item) => !allowed.has(item.id));
        return { count: before - state.kpiCaches.length };
      },
    },
  };
};

const prismaStub = createPrismaStub();

const loadRetentionModule = async () => {
  vi.resetModules();
  vi.doMock("~/db.server", () => ({
    __esModule: true,
    default: prismaStub,
  }));

  return import("../retention.server");
};

describe("settings retention utilities", () => {
  beforeEach(() => {
    prismaStub.reset();
  });

  it("removes stale connection events while keeping the latest per integration", async () => {
    const now = new Date("2024-02-01T00:00:00Z");

    prismaStub.setConnectionEvents([
      {
        id: "stale-a",
        storeId: "store-a",
        integration: "GA4",
        createdAt: new Date("2023-12-10T00:00:00Z"),
      },
      {
        id: "fresh-a",
        storeId: "store-a",
        integration: "GA4",
        createdAt: new Date("2024-01-20T00:00:00Z"),
      },
      {
        id: "stale-b-old",
        storeId: "store-b",
        integration: "GSC",
        createdAt: new Date("2023-10-01T00:00:00Z"),
      },
      {
        id: "stale-b-new",
        storeId: "store-b",
        integration: "GSC",
        createdAt: new Date("2023-12-05T00:00:00Z"),
      },
    ] as ConnectionEventRecord[]);

    const { pruneConnectionEvents } = await loadRetentionModule();

    const result = await pruneConnectionEvents({ now, retainDays: 30 });

    expect(result.deletedCount).toBe(2);
    expect(result.staleCount).toBe(3);
    expect(new Set(result.keepIds)).toEqual(new Set(["fresh-a", "stale-b-new"]));
  });

  it("returns overdue and upcoming rotation reminders within the window", async () => {
    const now = new Date("2024-02-01T00:00:00Z");

    prismaStub.setStoreSecrets([
      {
        id: "secret-overdue",
        storeId: "store-a",
        provider: "ga4",
        maskedValue: "••••1234",
        rotationReminderAt: new Date("2024-01-30T00:00:00Z"),
        store: {
          domain: "shop-a.test",
          myShopifyDomain: "shop-a.myshopify.com",
          name: "Shop A",
          settings: {
            notificationEmails: "ops@shop-a.test",
          },
        },
      },
      {
        id: "secret-upcoming",
        storeId: "store-b",
        provider: "gsc",
        maskedValue: "••••5678",
        rotationReminderAt: new Date("2024-02-04T00:00:00Z"),
        store: {
          domain: null,
          myShopifyDomain: "shop-b.myshopify.com",
          name: "Shop B",
          settings: {
            notificationEmails: null,
          },
        },
      },
      {
        id: "secret-outside-window",
        storeId: "store-c",
        provider: "bing",
        maskedValue: "••••9012",
        rotationReminderAt: new Date("2024-03-15T00:00:00Z"),
        store: {
          domain: "shop-c.test",
          myShopifyDomain: "shop-c.myshopify.com",
          name: "Shop C",
          settings: {
            notificationEmails: "ops@shop-c.test",
          },
        },
      },
    ] as StoreSecretRecord[]);

    const { collectSecretRotationReminders } = await loadRetentionModule();

    const results = await collectSecretRotationReminders({
      now,
      upcomingWindowDays: 14,
    });

    expect(results.length).toBe(2);

    const overdue = results.find((record) => record.secretId === "secret-overdue");
    expect(overdue).toBeTruthy();
    expect(overdue?.status).toBe("overdue");
    expect(overdue?.daysOverdue).toBe(2);
    expect(overdue?.notificationEmails).toBe("ops@shop-a.test");

    const upcoming = results.find((record) => record.secretId === "secret-upcoming");
    expect(upcoming).toBeTruthy();
    expect(upcoming?.status).toBe("upcoming");
    expect(upcoming?.daysUntilDue).toBe(3);
    expect(upcoming?.shopDomain).toBe("shop-b.myshopify.com");
  });

  it("prunes expired KPI cache records and honours fallback TTL for entries without expiresAt", async () => {
    const now = new Date("2024-02-01T12:00:00Z");

    prismaStub.setKpiCaches([
      {
        id: "expired-with-ttl",
        expiresAt: new Date("2024-02-01T09:00:00Z"),
        refreshedAt: new Date("2024-02-01T08:30:00Z"),
      },
      {
        id: "stale-without-ttl",
        expiresAt: null,
        refreshedAt: new Date("2024-02-01T07:00:00Z"),
      },
      {
        id: "fresh-with-ttl",
        expiresAt: new Date("2024-02-01T18:00:00Z"),
        refreshedAt: new Date("2024-02-01T10:00:00Z"),
      },
      {
        id: "fresh-without-ttl",
        expiresAt: null,
        refreshedAt: new Date("2024-02-01T11:45:00Z"),
      },
    ] as KpiCacheRecord[]);

    const { pruneKpiCache } = await loadRetentionModule();

    const result = await pruneKpiCache({
      now,
      fallbackTtlMinutes: 180,
    });

    expect(result.staleCount).toBe(2);
    expect(result.deletedCount).toBe(2);
    expect(result.expiredCount).toBe(1);
    expect(result.fallbackCount).toBe(1);
    expect(result.fallbackCutoff).toBe("2024-02-01T09:00:00.000Z");

    const remaining = await prismaStub.kpiCache.findMany({ select: { id: true } });
    expect(new Set(remaining.map((row: { id: string }) => row.id))).toEqual(
      new Set(["fresh-with-ttl", "fresh-without-ttl"]),
    );
  });

  it("surfaces KPI cache stats when running the retention sweep", async () => {
    const now = new Date("2024-02-01T12:00:00Z");

    prismaStub.setKpiCaches([
      {
        id: "needs-cleanup",
        expiresAt: null,
        refreshedAt: new Date("2024-02-01T03:00:00Z"),
      },
      {
        id: "future",
        expiresAt: new Date("2024-02-01T19:00:00Z"),
        refreshedAt: new Date("2024-02-01T11:00:00Z"),
      },
    ] as KpiCacheRecord[]);

    const { runSettingsRetention } = await loadRetentionModule();

    const result = await runSettingsRetention({
      now,
      retainDays: 30,
      upcomingWindowDays: 7,
    });

    expect(result.kpiCache.deletedCount).toBe(1);
    expect(result.kpiCache.staleCount).toBe(1);
    expect(result.kpiCache.fallbackCount).toBe(1);
  });
});

afterAll(() => {
  vi.resetModules();
});
