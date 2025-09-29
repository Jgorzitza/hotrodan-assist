import type { InventorySkuDemand, InventoryDemandTrendPoint } from "../../types/dashboard";

/**
 * Advanced analytics algorithms for inventory management
 * Includes demand forecasting, vendor performance, and automated insights
 */

export type DemandForecast = {
  skuId: string;
  sku: string;
  currentDemand: number;
  forecastedDemand: number[];
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  seasonality: number;
  nextReorderDate: string;
  recommendedOrderQuantity: number;
};

export type VendorPerformance = {
  vendorId: string;
  vendorName: string;
  totalSkus: number;
  averageLeadTime: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  costEfficiency: number;
  overallScore: number;
  recommendations: string[];
};

export type InventoryInsight = {
  id: string;
  type: "opportunity" | "risk" | "optimization";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  skuIds: string[];
  estimatedValue: number;
  confidence: number;
};

/**
 * Demand forecasting engine using multiple algorithms
 */
export class DemandForecaster {
  /**
   * Generate demand forecast for a SKU using historical trend data
   */
  static forecastDemand(
    sku: InventorySkuDemand,
    forecastPeriods: number = 12
  ): DemandForecast {
    const trend = sku.trend;
    const currentDemand = sku.velocity.lastWeekUnits;
    
    // Calculate trend using linear regression
    const trendAnalysis = this.calculateTrend(trend);
    
    // Calculate seasonality
    const seasonality = this.calculateSeasonality(trend);
    
    // Generate forecast
    const forecastedDemand = this.generateForecast(
      currentDemand,
      trendAnalysis,
      seasonality,
      forecastPeriods
    );
    
    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateConfidence(trend, trendAnalysis);
    
    // Determine trend direction
    const trendDirection = this.determineTrendDirection(trendAnalysis);
    
    // Calculate next reorder date
    const nextReorderDate = this.calculateNextReorderDate(
      sku.onHand,
      sku.committed,
      forecastedDemand[0] || currentDemand
    );
    
    // Calculate recommended order quantity
    const recommendedOrderQuantity = this.calculateRecommendedOrder(
      sku,
      forecastedDemand,
      confidence
    );
    
    return {
      skuId: sku.id,
      sku: sku.sku,
      currentDemand,
      forecastedDemand,
      confidence,
      trend: trendDirection,
      seasonality,
      nextReorderDate,
      recommendedOrderQuantity,
    };
  }

  /**
   * Calculate trend using linear regression
   */
  private static calculateTrend(trend: InventoryDemandTrendPoint[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    if (trend.length < 2) {
      return { slope: 0, intercept: 0, rSquared: 0 };
    }

    const n = trend.length;
    const x = trend.map((_, i) => i);
    const y = trend.map(point => point.units);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared };
  }

  /**
   * Calculate seasonality factor
   */
  private static calculateSeasonality(trend: InventoryDemandTrendPoint[]): number {
    if (trend.length < 4) return 1;

    // Simple seasonality calculation based on variance
    const values = trend.map(point => point.units);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Normalize variance to get seasonality factor
    return Math.min(2, Math.max(0.5, 1 + (variance / mean)));
  }

  /**
   * Generate forecast using trend and seasonality
   */
  private static generateForecast(
    currentDemand: number,
    trendAnalysis: { slope: number; intercept: number },
    seasonality: number,
    periods: number
  ): number[] {
    const forecast: number[] = [];
    
    for (let i = 1; i <= periods; i++) {
      const trendValue = trendAnalysis.slope * (trendAnalysis.intercept + i) + trendAnalysis.intercept;
      const seasonalValue = trendValue * seasonality;
      const forecastValue = Math.max(0, Math.round(seasonalValue));
      forecast.push(forecastValue);
    }
    
    return forecast;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(
    trend: InventoryDemandTrendPoint[],
    trendAnalysis: { rSquared: number }
  ): number {
    const dataQuality = Math.min(1, trend.length / 12); // More data = higher confidence
    const trendQuality = Math.max(0, trendAnalysis.rSquared);
    
    return (dataQuality * 0.6 + trendQuality * 0.4);
  }

  /**
   * Determine trend direction
   */
  private static determineTrendDirection(trendAnalysis: { slope: number }): "increasing" | "decreasing" | "stable" {
    if (trendAnalysis.slope > 0.1) return "increasing";
    if (trendAnalysis.slope < -0.1) return "decreasing";
    return "stable";
  }

  /**
   * Calculate next reorder date
   */
  private static calculateNextReorderDate(
    onHand: number,
    committed: number,
    dailyDemand: number
  ): string {
    const netAvailable = onHand - committed;
    if (netAvailable <= 0) return new Date().toISOString();
    
    const daysUntilReorder = Math.floor(netAvailable / dailyDemand);
    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + daysUntilReorder);
    
    return reorderDate.toISOString();
  }

