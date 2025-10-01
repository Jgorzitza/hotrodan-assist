/* eslint-disable @typescript-eslint/consistent-type-imports */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { analyticsSalesFixtures, analyticsSalesWarning } from "~/mocks/fixtures/analytics.sales";
import type { FetchSalesAnalyticsWithCacheOptions } from "~/lib/sales/cache.server";
import type { SalesDataset } from "~/types/dashboard";
import type { AnalyticsSalesResponse } from "~/types/analytics";

const mapAnalyticsResponsePromise = vi.hoisted(() =>
  vi
    .importActual<typeof import("../../lib/sales/analytics.server")>(
      "../../lib/sales/analytics.server",
    )
    .then((module) => module.mapAnalyticsResponse),
);

const authenticateAdminMock = vi.fn(async () => ({ session: { shop: "test-shop" } }));

const fetchSalesAnalyticsWithCacheMock = vi.fn(
  async (params: FetchSalesAnalyticsWithCacheOptions): Promise<SalesDataset> => {
    const mapAnalyticsResponse = await mapAnalyticsResponsePromise;
    const payload: AnalyticsSalesResponse = structuredClone(analyticsSalesWarning);
    payload.granularity = params.search.granularity;
    if (params.search.rangeStart && params.search.rangeEnd) {
      payload.range = {
        label: payload.range?.label ?? "Custom range",
        start: params.search.rangeStart,
        end: params.search.rangeEnd,
      };
    }
    return mapAnalyticsResponse(payload);
  },
);

type AppSalesModule = Awaited<ReturnType<typeof importModule>>;

const importModule = () => import("../app.sales");

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

vi.mock("../../lib/sales/cache.server", async () => {
  const actual = await vi.importActual<typeof import("../../lib/sales/cache.server")>(
    "../../lib/sales/cache.server",
  );
  return {
    ...actual,
    fetchSalesAnalyticsWithCache: fetchSalesAnalyticsWithCacheMock,
  };
});

let cachedModule: AppSalesModule | null = null;

const loadModule = async (): Promise<AppSalesModule> => {
  process.env.USE_MOCK_DATA = "false";
  authenticateAdminMock.mockResolvedValue({ session: { shop: "test-shop" } });

  if (cachedModule) {
    return cachedModule;
  }

  cachedModule = await importModule();
  return cachedModule;
};

beforeEach(() => {
  authenticateAdminMock.mockClear();
  fetchSalesAnalyticsWithCacheMock.mockClear();
});

afterEach(() => {
  delete process.env.USE_MOCK_DATA;
  vi.restoreAllMocks();
});

