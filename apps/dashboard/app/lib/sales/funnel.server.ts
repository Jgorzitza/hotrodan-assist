import type { SalesDataset } from "~/types/dashboard";

/**
 * Sales funnel analysis logic
 * 
 * This module provides funnel analysis capabilities for the sales insights feature.
 * It analyzes the customer journey from sessions → add-to-cart → checkout → purchase.
 */

export type FunnelStage = "sessions" | "add_to_cart" | "checkout" | "purchase";

export type FunnelMetrics = {
  stage: FunnelStage;
  count: number;
  percentage: number; // percentage of previous stage
  dropoffRate: number; // percentage lost from previous stage
};

export type FunnelAnalysis = {
  stages: FunnelMetrics[];
  overallConversionRate: number; // sessions to purchase
  totalRevenue: number;
  averageOrderValue: number;
  conversionByChannel: Record<string, FunnelMetrics[]>;
  conversionByProduct: Record<string, FunnelMetrics[]>;
  insights: FunnelInsight[];
};

export type FunnelInsight = {
  type: "dropoff" | "opportunity" | "performance";
  stage: FunnelStage;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  recommendation: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
};

/**
 * Analyzes the sales funnel from the provided dataset
 */
export function analyzeFunnel(dataset: SalesDataset): FunnelAnalysis {
  // Extract basic metrics from the dataset
  const totalOrders = dataset.totals.currentTotal.amount / dataset.totals.averageOrderValue.amount;
  const conversionRate = dataset.totals.conversionRate;
  
  // Estimate sessions based on conversion rate
  // This is a simplified calculation - in reality, you'd get this from GA4
  const estimatedSessions = totalOrders / (conversionRate / 100);
  
  // Estimate add-to-cart events (typically 3-5x higher than purchases)
  const estimatedAddToCart = estimatedSessions * 0.08; // 8% add-to-cart rate
  
  // Estimate checkout starts (typically 60-80% of add-to-cart)
  const estimatedCheckout = estimatedAddToCart * 0.7; // 70% checkout rate
  
  // Build funnel stages
  const stages: FunnelMetrics[] = [
    {
      stage: "sessions",
      count: Math.round(estimatedSessions),
      percentage: 100,
      dropoffRate: 0,
    },
    {
      stage: "add_to_cart",
      count: Math.round(estimatedAddToCart),
      percentage: Math.round((estimatedAddToCart / estimatedSessions) * 100),
      dropoffRate: Math.round(((estimatedSessions - estimatedAddToCart) / estimatedSessions) * 100),
    },
    {
      stage: "checkout",
      count: Math.round(estimatedCheckout),
      percentage: Math.round((estimatedCheckout / estimatedAddToCart) * 100),
      dropoffRate: Math.round(((estimatedAddToCart - estimatedCheckout) / estimatedAddToCart) * 100),
    },
    {
      stage: "purchase",
      count: Math.round(totalOrders),
      percentage: Math.round((totalOrders / estimatedCheckout) * 100),
      dropoffRate: Math.round(((estimatedCheckout - totalOrders) / estimatedCheckout) * 100),
    },
  ];

  // Analyze channel performance
  const conversionByChannel = analyzeChannelConversion(dataset);
  
  // Analyze product performance
  const conversionByProduct = analyzeProductConversion(dataset);
  
  // Generate insights
  const insights = generateFunnelInsights(stages, dataset);

  return {
    stages,
    overallConversionRate: conversionRate,
    totalRevenue: dataset.totals.currentTotal.amount,
    averageOrderValue: dataset.totals.averageOrderValue.amount,
    conversionByChannel,
    conversionByProduct,
    insights,
  };
}

/**
 * Analyzes conversion rates by channel
 */
