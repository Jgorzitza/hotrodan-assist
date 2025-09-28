import type { IntegrationProvider, SettingsSecretProvider } from "@prisma/client";

import prisma from "~/db.server";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_MINUTE = 60 * 1000;
const DEFAULT_KPI_CACHE_TTL_MINUTES = 6 * 60;

type PruneConnectionEventsOptions = {
  retainDays?: number;
  now?: Date;
};

type PruneConnectionEventsResult = {
  cutoff: string;
  staleCount: number;
  deletedCount: number;
  combosScanned: number;
  keepIds: string[];
};

type CollectRotationReminderOptions = {
  upcomingWindowDays?: number;
  now?: Date;
};

type RotationReminderRecord = {
  secretId: string;
  storeId: string;
  provider: SettingsSecretProvider;
  maskedValue: string;
  rotationReminderAt: string;
  status: "upcoming" | "overdue";
  daysUntilDue: number;
  daysOverdue: number;
  shopDomain: string | null;
  storeName: string | null;
  notificationEmails: string | null;
};

type RunRetentionOptions = PruneConnectionEventsOptions & CollectRotationReminderOptions;

type RunRetentionResult = {
  ranAt: string;
  prune: PruneConnectionEventsResult;
  rotationReminders: RotationReminderRecord[];
  kpiCache: PruneKpiCacheResult;
};

type PruneKpiCacheOptions = {
  now?: Date;
  fallbackTtlMinutes?: number;
};

type PruneKpiCacheResult = {
  staleCount: number;
  deletedCount: number;
  expiredCount: number;
  fallbackCount: number;
  fallbackCutoff: string | null;
};

const toDate = (value: Date | string | undefined | null): Date | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};

const normalizeStoreDomain = (
  store: {
    domain: string | null;
    myShopifyDomain: string | null;
  } | null,
): string | null => {
  if (!store) {
    return null;
  }
  if (store.domain) {
    return store.domain;
  }
  if (store.myShopifyDomain) {
    return store.myShopifyDomain;
  }
  return null;
};

