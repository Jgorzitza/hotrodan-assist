import { afterEach, describe, expect, it, vi } from "vitest";

import { analyticsSalesWarning } from "~/mocks/fixtures/analytics.sales";

import { fetchSalesAnalytics, mapAnalyticsResponse } from "../analytics.server";

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof vi.unstubAllGlobals === "function") {
    vi.unstubAllGlobals();
  }
});

describe("fetchSalesAnalytics", () => {

  it("maps analytics response into SalesDataset", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => analyticsSalesWarning,
    });
    vi.stubGlobal("fetch", fetchMock);

    const dataset = await fetchSalesAnalytics({
      baseUrl: "https://analytics.test",
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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://analytics.test/analytics/sales?period=28d&compare=previous_period&granularity=daily&days=28&rangeStart=2025-09-01&rangeEnd=2025-09-28",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Shop-Domain": "test-shop.myshopify.com" }),
      }),
    );

    expect(dataset.range.start).toBe("2025-09-01");
    expect(dataset.range.end).toBe("2025-09-28");
    expect(dataset.state).toBe("warning");
    expect(dataset.granularity).toBe("weekly");
    expect(dataset.range.label).toBe("Last 4 weeks");
    expect(dataset.totals.currentTotal.amount).toBeCloseTo(125000.55);
    expect(dataset.channelBreakdown[0]?.channel).toBe("Online Store");
    expect(dataset.forecast?.varianceLabel).toBe("ahead");

    expect(dataset.trend[0]?.date).toBe("2025-09-01");

    const [collection] = dataset.collections;
    expect(collection?.title).toBe("EFI Components");

    const products = dataset.productsByCollection[collection!.id];
    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.title).toBe("Fuel Pump Kit");
    expect(product.attachRate).toBeCloseTo(22.5);

    const variants = dataset.variantsByProduct[product.id];
    expect(variants).toHaveLength(1);
    expect(variants[0]?.backorderRisk).toBe("low");

    expect(dataset.bestSellers[0]?.inventoryStatus).toBe("overstock");
    expect(dataset.laggards[0]?.inventoryStatus).toBe("stockout_risk");
    expect(dataset.attachRateInsights[0]?.attachRate).toBeCloseTo(12.5);
    expect(dataset.overstockRisks[0]?.daysOnHand).toBe(65);
    expect(dataset.topCustomers[0]?.lifetimeValue.formatted).toBe("$3,200.00");
    expect(dataset.alert).toBe("Live data delayed");
  });

  it("preserves base URL path segments when building analytics request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => analyticsSalesWarning,
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchSalesAnalytics({
      baseUrl: "https://analytics.test/api/v1",
      shopDomain: "test-shop.myshopify.com",
      search: {
        period: "28d",
        compare: "previous_period",
        granularity: "daily",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://analytics.test/api/v1/analytics/sales?period=28d&compare=previous_period&granularity=daily",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Shop-Domain": "test-shop.myshopify.com" }),
      }),
    );
  });

  it("throws when analytics base URL is missing", async () => {
    await expect(
      fetchSalesAnalytics({
        shopDomain: "test-shop",
        search: {
          period: "28d",
          compare: "previous_period",
          granularity: "daily",
        },
      }),
    ).rejects.toThrowError(/ANALYTICS_SERVICE_URL/);
  });

  it("normalizes date fields to YYYY-MM-DD", () => {
    const dataset = mapAnalyticsResponse({
      scenario: "base",
      state: "ok",
      granularity: "daily",
      range: {
        label: "Custom",
        start: "2025-10-01T05:15:00-04:00",
        end: "2025-10-07 23:00:00",
      },
      totals: {
        current_total: { amount: 1000, currency: "USD" },
        previous_total: { amount: 900, currency: "USD" },
        delta_percentage: 5,
        average_order_value: { amount: 120, currency: "USD" },
        conversion_rate: 2.5,
      },
      trend: [
        {
          date: "2025-10-01T12:00:00Z",
          total: { amount: 500, currency: "USD" },
          orders: "18",
        },
        {
          date: "2025-10-02 15:30:00",
          total: { amount: 420, currency: "USD" },
          orders: 15,
        },
      ],
      channel_breakdown: null,
      collections: [],
      best_sellers: [],
      laggards: [],
      attach_rate_insights: [],
      overstock_risks: [],
      cohort_highlights: [],
      top_customers: [],
    });

    expect(dataset.range.start).toBe("2025-10-01");
    expect(dataset.range.end).toBe("2025-10-07");
    expect(dataset.trend[0]?.date).toBe("2025-10-01");
    expect(dataset.trend[1]?.date).toBe("2025-10-02");
  });
});
