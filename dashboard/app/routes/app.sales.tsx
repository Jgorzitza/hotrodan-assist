import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useLocation,
  useSearchParams,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  DataTable,
  InlineGrid,
  InlineStack,
  Layout,
  Link as PolarisLink,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import {
  BarChart,
  PolarisVizProvider,
  SparkLineChart,
  type DataSeries,
} from "@shopify/polaris-viz";
import { TitleBar } from "@shopify/app-bridge-react";
import { z } from "zod";

import { authenticate } from "../shopify.server";
import { scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type {
  DashboardRangeKey,
  MockScenario,
  Money,
  SalesBreadcrumb,
  SalesCollectionPerformance,
  SalesDataset,
  SalesDrilldown,
  SalesDrilldownMetrics,
  SalesGranularity,
  SalesProductPerformance,
  SalesTrendPoint,
  SalesVariantPerformance,
} from "~/types/dashboard";
import {
  DASHBOARD_RANGE_KEY_LIST,
  DEFAULT_DASHBOARD_RANGE,
  buildDashboardRangeSelection,
  resolveDashboardRangeKey,
} from "~/lib/date-range";
import { fetchSalesAnalyticsWithCache } from "~/lib/sales/cache.server";
import { buildSalesFixtureDataset } from "~/lib/sales/fixtures.server";

const GRANULARITY_VALUES = ["daily", "weekly", "monthly"] as const;

const GRANULARITY_OPTIONS: Array<{ label: string; value: SalesGranularity }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const PERIOD_OPTIONS = ["7d", "14d", "28d", "90d"] as const;
type PeriodOption = (typeof PERIOD_OPTIONS)[number];

const PERIOD_TO_DAYS: Record<PeriodOption, number> = {
  "7d": 7,
  "14d": 14,
  "28d": 28,
  "90d": 90,
};

const DEFAULT_PERIOD: PeriodOption = "28d";

const mapRangeKeyToPeriod = (range: DashboardRangeKey): PeriodOption => {
  switch (range) {
    case "today":
      return "7d";
    case "7d":
    case "14d":
    case "28d":
    case "90d":
      return range;
    default:
      return DEFAULT_PERIOD;
  }
};

const mapPeriodToRangeKey = (period: PeriodOption): DashboardRangeKey => {
  switch (period) {
    case "14d":
      return "14d";
    case "7d":
    case "28d":
    case "90d":
      return period;
    default:
      return DEFAULT_DASHBOARD_RANGE;
  }
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const computeRangeDays = (
  range: SalesDataset["range"] | undefined,
  fallback: number,
): number => {
  if (!range?.start || !range?.end) return fallback;
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return fallback;
  }
  const diff = end - start;
  if (!Number.isFinite(diff)) {
    return fallback;
  }
  const days = Math.floor(diff / MS_PER_DAY) + 1;
  if (!Number.isFinite(days) || days <= 0) {
    return fallback;
  }
  return days;
};

const toDateOnlyString = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  const [datePart] = trimmed.split("T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  return trimmed;
};

const COMPARE_OPTIONS = ["previous_period", "previous_year"] as const;
type CompareOption = (typeof COMPARE_OPTIONS)[number];

const COMPARE_SELECT_OPTIONS: Array<{ label: string; value: CompareOption }> = [
  { label: "Previous period", value: "previous_period" },
  { label: "Previous year", value: "previous_year" },
];

type SalesFilters = {
  period: PeriodOption;
  compare: CompareOption;
  granularity: SalesGranularity;
  bucketDate: string | null;
  collectionId: string | null;
  productId: string | null;
  variantId: string | null;
  days: number;
  range: DashboardRangeKey;
};

type LoaderData = {
  dataset: SalesDataset;
  scenario: MockScenario;
  useMockData: boolean;
  filters: SalesFilters;
  drilldown: SalesDrilldown;
  selection: {
    bucket?: SalesTrendPoint;
    collection?: SalesCollectionPerformance;
    product?: SalesProductPerformance;
    variant?: SalesVariantPerformance;
  };
};

const SEARCH_SCHEMA = z.object({
  period: z.enum(PERIOD_OPTIONS).default(DEFAULT_PERIOD),
  compare: z.enum(COMPARE_OPTIONS).default("previous_period"),
  granularity: z.enum(GRANULARITY_VALUES).default("daily"),
  bucketDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Invalid bucket date",
    }),
  collectionId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
});

type SearchParams = z.infer<typeof SEARCH_SCHEMA>;

type SelectionState = {
  collection?: SalesCollectionPerformance;
  products: SalesProductPerformance[];
  product?: SalesProductPerformance;
  variants: SalesVariantPerformance[];
  variant?: SalesVariantPerformance;
  level: SalesDrilldown["level"];
};

type DrilldownComputation =
  | {
      level: "collections";
      rows: SalesCollectionPerformance[];
      metrics: SalesDrilldownMetrics;
      nextLevel: "products";
    }
  | {
      level: "products";
      rows: SalesProductPerformance[];
      metrics: SalesDrilldownMetrics;
      nextLevel: "variants";
      selectedCollection: SalesCollectionPerformance;
    }
  | {
      level: "variants";
      rows: SalesVariantPerformance[];
      metrics: SalesDrilldownMetrics;
      nextLevel: null;
      selectedCollection?: SalesCollectionPerformance;
      selectedProduct: SalesProductPerformance;
    };

type DrilldownFactors = {
  revenue: number;
  orders: number;
};

type FilterParamKey =
  | "period"
  | "compare"
  | "granularity"
  | "bucketDate"
  | "range"
  | "collectionId"
  | "productId"
  | "variantId";

