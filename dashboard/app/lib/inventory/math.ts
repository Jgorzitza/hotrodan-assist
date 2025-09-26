export type VelocityInput = {
  dailySales: number;
  leadTimeDays: number;
  safetyStockDays: number;
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
