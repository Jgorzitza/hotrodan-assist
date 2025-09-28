// Raw analytics service response types shared between adapters and fixtures.

export type MoneyPayload = {
  amount?: number | string | null;
  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
};

export type AnalyticsSalesVariant = {
  id?: string | null;
  sku?: string | null;
  title?: string | null;
  gmv?: MoneyPayload | null;
  units_sold?: number | string | null;
  unitsSold?: number | string | null;
  inventory_on_hand?: number | string | null;
  inventoryOnHand?: number | string | null;
  attach_rate?: number | string | null;
  attachRate?: number | string | null;
  backorder_risk?: string | null;
  backorderRisk?: string | null;
};

export type AnalyticsSalesProduct = {
  id?: string | null;
  title?: string | null;
  gmv?: MoneyPayload | null;
  orders?: number | string | null;
  attach_rate?: number | string | null;
  attachRate?: number | string | null;
  returning_rate?: number | string | null;
  returningRate?: number | string | null;
  refund_rate?: number | string | null;
  refundRate?: number | string | null;
  sku_count?: number | string | null;
  skuCount?: number | string | null;
  inventory_status?: string | null;
  inventoryStatus?: string | null;
  variants?: AnalyticsSalesVariant[] | null;
};

export type AnalyticsSalesCollection = {
  id?: string | null;
  title?: string | null;
  handle?: string | null;
  gmv?: MoneyPayload | null;
  orders?: number | string | null;
  conversion_rate?: number | string | null;
  conversionRate?: number | string | null;
  returning_rate?: number | string | null;
  returningRate?: number | string | null;
  attach_rate?: number | string | null;
  attachRate?: number | string | null;
  delta_percentage?: number | string | null;
  deltaPercentage?: number | string | null;
  products?: AnalyticsSalesProduct[] | null;
};

export type AnalyticsSalesTotals = {
  current_total?: MoneyPayload | null;
  currentTotal?: MoneyPayload | null;
  previous_total?: MoneyPayload | null;
  previousTotal?: MoneyPayload | null;
  delta_percentage?: number | string | null;
  deltaPercentage?: number | string | null;
  average_order_value?: MoneyPayload | null;
  averageOrderValue?: MoneyPayload | null;
  conversion_rate?: number | string | null;
  conversionRate?: number | string | null;
};

export type AnalyticsSalesForecast = {
  projected_total?: MoneyPayload | null;
  projectedTotal?: MoneyPayload | null;
  variance_percentage?: number | string | null;
  variancePercentage?: number | string | null;
  variance_label?: string | null;
  varianceLabel?: string | null;
};

export type AnalyticsChannelEntry = {
  channel?: string | null;
  total?: MoneyPayload | null;
  percentage?: number | string | null;
};

export type AnalyticsTrendEntry = {
  date?: string | null;
  total?: MoneyPayload | null;
  orders?: number | string | null;
};

export type AnalyticsAttachRateInsight = {
  id?: string | null;
  primary_product?: string | null;
  primaryProduct?: string | null;
  attachment_product?: string | null;
  attachmentProduct?: string | null;
  attach_rate?: number | string | null;
  attachRate?: number | string | null;
  opportunity?: string | null;
};

export type AnalyticsInventoryRisk = {
  id?: string | null;
  product_id?: string | null;
  productId?: string | null;
  title?: string | null;
  status?: string | null;
  days_on_hand?: number | string | null;
  daysOnHand?: number | string | null;
  recommended_action?: string | null;
  recommendedAction?: string | null;
};

export type AnalyticsCohortHighlight = {
  id?: string | null;
  title?: string | null;
  value?: string | null;
  description?: string | null;
};

export type AnalyticsTopCustomer = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  orders?: number | string | null;
  lifetime_value?: MoneyPayload | null;
  lifetimeValue?: MoneyPayload | null;
  last_order_at?: string | null;
  lastOrderAt?: string | null;
  first_order_at?: string | null;
  firstOrderAt?: string | null;
};

export type AnalyticsSalesResponse = {
  scenario?: string | null;
  state?: string | null;
  granularity?: string | null;
  range?: {
    label?: string | null;
    start?: string | null;
    end?: string | null;
  } | null;
  totals?: AnalyticsSalesTotals | null;
  trend?: AnalyticsTrendEntry[] | null;
  channel_breakdown?: AnalyticsChannelEntry[] | null;
  channelBreakdown?: AnalyticsChannelEntry[] | null;
  forecast?: AnalyticsSalesForecast | null;
  collections?: AnalyticsSalesCollection[] | null;
  best_sellers?: AnalyticsSalesProduct[] | null;
  bestSellers?: AnalyticsSalesProduct[] | null;
  laggards?: AnalyticsSalesProduct[] | null;
  attach_rate_insights?: AnalyticsAttachRateInsight[] | null;
  attachRateInsights?: AnalyticsAttachRateInsight[] | null;
  overstock_risks?: AnalyticsInventoryRisk[] | null;
  overstockRisks?: AnalyticsInventoryRisk[] | null;
  cohort_highlights?: AnalyticsCohortHighlight[] | null;
  cohortHighlights?: AnalyticsCohortHighlight[] | null;
  top_customers?: AnalyticsTopCustomer[] | null;
  topCustomers?: AnalyticsTopCustomer[] | null;
  alert?: string | null;
  error?: string | null;
};
