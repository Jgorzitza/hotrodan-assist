import type { DateRange, SalesGranularity } from "~/types/dashboard";

const toUtc = (value: Date | string): Date => {
  return typeof value === "string" ? new Date(value) : new Date(value.getTime());
};

export const addDays = (date: Date, days: number): Date => {
  const next = toUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const subDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

export const toIso = (date: Date): string => {
  return date.toISOString();
};

export const createDateRange = (
  days: number,
  end: Date = new Date(),
  label?: string,
): DateRange => {
  const safeDays = Math.max(days, 1);
  const endUtc = toUtc(end);
  const startUtc = subDays(endUtc, safeDays - 1);

  return {
    label: label ?? `${safeDays}-day range`,
    start: toIso(startUtc),
    end: toIso(endUtc),
  };
};

const stepsByGranularity: Record<SalesGranularity, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const buildDateBuckets = (
  range: DateRange,
  granularity: SalesGranularity,
): string[] => {
  const buckets: string[] = [];
  const step = stepsByGranularity[granularity];
  let cursor = toUtc(range.start);
  const end = toUtc(range.end);

  while (cursor <= end) {
    buckets.push(toIso(cursor));
    cursor = addDays(cursor, step);
  }

  if (buckets[buckets.length - 1] !== range.end) {
    buckets[buckets.length - 1] = range.end;
  }

  return buckets;
};

