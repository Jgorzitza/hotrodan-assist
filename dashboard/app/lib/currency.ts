import type { CurrencyCode, Money } from "~/types/dashboard";

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

const formatterCache = new Map<string, Intl.NumberFormat>();

const buildFormatter = (currency: CurrencyCode, fractionDigits: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const getFormatter = (currency: CurrencyCode, fractionDigits: number): Intl.NumberFormat => {
  const key = `${currency}-${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = buildFormatter(currency, fractionDigits);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

const roundTo = (value: number, precision = 2): number => {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const sanitizeAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

export const formatCurrency = (
  amount: number | null | undefined,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string => {
  const numeric = sanitizeAmount(amount);
  const absolute = Math.abs(numeric);

  if (absolute >= 1000) {
    const scaled = roundTo(numeric / 1000, 1);
    const formatter = getFormatter(currency, 1);
    return `${formatter.format(scaled)}K`;
  }

  const formatter = getFormatter(currency, 2);
  return formatter.format(roundTo(numeric, 2));
};

export const createMoney = (
  amount: number | null | undefined,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): Money => {
  const numeric = roundTo(sanitizeAmount(amount), 2);
  return {
    amount: numeric,
    currency,
    formatted: formatCurrency(numeric, currency),
  };
};

