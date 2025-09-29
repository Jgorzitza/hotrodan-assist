import type { EnhancedMetricData } from "~/components/EnhancedMetricCard";

export function generateEnhancedMetrics(range: string): EnhancedMetricData[] {
  // Mock data generation - in production, this would fetch from analytics APIs
  const baseMetrics = {
    revenue: { base: 125000, variance: 0.15 },
    aov: { base: 85, variance: 0.08 },
    conversion: { base: 2.4, variance: 0.12 },
    cac: { base: 45, variance: 0.10 },
    ltv: { base: 320, variance: 0.18 },
  };

  const rangeDays = getRangeDays(range);
  const sparklinePoints = rangeDays;

  return [
    {
      id: "revenue",
      label: "Revenue",
      value: Math.round(baseMetrics.revenue.base * (1 + (Math.random() - 0.5) * baseMetrics.revenue.variance)),
      delta: (Math.random() - 0.5) * 20,
      deltaPeriod: "vs last period",
      sparklineData: generateSparklineData(baseMetrics.revenue.base, baseMetrics.revenue.variance, sparklinePoints),
      format: "currency",
    },
    {
      id: "aov",
      label: "Average Order Value",
      value: Math.round(baseMetrics.aov.base * (1 + (Math.random() - 0.5) * baseMetrics.aov.variance)),
      delta: (Math.random() - 0.5) * 15,
      deltaPeriod: "vs last period",
      sparklineData: generateSparklineData(baseMetrics.aov.base, baseMetrics.aov.variance, sparklinePoints),
      format: "currency",
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: (baseMetrics.conversion.base * (1 + (Math.random() - 0.5) * baseMetrics.conversion.variance)).toFixed(1),
      delta: (Math.random() - 0.5) * 25,
      deltaPeriod: "vs last period",
      sparklineData: generateSparklineData(baseMetrics.conversion.base, baseMetrics.conversion.variance, sparklinePoints),
      format: "percentage",
    },
    {
      id: "cac",
      label: "Customer Acquisition Cost",
      value: Math.round(baseMetrics.cac.base * (1 + (Math.random() - 0.5) * baseMetrics.cac.variance)),
      delta: (Math.random() - 0.5) * 18,
      deltaPeriod: "vs last period",
      sparklineData: generateSparklineData(baseMetrics.cac.base, baseMetrics.cac.variance, sparklinePoints),
      format: "currency",
    },
    {
      id: "ltv",
      label: "Lifetime Value",
      value: Math.round(baseMetrics.ltv.base * (1 + (Math.random() - 0.5) * baseMetrics.ltv.variance)),
      delta: (Math.random() - 0.5) * 22,
      deltaPeriod: "vs last period",
      sparklineData: generateSparklineData(baseMetrics.ltv.base, baseMetrics.ltv.variance, sparklinePoints),
      format: "currency",
    },
  ];
}

function getRangeDays(range: string): number {
  const rangeMap: Record<string, number> = {
    today: 1,
    "7d": 7,
    "14d": 14,
    "28d": 28,
    "90d": 90,
  };
  return rangeMap[range] || 28;
}

function generateSparklineData(base: number, variance: number, points: number): number[] {
  const data: number[] = [];
  let current = base;
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * variance * 0.1;
    current = current * (1 + change);
    data.push(Math.round(current));
  }
  
  return data;
}

export function calculateMetricInsights(metrics: EnhancedMetricData[]): {
  bestPerformer: EnhancedMetricData;
  worstPerformer: EnhancedMetricData;
  overallTrend: "positive" | "negative" | "neutral";
} {
  const sortedByDelta = [...metrics].sort((a, b) => b.delta - a.delta);
  const bestPerformer = sortedByDelta[0];
  const worstPerformer = sortedByDelta[sortedByDelta.length - 1];
  
  const avgDelta = metrics.reduce((sum, metric) => sum + metric.delta, 0) / metrics.length;
  const overallTrend = avgDelta > 2 ? "positive" : avgDelta < -2 ? "negative" : "neutral";
  
  return {
    bestPerformer,
    worstPerformer,
    overallTrend,
  };
}