export const pruneConnectionEvents = async (
  options: PruneConnectionEventsOptions = {},
): Promise<PruneConnectionEventsResult> => {
  const retainDays = options.retainDays ?? 30;
  const now = options.now ? new Date(options.now) : new Date();
  const cutoff = new Date(now.getTime() - retainDays * MILLISECONDS_IN_DAY);

  const staleEvents = await prisma.connectionEvent.findMany({
    where: { createdAt: { lt: cutoff } },
    select: {
      id: true,
      storeId: true,
      integration: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (staleEvents.length === 0) {
    return {
      cutoff: cutoff.toISOString(),
      staleCount: 0,
      deletedCount: 0,
      combosScanned: 0,
      keepIds: [],
    };
  }

  const combos = new Map<string, { storeId: string; integration: IntegrationProvider }>();
  for (const event of staleEvents) {
    const key = `${event.storeId}:${event.integration}`;
    if (!combos.has(key)) {
      combos.set(key, {
        storeId: event.storeId,
        integration: event.integration as IntegrationProvider,
      });
    }
  }

  const keepIds = new Set<string>();
  const comboArray = Array.from(combos.values());

  if (comboArray.length > 0) {
    const latestPerCombo = await Promise.all(
      comboArray.map((combo) =>
        prisma.connectionEvent.findFirst({
          where: {
            storeId: combo.storeId,
            integration: combo.integration,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: { id: true },
        }),
      ),
    );

    for (const record of latestPerCombo) {
      if (record?.id) {
        keepIds.add(record.id);
      }
    }
  }

  const idsToDelete = staleEvents
    .filter((event) => !keepIds.has(event.id))
    .map((event) => event.id);

  let deletedCount = 0;
  if (idsToDelete.length > 0) {
    const result = await prisma.connectionEvent.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    deletedCount = result.count;
  }

  return {
    cutoff: cutoff.toISOString(),
    staleCount: staleEvents.length,
    deletedCount,
    combosScanned: combos.size,
    keepIds: Array.from(keepIds.values()),
  };
};

export const collectSecretRotationReminders = async (
  options: CollectRotationReminderOptions = {},
): Promise<RotationReminderRecord[]> => {
  const now = options.now ? new Date(options.now) : new Date();
  const upcomingWindowDays = options.upcomingWindowDays ?? 14;
  const upperBound = new Date(now.getTime() + upcomingWindowDays * MILLISECONDS_IN_DAY);

  const secrets = await prisma.storeSecret.findMany({
    where: {
      rotationReminderAt: {
        not: null,
        lte: upperBound,
      },
    },
    select: {
      id: true,
      storeId: true,
      provider: true,
      maskedValue: true,
      rotationReminderAt: true,
      store: {
        select: {
          domain: true,
          myShopifyDomain: true,
          name: true,
          settings: {
            select: {
              notificationEmails: true,
            },
          },
        },
      },
    },
    orderBy: {
      rotationReminderAt: "asc",
    },
  });

  const records: RotationReminderRecord[] = [];

  for (const secret of secrets) {
    const reminderAt = toDate(secret.rotationReminderAt);
    if (!reminderAt) {
      continue;
    }

    const diffMs = reminderAt.getTime() - now.getTime();
    const status = diffMs < 0 ? "overdue" : "upcoming";
    const daysUntilDue = diffMs >= 0 ? Math.ceil(diffMs / MILLISECONDS_IN_DAY) : 0;
    const daysOverdue = diffMs < 0 ? Math.ceil(Math.abs(diffMs) / MILLISECONDS_IN_DAY) : 0;

    records.push({
      secretId: secret.id,
      storeId: secret.storeId,
      provider: secret.provider,
      maskedValue: secret.maskedValue,
      rotationReminderAt: reminderAt.toISOString(),
      status,
      daysUntilDue,
      daysOverdue,
      shopDomain: normalizeStoreDomain(secret.store ?? null),
      storeName: secret.store?.name ?? null,
      notificationEmails:
        secret.store?.settings?.notificationEmails ?? null,
    });
  }

  return records;
};

export const pruneKpiCache = async (
  options: PruneKpiCacheOptions = {},
): Promise<PruneKpiCacheResult> => {
  const now = options.now ? new Date(options.now) : new Date();
  const fallbackTtlMinutes = options.fallbackTtlMinutes ?? DEFAULT_KPI_CACHE_TTL_MINUTES;

  const expired = await prisma.kpiCache.findMany({
    where: {
      expiresAt: {
        not: null,
        lt: now,
      },
    },
    select: { id: true },
  });

  const staleIds = new Set<string>();
  let fallbackCutoff: Date | null = null;

  for (const row of expired) {
    staleIds.add(row.id);
  }

  if (fallbackTtlMinutes > 0) {
    fallbackCutoff = new Date(now.getTime() - fallbackTtlMinutes * MILLISECONDS_IN_MINUTE);
    const staleWithoutExpiry = await prisma.kpiCache.findMany({
      where: {
        expiresAt: null,
        refreshedAt: {
          lt: fallbackCutoff,
        },
      },
      select: { id: true },
    });

    for (const row of staleWithoutExpiry) {
      staleIds.add(row.id);
    }
  }

  const staleCount = staleIds.size;
  if (staleCount === 0) {
    return {
      staleCount: 0,
      deletedCount: 0,
      expiredCount: expired.length,
      fallbackCount: 0,
      fallbackCutoff: fallbackCutoff ? fallbackCutoff.toISOString() : null,
    };
  }

  const deleteResult = await prisma.kpiCache.deleteMany({
    where: {
      id: {
        in: Array.from(staleIds.values()),
      },
    },
  });

  return {
    staleCount,
    deletedCount: deleteResult.count,
    expiredCount: expired.length,
    fallbackCount: staleCount - expired.length,
    fallbackCutoff: fallbackCutoff ? fallbackCutoff.toISOString() : null,
  };
};

export const runSettingsRetention = async (
  options: RunRetentionOptions = {},
): Promise<RunRetentionResult> => {
  const now = options.now ? new Date(options.now) : new Date();

  const prune = await pruneConnectionEvents({
    retainDays: options.retainDays,
    now,
  });

  const rotationReminders = await collectSecretRotationReminders({
    upcomingWindowDays: options.upcomingWindowDays,
    now,
  });

  const kpiCache = await pruneKpiCache({
    now,
  });

  return {
    ranAt: now.toISOString(),
    prune,
    rotationReminders,
    kpiCache,
  };
};

export type {
  PruneConnectionEventsOptions,
  PruneConnectionEventsResult,
  CollectRotationReminderOptions,
  RotationReminderRecord,
  RunRetentionOptions,
  RunRetentionResult,
  PruneKpiCacheOptions,
  PruneKpiCacheResult,
};
