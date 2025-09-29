import type { EnhancedSalesAnalytics } from "./enhanced-analytics.server";

const BASE_URL = process.env.SALES_ANALYTICS_API_URL || "http://localhost:8005";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function apiChannelCampaignMetrics(records: unknown[]) {
  return postJson<{ success: boolean; results: unknown[]; count: number }>(
    "/api/sales/channel-campaign-metrics",
    { records }
  );
}

export async function apiAttributionCompare(conversions: unknown[]) {
  return postJson<{ success: boolean; results: unknown }>(
    "/api/sales/attribution/compare",
    { conversions }
  );
}

export async function apiFunnelDropoff(events: unknown[], funnel_steps: string[]) {
  return postJson<{ success: boolean; results: unknown }>(
    "/api/sales/funnel-dropoff",
    { events, funnel_steps }
  );
}

export async function apiForecastRollup(series: unknown[], group_by: string[], value_field = "value", ci = 0.95) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/forecast/rollup",
    { series, group_by, value_field, ci }
  );
}

export async function apiPricingElasticity(data: unknown[]) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/pricing/elasticity",
    { data }
  );
}

export async function apiMarginAnalysis(data: unknown[], group_by: string[] = []) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/margin/analysis",
    { data, group_by }
  );
}

export async function apiChurnRisk(customers: unknown[]) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/churn/risk",
    { customers }
  );
}

export async function apiNextBestActions(customers: unknown[], segments?: unknown, actions?: unknown) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/nudge/next-best-actions",
    { customers, segments, actions }
  );
}

export async function apiQbrMbrPack(data: unknown, report_type: "QBR" | "MBR" = "QBR", period?: string, company_name?: string, include_charts = true) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/reports/qbr-mbr",
    { data, report_type, period, company_name, include_charts }
  );
}

export async function apiRepPerformance(reps: unknown[], period_days = 30, team_averages: Record<string, number> = {}) {
  return postJson<{ success: boolean; result: unknown }>(
    "/api/sales/reps/performance",
    { reps, period_days, team_averages }
  );
}
