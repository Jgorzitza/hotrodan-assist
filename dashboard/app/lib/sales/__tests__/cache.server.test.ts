import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SalesDataset } from "~/types/dashboard";

const findFirstMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const deleteManyMock = vi.fn();
const fetchSalesAnalyticsMock = vi.fn();

vi.mock("~/db.server", () => ({
  __esModule: true,
  default: {
    store: {
      findFirst: findFirstMock,
    },
    kpiCache: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
  },
}));

vi.mock("~/lib/sales/analytics.server", () => ({
  __esModule: true,
  fetchSalesAnalytics: fetchSalesAnalyticsMock,
}));

const datasetFixture: SalesDataset = {
  scenario: "base",
  state: "ok",
  granularity: "daily",
  range: {
    label: "Last 28 days",
    start: "2025-09-01T00:00:00.000Z",
    end: "2025-09-28T00:00:00.000Z",
  },
  totals: {
    currentTotal: { amount: 1000, currency: "USD", formatted: "$1,000.00" },
    previousTotal: { amount: 900, currency: "USD", formatted: "$900.00" },
    deltaPercentage: 11.1,
    averageOrderValue: { amount: 150, currency: "USD", formatted: "$150.00" },
    conversionRate: 2.4,
  },
  trend: [],
  channelBreakdown: [],
  forecast: null,
  collections: [],
  productsByCollection: {},
  variantsByProduct: {},
  bestSellers: [],
  laggards: [],
  attachRateInsights: [],
  overstockRisks: [],
  cohortHighlights: [],
  topCustomers: [],
};

const resetMocks = () => {
  findFirstMock.mockReset();
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  deleteManyMock.mockReset();
  fetchSalesAnalyticsMock.mockReset();
};

beforeEach(() => {
  resetMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

const importModule = () =>
  import("../cache.server").then((module) => ({
    fetchSalesAnalyticsWithCache: module.fetchSalesAnalyticsWithCache,
    invalidateSalesAnalyticsCache: module.invalidateSalesAnalyticsCache,
  }));

describe("fetchSalesAnalyticsWithCache", () => {
  it("returns cached dataset when entry is fresh", async () => {
    const { fetchSalesAnalyticsWithCache } = await importModule();
    const now = new Date("2025-09-29T12:00:00.000Z");

    findFirstMock.mockResolvedValue({ id: "store_123" });
    findUniqueMock.mockResolvedValue({
      payload: {
        dataset: datasetFixture,
        search: {
          period: "28d",
          compare: "previous_period",
          granularity: "daily",
          bucketDate: null,
          collectionId: null,
          productId: null,
          variantId: null,
          days: 28,
        },
        storedAt: now.toISOString(),
      },
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    const result = await fetchSalesAnalyticsWithCache({
      cache: { now },
      shopDomain: "test-shop.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
    });

    expect(fetchSalesAnalyticsMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(result).toEqual(datasetFixture);
  });

  it("fetches dataset and persists cache on miss", async () => {
    const { fetchSalesAnalyticsWithCache } = await importModule();
    const now = new Date("2025-09-29T12:00:00.000Z");

    findFirstMock.mockResolvedValue({ id: "store_abc" });
    findUniqueMock.mockResolvedValue(null);
    fetchSalesAnalyticsMock.mockResolvedValue(datasetFixture);

    const result = await fetchSalesAnalyticsWithCache({
      cache: { now, ttlMinutes: 30 },
      shopDomain: "test-shop.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
    });

    expect(result).toEqual(datasetFixture);
    expect(fetchSalesAnalyticsMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = upsertMock.mock.calls[0]?.[0];
    expect(upsertArgs?.where?.storeId_metricKey_rangeStart_rangeEnd?.storeId).toBe("store_abc");
    expect(upsertArgs?.where?.storeId_metricKey_rangeStart_rangeEnd?.metricKey).toMatch(
      /^sales_analytics:/,
    );
    expect(upsertArgs?.create?.payload?.dataset).toEqual(datasetFixture);
    expect(upsertArgs?.create?.refreshedAt).toEqual(now);
  });

  it("supports legacy payload shape without wrapper", async () => {
    const { fetchSalesAnalyticsWithCache } = await importModule();
    const now = new Date("2025-09-29T12:00:00.000Z");

    findFirstMock.mockResolvedValue({ id: "store_legacy" });
    findUniqueMock.mockResolvedValue({
      payload: datasetFixture,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    const result = await fetchSalesAnalyticsWithCache({
      cache: { now },
      shopDomain: "legacy-store.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
    });

    expect(fetchSalesAnalyticsMock).not.toHaveBeenCalled();
    expect(result).toEqual(datasetFixture);
  });

  it("falls back to direct fetch when store is missing", async () => {
    const { fetchSalesAnalyticsWithCache } = await importModule();
    findFirstMock.mockResolvedValue(null);
    fetchSalesAnalyticsMock.mockResolvedValue(datasetFixture);

    const result = await fetchSalesAnalyticsWithCache({
      shopDomain: "missing-store.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
    });

    expect(result).toEqual(datasetFixture);
    expect(fetchSalesAnalyticsMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("ignores expired cache entries", async () => {
    const { fetchSalesAnalyticsWithCache } = await importModule();
    const now = new Date("2025-09-29T12:00:00.000Z");

    findFirstMock.mockResolvedValue({ id: "store_expired" });
    findUniqueMock.mockResolvedValue({
      payload: {
        dataset: datasetFixture,
        search: {
          period: "28d",
          compare: "previous_period",
          granularity: "daily",
          bucketDate: null,
          collectionId: null,
          productId: null,
          variantId: null,
          days: 28,
        },
        storedAt: "2025-09-01T00:00:00.000Z",
      },
      expiresAt: new Date(now.getTime() - 5 * 60 * 1000),
    });
    fetchSalesAnalyticsMock.mockResolvedValue(datasetFixture);

    const result = await fetchSalesAnalyticsWithCache({
      cache: { now },
      shopDomain: "expired-store.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
    });

    expect(result).toEqual(datasetFixture);
    expect(fetchSalesAnalyticsMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});

describe("invalidateSalesAnalyticsCache", () => {
  it("deletes matching cache rows", async () => {
    const { invalidateSalesAnalyticsCache } = await importModule();

    findFirstMock.mockResolvedValue({ id: "store_123" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    await invalidateSalesAnalyticsCache({
      storeId: "store_123",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        bucketDate: null,
        collectionId: null,
        productId: null,
        variantId: null,
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
      rangeStart: "2025-09-01",
      rangeEnd: "2025-09-28",
    });

    expect(deleteManyMock).toHaveBeenCalledTimes(1);
    const args = deleteManyMock.mock.calls[0]?.[0];
    expect(args?.where?.storeId).toBe("store_123");
    expect(args?.where?.metricKey).toMatch(/^sales_analytics:/);
  });

  it("skips invalid ranges", async () => {
    const { invalidateSalesAnalyticsCache } = await importModule();

    await invalidateSalesAnalyticsCache({
      storeId: "store_invalid",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
        bucketDate: null,
        collectionId: null,
        productId: null,
        variantId: null,
        days: 28,
        rangeStart: "2025-09-01",
        rangeEnd: "2025-09-28",
      },
      rangeStart: "not-a-date",
      rangeEnd: "2025-09-28",
    });

    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});
