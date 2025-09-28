import type {
  CurrencyCode,
  MockScenario,
  Money,
  SalesAttachRateInsight,
  SalesChannelBreakdown,
  SalesCohortHighlight,
  SalesDataset,
  SalesForecast,
  SalesGranularity,
  SalesInventoryRisk,
  SalesProductPerformance,
  SalesTopCustomer,
  SalesTotals,
  SalesTrendPoint,
  SalesVariantPerformance,
} from "~/types/dashboard";
import type {
  AnalyticsAttachRateInsight,
  AnalyticsChannelEntry,
  AnalyticsCohortHighlight,
  AnalyticsInventoryRisk,
  AnalyticsSalesCollection,
  AnalyticsSalesForecast,
  AnalyticsSalesProduct,
  AnalyticsSalesResponse,
  AnalyticsSalesTotals,
  AnalyticsSalesVariant,
  AnalyticsTopCustomer,
  AnalyticsTrendEntry,
  MoneyPayload,
} from "~/types/analytics";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateOnlyFromDate = (date: Date): string => date.toISOString().slice(0, 10);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateInput = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const prefix = trimmed.slice(0, 10);
  if (ISO_DATE_PATTERN.test(prefix)) {
    return prefix;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return toDateOnlyFromDate(parsed);
};

const toDateOnly = (value?: string | null, fallback?: string): string => {
  const normalized = normalizeDateInput(value);
  if (normalized) {
    return normalized;
  }
  const fallbackNormalized = normalizeDateInput(fallback);
  if (fallbackNormalized) {
    return fallbackNormalized;
  }
  return toDateOnlyFromDate(new Date());
};

const DEFAULT_CURRENCY: CurrencyCode = "USD";
const defaultRangeEnd = new Date();
const defaultRangeStart = new Date(defaultRangeEnd.getTime() - 27 * MS_PER_DAY);
const DEFAULT_RANGE = {
  label: "Last 28 days",
  start: toDateOnlyFromDate(defaultRangeStart),
  end: toDateOnlyFromDate(defaultRangeEnd),
};

const isCurrencyCode = (value: string): value is CurrencyCode => {
  return value === "USD" || value === "CAD" || value === "EUR" || value === "GBP";
};