const currencyFormatterCache = new Map<Money["currency"], Intl.NumberFormat>();

const getCurrencyFormatter = (currency: Money["currency"]): Intl.NumberFormat => {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter;
};

const makeMoney = (currency: Money["currency"], amount: number): Money => {
  const rounded = Math.round(amount * 100) / 100;
  return {
    amount: rounded,
    currency,
    formatted: getCurrencyFormatter(currency).format(rounded),
  };
};

const scaleMoney = (money: Money, factor: number): Money => {
  return makeMoney(money.currency, money.amount * factor);
};

const scaleCount = (value: number, factor: number): number => {
  if (factor === 1) return Math.round(value);
  return Math.max(0, Math.round(value * factor));
};

const sumNumbers = (values: number[]): number =>
  values.reduce((total, current) => total + current, 0);

const averageNumbers = (values: number[]): number => {
  if (!values.length) return 0;
  return sumNumbers(values) / values.length;
};

const toOneDecimal = (value: number): number => Number(value.toFixed(1));

const parseSearch = (url: URL): SearchParams => {
  const raw: Record<string, string | undefined> = {};
  const keys = [
    "period",
    "compare",
    "granularity",
    "bucketDate",
    "collectionId",
    "productId",
    "variantId",
  ] as const;

  keys.forEach((key) => {
    const value = url.searchParams.get(key);
    raw[key] = value && value.trim().length > 0 ? value.trim() : undefined;
  });

  if (!raw.period) {
    const rangeValue = url.searchParams.get("range");
    if (rangeValue) {
      const normalizedRange = resolveDashboardRangeKey(rangeValue, DEFAULT_DASHBOARD_RANGE);
      raw.period = mapRangeKeyToPeriod(normalizedRange);
    }
  }

  if (!raw.period) {
    const daysValue = url.searchParams.get("days");
    if (daysValue) {
      const parsedDays = Number(daysValue);
      if (Number.isFinite(parsedDays)) {
        const mapped = Object.entries(PERIOD_TO_DAYS).find(([, days]) => days === parsedDays);
        if (mapped) {
          raw.period = mapped[0] as PeriodOption;
        } else if (parsedDays === 30) {
          raw.period = "28d";
        }
      }
    }
  }

  const result = SEARCH_SCHEMA.safeParse(raw);
  if (result.success) {
    return result.data;
  }

  console.warn("sales loader: falling back to defaults due to invalid params", result.error.flatten());
  return SEARCH_SCHEMA.parse({});
};

const selectEntities = (
  dataset: SalesDataset,
  filters: SearchParams,
): SelectionState => {
  const collection = filters.collectionId
    ? dataset.collections.find((item) => item.id === filters.collectionId)
    : undefined;
  const products = collection
    ? dataset.productsByCollection[collection.id] ?? []
    : [];
  const product = collection && filters.productId
    ? products.find((item) => item.id === filters.productId)
    : undefined;
  const variants = product
    ? dataset.variantsByProduct[product.id] ?? []
    : [];
  const variant = product && filters.variantId
    ? variants.find((item) => item.id === filters.variantId)
    : undefined;

  const level: SalesDrilldown["level"] = product
    ? "variants"
    : collection
      ? "products"
      : "collections";

  return { collection, products, product, variants, variant, level };
};

const computeFactors = (
  dataset: SalesDataset,
  bucket?: SalesTrendPoint,
): DrilldownFactors => {
  if (!bucket) {
    return { revenue: 1, orders: 1 };
  }

  const totalRevenue = dataset.totals.currentTotal.amount || 1;
  const revenueFactor = bucket.total.amount / totalRevenue || 0;

  const totalOrders = dataset.trend.reduce((total, entry) => total + entry.orders, 0) || 1;
  const ordersFactor = bucket.orders / totalOrders || revenueFactor || 1;

  return {
    revenue: Math.max(revenueFactor, 0),
    orders: Math.max(ordersFactor, 0),
  };
};

const computeCollectionMetrics = (
  rows: SalesCollectionPerformance[],
  currency: Money["currency"],
): SalesDrilldownMetrics => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.orders)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal(averageNumbers(rows.map((row) => row.returningRate))),
});

const computeProductMetrics = (
  rows: SalesProductPerformance[],
  currency: Money["currency"],
): SalesDrilldownMetrics => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.orders)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal(averageNumbers(rows.map((row) => row.returningRate))),
});

const computeVariantMetrics = (
  rows: SalesVariantPerformance[],
  currency: Money["currency"],
  product?: SalesProductPerformance,
): SalesDrilldownMetrics => ({
  gmv: makeMoney(currency, sumNumbers(rows.map((row) => row.gmv.amount))),
  orders: sumNumbers(rows.map((row) => row.unitsSold)),
  attachRate: toOneDecimal(averageNumbers(rows.map((row) => row.attachRate))),
  returningRate: toOneDecimal(product?.returningRate ?? 0),
});

