import type { SalesDataset } from "~/types/dashboard";
import { fetchSalesAnalytics, type FetchSalesAnalyticsParams } from "./analytics.server";
import { analyzeFunnel, exportFunnelToCSV } from "./funnel.server";
import { generateExperimentSuggestions, exportExperimentsToCSV } from "./experiments.server";

/**
 * Enhanced sales analytics with funnel analysis and experiment suggestions
 * 
 * This module extends the basic sales analytics with advanced insights
 * including funnel analysis and experiment recommendations.
 */

export type EnhancedSalesAnalytics = {
  dataset: SalesDataset;
  funnel: ReturnType<typeof analyzeFunnel>;
  experiments: ReturnType<typeof generateExperimentSuggestions>;
};

export type SalesInsightsExport = {
  funnel: string;
  experiments: string;
  summary: string;
};

/**
 * Fetches enhanced sales analytics including funnel and experiment analysis
 */
export async function fetchEnhancedSalesAnalytics(params: FetchSalesAnalyticsParams): Promise<EnhancedSalesAnalytics> {
  const dataset = await fetchSalesAnalytics(params);
  const funnel = analyzeFunnel(dataset);
  const experiments = generateExperimentSuggestions(dataset);
  
  return { dataset, funnel, experiments };
}

/**
 * Exports comprehensive sales insights to CSV format
 */
export function exportSalesInsightsToCSV(dataset: SalesDataset): SalesInsightsExport {
  const funnel = analyzeFunnel(dataset);
  const experiments = generateExperimentSuggestions(dataset);
  
  // Generate summary CSV
  const summary = generateSummaryCSV(dataset, funnel, experiments);
  
  return {
    funnel: exportFunnelToCSV(funnel),
    experiments: exportExperimentsToCSV(experiments),
    summary,
  };
}

/**
 * Generates a summary CSV with key metrics and recommendations
 */
function generateSummaryCSV(
  dataset: SalesDataset, 
  funnel: ReturnType<typeof analyzeFunnel>,
  experiments: ReturnType<typeof generateExperimentSuggestions>
): string {
  const lines: string[] = [];
  
  // Header
  lines.push("Metric,Value,Target,Status,Recommendation");
  
  // Key metrics
  lines.push([
    "Overall Conversion Rate",
    `${dataset.totals.conversionRate}%`,
    "3.5%",
    dataset.totals.conversionRate >= 3.5 ? "Good" : "Needs Improvement",
    dataset.totals.conversionRate < 2.5 ? "Focus on checkout optimization" : "Maintain current performance"
  ].join(","));
  
  lines.push([
    "Average Order Value",
    `$${dataset.totals.averageOrderValue.amount.toFixed(2)}`,
    "$200+",
    dataset.totals.averageOrderValue.amount >= 200 ? "Good" : "Opportunity",
    dataset.totals.averageOrderValue.amount < 200 ? "Implement upsell strategies" : "Continue current approach"
  ].join(","));
  
  lines.push([
    "Revenue Growth",
    `${dataset.totals.deltaPercentage > 0 ? '+' : ''}${dataset.totals.deltaPercentage}%`,
    "5%+",
    dataset.totals.deltaPercentage >= 5 ? "Excellent" : "Needs Attention",
    dataset.totals.deltaPercentage < 0 ? "Investigate declining trends" : "Accelerate growth strategies"
  ].join(","));
  
  // Funnel insights
  const purchaseStage = funnel.stages.find(s => s.stage === "purchase");
  if (purchaseStage) {
    lines.push([
      "Funnel Conversion",
      `${purchaseStage.percentage}%`,
      "2.5%",
      purchaseStage.percentage >= 2.5 ? "Good" : "Critical",
      purchaseStage.percentage < 2.5 ? "Optimize entire funnel" : "Focus on specific stages"
    ].join(","));
  }
  
  // Top experiment recommendations
  lines.push("");
  lines.push("Top Experiment Recommendations");
  lines.push("Type,Title,Priority,Expected Impact,Effort");
  
  experiments.prioritized.slice(0, 5).forEach(experiment => {
    lines.push([
      experiment.type.replace('_', ' '),
      `"${experiment.title}"`,
      experiment.priority.toString(),
      `$${experiment.expectedImpact.revenue.toFixed(2)}`,
      experiment.effort
    ].join(","));
  });
  
  // Action items
  lines.push("");
  lines.push("Action Items");
  lines.push("Priority,Action,Impact,Effort,Timeline");
  
  const highPriorityInsights = funnel.insights.filter(i => i.severity === "high");
  highPriorityInsights.forEach(insight => {
    lines.push([
      "High",
      `"${insight.title}"`,
      insight.impact,
      insight.effort,
      "1-2 weeks"
    ].join(","));
  });
  
  const mediumPriorityInsights = funnel.insights.filter(i => i.severity === "medium");
  mediumPriorityInsights.slice(0, 3).forEach(insight => {
    lines.push([
      "Medium",
      `"${insight.title}"`,
      insight.impact,
      insight.effort,
      "2-4 weeks"
    ].join(","));
  });
  
  return lines.join("\n");
}

