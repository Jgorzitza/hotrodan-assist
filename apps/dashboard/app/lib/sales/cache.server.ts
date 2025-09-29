import { createHash } from "node:crypto";

import prisma from "~/db.server";
import { fetchSalesAnalytics, type FetchSalesAnalyticsParams } from "~/lib/sales/analytics.server";
import type { SalesDataset, SalesGranularity } from "~/types/dashboard";

const DEFAULT_CACHE_TTL_MINUTES = 6 * 60;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRangeBoundary = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = `${trimmed}T00:00:00.000Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

type NormalizedSearch = {
  period: string;
  compare: string;
  granularity: SalesGranularity;
  bucketDate: string | null;
  collectionId: string | null;
  productId: string | null;
  variantId: string | null;
  days: number | null;
};

const normalizeSearch = (
  search: FetchSalesAnalyticsParams["search"],
): NormalizedSearch => ({
  period: search.period,
  compare: search.compare,
  granularity: search.granularity,
  bucketDate: search.bucketDate ?? null,
  collectionId: search.collectionId ?? null,
  productId: search.productId ?? null,
  variantId: search.variantId ?? null,
  days: typeof search.days === "number" ? search.days : null,
});

const buildMetricKey = (search: FetchSalesAnalyticsParams["search"]): string => {
  const normalized = normalizeSearch(search);
  const hash = createHash("sha1").update(JSON.stringify(normalized)).digest("hex");
  return `sales_analytics:${hash}`;
};

type CachedPayload = {
  dataset: SalesDataset;
  search: NormalizedSearch;
  storedAt: string;
};

const isSalesDataset = (value: unknown): value is SalesDataset => {
  if (!isObject(value)) return false;
  return (
    typeof value.range === "object" &&
    value.range !== null &&
    Array.isArray((value as { trend?: unknown }).trend) &&
    Array.isArray((value as { collections?: unknown }).collections) &&
    typeof (value as { totals?: unknown }).totals === "object"
  );
};

const isCachedPayload = (value: unknown): value is CachedPayload =>
  isObject(value) && "dataset" in value && isSalesDataset((value as { dataset: unknown }).dataset);

const cloneDataset = (dataset: SalesDataset): SalesDataset => {
  if (typeof structuredClone === "function") {
    return structuredClone(dataset);
  }
  return JSON.parse(JSON.stringify(dataset)) as SalesDataset;
};

type ResolveStoreIdInput = {
  explicitStoreId?: string | null;
  shopDomain?: string | null;
};

const resolveStoreId = async ({
  explicitStoreId,
  shopDomain,
}: ResolveStoreIdInput): Promise<string | null> => {
  if (explicitStoreId) {
    return explicitStoreId;
  }
  if (!shopDomain) {
    return null;
  }
  const normalized = shopDomain.toLowerCase();
  try {
    const record = await prisma.store.findFirst({
      where: {
        OR: [
          { domain: normalized },
          { myShopifyDomain: normalized },
        ],
      },
      select: { id: true },
    });
    return record?.id ?? null;
  } catch (error) {
    console.warn("[sales:cache] Failed to resolve store for domain", {
      shopDomain: normalized,
      error,
    });
    return null;
  }
};

type CacheCoordinates = {
  storeId: string;
  metricKey: string;
  rangeStart: Date;
  rangeEnd: Date;
};

type LoadCacheArgs = CacheCoordinates & {
  now: Date;
};

const loadCachedDataset = async (
  args: LoadCacheArgs,
): Promise<SalesDataset | null> => {
  try {
    const row = await prisma.kpiCache.findUnique({
      where: {
        storeId_metricKey_rangeStart_rangeEnd: {
          storeId: args.storeId,
          metricKey: args.metricKey,
          rangeStart: args.rangeStart,
          rangeEnd: args.rangeEnd,
        },
      },
    });
    if (!row) {
      return null;
    }
    if (row.expiresAt && row.expiresAt.getTime() <= args.now.getTime()) {
      return null;
    }
    const payload = row.payload as CachedPayload | SalesDataset | null;
    if (!payload) {
      return null;
    }
    if (isCachedPayload(payload)) {
      return cloneDataset(payload.dataset);
    }
    if (isSalesDataset(payload)) {
      return cloneDataset(payload);
    }
    console.warn("[sales:cache] Ignoring invalid cache payload", {
      storeId: args.storeId,
      metricKey: args.metricKey,
    });
    return null;
  } catch (error) {
    console.warn("[sales:cache] Failed to load sales analytics cache", {
      storeId: args.storeId,
      metricKey: args.metricKey,
      error,
    });
    return null;
  }
};

type PersistCacheArgs = CacheCoordinates & {
  dataset: SalesDataset;
  search: FetchSalesAnalyticsParams["search"];
  now: Date;
  ttlMinutes?: number;
};

const persistCache = async (args: PersistCacheArgs) => {
  const payload: CachedPayload = {
    dataset: args.dataset,
    search: normalizeSearch(args.search),
    storedAt: args.now.toISOString(),
  };
  const ttlMinutes = typeof args.ttlMinutes === "number" && args.ttlMinutes > 0
    ? args.ttlMinutes
    : DEFAULT_CACHE_TTL_MINUTES;
  const expiresAt = new Date(args.now.getTime() + ttlMinutes * 60 * 1000);

  try {
    await prisma.kpiCache.upsert({
      where: {
        storeId_metricKey_rangeStart_rangeEnd: {
          storeId: args.storeId,
          metricKey: args.metricKey,
          rangeStart: args.rangeStart,
          rangeEnd: args.rangeEnd,
        },
      },
      update: {
        payload,
        refreshedAt: args.now,
        expiresAt,
      },
      create: {
        storeId: args.storeId,
        metricKey: args.metricKey,
        rangeStart: args.rangeStart,
        rangeEnd: args.rangeEnd,
        payload,
        refreshedAt: args.now,
        expiresAt,
      },
    });
  } catch (error) {
    console.warn("[sales:cache] Failed to persist sales analytics cache", {
      storeId: args.storeId,
      metricKey: args.metricKey,
      error,
    });
  }
};

export type FetchSalesAnalyticsWithCacheOptions = FetchSalesAnalyticsParams & {
  cache?: {
    storeId?: string | null;
    ttlMinutes?: number;
    now?: Date;
  };
};

export const fetchSalesAnalyticsWithCache = async (
  options: FetchSalesAnalyticsWithCacheOptions,
): Promise<SalesDataset> => {
  const { cache, ...fetchParams } = options;
  const now = cache?.now ?? new Date();
  const rangeStart = parseRangeBoundary(fetchParams.search.rangeStart);
  const rangeEnd = parseRangeBoundary(fetchParams.search.rangeEnd);
  let storeId: string | null = null;

  if (rangeStart && rangeEnd) {
    storeId = await resolveStoreId({
      explicitStoreId: cache?.storeId ?? null,
      shopDomain: fetchParams.shopDomain ?? null,
    });

    if (storeId) {
      const metricKey = buildMetricKey(fetchParams.search);
      const cached = await loadCachedDataset({
        storeId,
        metricKey,
        rangeStart,
        rangeEnd,
        now,
      });
      if (cached) {
        return cached;
      }

      const dataset = await fetchSalesAnalytics(fetchParams);
      await persistCache({
        storeId,
        metricKey,
        rangeStart,
        rangeEnd,
        dataset,
        search: fetchParams.search,
        now,
        ttlMinutes: cache?.ttlMinutes,
      });
      return dataset;
    }
  }

  return fetchSalesAnalytics(fetchParams);
};

export const invalidateSalesAnalyticsCache = async (
  options: {
    storeId: string;
    search: FetchSalesAnalyticsParams["search"];
    rangeStart: string;
    rangeEnd: string;
  },
): Promise<void> => {
  const startDate = parseRangeBoundary(options.rangeStart);
  const endDate = parseRangeBoundary(options.rangeEnd);
  if (!startDate || !endDate) {
    return;
  }
  const metricKey = buildMetricKey(options.search);
  try {
    await prisma.kpiCache.deleteMany({
      where: {
        storeId: options.storeId,
        metricKey,
        rangeStart: startDate,
        rangeEnd: endDate,
      },
    });
  } catch (error) {
    console.warn("[sales:cache] Failed to invalidate sales analytics cache", {
      storeId: options.storeId,
      metricKey,
      error,
    });
  }
};