const computeDrilldown = (
  dataset: SalesDataset,
  selection: SelectionState,
  factors: DrilldownFactors,
): DrilldownComputation => {
  const currency = dataset.totals.currentTotal.currency;

  if (selection.level === "collections") {
    const rows = dataset.collections.map((row) => ({
      ...row,
      gmv: scaleMoney(row.gmv, factors.revenue),
      orders: scaleCount(row.orders, factors.orders),
    }));

    return {
      level: "collections",
      rows,
      metrics: computeCollectionMetrics(rows, currency),
      nextLevel: "products",
    };
  }

  if (selection.level === "products") {
    const collection = selection.collection!;
    const baseRows = dataset.productsByCollection[collection.id] ?? [];
    const rows = baseRows.map((row) => ({
      ...row,
      gmv: scaleMoney(row.gmv, factors.revenue),
      orders: scaleCount(row.orders, factors.orders),
    }));

    return {
      level: "products",
      rows,
      metrics: computeProductMetrics(rows, currency),
      nextLevel: "variants",
      selectedCollection: {
        ...collection,
        gmv: scaleMoney(collection.gmv, factors.revenue),
        orders: scaleCount(collection.orders, factors.orders),
      },
    };
  }

  const product = selection.product!;
  const variants = dataset.variantsByProduct[product.id] ?? [];
  const rows = variants.map((row) => ({
    ...row,
    gmv: scaleMoney(row.gmv, factors.revenue),
    unitsSold: scaleCount(row.unitsSold, factors.orders),
  }));

  return {
    level: "variants",
    rows,
    metrics: computeVariantMetrics(rows, currency, product),
    nextLevel: null,
    selectedCollection: selection.collection
      ? {
          ...selection.collection,
          gmv: scaleMoney(selection.collection.gmv, factors.revenue),
          orders: scaleCount(selection.collection.orders, factors.orders),
        }
      : undefined,
    selectedProduct: {
      ...product,
      gmv: scaleMoney(product.gmv, factors.revenue),
      orders: scaleCount(product.orders, factors.orders),
    },
  };
};

const buildSearchParams = (
  base: URLSearchParams,
  filters: SalesFilters,
): URLSearchParams => {
  const params = new URLSearchParams();

  if (base.has("mockState")) {
    const mockState = base.get("mockState");
    if (mockState) {
      params.set("mockState", mockState);
    }
  }

  params.set("period", filters.period);
  params.set("compare", filters.compare);
  params.set("granularity", filters.granularity);

  if (filters.bucketDate) params.set("bucketDate", filters.bucketDate);
  if (filters.collectionId) params.set("collectionId", filters.collectionId);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.variantId) params.set("variantId", filters.variantId);

  return params;
};

