/**
 * SEO Performance Tracking API Routes
 * 
 * Provides API endpoints for performance tracking, ROI measurement,
 * and content performance analytics
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";

// Performance Types
export interface PerformanceMetric {
  id: string;
  metric_type: 'ranking' | 'traffic' | 'conversion' | 'engagement' | 'technical';
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ContentPerformance {
  content_id: string;
  url: string;
  title: string;
  target_keywords: string[];
  created_at: string;
  last_updated: string;
  organic_traffic: PerformanceMetric[];
  ranking_positions: PerformanceMetric[];
  conversions: PerformanceMetric[];
  engagement_metrics: PerformanceMetric[];
  estimated_value: number;
  implementation_cost: number;
  roi_percentage: number;
  traffic_trend: 'up' | 'down' | 'stable';
  ranking_trend: 'up' | 'down' | 'stable';
  conversion_trend: 'up' | 'down' | 'stable';
}

export interface OpportunityPerformance {
  opportunity_id: string;
  title: string;
  target_keyword: string;
  implemented_at: string;
  baseline_traffic: number;
  baseline_ranking: number | null;
  baseline_conversions: number;
  current_traffic: number;
  current_ranking: number | null;
  current_conversions: number;
  traffic_growth: number;
  ranking_improvement: number | null;
  conversion_growth: number;
  implementation_cost: number;
  revenue_generated: number;
  roi_percentage: number;
  payback_period_days: number | null;
  is_successful: boolean;
  success_factors: string[];
  areas_for_improvement: string[];
}

export interface PerformanceSummary {
  period_start: string;
  period_end: string;
  total_opportunities_tracked: number;
  successful_opportunities: number;
  success_rate: number;
  total_traffic_growth: number;
  total_organic_traffic: number;
  traffic_growth_percentage: number;
  average_ranking_improvement: number;
  keywords_ranking_top_10: number;
  keywords_ranking_top_3: number;
  total_investment: number;
  total_revenue: number;
  overall_roi: number;
  top_performing_content: string[];
  top_performing_keywords: string[];
  recommendations: string[];
}

// Mock performance data
const mockOpportunityPerformance: OpportunityPerformance[] = [
  {
    opportunity_id: "opp_1",
    title: "LS Engine Swap Guide",
    target_keyword: "LS engine swap guide",
    implemented_at: "2025-01-01T00:00:00",
    baseline_traffic: 100,
    baseline_ranking: 25,
    baseline_conversions: 2,
    current_traffic: 800,
    current_ranking: 5,
    current_conversions: 15,
    traffic_growth: 700.0,
    ranking_improvement: 20,
    conversion_growth: 650.0,
    implementation_cost: 500,
    revenue_generated: 2500,
    roi_percentage: 400.0,
    payback_period_days: 73,
    is_successful: true,
    success_factors: ["High traffic growth", "Significant ranking improvement", "Strong conversion growth", "Excellent ROI"],
    areas_for_improvement: []
  },
  {
    opportunity_id: "opp_2",
    title: "Turbo Installation Tutorial",
    target_keyword: "turbo installation guide",
    implemented_at: "2025-01-15T00:00:00",
    baseline_traffic: 50,
    baseline_ranking: 40,
    baseline_conversions: 1,
    current_traffic: 300,
    current_ranking: 12,
    current_conversions: 8,
    traffic_growth: 500.0,
    ranking_improvement: 28,
    conversion_growth: 700.0,
    implementation_cost: 800,
    revenue_generated: 1800,
    roi_percentage: 125.0,
    payback_period_days: 162,
    is_successful: true,
    success_factors: ["High traffic growth", "Significant ranking improvement", "Strong conversion growth"],
    areas_for_improvement: ["Reduce implementation costs"]
  },
  {
    opportunity_id: "opp_3",
    title: "Custom Hot Rod Build Process",
    target_keyword: "custom hot rod build",
    implemented_at: "2025-02-01T00:00:00",
    baseline_traffic: 200,
    baseline_ranking: 18,
    baseline_conversions: 5,
    current_traffic: 250,
    current_ranking: 15,
    current_conversions: 6,
    traffic_growth: 25.0,
    ranking_improvement: 3,
    conversion_growth: 20.0,
    implementation_cost: 1200,
    revenue_generated: 900,
    roi_percentage: -25.0,
    payback_period_days: null,
    is_successful: false,
    success_factors: [],
    areas_for_improvement: ["Improve content optimization", "Focus on ranking improvement", "Optimize conversion funnel", "Reduce implementation costs"]
  }
];

const mockContentPerformance: ContentPerformance[] = [
  {
    content_id: "content_1",
    url: "https://hotrodan.com/ls-engine-swap-guide",
    title: "Complete LS Engine Swap Guide",
    target_keywords: ["ls engine swap", "engine swap guide", "LS swap tutorial"],
    created_at: "2025-01-01T00:00:00",
    last_updated: "2025-09-28T00:00:00",
    organic_traffic: [
      {
        id: "traffic_1",
        metric_type: "traffic",
        value: 800,
        timestamp: "2025-09-28T00:00:00"
      }
    ],
    ranking_positions: [
      {
        id: "ranking_1",
        metric_type: "ranking",
        value: 5,
        timestamp: "2025-09-28T00:00:00"
      }
    ],
    conversions: [
      {
        id: "conversion_1",
        metric_type: "conversion",
        value: 15,
        timestamp: "2025-09-28T00:00:00"
      }
    ],
    engagement_metrics: [
      {
        id: "engagement_1",
        metric_type: "engagement",
        value: 0.45,
        timestamp: "2025-09-28T00:00:00"
      }
    ],
    estimated_value: 2500,
    implementation_cost: 500,
    roi_percentage: 400.0,
    traffic_trend: "up",
    ranking_trend: "up",
    conversion_trend: "up"
  }
];

// GET /api/seo/performance - Get performance data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  // Parse query parameters
  const type = url.searchParams.get("type") || "opportunities"; // opportunities, content, summary
  const period = url.searchParams.get("period") || "30d"; // 7d, 30d, 90d, 1y
  const limit = parseInt(url.searchParams.get("limit") || "20");
  
  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }
  
  if (type === "opportunities") {
    // Filter opportunities by date range
    const filteredOpportunities = mockOpportunityPerformance.filter(opp => {
      const implementedDate = new Date(opp.implemented_at);
      return implementedDate >= startDate && implementedDate <= endDate;
    });
    
    // Apply limit
    const paginatedOpportunities = filteredOpportunities.slice(0, limit);
    
    // Calculate summary metrics
    const totalOpportunities = filteredOpportunities.length;
    const successfulOpportunities = filteredOpportunities.filter(opp => opp.is_successful).length;
    const successRate = totalOpportunities > 0 ? (successfulOpportunities / totalOpportunities) * 100 : 0;
    
    const totalTrafficGrowth = filteredOpportunities.reduce((sum, opp) => sum + opp.traffic_growth, 0);
    const totalInvestment = filteredOpportunities.reduce((sum, opp) => sum + opp.implementation_cost, 0);
    const totalRevenue = filteredOpportunities.reduce((sum, opp) => sum + opp.revenue_generated, 0);
    const overallROI = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
    
    return json({
      opportunities: paginatedOpportunities,
      summary: {
        total_opportunities: totalOpportunities,
        successful_opportunities,
        success_rate: successRate,
        total_traffic_growth: totalTrafficGrowth,
        total_investment: totalInvestment,
        total_revenue: totalRevenue,
        overall_roi: overallROI
      },
      pagination: {
        total: filteredOpportunities.length,
        limit,
        offset: 0,
        hasMore: filteredOpportunities.length > limit
      }
    });
  }
  
  if (type === "content") {
    return json({
      content: mockContentPerformance.slice(0, limit),
      pagination: {
        total: mockContentPerformance.length,
        limit,
        offset: 0,
        hasMore: mockContentPerformance.length > limit
      }
    });
  }
  
  if (type === "summary") {
    // Generate performance summary
    const summary: PerformanceSummary = {
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      total_opportunities_tracked: mockOpportunityPerformance.length,
      successful_opportunities: mockOpportunityPerformance.filter(opp => opp.is_successful).length,
      success_rate: (mockOpportunityPerformance.filter(opp => opp.is_successful).length / mockOpportunityPerformance.length) * 100,
      total_traffic_growth: mockOpportunityPerformance.reduce((sum, opp) => sum + opp.traffic_growth, 0),
      total_organic_traffic: mockOpportunityPerformance.reduce((sum, opp) => sum + opp.current_traffic, 0),
      traffic_growth_percentage: mockOpportunityPerformance.reduce((sum, opp) => sum + opp.traffic_growth, 0) / mockOpportunityPerformance.length,
      average_ranking_improvement: mockOpportunityPerformance
        .filter(opp => opp.ranking_improvement !== null)
        .reduce((sum, opp) => sum + (opp.ranking_improvement || 0), 0) / mockOpportunityPerformance.length,
      keywords_ranking_top_10: mockOpportunityPerformance.filter(opp => opp.current_ranking && opp.current_ranking <= 10).length,
      keywords_ranking_top_3: mockOpportunityPerformance.filter(opp => opp.current_ranking && opp.current_ranking <= 3).length,
      total_investment: mockOpportunityPerformance.reduce((sum, opp) => sum + opp.implementation_cost, 0),
      total_revenue: mockOpportunityPerformance.reduce((sum, opp) => sum + opp.revenue_generated, 0),
      overall_roi: ((mockOpportunityPerformance.reduce((sum, opp) => sum + opp.revenue_generated, 0) - 
                    mockOpportunityPerformance.reduce((sum, opp) => sum + opp.implementation_cost, 0)) / 
                   mockOpportunityPerformance.reduce((sum, opp) => sum + opp.implementation_cost, 0)) * 100,
      top_performing_content: mockOpportunityPerformance
        .sort((a, b) => b.traffic_growth - a.traffic_growth)
        .slice(0, 3)
        .map(opp => opp.title),
      top_performing_keywords: mockOpportunityPerformance
        .sort((a, b) => b.roi_percentage - a.roi_percentage)
        .slice(0, 3)
        .map(opp => opp.target_keyword),
      recommendations: [
        "Focus on High traffic growth - this was the most common success factor",
        "Address Reduce implementation costs - this was the most common improvement area",
        "Improve content optimization for opportunities with low traffic growth"
      ]
    };
    
    return json({ summary });
  }
  
  return json({ error: "Invalid type parameter" }, { status: 400 });
};

// POST /api/seo/performance - Track new performance data
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  
  try {
    const body = await request.json();
    const actionType = body.action; // track_content, track_opportunity
    
    if (actionType === "track_content") {
      // Track content performance
      const { content_id, metrics, timestamp } = body;
      
      if (!content_id || !metrics) {
        return json({ error: "content_id and metrics are required" }, { status: 400 });
      }
      
      // TODO: In real implementation, this would save to database
      
      return json({
        success: true,
        message: "Content performance tracked successfully",
        content_id
      });
    }
    
    if (actionType === "track_opportunity") {
      // Track opportunity performance
      const { opportunity_id, performance_data } = body;
      
      if (!opportunity_id || !performance_data) {
        return json({ error: "opportunity_id and performance_data are required" }, { status: 400 });
      }
      
      // TODO: In real implementation, this would save to database
      
      return json({
        success: true,
        message: "Opportunity performance tracked successfully",
        opportunity_id
      });
    }
    
    return json({ error: "Invalid action type" }, { status: 400 });
    
  } catch (error) {
    console.error("Error tracking performance:", error);
    
    return json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
};