function analyzeChannelConversion(dataset: SalesDataset): Record<string, FunnelMetrics[]> {
  const channelAnalysis: Record<string, FunnelMetrics[]> = {};
  
  dataset.channelBreakdown.forEach(channel => {
    // Estimate funnel metrics for each channel based on revenue share
    const channelOrders = (channel.percentage / 100) * (dataset.totals.currentTotal.amount / dataset.totals.averageOrderValue.amount);
    const channelSessions = channelOrders / (dataset.totals.conversionRate / 100);
    const channelAddToCart = channelSessions * 0.08;
    const channelCheckout = channelAddToCart * 0.7;
    
    channelAnalysis[channel.channel] = [
      {
        stage: "sessions",
        count: Math.round(channelSessions),
        percentage: 100,
        dropoffRate: 0,
      },
      {
        stage: "add_to_cart",
        count: Math.round(channelAddToCart),
        percentage: Math.round((channelAddToCart / channelSessions) * 100),
        dropoffRate: Math.round(((channelSessions - channelAddToCart) / channelSessions) * 100),
      },
      {
        stage: "checkout",
        count: Math.round(channelCheckout),
        percentage: Math.round((channelCheckout / channelAddToCart) * 100),
        dropoffRate: Math.round(((channelAddToCart - channelCheckout) / channelAddToCart) * 100),
      },
      {
        stage: "purchase",
        count: Math.round(channelOrders),
        percentage: Math.round((channelOrders / channelCheckout) * 100),
        dropoffRate: Math.round(((channelCheckout - channelOrders) / channelCheckout) * 100),
      },
    ];
  });
  
  return channelAnalysis;
}

/**
 * Analyzes conversion rates by product category
 */
function analyzeProductConversion(dataset: SalesDataset): Record<string, FunnelMetrics[]> {
  const productAnalysis: Record<string, FunnelMetrics[]> = {};
  
  dataset.collections.forEach(collection => {
    const collectionOrders = collection.orders;
    // const collectionRevenue = collection.gmv.amount;
    // const avgOrderValue = collectionRevenue / collectionOrders;
    const conversionRate = collection.conversionRate;
    
    const collectionSessions = collectionOrders / (conversionRate / 100);
    const collectionAddToCart = collectionSessions * 0.08;
    const collectionCheckout = collectionAddToCart * 0.7;
    
    productAnalysis[collection.title] = [
      {
        stage: "sessions",
        count: Math.round(collectionSessions),
        percentage: 100,
        dropoffRate: 0,
      },
      {
        stage: "add_to_cart",
        count: Math.round(collectionAddToCart),
        percentage: Math.round((collectionAddToCart / collectionSessions) * 100),
        dropoffRate: Math.round(((collectionSessions - collectionAddToCart) / collectionSessions) * 100),
      },
      {
        stage: "checkout",
        count: Math.round(collectionCheckout),
        percentage: Math.round((collectionCheckout / collectionAddToCart) * 100),
        dropoffRate: Math.round(((collectionAddToCart - collectionCheckout) / collectionAddToCart) * 100),
      },
      {
        stage: "purchase",
        count: Math.round(collectionOrders),
        percentage: Math.round((collectionOrders / collectionCheckout) * 100),
        dropoffRate: Math.round(((collectionCheckout - collectionOrders) / collectionCheckout) * 100),
      },
    ];
  });
  
  return productAnalysis;
}

/**
 * Generates actionable insights from funnel analysis
 */