/**
 * Generates a comprehensive sales insights report
 */
export function generateSalesInsightsReport(analytics: EnhancedSalesAnalytics): {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  experimentPriorities: string[];
} {
  const { dataset, funnel, experiments } = analytics;
  
  const summary = `Sales Performance Summary: ${dataset.totals.currentTotal.formatted} revenue (${dataset.totals.deltaPercentage > 0 ? '+' : ''}${dataset.totals.deltaPercentage}% vs previous period). Conversion rate: ${dataset.totals.conversionRate}%. Average order value: ${dataset.totals.averageOrderValue.formatted}.`;
  
  const keyFindings: string[] = [];
  
  // Conversion rate analysis
  if (dataset.totals.conversionRate < 2.5) {
    keyFindings.push(`Low conversion rate (${dataset.totals.conversionRate}%) indicates checkout optimization opportunities`);
  } else if (dataset.totals.conversionRate > 4) {
    keyFindings.push(`Strong conversion rate (${dataset.totals.conversionRate}%) - focus on increasing traffic or AOV`);
  }
  
  // Revenue growth analysis
  if (dataset.totals.deltaPercentage < 0) {
    keyFindings.push(`Revenue declining (${dataset.totals.deltaPercentage}%) - investigate traffic sources and product performance`);
  } else if (dataset.totals.deltaPercentage > 10) {
    keyFindings.push(`Strong revenue growth (${dataset.totals.deltaPercentage}%) - scale successful strategies`);
  }
  
  // Funnel analysis
  const purchaseStage = funnel.stages.find(s => s.stage === "purchase");
  if (purchaseStage && purchaseStage.dropoffRate > 60) {
    keyFindings.push(`High checkout dropoff (${purchaseStage.dropoffRate}%) - simplify checkout process`);
  }
  
  // Product performance
  if (dataset.laggards.length > 0) {
    keyFindings.push(`${dataset.laggards.length} products underperforming - review pricing and positioning`);
  }
  
  const recommendations: string[] = [];
  
  // High-priority funnel insights
  const highPriorityInsights = funnel.insights.filter(i => i.severity === "high");
  highPriorityInsights.forEach(insight => {
    recommendations.push(`${insight.title}: ${insight.recommendation}`);
  });
  
  // Top experiment recommendations
  const topExperiments = experiments.prioritized.slice(0, 3);
  topExperiments.forEach(experiment => {
    recommendations.push(`Run ${experiment.type.replace('_', ' ')} experiment: ${experiment.title}`);
  });
  
  // Channel optimization
  const topChannel = dataset.channelBreakdown.reduce((prev, current) => 
    current.percentage > prev.percentage ? current : prev
  );
  recommendations.push(`Optimize ${topChannel.channel} channel (${topChannel.percentage}% of revenue)`);
  
  const experimentPriorities: string[] = experiments.prioritized.map(exp => 
    `${exp.priority}. ${exp.title} (${exp.type.replace('_', ' ')})`
  );
  
  return {
    summary,
    keyFindings,
    recommendations,
    experimentPriorities,
  };
}