  /**
   * Calculate recommended order quantity
   */
  private static calculateRecommendedOrder(
    sku: InventorySkuDemand,
    forecast: number[],
    confidence: number
  ): number {
    const averageForecast = forecast.reduce((a, b) => a + b, 0) / forecast.length;
    const leadTimeDays = 30; // Should come from vendor data
    const safetyFactor = 1 + (1 - confidence) * 0.5; // Higher uncertainty = more safety stock
    
    const recommended = Math.round(averageForecast * leadTimeDays * safetyFactor);
    return Math.max(recommended, 1); // Ensure minimum order quantity of 1
  }
}

/**
 * Vendor performance analyzer
 */
export class VendorPerformanceAnalyzer {
  /**
   * Analyze vendor performance across all SKUs
   */
  static analyzeVendorPerformance(
    skus: InventorySkuDemand[],
    vendorMappings: Array<{ id: string; name: string; leadTimeDays: number }>
  ): VendorPerformance[] {
    const vendorGroups = this.groupSkusByVendor(skus);
    
    return vendorMappings.map(vendor => {
      const vendorSkus = vendorGroups[vendor.id] || [];
      return this.calculateVendorMetrics(vendor, vendorSkus);
    });
  }

  /**
   * Group SKUs by vendor
   */
  private static groupSkusByVendor(skus: InventorySkuDemand[]): Record<string, InventorySkuDemand[]> {
    return skus.reduce((groups, sku) => {
      if (!groups[sku.vendorId]) {
        groups[sku.vendorId] = [];
      }
      groups[sku.vendorId].push(sku);
      return groups;
    }, {} as Record<string, InventorySkuDemand[]>);
  }

  /**
   * Calculate vendor performance metrics
   */
  private static calculateVendorMetrics(
    vendor: { id: string; name: string; leadTimeDays: number },
    skus: InventorySkuDemand[]
  ): VendorPerformance {
    const totalSkus = skus.length;
    const averageLeadTime = vendor.leadTimeDays;
    
    // Calculate on-time delivery rate (simplified)
    const onTimeDeliveryRate = this.calculateOnTimeDeliveryRate(skus);
    
    // Calculate quality score based on inventory status
    const qualityScore = this.calculateQualityScore(skus);
    
    // Calculate cost efficiency
    const costEfficiency = this.calculateCostEfficiency(skus);
    
    // Calculate overall score
    const overallScore = (onTimeDeliveryRate * 0.4 + qualityScore * 0.3 + costEfficiency * 0.3);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      onTimeDeliveryRate,
      qualityScore,
      costEfficiency,
      averageLeadTime
    );
    
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      totalSkus,
      averageLeadTime,
      onTimeDeliveryRate,
      qualityScore,
      costEfficiency,
      overallScore,
      recommendations,
    };
  }

  private static calculateOnTimeDeliveryRate(skus: InventorySkuDemand[]): number {
    // Simplified calculation - in reality, this would use historical delivery data
    const healthySkus = skus.filter(sku => sku.status === "healthy").length;
    return skus.length > 0 ? healthySkus / skus.length : 0;
  }

  private static calculateQualityScore(skus: InventorySkuDemand[]): number {
    // Based on inventory status distribution
    const statusWeights = { healthy: 1, low: 0.7, backorder: 0.3, preorder: 0.5 };
    const totalWeight = skus.reduce((sum, sku) => sum + (statusWeights[sku.status] || 0), 0);
    return skus.length > 0 ? totalWeight / skus.length : 0;
  }

  private static calculateCostEfficiency(skus: InventorySkuDemand[]): number {
    // Based on unit cost distribution
    const costs = skus.map(sku => sku.unitCost.amount);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const costVariance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgCost, 2), 0) / costs.length;
    
    // Lower variance = higher efficiency
    return Math.max(0, 1 - (costVariance / avgCost));
  }

  private static generateRecommendations(
    onTimeRate: number,
    qualityScore: number,
    costEfficiency: number,
    leadTime: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (onTimeRate < 0.8) {
      recommendations.push("Improve delivery reliability - consider backup suppliers");
    }
    
    if (qualityScore < 0.7) {
      recommendations.push("Address inventory quality issues - review supplier standards");
    }
    
    if (costEfficiency < 0.6) {
      recommendations.push("Optimize cost structure - negotiate better pricing");
    }
    
    if (leadTime > 45) {
      recommendations.push("Reduce lead times - consider local suppliers or faster shipping");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Vendor performance is excellent - maintain current relationship");
    }
    
    return recommendations;
  }
}

/**
 * Inventory insights generator
 */