describe("sales loader (prisma mode)", () => {
  it("authenticates and normalizes the base filters", async () => {
    const module = await loadModule();

    const request = new Request("http://localhost/app/sales?period=14d&compare=previous_year&granularity=weekly");
    const response = await module.loader({
      request,
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(authenticateAdminMock).toHaveBeenCalledTimes(1);
    expect(payload.useMockData).toBe(false);
    expect(payload.filters.period).toBe("14d");
    expect(payload.filters.range).toBe("14d");
    expect(payload.filters.compare).toBe("previous_year");
    expect(payload.drilldown.level).toBe("collections");
    expect(payload.drilldown.rows.length).toBeGreaterThan(0);
    expect(payload.dataset.collections.length).toBeGreaterThan(0);
    expect(fetchSalesAnalyticsWithCacheMock).toHaveBeenCalledTimes(1);
    const fetchArgs = fetchSalesAnalyticsWithCacheMock.mock.calls[0]?.[0];
    expect(payload.filters.days).toBe(fetchArgs?.search.days);
    expect(fetchArgs?.shopDomain).toBe("test-shop");
    expect(fetchArgs?.search).toEqual(
      expect.objectContaining({
        period: "14d",
        compare: "previous_year",
        granularity: "weekly",
        days: 14,
      }),
    );
    expect(fetchArgs?.search.rangeStart).toEqual(payload.dataset.range.start);
    expect(fetchArgs?.search.rangeEnd).toEqual(payload.dataset.range.end);
    expect(fetchArgs?.search.rangeStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fetchArgs?.search.rangeEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.dataset.range.start).not.toContain("T");
    expect(payload.dataset.range.end).not.toContain("T");
    expect(fetchArgs?.search.collectionId ?? undefined).toBeUndefined();
    expect(fetchArgs?.search.productId ?? undefined).toBeUndefined();
    expect(fetchArgs?.search.variantId ?? undefined).toBeUndefined();
  });

  it("returns variant drilldown when search params target a specific SKU", async () => {
    const module = await loadModule();

    const baseResponse = await module.loader({
      request: new Request("http://localhost/app/sales?granularity=daily"),
      params: {},
      context: {} as never,
    });
    const basePayload = await baseResponse.json();

    const collection = basePayload.dataset.collections[0];
    const product = basePayload.dataset.productsByCollection[collection.id][0];
    const variant = basePayload.dataset.variantsByProduct[product.id][0];

    const url = new URL("http://localhost/app/sales");
    url.searchParams.set("collectionId", collection.id);
    url.searchParams.set("productId", product.id);
    url.searchParams.set("variantId", variant.id);

    const response = await module.loader({
      request: new Request(url),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(authenticateAdminMock).toHaveBeenCalledTimes(2);
    expect(payload.drilldown.level).toBe("variants");
    expect(payload.selection.variant?.id).toBe(variant.id);
    expect(payload.filters.variantId).toBe(variant.id);
    expect(payload.drilldown.rows.length).toBeGreaterThan(0);
  });

  it("falls back to fixture data when analytics fetch fails", async () => {
    const module = await loadModule();

    fetchSalesAnalyticsWithCacheMock.mockRejectedValueOnce(new Error("analytics offline"));

    const response = await module.loader({
      request: new Request("http://localhost/app/sales"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(fetchSalesAnalyticsWithCacheMock).toHaveBeenCalledTimes(1);
    expect(payload.useMockData).toBe(true);
    expect(payload.dataset.state).toBe("warning");
    expect(payload.dataset.collections.length).toBeGreaterThan(0);
    expect(payload.dataset.alert).toContain("temporarily unavailable");
  });
});

describe("sales action (prisma mode)", () => {
  it("authenticates and downloads variant drilldown CSV", async () => {
    const module = await loadModule();

    const baseResponse = await module.loader({
      request: new Request("http://localhost/app/sales?period=14d&granularity=daily"),
      params: {},
      context: {} as never,
    });
    const basePayload = await baseResponse.json();

    const collection = basePayload.dataset.collections[0];
    const product = basePayload.dataset.productsByCollection[collection.id][0];
    const variant = basePayload.dataset.variantsByProduct[product.id][0];

    const form = new URLSearchParams();
    form.set("intent", "export");
    form.set("period", "14d");
    form.set("compare", "previous_period");
    form.set("granularity", "daily");
    form.set("collectionId", collection.id);
    form.set("productId", product.id);
    form.set("variantId", variant.id);

    const response = await module.action({
      request: new Request("http://localhost/app/sales", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      params: {},
      context: {} as never,
    });

    expect(authenticateAdminMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "sales-variants-14d.csv",
    );

    const csv = await response.text();
    const [header] = csv.trim().split("\n");
    expect(header).toBe("Variant,SKU,GMV,Units Sold,Attach Rate,Inventory On Hand,Backorder Risk");
    expect(csv.includes(variant.sku)).toBe(true);
    expect(fetchSalesAnalyticsWithCacheMock).toHaveBeenCalledTimes(2);
    const actionArgs = fetchSalesAnalyticsWithCacheMock.mock.calls[1]?.[0];
    expect(actionArgs?.search.collectionId).toBe(collection.id);
    expect(actionArgs?.search.productId).toBe(product.id);
    expect(actionArgs?.search.variantId).toBe(variant.id);
    expect(actionArgs?.search.period).toBe("14d");
    expect(actionArgs?.search.compare).toBe("previous_period");
    expect(actionArgs?.search.granularity).toBe("daily");
    expect(actionArgs?.search.rangeStart).toEqual(basePayload.dataset.range.start);
    expect(actionArgs?.search.rangeEnd).toEqual(basePayload.dataset.range.end);
    expect(actionArgs?.search.rangeStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(actionArgs?.search.rangeEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(basePayload.dataset.range.start).not.toContain("T");
    expect(basePayload.dataset.range.end).not.toContain("T");
  });

  it("exports CSV from fixture data when analytics fetch fails", async () => {
    const module = await loadModule();

    await module.loader({
      request: new Request("http://localhost/app/sales"),
      params: {},
      context: {} as never,
    });

    fetchSalesAnalyticsWithCacheMock.mockRejectedValueOnce(new Error("analytics offline"));

    const form = new URLSearchParams();
    form.set("intent", "export");
    form.set("period", "28d");
    form.set("compare", "previous_period");
    form.set("granularity", "daily");

    const response = await module.action({
      request: new Request("http://localhost/app/sales", {
        method: "POST",
        body: form,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
      params: {},
      context: {} as never,
    });

    expect(fetchSalesAnalyticsWithCacheMock).toHaveBeenCalledTimes(2);
    const failedActionArgs = fetchSalesAnalyticsWithCacheMock.mock.calls[1]?.[0];
    expect(failedActionArgs?.search.rangeStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(failedActionArgs?.search.rangeEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    const csv = await response.text();
    expect(csv.split("\n")[0]).toBe(
      "Collection,Handle,GMV,Orders,Conversion Rate,Returning Rate,Attach Rate,Delta %",
    );
    const expectedCollectionTitle =
      analyticsSalesFixtures.base.collections?.[0]?.title ?? "";
    expect(csv).toContain(expectedCollectionTitle);
  });
});
