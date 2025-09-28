import type { InventoryDemandTrendPoint } from "~/types/dashboard";

export type VelocityInput = {
  dailySales: number;
  leadTimeDays: number;
  safetyStockDays: number;
};

export type InventoryTrendStats = {
  average: number;
  latest: InventoryDemandTrendPoint;
  deltaPercentage: number | null;
  highest: InventoryDemandTrendPoint;
  lowest: InventoryDemandTrendPoint;
};

export const calculateStockoutDate = (
  inventoryOnHand: number,
  dailySales: number,
): Date => {
  if (dailySales <= 0) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const daysRemaining = inventoryOnHand / dailySales;
  const now = new Date();
  return new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
};

export const calculateReorderPoint = ({
  dailySales,
  leadTimeDays,
  safetyStockDays,
}: VelocityInput): number => {
  const leadDemand = dailySales * leadTimeDays;
  const safetyStock = dailySales * safetyStockDays;
  return Math.ceil(leadDemand + safetyStock);
};

export const calculateSafetyStock = (
  averageSales: number,
  peakSales: number,
  leadTimeDays: number,
): number => {
  const demandVariance = Math.max(peakSales - averageSales, 0);
  return Math.ceil(demandVariance * leadTimeDays);
};

export const calculateTrendStats = (
  trend: InventoryDemandTrendPoint[],
): InventoryTrendStats | null => {
  if (!Array.isArray(trend) || trend.length === 0) {
    return null;
  }

  const sanitized = trend.map((point) => ({
    label: point.label,
    units: Number.isFinite(point.units) ? point.units : 0,
  }));

  const average = Math.round(
    sanitized.reduce((total, entry) => total + entry.units, 0) /
      sanitized.length,
  );

  const latest = sanitized[sanitized.length - 1]!;
  const prior = sanitized.length > 1 ? sanitized[sanitized.length - 2]! : null;
  const deltaPercentage =
    prior && prior.units > 0
      ? Math.round(((latest.units - prior.units) / prior.units) * 100)
      : null;

  let highest = sanitized[0]!;
  let lowest = sanitized[0]!;

  for (const point of sanitized) {
    if (point.units > highest.units) {
      highest = point;
    }
    if (point.units < lowest.units) {
      lowest = point;
    }
  }

  return {
    average,
    latest,
    deltaPercentage,
    highest,
    lowest,
  };
};

export const aggregateTrendSeries = (
  series: Array<InventoryDemandTrendPoint[] | null | undefined>,
): InventoryDemandTrendPoint[] => {
  if (!Array.isArray(series) || series.length === 0) {
    return [];
  }

  const lengths = series.map((entry) => (Array.isArray(entry) ? entry.length : 0));
  const maxLength = Math.max(0, ...lengths);

  if (maxLength === 0) {
    return [];
  }

  const totals = Array.from({ length: maxLength }, () => 0);
  const labels = Array.from({ length: maxLength }, () => "");

  series.forEach((entry) => {
    if (!Array.isArray(entry)) {
      return;
    }

    entry.forEach((point, index) => {
      const units = Number.isFinite(point?.units) ? point.units : 0;
      totals[index] += units;

      if (!labels[index] && typeof point?.label === "string" && point.label.trim().length > 0) {
        labels[index] = point.label;
      }
    });
  });

  return totals.map((total, index) => ({
    label: labels[index] || `P${index + 1}`,
    units: Math.round(total),
  }));
};
