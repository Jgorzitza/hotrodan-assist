import type { InventoryDemandTrendPoint } from "../../types/dashboard";

export type VelocityInput = {
  dailySales: number;
  leadTimeDays: number;
  safetyStockDays: number;
};

export type StatisticalROPInput = {
  meanDailyDemand: number;
  leadTimeDays: number;
  demandStandardDeviation: number;
  serviceLevel: number; // 0-1, e.g., 0.95 for 95% service level
};

export type InventoryTrendStats = {
  average: number;
  latest: InventoryDemandTrendPoint;
  deltaPercentage: number | null;
  highest: InventoryDemandTrendPoint;
  lowest: InventoryDemandTrendPoint;
};

export type VelocityDecile = {
  decile: number;
  minVelocity: number;
  maxVelocity: number;
  skuCount: number;
  skuIds: string[];
  averageVelocity: number;
};

/**
 * Calculate the Z-score for a given service level
 * Common service levels and their Z-scores:
 * 90% = 1.28, 95% = 1.65, 99% = 2.33
 */
export const getZScore = (serviceLevel: number): number => {
  // Inverse normal distribution approximation
  // For common service levels, we use pre-calculated values
  const zScores: Record<number, number> = {
    0.90: 1.28,
    0.91: 1.34,
    0.92: 1.41,
    0.93: 1.48,
    0.94: 1.55,
    0.95: 1.65,
    0.96: 1.75,
    0.97: 1.88,
    0.98: 2.05,
    0.99: 2.33,
  };

  // Round to nearest 0.01 for lookup
  const rounded = Math.round(serviceLevel * 100) / 100;
  return zScores[rounded] || 1.65; // Default to 95% service level
};

/**
 * Calculate demand standard deviation from historical data
 */
export const calculateDemandStandardDeviation = (
  demandHistory: number[],
): number => {
  if (demandHistory.length < 2) return 0;

  const mean = demandHistory.reduce((sum, value) => sum + value, 0) / demandHistory.length;
  const variance = demandHistory.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (demandHistory.length - 1);
  return Math.sqrt(variance);
};

/**
 * Calculate statistical reorder point using the formula: ROP = μ_d * L + z * σ_d * √L
 * Where:
 * - μ_d = mean daily demand
 * - L = lead time in days
 * - z = Z-score for desired service level
 * - σ_d = standard deviation of daily demand
 */
export const calculateStatisticalReorderPoint = ({
  meanDailyDemand,
  leadTimeDays,
  demandStandardDeviation,
  serviceLevel,
}: StatisticalROPInput): number => {
  const z = getZScore(serviceLevel);
  const leadTimeDemand = meanDailyDemand * leadTimeDays;
  const safetyStock = z * demandStandardDeviation * Math.sqrt(leadTimeDays);
  return Math.ceil(leadTimeDemand + safetyStock);
};

/**
 * Calculate velocity deciles for Fast Movers analysis
 */
export const calculateVelocityDeciles = (
  skus: Array<{ id: string; velocity: { lastWeekUnits: number } }>,
): VelocityDecile[] => {
  if (skus.length === 0) return [];

  // Sort SKUs by velocity (lastWeekUnits)
  const sortedSkus = [...skus].sort((a, b) => b.velocity.lastWeekUnits - a.velocity.lastWeekUnits);
  
  const deciles: VelocityDecile[] = [];
  const skusPerDecile = Math.ceil(sortedSkus.length / 10);

  for (let i = 0; i < 10; i++) {
    const startIndex = i * skusPerDecile;
    const endIndex = Math.min(startIndex + skusPerDecile, sortedSkus.length);
    
    if (startIndex >= sortedSkus.length) break;

    const decileSkus = sortedSkus.slice(startIndex, endIndex);
    const velocities = decileSkus.map(sku => sku.velocity.lastWeekUnits);
    const minVelocity = Math.min(...velocities);
    const maxVelocity = Math.max(...velocities);

    deciles.push({
      decile: i + 1,
      minVelocity,
      maxVelocity,
      skuCount: decileSkus.length,
      skuIds: decileSkus.map(sku => sku.id),
      averageVelocity: velocities.reduce((sum, v) => sum + v, 0) / velocities.length,
    });
  }

  return deciles;
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