function generateFunnelInsights(stages: FunnelMetrics[], dataset: SalesDataset): FunnelInsight[] {
  const insights: FunnelInsight[] = [];
  
  // Analyze dropoff rates
  stages.forEach((stage, index) => {
    if (index === 0) return; // Skip sessions stage
    
    const dropoffRate = stage.dropoffRate;
    // const previousStage = stages[index - 1];
    
    if (dropoffRate > 70) {
      insights.push({
        type: "dropoff",
        stage: stage.stage,
        severity: "high",
        title: `High ${stage.stage.replace('_', ' ')} dropoff`,
        description: `${dropoffRate}% of users drop off at ${stage.stage.replace('_', ' ')} stage`,
        recommendation: getDropoffRecommendation(stage.stage),
        impact: "high",
        effort: "medium",
      });
    } else if (dropoffRate > 50) {
      insights.push({
        type: "dropoff",
        stage: stage.stage,
        severity: "medium",
        title: `Moderate ${stage.stage.replace('_', ' ')} dropoff`,
        description: `${dropoffRate}% of users drop off at ${stage.stage.replace('_', ' ')} stage`,
        recommendation: getDropoffRecommendation(stage.stage),
        impact: "medium",
        effort: "low",
      });
    }
  });
  
  // Analyze overall conversion rate
  const overallConversion = stages[stages.length - 1].percentage;
  if (overallConversion < 2) {
    insights.push({
      type: "performance",
      stage: "purchase",
      severity: "high",
      title: "Low overall conversion rate",
      description: `Only ${overallConversion}% of sessions convert to purchases`,
      recommendation: "Focus on improving user experience and reducing friction in the checkout process",
      impact: "high",
      effort: "high",
    });
  }
  
  // Analyze attach rate opportunities
  if (dataset.attachRateInsights.length > 0) {
    dataset.attachRateInsights.forEach(insight => {
      insights.push({
        type: "opportunity",
        stage: "add_to_cart",
        severity: "medium",
        title: `Cross-sell opportunity: ${insight.primaryProduct} → ${insight.attachmentProduct}`,
        description: `Current attach rate: ${insight.attachRate}%`,
        recommendation: insight.opportunity,
        impact: "medium",
        effort: "low",
      });
    });
  }
  
  return insights;
}

/**
 * Provides specific recommendations for dropoff issues
 */
function getDropoffRecommendation(stage: FunnelStage): string {
  switch (stage) {
    case "add_to_cart":
      return "Improve product pages with better images, descriptions, and clear CTAs";
    case "checkout":
      return "Simplify checkout process, add guest checkout option, and reduce form fields";
    case "purchase":
      return "Review payment options, shipping costs, and final confirmation steps";
    default:
      return "Investigate user behavior and improve user experience";
  }
}

/**
 * Calculates impact/effort scoring for insights
 */
export function calculateImpactEffortScore(insight: FunnelInsight): number {
  const impactScores = { low: 1, medium: 2, high: 3 };
  const effortScores = { low: 3, medium: 2, high: 1 }; // Lower effort = higher score
  
  const impact = impactScores[insight.impact];
  const effort = effortScores[insight.effort];
  
  return (impact * effort) / 3; // Normalize to 0-3 scale
}

/**
 * Exports funnel analysis data to CSV format
 */
export function exportFunnelToCSV(analysis: FunnelAnalysis): string {
  const lines: string[] = [];
  
  // Header
  lines.push("Stage,Count,Percentage,Dropoff Rate,Conversion Rate");
  
  // Funnel stages
  analysis.stages.forEach(stage => {
    lines.push([
      stage.stage.replace('_', ' '),
      stage.count.toString(),
      `${stage.percentage}%`,
      `${stage.dropoffRate}%`,
      stage.percentage === 100 ? "100%" : `${100 - stage.dropoffRate}%`
    ].join(","));
  });
  
  // Summary
  lines.push("");
  lines.push("Summary");
  lines.push(`Overall Conversion Rate,${analysis.overallConversionRate}%`);
  lines.push(`Total Revenue,$${analysis.totalRevenue.toFixed(2)}`);
  lines.push(`Average Order Value,$${analysis.averageOrderValue.toFixed(2)}`);
  
  // Insights
  lines.push("");
  lines.push("Insights");
  lines.push("Type,Stage,Severity,Title,Impact,Effort,Score");
  analysis.insights.forEach(insight => {
    const score = calculateImpactEffortScore(insight);
    lines.push([
      insight.type,
      insight.stage.replace('_', ' '),
      insight.severity,
      `"${insight.title}"`,
      insight.impact,
      insight.effort,
      score.toFixed(2)
    ].join(","));
  });
  
  return lines.join("\n");
}