const buildHref = (
  url: URL,
  filters: SalesFilters,
  overrides: Partial<
    Pick<
      SalesFilters,
      "period" | "compare" | "granularity" | "bucketDate" | "collectionId" | "productId" | "variantId"
    >
  >,
): string => {
  const params = buildSearchParams(url.searchParams, filters);

  Object.entries(overrides).forEach(([key, value]) => {
    const param = key as keyof SalesFilters;
    if (value === null || value === undefined || value === "") {
      params.delete(param);
    } else {
      params.set(param, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

const buildBreadcrumbs = (
  url: URL,
  filters: SalesFilters,
  selection: SelectionState,
  rangeLabel: string,
  level: SalesDrilldown["level"],
): SalesBreadcrumb[] => {
  const breadcrumbs: SalesBreadcrumb[] = [];
  const baseLabel = filters.bucketDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(filters.bucketDate))
    : rangeLabel;

  breadcrumbs.push({
    label: baseLabel,
    ...(filters.bucketDate
      ? {
          href: buildHref(url, filters, {
            bucketDate: null,
            collectionId: null,
            productId: null,
            variantId: null,
          }),
        }
      : {}),
  });

  if (selection.collection) {
    breadcrumbs.push({
      label: selection.collection.title,
      ...(level !== "collections"
        ? {
            href: buildHref(url, filters, {
              collectionId: null,
              productId: null,
              variantId: null,
            }),
          }
        : {}),
    });
  }

  if (selection.product) {
    breadcrumbs.push({
      label: selection.product.title,
      ...(level === "variants"
        ? {
            href: buildHref(url, filters, { productId: null, variantId: null }),
          }
        : {}),
    });
  }

  return breadcrumbs;
};

const escapeCsv = (value: string | number): string => {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const generateCsv = (drilldown: DrilldownComputation): string => {
  const lines: string[] = [];

  switch (drilldown.level) {
    case "collections": {
      lines.push(
        "Collection,Handle,GMV,Orders,Conversion Rate,Returning Rate,Attach Rate,Delta %",
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.handle),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.orders),
            escapeCsv(`${row.conversionRate.toFixed(2)}%`),
            escapeCsv(`${row.returningRate.toFixed(1)}%`),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(`${row.deltaPercentage.toFixed(1)}%`),
          ].join(","),
        );
      });
      break;
    }
    case "products": {
      lines.push(
        "Product,GMV,Orders,Attach Rate,Returning Rate,Refund Rate,SKU Count,Inventory Status",
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.orders),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(`${row.returningRate.toFixed(1)}%`),
            escapeCsv(`${row.refundRate.toFixed(1)}%`),
            escapeCsv(row.skuCount),
            escapeCsv(row.inventoryStatus.replace(/_/g, " ")), 
          ].join(","),
        );
      });
      break;
    }
    case "variants": {
      lines.push(
        "Variant,SKU,GMV,Units Sold,Attach Rate,Inventory On Hand,Backorder Risk",
      );
      drilldown.rows.forEach((row) => {
        lines.push(
          [
            escapeCsv(row.title),
            escapeCsv(row.sku),
            escapeCsv(row.gmv.formatted),
            escapeCsv(row.unitsSold),
            escapeCsv(`${row.attachRate.toFixed(1)}%`),
            escapeCsv(row.inventoryOnHand),
            escapeCsv(row.backorderRisk.replace(/_/g, " ")),
          ].join(","),
        );
      });
      break;
    }
    default: {
      lines.push("No data available");
    }
  }

  if (lines.length === 1 && !lines[0]) {
    lines.push("No records");
  }

  return `${lines.join("\n")}\n`;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const search = parseSearch(url);
  const scenario = scenarioFromRequest(request);

  const fallbackRange = mapPeriodToRangeKey(search.period);
  const rawRangeParam = url.searchParams.get("range");
  const activeRange = rawRangeParam
    ? resolveDashboardRangeKey(rawRangeParam, fallbackRange)
    : fallbackRange;
  const rangeSelection = buildDashboardRangeSelection(activeRange);
  const normalizedPeriod = mapRangeKeyToPeriod(activeRange);
  const normalizedSearch: SearchParams = {
    ...search,
    period: normalizedPeriod,
  };

  const rangeStartDate = toDateOnlyString(rangeSelection.start);
  const rangeEndDate = toDateOnlyString(rangeSelection.end);

  const fixtureRange = {
    label: rangeSelection.label,
    start: rangeStartDate,
    end: rangeEndDate,
    days: rangeSelection.days,
  } as const;

  const fixtureDataset = buildSalesFixtureDataset({
    scenario,
    granularity: normalizedSearch.granularity,
    range: fixtureRange,
  });

  let dataset: SalesDataset = fixtureDataset;
  let usingMockDataset = USE_MOCK_DATA;

  if (!USE_MOCK_DATA) {
    const auth = await authenticate.admin(request);
    try {
      dataset = await fetchSalesAnalyticsWithCache({
        shopDomain: auth?.session?.shop ?? undefined,
        signal: request.signal,
        search: {
          period: normalizedSearch.period,
          compare: normalizedSearch.compare,
          granularity: normalizedSearch.granularity,
          bucketDate: normalizedSearch.bucketDate ?? undefined,
          collectionId: normalizedSearch.collectionId ?? undefined,
          productId: normalizedSearch.productId ?? undefined,
          variantId: normalizedSearch.variantId ?? undefined,
          days: rangeSelection.days,
          rangeStart: rangeStartDate,
          rangeEnd: rangeEndDate,
        },
      });
      usingMockDataset = false;
    } catch (error) {
      console.error("sales loader: analytics fetch failed", error);
      const fallbackMessage = "Sales analytics temporarily unavailable — showing mock data";
      dataset = {
        ...fixtureDataset,
        state: fixtureDataset.state === "ok" ? "warning" : fixtureDataset.state,
        alert: fixtureDataset.alert
          ? `${fallbackMessage}. ${fixtureDataset.alert}`
          : fallbackMessage,
      };
      usingMockDataset = true;
    }
  }

  const datasetRangeDays = computeRangeDays(dataset.range, rangeSelection.days);
  const bucket = normalizedSearch.bucketDate
    ? dataset.trend.find((entry) => entry.date === normalizedSearch.bucketDate)
    : undefined;

  const resolvedSearch: SearchParams = {
    ...normalizedSearch,
    bucketDate: bucket?.date,
  };

  const selection = selectEntities(dataset, resolvedSearch);
  const filters: SalesFilters = {
    period: resolvedSearch.period,
    compare: resolvedSearch.compare,
    granularity: resolvedSearch.granularity,
    bucketDate: resolvedSearch.bucketDate ?? null,
    collectionId: selection.collection?.id ?? null,
    productId: selection.product?.id ?? null,
    variantId: selection.variant?.id ?? null,
    days: datasetRangeDays,
    range: activeRange,
  };

  const factors = computeFactors(dataset, bucket);
  const drilldownCore = computeDrilldown(dataset, selection, factors);
  const breadcrumbs = buildBreadcrumbs(
    url,
    filters,
    selection,
    dataset.range.label,
    drilldownCore.level,
  );

  let drilldown: SalesDrilldown;
  if (drilldownCore.level === "collections") {
    drilldown = { ...drilldownCore, breadcrumbs };
  } else if (drilldownCore.level === "products") {
    drilldown = { ...drilldownCore, breadcrumbs };
  } else {
    drilldown = { ...drilldownCore, breadcrumbs };
  }

  return json<LoaderData>(
    {
      dataset,
      scenario,
      useMockData: usingMockDataset,
      filters,
      drilldown,
      selection: {
        bucket: bucket ?? undefined,
        collection: selection.collection ?? undefined,
        product: selection.product ?? undefined,
        variant: selection.variant ?? undefined,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "export") {
    return json({ ok: false, message: "Unsupported action intent." }, { status: 400 });
  }

  const raw: Record<string, string | undefined> = {};
  const keys = [
    "period",
    "compare",
    "granularity",
    "bucketDate",
    "collectionId",
    "productId",
    "variantId",
  ] as const;

  keys.forEach((key) => {
    const value = formData.get(key);
    raw[key] = typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  });

  const parsed = SEARCH_SCHEMA.safeParse(raw);
  const search = parsed.success ? parsed.data : SEARCH_SCHEMA.parse({});
  const scenario = scenarioFromRequest(request);
  const rangeKey = mapPeriodToRangeKey(search.period);
  const rangeSelection = buildDashboardRangeSelection(rangeKey);
  const actionRangeStart = toDateOnlyString(rangeSelection.start);
  const actionRangeEnd = toDateOnlyString(rangeSelection.end);

  const fixtureDataset = buildSalesFixtureDataset({
    scenario,
    granularity: search.granularity,
    range: {
      label: rangeSelection.label,
      start: actionRangeStart,
      end: actionRangeEnd,
      days: rangeSelection.days,
    },
  });

  let dataset: SalesDataset = fixtureDataset;

  if (!USE_MOCK_DATA) {
    const auth = await authenticate.admin(request);
    try {
      dataset = await fetchSalesAnalyticsWithCache({
        shopDomain: auth?.session?.shop ?? undefined,
        signal: request.signal,
        search: {
          period: search.period,
          compare: search.compare,
          granularity: search.granularity,
          bucketDate: search.bucketDate ?? undefined,
          collectionId: search.collectionId ?? undefined,
          productId: search.productId ?? undefined,
          variantId: search.variantId ?? undefined,
          days: rangeSelection.days,
          rangeStart: actionRangeStart,
          rangeEnd: actionRangeEnd,
        },
      });
    } catch (error) {
      console.error("sales action: analytics fetch failed", error);
      const fallbackMessage = "Sales analytics export using mock data";
      dataset = {
        ...fixtureDataset,
        state: fixtureDataset.state === "ok" ? "warning" : fixtureDataset.state,
        alert: fixtureDataset.alert
          ? `${fallbackMessage}. ${fixtureDataset.alert}`
          : fallbackMessage,
      };
    }
  }

  const bucket = search.bucketDate
    ? dataset.trend.find((entry) => entry.date === search.bucketDate)
    : undefined;

  const resolvedSearch: SearchParams = {
    ...search,
    bucketDate: bucket?.date,
  };

  const selection = selectEntities(dataset, resolvedSearch);
  const factors = computeFactors(dataset, bucket);
  const drilldownCore = computeDrilldown(dataset, selection, factors);
  const csv = generateCsv(drilldownCore);
  const filename = `sales-${drilldownCore.level}-${search.period}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};

const formatPercent = (value: number, fractionDigits = 1) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(value),
  );

export default function SalesRoute() {
  const { dataset, scenario, useMockData, filters, drilldown, selection } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exportFetcher = useFetcher();
  const drilldownPrefetcher = useFetcher();
  const location = useLocation();
  const { load: loadDrilldown } = drilldownPrefetcher;
  const exportData = exportFetcher.data as string | undefined;
  const exportReadyRef = useRef<string | null>(null);
  const prefetchedDrilldownsRef = useRef<Set<string>>(new Set());
  const basePathname = location.pathname || "/app/sales";
  // Track prefetched drilldown paths so hover/focus events don't hammer the analytics endpoint.
  const prefetchDrilldown = useCallback(
    (href: string | null | undefined) => {
      if (!href) return;
      const targetPath = href.startsWith("?") ? `${basePathname}${href}` : href;
      if (prefetchedDrilldownsRef.current.has(targetPath)) {
        return;
      }
      prefetchedDrilldownsRef.current.add(targetPath);
      loadDrilldown(targetPath);
    },
    [basePathname, loadDrilldown],
  );

  const buildClientHref = useMemo(
    () =>
      (overrides: Partial<Record<FilterParamKey, string | null>>) => {
        const params = new URLSearchParams();
        const mockState = searchParams.get("mockState");
        if (mockState) {
          params.set("mockState", mockState);
        }

        const periodValue = (overrides.period ?? filters.period) as PeriodOption;
        params.set("period", periodValue);
        const rangeCandidate =
          overrides.range === undefined
            ? filters.range
            : ((overrides.range as DashboardRangeKey | null) ?? filters.range);
        const effectiveRange = rangeCandidate ?? mapPeriodToRangeKey(periodValue);
        params.set("range", effectiveRange);
        params.set("compare", overrides.compare ?? filters.compare);
        params.set("granularity", overrides.granularity ?? filters.granularity);

        const bucketDate =
          overrides.bucketDate === undefined ? filters.bucketDate : overrides.bucketDate;
        if (bucketDate) {
          params.set("bucketDate", bucketDate);
        }

        const collectionId =
          overrides.collectionId === undefined ? filters.collectionId : overrides.collectionId;
        if (collectionId) {
          params.set("collectionId", collectionId);
        }

        const productId =
          overrides.productId === undefined ? filters.productId : overrides.productId;
        if (productId) {
          params.set("productId", productId);
        }

        const variantId =
          overrides.variantId === undefined ? filters.variantId : overrides.variantId;
        if (variantId) {
          params.set("variantId", variantId);
        }

        const query = params.toString();
        return query ? `?${query}` : "";
      },
    [filters, searchParams],
  );

  const exportLoading = exportFetcher.state !== "idle";

  useEffect(() => {
    if (
      exportFetcher.state === "idle" &&
      typeof exportData === "string" &&
      exportData.length > 0 &&
      exportReadyRef.current !== exportData
    ) {
      exportReadyRef.current = exportData;
      const blob = new Blob([exportData], { type: "text/csv;charset=utf-8" });
      const urlObject = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = urlObject;
      anchor.download = `sales-${drilldown.level}-${filters.period}.csv`;
      anchor.click();
      URL.revokeObjectURL(urlObject);
    }
  }, [exportFetcher.state, exportData, drilldown.level, filters.period]);

  const handleGranularityChange = (value: string) => {
    const href = buildClientHref({
      granularity: value as SalesGranularity,
      collectionId: null,
      productId: null,
      variantId: null,
    });
    navigate(href || ".", { replace: true });
  };

  const handleRangeChange = (value: DashboardRangeKey) => {
    const href = buildClientHref({
      period: mapRangeKeyToPeriod(value),
      range: value,
      bucketDate: null,
      collectionId: null,
      productId: null,
      variantId: null,
    });
    navigate(href || ".", { replace: true });
  };

  const handleCompareChange = (value: string) => {
    const href = buildClientHref({ compare: value as CompareOption });
    navigate(href || ".", { replace: true });
  };

  const handleResetDrilldown = () => {
    const href = buildClientHref({
      collectionId: null,
      productId: null,
      variantId: null,
    });
    navigate(href || ".", { replace: true });
  };

  const handleExport = () => {
    const submission: Record<string, string> = {
      intent: "export",
      period: filters.period,
      compare: filters.compare,
      granularity: filters.granularity,
    };
    if (filters.bucketDate) submission.bucketDate = filters.bucketDate;
    if (filters.collectionId) submission.collectionId = filters.collectionId;
    if (filters.productId) submission.productId = filters.productId;
    if (filters.variantId) submission.variantId = filters.variantId;
    exportFetcher.submit(submission, { method: "post" });
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: dataset.totals.currentTotal.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [dataset.totals.currentTotal.currency],
  );

  const formatCurrencyValue = useCallback(
    (value: number | string | null | undefined) => {
      const numeric =
        typeof value === "number"
          ? value
          : Number(
              typeof value === "string" && value.trim().length
                ? value
                : value ?? 0,
            );
      const safe = Number.isFinite(numeric) ? numeric : 0;
      return currencyFormatter.format(safe);
    },
    [currencyFormatter],
  );

  const revenueTrendSeries = useMemo<DataSeries[]>(() => {
    if (!dataset.trend.length) return [];
    return [
      {
        name: "GMV",
        data: dataset.trend.map((bucket) => ({
          key: bucket.date,
          value: bucket.total.amount,
        })),
      },
    ];
  }, [dataset.trend]);

  const channelBreakdownData = useMemo(
    () =>
      dataset.channelBreakdown.map((channel) => ({
        key: channel.channel,
        value: channel.total.amount,
      })),
    [dataset.channelBreakdown],
  );

  const channelBreakdownSeries = useMemo<DataSeries[]>(() => {
    if (!channelBreakdownData.length) return [];
    return [
      {
        name: "Revenue",
        data: channelBreakdownData,
      },
    ];
  }, [channelBreakdownData]);

  const channelChartHeight = useMemo(
    () => Math.max(160, channelBreakdownData.length * 44),
    [channelBreakdownData],
  );

  const drilldownTable = useMemo(() => {
    switch (drilldown.level) {
      case "collections": {
        const rows = drilldown.rows.map((row) => {
          const href = drilldown.nextLevel
            ? buildClientHref({
                collectionId: row.id,
                productId: null,
                variantId: null,
              })
            : "";
          return [
            drilldown.nextLevel ? (
              <PolarisLink
                url={href}
              >
                {row.title}
              </PolarisLink>
            ) : (
              row.title
            ),
            row.gmv.formatted,
            formatNumber(row.orders),
            `${row.conversionRate.toFixed(2)}%`,
            `${row.returningRate.toFixed(1)}%`,
            `${row.attachRate.toFixed(1)}%`,
            formatPercent(row.deltaPercentage),
          ];
        });

        const columnTypes: Array<"text" | "numeric"> = [
          "text",
          "numeric",
          "numeric",
          "text",
          "text",
          "text",
          "text",
        ];

        return {
          headings: [
            "Collection",
            "GMV",
            "Orders",
            "Conversion",
            "Returning",
            "Attach",
            "Δ",
          ],
          rows,
          columnTypes,
        };
      }
      case "products": {
        const rows = drilldown.rows.map((row) => {
          const href = drilldown.nextLevel
            ? buildClientHref({
                productId: row.id,
                variantId: null,
              })
            : "";
          return [
            drilldown.nextLevel ? (
              <PolarisLink
                url={href}
              >
                {row.title}
              </PolarisLink>
            ) : (
              row.title
            ),
            row.gmv.formatted,
            formatNumber(row.orders),
            `${row.attachRate.toFixed(1)}%`,
            `${row.returningRate.toFixed(1)}%`,
            `${row.refundRate.toFixed(1)}%`,
            toTitleCase(row.inventoryStatus),
          ];
        });

        const columnTypes: Array<"text" | "numeric"> = [
          "text",
          "numeric",
          "numeric",
          "text",
          "text",
          "text",
          "text",
        ];

        return {
          headings: [
            "Product",
            "GMV",
            "Orders",
            "Attach",
            "Returning",
            "Refund",
            "Inventory",
          ],
          rows,
          columnTypes,
        };
      }
      case "variants": {
        const rows = drilldown.rows.map((row) => [
          row.title,
          row.sku,
          row.gmv.formatted,
          formatNumber(row.unitsSold),
          `${row.attachRate.toFixed(1)}%`,
          formatNumber(row.inventoryOnHand),
          toTitleCase(row.backorderRisk),
        ]);

        const columnTypes: Array<"text" | "numeric"> = [
          "text",
          "text",
          "numeric",
          "numeric",
          "text",
          "numeric",
          "text",
        ];

        return {
          headings: [
            "Variant",
            "SKU",
            "GMV",
            "Units",
            "Attach",
            "On hand",
            "Backorder risk",
          ],
          rows,
          columnTypes,
        };
      }
      default:
        return { headings: [], rows: [], columnTypes: [] as Array<"text" | "numeric"> };
    }
  }, [drilldown, buildClientHref, prefetchDrilldown]);
  const trendRows = useMemo(
    () =>
      dataset.trend.map((bucket) => {
        const href = buildClientHref({
          bucketDate: bucket.date,
          collectionId: null,
          productId: null,
          variantId: null,
        });
        const formatted = formatDate(bucket.date);
        const isActive = selection.bucket?.date === bucket.date;
        const linkTarget = href || ".";
        return [
          <PolarisLink key={bucket.date} url={linkTarget}>
            {isActive ? <Badge tone="info">{formatted}</Badge> : formatted}
          </PolarisLink>,
          bucket.total.formatted,
          formatNumber(bucket.orders),
        ];
      }),
    [dataset.trend, buildClientHref, selection.bucket],
  );

  const bestSellerRows = useMemo(
    () =>
      dataset.bestSellers.slice(0, 5).map((product) => [
        product.title,
        product.gmv.formatted,
        formatNumber(product.orders),
        `${product.attachRate.toFixed(1)}%`,
      ]),
    [dataset.bestSellers],
  );

  const laggardRows = useMemo(
    () =>
      dataset.laggards.slice(0, 5).map((product) => [
        product.title,
        product.gmv.formatted,
        formatNumber(product.orders),
        `${product.attachRate.toFixed(1)}%`,
      ]),
    [dataset.laggards],
  );

  const attachRateRows = useMemo(
    () =>
      dataset.attachRateInsights.slice(0, 4).map((insight) => [
        `${insight.primaryProduct} → ${insight.attachmentProduct}`,
        `${insight.attachRate.toFixed(1)}%`,
        insight.opportunity,
      ]),
    [dataset.attachRateInsights],
  );

  const inventoryRiskRows = useMemo(
    () =>
      dataset.overstockRisks.slice(0, 4).map((risk) => [
        risk.title,
        toTitleCase(risk.status),
        `${risk.daysOnHand} days`,
        risk.recommendedAction,
      ]),
    [dataset.overstockRisks],
  );

  const customerRows = useMemo(
    () =>
      dataset.topCustomers.slice(0, 5).map((customer) => [
        customer.name,
        formatNumber(customer.orders),
        customer.lifetimeValue.formatted,
        formatDateTime(customer.lastOrderAt),
      ]),
    [dataset.topCustomers],
  );

  const ordersMetricLabel = drilldown.level === "variants" ? "Units sold" : "Orders";
  const hasPathSelection = Boolean(
    filters.collectionId || filters.productId || filters.variantId,
  );

  return (
    <PolarisVizProvider>
      <Page
        title="Sales analytics"
        subtitle="Inspect revenue trends, channel performance, and forecast variance."
      >
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h2" variant="headingLg">Sales</Text>
        <Button onClick={handleExport} loading={exportLoading}>
          {exportLoading ? "Exporting…" : "Export CSV"}
        </Button>
      </InlineStack>
      <BlockStack gap="500">
        {(dataset.alert || dataset.error || useMockData) && (
          <BlockStack gap="200">
            {useMockData && (
              <Banner
                title={`Mock data scenario: ${scenario}`}
                tone={scenario === "warning" ? "warning" : "info"}
              >
                <p>
                  Adjust the `mockState` query parameter to preview alternate data states.
                </p>
              </Banner>
            )}
            {dataset.alert && !dataset.error && (
              <Banner tone="warning" title="Attention required">
                <p>{dataset.alert}</p>
              </Banner>
            )}
            {dataset.error && (
              <Banner tone="critical" title="Sales data unavailable">
                <p>{dataset.error}</p>
              </Banner>
            )}
          </BlockStack>
        )}

        <Card>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingSm">Revenue summary</Text>
              <Button onClick={() => navigate(0)}>Refresh</Button>
            </InlineStack>
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200">
                <Select
                  labelHidden
                  label="Granularity"
                  options={GRANULARITY_OPTIONS}
                  value={filters.granularity}
                  onChange={handleGranularityChange}
                />
                <ButtonGroup>
                  {DASHBOARD_RANGE_KEY_LIST.map((option) => (
                    <Button
                      key={option}
                      pressed={filters.range === option}
                      onClick={() => handleRangeChange(option)}
                    >
                      {option === "today" ? "TODAY" : option.toUpperCase()}
                    </Button>
                  ))}
                </ButtonGroup>
                <Select
                  labelHidden
                  label="Comparison"
                  options={COMPARE_SELECT_OPTIONS}
                  value={filters.compare}
                  onChange={handleCompareChange}
                />
              </InlineStack>
              <Badge tone={dataset.forecast ? "attention" : "info"}>
                {dataset.range.label}
              </Badge>
            </InlineStack>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="300">
              <MetricTile
                label="Current revenue"
                value={dataset.totals.currentTotal.formatted}
                delta={formatPercent(dataset.totals.deltaPercentage)}
              />
              <MetricTile
                label="Previous period"
                value={dataset.totals.previousTotal.formatted}
                delta="Benchmark"
              />
              <MetricTile
                label="Average order value"
                value={dataset.totals.averageOrderValue.formatted}
                delta={`Conversion ${dataset.totals.conversionRate.toFixed(2)}%`}
              />
              <MetricTile
                label="Forecast variance"
                value={
                  dataset.forecast?.projectedTotal.formatted ??
                  dataset.totals.currentTotal.formatted
                }
                delta={
                  dataset.forecast
                    ? `${formatPercent(dataset.forecast.variancePercentage)} ${dataset.forecast.varianceLabel.replace("_", " ")}`
                    : "On track"
                }
              />
            </InlineGrid>
          </BlockStack>
        </Card>

        <Card>
            <InlineStack align="space-between" blockAlign="center" wrap>
              <InlineStack gap="200" wrap>
                {drilldown.breadcrumbs.map((crumb, index) => (
                  <InlineStack key={`${crumb.label}-${index}`} gap="100" blockAlign="center">
                    {index > 0 && (
                      <Text as="span" tone="subdued">
                        ›
                      </Text>
                    )}
                    {crumb.href ? (
                      <PolarisLink url={crumb.href}>{crumb.label}</PolarisLink>
                    ) : (
                      <Text as="span" variant="bodyMd">
                        {crumb.label}
                      </Text>
                    )}
                  </InlineStack>
                ))}
              </InlineStack>
              {hasPathSelection && (
                <Button onClick={handleResetDrilldown} variant="plain">
                  Reset drilldown
                </Button>
              )}
            </InlineStack>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="300">
              <MetricSummary label="GMV" value={drilldown.metrics.gmv.formatted} />
              <MetricSummary
                label={ordersMetricLabel}
                value={formatNumber(drilldown.metrics.orders)}
              />
              <MetricSummary
                label="Attach rate"
                value={`${drilldown.metrics.attachRate.toFixed(1)}%`}
              />
              <MetricSummary
                label="Returning rate"
                value={`${drilldown.metrics.returningRate.toFixed(1)}%`}
              />
            </InlineGrid>
            {drilldownTable.rows.length ? (
              <DataTable
                columnContentTypes={drilldownTable.columnTypes}
                headings={drilldownTable.headings}
                rows={drilldownTable.rows}
              />
            ) : (
              <Text tone="subdued" variant="bodySm" as="span">
                No data available for this selection.
              </Text>
            )}
        </Card>

        <Layout>
          <Layout.Section>
            <Card>
                {revenueTrendSeries.length ? (
                  <div style={{ width: "100%", height: 220 }}>
                    <SparkLineChart
                      data={revenueTrendSeries}
                      isAnimated={false}
                      accessibilityLabel="Revenue trend for the selected period"
                    />
                  </div>
                ) : (
                  <Text tone="subdued" variant="bodySm" as="span">
                    Revenue trend data unavailable.
                  </Text>
                )}
                {trendRows.length ? (
                  <DataTable
                    columnContentTypes={["text", "text", "numeric"]}
                    headings={["Date", "GMV", "Orders"]}
                    rows={trendRows}
                  />
                ) : (
                  <Text tone="subdued" variant="bodySm" as="span">
                    No revenue entries for this period.
                  </Text>
                )}
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
                {channelBreakdownSeries.length ? (
                  <div style={{ width: "100%", height: channelChartHeight }}>
                    <BarChart
                      data={channelBreakdownSeries}
                      direction="horizontal"
                      isAnimated={false}
                      showLegend={false}
                      skipLinkText="Skip channel breakdown chart"
                      tooltipOptions={{
                        valueFormatter: (value) => formatCurrencyValue(value),
                        keyFormatter: (value) => String(value ?? ""),
                      }}
                      xAxisOptions={{
                        labelFormatter: (value) => formatCurrencyValue(value),
                      }}
                    />
                  </div>
                ) : (
                  <Text tone="subdued" variant="bodySm" as="span">
                    No channel data available.
                  </Text>
                )}
              {dataset.channelBreakdown.length ? (
                  <BlockStack gap="300">
                    {dataset.channelBreakdown.map((channel) => (
                      <InlineStack
                        key={channel.channel}
                        align="space-between"
                        blockAlign="center"
                      >
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd">
                            {channel.channel}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {formatPercent(channel.percentage, 1)} of revenue
                          </Text>
                        </BlockStack>
                        <Text variant="headingMd" as="span">
                          {channel.total.formatted}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
              ) : null}
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Best sellers
                  </Text>
                  {bestSellerRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "text", "numeric", "text"]}
                      headings={["Product", "GMV", "Orders", "Attach"]}
                      rows={bestSellerRows}
                    />
                  ) : (
                    <Text tone="subdued" variant="bodySm" as="span">
                      No best sellers to show.
                    </Text>
                  )}
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Laggards
                  </Text>
                  {laggardRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "text", "numeric", "text"]}
                      headings={["Product", "GMV", "Orders", "Attach"]}
                      rows={laggardRows}
                    />
                  ) : (
                    <Text tone="subdued" variant="bodySm" as="span">
                      No laggards detected.
                    </Text>
                  )}
                </BlockStack>
              </InlineGrid>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Attach opportunities
                  </Text>
                  {attachRateRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "text", "text"]}
                      headings={["Bundle", "Attach", "Opportunity"]}
                      rows={attachRateRows}
                    />
                  ) : (
                    <Text tone="subdued" variant="bodySm" as="span">
                      No attach-rate insights available.
                    </Text>
                  )}
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Inventory risks
                  </Text>
                  {inventoryRiskRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "text"]}
                      headings={["Product", "Status", "Days on hand", "Recommendation"]}
                      rows={inventoryRiskRows}
                    />
                  ) : (
                    <Text tone="subdued" variant="bodySm" as="span">
                      Inventory is healthy.
                    </Text>
                  )}
                </BlockStack>
              </InlineGrid>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                {dataset.cohortHighlights.map((highlight) => (
                  <BlockStack key={highlight.id} gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {highlight.title}
                    </Text>
                    <Text as="span" variant="headingMd">
                      {highlight.value}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {highlight.description}
                    </Text>
                  </BlockStack>
                ))}
              </InlineGrid>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card>
              {customerRows.length ? (
                <DataTable
                  columnContentTypes={["text", "numeric", "text", "text"]}
                  headings={["Customer", "Orders", "Lifetime value", "Last order"]}
                  rows={customerRows}
                />
              ) : (
                <Text tone="subdued" variant="bodySm" as="span">
                  No customer insights yet.
                </Text>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
    </PolarisVizProvider>
  );
}

function MetricSummary({ label, value }: { label: string; value: string }) {
  return (
    <BlockStack gap="050">
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </BlockStack>
  );
}

const formatNumber = (value: number) => value.toLocaleString("en-US");

const toTitleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

function MetricTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <Card background="bg-surface-secondary">
        <BlockStack gap="050">
          <Text as="span" variant="bodySm" tone="subdued">
            {label}
          </Text>
          <Text as="p" variant="headingLg">
            {value}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {delta}
          </Text>
        </BlockStack>
    </Card>
  );
}