const currencyFormatterCache = new Map<CurrencyCode, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: CurrencyCode): Intl.NumberFormat => {
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

type CollectionMappingResult = {
  collections: SalesDataset["collections"];
  productsByCollection: SalesDataset["productsByCollection"];
  variantsByProduct: Record<string, SalesVariantPerformance[]>;
};

const firstDefined = <T>(...values: Array<T | null | undefined>): T | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toCurrencyCode = (value?: string | null): CurrencyCode => {
  if (typeof value === "string" && value.trim().length > 0) {
    const upper = value.trim().toUpperCase();
    if (isCurrencyCode(upper)) {
      return upper;
    }
  }
  return DEFAULT_CURRENCY;
};

const toMoney = (payload?: MoneyPayload | null): Money => {
  const amount = toNumber(payload?.amount, 0);
  const currency = toCurrencyCode(payload?.currency ?? payload?.currency_code ?? payload?.currencyCode);
  return {
    amount,
    currency,
    formatted: getCurrencyFormatter(currency).format(amount),
  };
};

const toGranularity = (value?: string | null): SalesGranularity => {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return "daily";
};

const toScenario = (value?: string | null): MockScenario => {
  if (value === "empty" || value === "warning" || value === "error") {
    return value;
  }
  return "base";
};

const toDatasetState = (value?: string | null): SalesDataset["state"] => {
  if (value === "empty" || value === "warning" || value === "error") {
    return value;
  }
  return "ok";
};

const toVarianceLabel = (value?: string | null): SalesForecast["varianceLabel"] => {
  if (value === "ahead" || value === "behind") {
    return value;
  }
  return "on_track";
};

const toInventoryStatus = (
  value?: string | null,
): SalesProductPerformance["inventoryStatus"] => {
  if (value === "overstock" || value === "stockout_risk") {
    return value;
  }
  return "healthy";
};

const toBackorderRisk = (
  value?: string | null,
): SalesVariantPerformance["backorderRisk"] => {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "none";
};

const mapTotals = (totals?: AnalyticsSalesTotals | null): SalesTotals => {
  return {
    currentTotal: toMoney(firstDefined(totals?.current_total, totals?.currentTotal)),
    previousTotal: toMoney(firstDefined(totals?.previous_total, totals?.previousTotal)),
    deltaPercentage: toNumber(firstDefined(totals?.delta_percentage, totals?.deltaPercentage), 0),
    averageOrderValue: toMoney(firstDefined(totals?.average_order_value, totals?.averageOrderValue)),
    conversionRate: toNumber(firstDefined(totals?.conversion_rate, totals?.conversionRate), 0),
  };
};

const mapTrend = (entries?: AnalyticsTrendEntry[] | null): SalesTrendPoint[] => {
  if (!entries || entries.length === 0) {
    return [];
  }
  const now = Date.now();
  return entries.map((entry, index) => {
    const fallbackDate = new Date(now - index * MS_PER_DAY);
    return {
      date: toDateOnly(entry.date, toDateOnlyFromDate(fallbackDate)),
      total: toMoney(entry.total),
      orders: toNumber(entry.orders, 0),
    };
  });
};

const mapChannelBreakdown = (
  entries?: AnalyticsChannelEntry[] | null,
): SalesChannelBreakdown[] => {
  return (entries ?? []).map((entry, index) => ({
    channel: entry.channel ?? `Channel ${index + 1}`,
    total: toMoney(entry.total),
    percentage: toNumber(entry.percentage, 0),
  }));
};

const mapForecast = (forecast?: AnalyticsSalesForecast | null): SalesForecast | null => {
  if (!forecast) return null;
  return {
    projectedTotal: toMoney(firstDefined(forecast.projected_total, forecast.projectedTotal)),
    variancePercentage: toNumber(firstDefined(forecast.variance_percentage, forecast.variancePercentage), 0),
    varianceLabel: toVarianceLabel(firstDefined(forecast.variance_label, forecast.varianceLabel)),
  };
};

const mapVariant = (
  variant: AnalyticsSalesVariant,
  productId: string,
  index: number,
): SalesVariantPerformance => {
  const id = variant.id ?? `${productId}-variant-${index}`;
  return {
    id,
    sku: variant.sku ?? id,
    title: variant.title ?? `Variant ${index + 1}`,
    gmv: toMoney(variant.gmv),
    unitsSold: toNumber(firstDefined(variant.units_sold, variant.unitsSold), 0),
    inventoryOnHand: toNumber(firstDefined(variant.inventory_on_hand, variant.inventoryOnHand), 0),
    attachRate: toNumber(firstDefined(variant.attach_rate, variant.attachRate), 0),
    backorderRisk: toBackorderRisk(firstDefined(variant.backorder_risk, variant.backorderRisk)),
  };
};

const mapProduct = (
  product: AnalyticsSalesProduct,
  fallbackId: string,
  index: number,
): { product: SalesProductPerformance; variants: SalesVariantPerformance[] } => {
  const id = product.id ?? fallbackId;
  const variants = (product.variants ?? []).map((variant, variantIndex) =>
    mapVariant(variant, id, variantIndex),
  );
  return {
    product: {
      id,
      title: product.title ?? `Product ${index + 1}`,
      gmv: toMoney(product.gmv),
      orders: toNumber(product.orders, 0),
      attachRate: toNumber(firstDefined(product.attach_rate, product.attachRate), 0),
      returningRate: toNumber(firstDefined(product.returning_rate, product.returningRate), 0),
      refundRate: toNumber(firstDefined(product.refund_rate, product.refundRate), 0),
      skuCount: toNumber(firstDefined(product.sku_count, product.skuCount), variants.length),
      inventoryStatus: toInventoryStatus(firstDefined(product.inventory_status, product.inventoryStatus)),
    },
    variants,
  };
};

const mapCollections = (
  collections?: AnalyticsSalesCollection[] | null,
): CollectionMappingResult => {
  const mapped: SalesDataset["collections"] = [];
  const productsByCollection: SalesDataset["productsByCollection"] = {};
  const variantsByProduct: Record<string, SalesVariantPerformance[]> = {};

  (collections ?? []).forEach((collection, index) => {
    const id = collection.id ?? `collection-${index}`;
    mapped.push({
      id,
      title: collection.title ?? `Collection ${index + 1}`,
      handle: collection.handle ?? id,
      gmv: toMoney(collection.gmv),
      orders: toNumber(collection.orders, 0),
      conversionRate: toNumber(firstDefined(collection.conversion_rate, collection.conversionRate), 0),
      returningRate: toNumber(firstDefined(collection.returning_rate, collection.returningRate), 0),
      attachRate: toNumber(firstDefined(collection.attach_rate, collection.attachRate), 0),
      deltaPercentage: toNumber(firstDefined(collection.delta_percentage, collection.deltaPercentage), 0),
    });

    const products = collection.products ?? [];
    const mappedProducts: SalesProductPerformance[] = [];
    productsByCollection[id] = mappedProducts;

    products.forEach((product, productIndex) => {
      const fallbackId = `${id}-product-${productIndex}`;
      const { product: mappedProduct, variants } = mapProduct(product, fallbackId, productIndex);
      mappedProducts.push(mappedProduct);
      variantsByProduct[mappedProduct.id] = variants;
    });
  });

  return { collections: mapped, productsByCollection, variantsByProduct };
};

const mapAttachRateInsights = (
  insights?: AnalyticsAttachRateInsight[] | null,
): SalesAttachRateInsight[] =>
  (insights ?? []).map((insight, index) => ({
    id: insight.id ?? `attach-${index}`,
    primaryProduct: insight.primary_product ?? insight.primaryProduct ?? "",
    attachmentProduct: insight.attachment_product ?? insight.attachmentProduct ?? "",
    attachRate: toNumber(firstDefined(insight.attach_rate, insight.attachRate), 0),
    opportunity: insight.opportunity ?? "",
  }));

const mapInventoryRisks = (
  risks?: AnalyticsInventoryRisk[] | null,
): SalesInventoryRisk[] =>
  (risks ?? []).map((risk, index) => ({
    id: risk.id ?? `risk-${index}`,
    productId: risk.product_id ?? risk.productId ?? "",
    title: risk.title ?? "",
    status:
      risk.status === "overstock" || risk.status === "stockout_risk"
        ? risk.status
        : "healthy",
    daysOnHand: toNumber(firstDefined(risk.days_on_hand, risk.daysOnHand), 0),
    recommendedAction: risk.recommended_action ?? risk.recommendedAction ?? "",
  }));

const mapCohortHighlights = (
  highlights?: AnalyticsCohortHighlight[] | null,
): SalesCohortHighlight[] =>
  (highlights ?? []).map((highlight, index) => ({
    id: highlight.id ?? `highlight-${index}`,
    title: highlight.title ?? "",
    value: highlight.value ?? "",
    description: highlight.description ?? "",
  }));

const mapTopCustomers = (
  customers?: AnalyticsTopCustomer[] | null,
): SalesTopCustomer[] =>
  (customers ?? []).map((customer, index) => ({
    id: customer.id ?? `customer-${index}`,
    name: customer.name ?? "",
    email: customer.email ?? "",
    orders: toNumber(customer.orders, 0),
    lifetimeValue: toMoney(firstDefined(customer.lifetime_value, customer.lifetimeValue)),
    lastOrderAt: customer.last_order_at ?? customer.lastOrderAt ?? new Date().toISOString(),
    firstOrderAt: customer.first_order_at ?? customer.firstOrderAt ?? new Date().toISOString(),
  }));

const mapProductsList = (products?: AnalyticsSalesProduct[] | null): SalesProductPerformance[] => {
  const mapped: SalesProductPerformance[] = [];
  (products ?? []).forEach((product, index) => {
    const fallbackId = `product-${index}`;
    const { product: mappedProduct } = mapProduct(product, fallbackId, index);
    mapped.push(mappedProduct);
  });
  return mapped;
};

export type FetchSalesAnalyticsParams = {
  baseUrl?: string;
  shopDomain?: string | null;
  signal?: AbortSignal;
  search: {
    period: string;
    compare: string;
    granularity: SalesGranularity;
    bucketDate?: string | null;
    collectionId?: string | null;
    productId?: string | null;
    variantId?: string | null;
    days?: number;
    rangeStart?: string;
    rangeEnd?: string;
  };
};

const buildAnalyticsUrl = (baseUrl: string, params: FetchSalesAnalyticsParams["search"]): string => {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  const normalizedPath = url.pathname.endsWith("/")
    ? `${url.pathname}analytics/sales`
    : `${url.pathname}/analytics/sales`;
  url.pathname = normalizedPath.replace(/\/+/g, "/");
  url.searchParams.set("period", params.period);
  url.searchParams.set("compare", params.compare);
  url.searchParams.set("granularity", params.granularity);
  if (params.bucketDate) url.searchParams.set("bucketDate", params.bucketDate);
  if (params.collectionId) url.searchParams.set("collectionId", params.collectionId);
  if (params.productId) url.searchParams.set("productId", params.productId);
  if (params.variantId) url.searchParams.set("variantId", params.variantId);
  if (params.days) url.searchParams.set("days", String(params.days));
  if (params.rangeStart) url.searchParams.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) url.searchParams.set("rangeEnd", params.rangeEnd);
  return url.toString();
};