export class InventoryInsightGenerator {
  /**
   * Generate actionable insights from inventory data
   */
  static generateInsights(skus: InventorySkuDemand[]): InventoryInsight[] {
    const insights: InventoryInsight[] = [];
    
    // Add various insight types
    insights.push(...this.generateStockoutRiskInsights(skus));
    insights.push(...this.generateOverstockInsights(skus));
    insights.push(...this.generateVelocityInsights(skus));
    insights.push(...this.generateCostOptimizationInsights(skus));
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private static generateStockoutRiskInsights(skus: InventorySkuDemand[]): InventoryInsight[] {
    const atRiskSkus = skus.filter(sku => 
      sku.status === "low" || sku.status === "backorder" || sku.coverDays < 7
    );
    
    if (atRiskSkus.length === 0) return [];
    
    return [{
      id: "stockout-risk",
      type: "risk",
      priority: "high",
      title: "Stockout Risk Detected",
      description: `${atRiskSkus.length} SKUs are at risk of stockout`,
      impact: "Potential lost sales and customer dissatisfaction",
      action: "Expedite reorder for at-risk SKUs",
      skuIds: atRiskSkus.map(sku => sku.id),
      estimatedValue: atRiskSkus.reduce((sum, sku) => sum + sku.unitCost.amount * sku.recommendedOrder, 0),
      confidence: 0.9,
    }];
  }

  private static generateOverstockInsights(skus: InventorySkuDemand[]): InventoryInsight[] {
    const overstockSkus = skus.filter(sku => 
      sku.bucketId === "overstock" || sku.coverDays > 90
    );
    
    if (overstockSkus.length === 0) return [];
    
    return [{
      id: "overstock-opportunity",
      type: "opportunity",
      priority: "medium",
      title: "Overstock Optimization Opportunity",
      description: `${overstockSkus.length} SKUs have excess inventory`,
      impact: "Free up working capital and reduce storage costs",
      action: "Consider promotions or vendor returns for overstock items",
      skuIds: overstockSkus.map(sku => sku.id),
      estimatedValue: overstockSkus.reduce((sum, sku) => sum + sku.unitCost.amount * (sku.onHand - sku.recommendedOrder), 0),
      confidence: 0.8,
    }];
  }

  private static generateVelocityInsights(skus: InventorySkuDemand[]): InventoryInsight[] {
    const fastMovers = skus.filter(sku => sku.velocity.lastWeekUnits > 50);
    const slowMovers = skus.filter(sku => sku.velocity.lastWeekUnits < 5);
    
    const insights: InventoryInsight[] = [];
    
    if (fastMovers.length > 0) {
      insights.push({
        id: "fast-movers-opportunity",
        type: "opportunity",
        priority: "high",
        title: "Fast Movers Opportunity",
        description: `${fastMovers.length} SKUs are high-velocity items`,
        impact: "Increase inventory investment in high-performing SKUs",
        action: "Increase reorder quantities for fast-moving items",
        skuIds: fastMovers.map(sku => sku.id),
        estimatedValue: fastMovers.reduce((sum, sku) => sum + sku.unitCost.amount * sku.velocity.lastWeekUnits, 0),
        confidence: 0.85,
      });
    }
    
    if (slowMovers.length > 0) {
      insights.push({
        id: "slow-movers-risk",
        type: "risk",
        priority: "medium",
        title: "Slow Movers Risk",
        description: `${slowMovers.length} SKUs have low velocity`,
        impact: "Potential dead stock and capital tie-up",
        action: "Review slow-moving items for discontinuation or promotion",
        skuIds: slowMovers.map(sku => sku.id),
        estimatedValue: slowMovers.reduce((sum, sku) => sum + sku.unitCost.amount * sku.onHand, 0),
        confidence: 0.75,
      });
    }
    
    return insights;
  }

  private static generateCostOptimizationInsights(skus: InventorySkuDemand[]): InventoryInsight[] {
    // Group by vendor to find cost optimization opportunities
    const vendorGroups = skus.reduce((groups, sku) => {
      if (!groups[sku.vendorId]) groups[sku.vendorId] = [];
      groups[sku.vendorId].push(sku);
      return groups;
    }, {} as Record<string, InventorySkuDemand[]>);
    
    const highCostVendors = Object.entries(vendorGroups)
      .filter(([_, vendorSkus]) => {
        const avgCost = vendorSkus.reduce((sum, sku) => sum + sku.unitCost.amount, 0) / vendorSkus.length;
        return avgCost > 50; // Threshold for high-cost items
      });
    
    if (highCostVendors.length === 0) return [];
    
    return [{
      id: "cost-optimization",
      type: "optimization",
      priority: "medium",
      title: "Cost Optimization Opportunity",
      description: `${highCostVendors.length} vendors have high-cost items`,
      impact: "Potential cost savings through vendor negotiation or alternatives",
      action: "Review high-cost vendors for negotiation opportunities",
      skuIds: highCostVendors.flatMap(([_, skus]) => skus.map(sku => sku.id)),
      estimatedValue: highCostVendors.reduce((sum, [_, skus]) => 
        sum + skus.reduce((vendorSum, sku) => vendorSum + sku.unitCost.amount * sku.onHand, 0), 0
      ),
      confidence: 0.7,
    }];
  }
}
