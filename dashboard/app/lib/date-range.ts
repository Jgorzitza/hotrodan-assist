import type { DashboardRangeKey } from "~/types/dashboard";

const DASHBOARD_RANGE_KEY_VALUES = [
  "today",
  "7d",
  "14d",
  "28d",
  "90d",
] as const satisfies readonly DashboardRangeKey[];

type DashboardRangePreset = {
  label: string;
  days: number;
};

export const DASHBOARD_RANGE_PRESETS: Record<DashboardRangeKey, DashboardRangePreset> = {
  today: { label: "Today", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "14d": { label: "Last 14 days", days: 14 },
  "28d": { label: "Last 28 days", days: 28 },
  "90d": { label: "Last 90 days", days: 90 },
};

export const DASHBOARD_RANGE_OPTIONS = DASHBOARD_RANGE_KEY_VALUES.map((key) => ({
  value: key,
  label: DASHBOARD_RANGE_PRESETS[key].label,
}));

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeKey = "28d";

export type DashboardRangeSelection = {
  key: DashboardRangeKey;
  label: string;
  days: number;
  start: string;
  end: string;
};

const clampToUtcDay = (value: Date) => {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

const createSelection = (
  key: DashboardRangeKey,
  referenceDate = new Date(),
): DashboardRangeSelection => {
  const preset = DASHBOARD_RANGE_PRESETS[key];
  const end = clampToUtcDay(referenceDate);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (preset.days - 1));

  return {
    key,
    label: preset.label,
    days: preset.days,
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

export const resolveDashboardRangeKey = (
  candidate: string | null | undefined,
  fallback: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
): DashboardRangeKey => {
  if (!candidate) {
    return fallback;
  }

  if ((DASHBOARD_RANGE_KEY_VALUES as readonly string[]).includes(candidate)) {
    return candidate as DashboardRangeKey;
  }

  return fallback;
};

export const resolveDashboardRange = (
  searchParams: URLSearchParams | URLSearchParamsInit,
  fallback: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
  referenceDate = new Date(),
): DashboardRangeSelection => {
  const params =
    searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
  const key = resolveDashboardRangeKey(params.get("range"), fallback);
  return createSelection(key, referenceDate);
};

export type WithDashboardRangeParamOptions = {
  searchParams?: URLSearchParams | URLSearchParamsInit;
  includeKeys?: string[];
};

const DEFAULT_SHARED_PARAM_KEYS = ["mockState"] as const;

export const withDashboardRangeParam = (
  path: string,
  key: DashboardRangeKey,
  options?: WithDashboardRangeParamOptions,
): string => {
  const url = new URL(path, "https://dashboard.internal");

  if (options?.searchParams) {
    const params =
      options.searchParams instanceof URLSearchParams
        ? options.searchParams
        : new URLSearchParams(options.searchParams);

    const allowedKeys = new Set(options.includeKeys ?? DEFAULT_SHARED_PARAM_KEYS);
    params.forEach((value, paramKey) => {
      if (!allowedKeys.has(paramKey)) return;
      if (!value) return;
      url.searchParams.set(paramKey, value);
    });
  }

  url.searchParams.set("range", key);
  return `${url.pathname}${url.search}${url.hash}`;
};

export const findDashboardRangeKeyByDays = (days: number): DashboardRangeKey | undefined => {
  const normalizedDays = Math.max(Math.round(days), 1);
  for (const key of DASHBOARD_RANGE_KEY_VALUES) {
    if (DASHBOARD_RANGE_PRESETS[key].days === normalizedDays) {
      return key;
    }
  }
  return undefined;
};

export const buildDashboardRangeSelection = (
  key: DashboardRangeKey,
  referenceDate = new Date(),
): DashboardRangeSelection => createSelection(key, referenceDate);

export const DASHBOARD_RANGE_KEY_LIST = DASHBOARD_RANGE_KEY_VALUES;