export const mapAnalyticsResponse = (payload: AnalyticsSalesResponse): SalesDataset => {
  const granularity = toGranularity(payload.granularity);
  const rangeStart = toDateOnly(payload.range?.start, DEFAULT_RANGE.start);
  const rangeEnd = toDateOnly(payload.range?.end, DEFAULT_RANGE.end);
  const range = {
    label: payload.range?.label ?? DEFAULT_RANGE.label,
    start: rangeStart,
    end: rangeEnd,
  };
  const totals = mapTotals(payload.totals);
  const trend = mapTrend(payload.trend);
  const channelBreakdown = mapChannelBreakdown(
    payload.channel_breakdown ?? payload.channelBreakdown,
  );
  const forecast = mapForecast(payload.forecast);
  const collectionsMapping = mapCollections(payload.collections);

  return {
    scenario: toScenario(payload.scenario),
    state: toDatasetState(payload.state),
    granularity,
    range,
    totals,
    trend,
    channelBreakdown,
    forecast,
    collections: collectionsMapping.collections,
    productsByCollection: collectionsMapping.productsByCollection,
    variantsByProduct: collectionsMapping.variantsByProduct,
    bestSellers: mapProductsList(payload.best_sellers ?? payload.bestSellers),
    laggards: mapProductsList(payload.laggards),
    attachRateInsights: mapAttachRateInsights(
      payload.attach_rate_insights ?? payload.attachRateInsights,
    ),
    overstockRisks: mapInventoryRisks(payload.overstock_risks ?? payload.overstockRisks),
    cohortHighlights: mapCohortHighlights(
      payload.cohort_highlights ?? payload.cohortHighlights,
    ),
    topCustomers: mapTopCustomers(payload.top_customers ?? payload.topCustomers),
    alert: payload.alert ?? undefined,
    error: payload.error ?? undefined,
  };
};

export const fetchSalesAnalytics = async (
  params: FetchSalesAnalyticsParams,
): Promise<SalesDataset> => {
  const baseUrl = params.baseUrl ?? process.env.ANALYTICS_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("Missing ANALYTICS_SERVICE_URL environment variable");
  }

  const url = buildAnalyticsUrl(baseUrl, params.search);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (params.shopDomain) {
    headers["X-Shop-Domain"] = params.shopDomain;
  }

  const response = await fetch(url, {
    signal: params.signal,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Analytics service request failed (${response.status} ${response.statusText})` +
        (text ? `: ${text}` : ""),
    );
  }

  const payload = (await response.json()) as AnalyticsSalesResponse;
  return mapAnalyticsResponse(payload);
};
