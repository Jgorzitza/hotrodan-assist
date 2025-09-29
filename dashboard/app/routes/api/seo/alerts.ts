/**
 * SEO Alerts API Routes
 * 
 * Provides API endpoints for SEO monitoring alerts and notifications
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";

// Alert Types
export type AlertType = 'new_opportunity' | 'ranking_change' | 'competitor_update' | 'technical_issue' | 'performance_drop';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SEOAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  domain: string;
  affected_keywords: string[];
  metric_changes: Record<string, number>;
  created_at: string;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, any>;
}

// Mock alerts data
const mockAlerts: SEOAlert[] = [
  {
    id: "alert_1",
    type: "new_opportunity",
    severity: "high",
    title: "New High-Value Keyword Opportunity",
    description: "Competitor 'hotrodparts.com' started ranking for 'LS engine swap guide' - high search volume (8,500/month)",
    domain: "hotrodparts.com",
    affected_keywords: ["ls engine swap guide", "engine swap tutorial"],
    metric_changes: {
      search_volume: 8500,
      opportunity_score: 87.5,
      roi_estimate: 245.0
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    acknowledged: false,
    resolved: false,
    metadata: {
      competitor_rank: 12,
      our_current_rank: null,
      content_suggestion: "Create comprehensive LS swap guide with video tutorials"
    }
  },
  {
    id: "alert_2",
    type: "ranking_change",
    severity: "medium",
    title: "Ranking Drop Detected",
    description: "Keyword 'custom hot rod builds' dropped from position 8 to 15 in search results",
    domain: "hotrodan.com",
    affected_keywords: ["custom hot rod builds"],
    metric_changes: {
      ranking_position: -7,
      estimated_traffic_loss: -23.5
    },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    acknowledged: true,
    resolved: false,
    metadata: {
      previous_rank: 8,
      current_rank: 15,
      competitors_gaining: ["competitor1.com", "competitor2.com"]
    }
  }
];

// GET /api/seo/alerts - List SEO alerts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  // Parse query parameters
  const severity = url.searchParams.get("severity") || "all";
  const type = url.searchParams.get("type") || "all";
  const status = url.searchParams.get("status") || "active"; // active, acknowledged, resolved, all
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const domain = url.searchParams.get("domain") || "all";
  
  // Filter alerts
  let filteredAlerts = mockAlerts;
  
  if (severity !== "all") {
    filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
  }
  
  if (type !== "all") {
    filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
  }
  
  if (domain !== "all") {
    filteredAlerts = filteredAlerts.filter(alert => alert.domain === domain);
  }
  
  if (status === "active") {
    filteredAlerts = filteredAlerts.filter(alert => !alert.resolved);
  } else if (status === "acknowledged") {
    filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged && !alert.resolved);
  } else if (status === "resolved") {
    filteredAlerts = filteredAlerts.filter(alert => alert.resolved);
  }
  
  // Sort by creation date (newest first)
  filteredAlerts.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Apply limit
  const paginatedAlerts = filteredAlerts.slice(0, limit);
  
  // Calculate summary statistics
  const summary = {
    total_alerts: mockAlerts.length,
    active_alerts: mockAlerts.filter(alert => !alert.resolved).length,
    acknowledged_alerts: mockAlerts.filter(alert => alert.acknowledged && !alert.resolved).length,
    resolved_alerts: mockAlerts.filter(alert => alert.resolved).length,
    critical_alerts: mockAlerts.filter(alert => alert.severity === "critical" && !alert.resolved).length,
    high_alerts: mockAlerts.filter(alert => alert.severity === "high" && !alert.resolved).length,
    medium_alerts: mockAlerts.filter(alert => alert.severity === "medium" && !alert.resolved).length,
    low_alerts: mockAlerts.filter(alert => alert.severity === "low" && !alert.resolved).length,
  };
  
  return json({
    alerts: paginatedAlerts,
    summary,
    pagination: {
      total: filteredAlerts.length,
      limit,
      offset: 0,
      hasMore: filteredAlerts.length > limit
    }
  });
};

// POST /api/seo/alerts - Manage alerts (acknowledge, resolve)
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  
  try {
    const body = await request.json();
    const actionType = body.action; // acknowledge, resolve
    
    if (!body.alertId) {
      return json({ error: "alertId is required" }, { status: 400 });
    }
    
    // Find the alert
    const alertIndex = mockAlerts.findIndex(alert => alert.id === body.alertId);
    if (alertIndex === -1) {
      return json({ error: "Alert not found" }, { status: 404 });
    }
    
    const alert = mockAlerts[alertIndex];
    
    // Perform action
    if (actionType === "acknowledge") {
      alert.acknowledged = true;
    } else if (actionType === "resolve") {
      alert.resolved = true;
      alert.acknowledged = true;
    } else {
      return json({ error: "Invalid action. Must be 'acknowledge' or 'resolve'" }, { status: 400 });
    }
    
    // TODO: In real implementation, this would update the database
    
    return json({
      success: true,
      alert,
      message: `Alert ${actionType}d successfully`
    });
    
  } catch (error) {
    console.error("Error managing alert:", error);
    
    return json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
};
