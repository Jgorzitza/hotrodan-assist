/**
 * SEO Live Metrics API - Dashboard Integration
 *
 * Provides real-time SEO metrics from GA4, GSC, and Bing connectors
 * with caching and error handling for optimal dashboard performance.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

// Types for live SEO metrics
export interface LiveSeoMetrics {
  timestamp: string;
  status: "success" | "partial" | "error";
  sources: {
    ga4: SourceStatus;
    gsc: SourceStatus;
    bing: SourceStatus;
  };
  traffic: TrafficMetrics;
  search: SearchMetrics;
  rankings: RankingMetrics;
  health: HealthMetrics;
  cache_info: CacheInfo;
}

export interface SourceStatus {
  available: boolean;
  healthy: boolean;
  last_updated: string | null;
  error_message?: string;
}

export interface TrafficMetrics {
  active_users: number;
  sessions: number;
  engagement_rate: number;
  conversions: number;
  bounce_rate: number;
  avg_session_duration: number;
  trend: "up" | "down" | "stable";
  change_percentage: number;
}

export interface SearchMetrics {
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_position: number;
  top_queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  indexed_pages: number;
  crawl_errors: number;
}

export interface RankingMetrics {
  keywords_tracked: number;
  keywords_top_3: number;
  keywords_top_10: number;
  keywords_top_50: number;
  avg_position: number;
  position_improvements: number;
  position_drops: number;
}

export interface HealthMetrics {
  core_web_vitals_score: number;
  seo_health_score: number;
  issues_critical: number;
  issues_warning: number;
  issues_info: number;
  sitemap_status: "healthy" | "warning" | "error";
  mobile_friendly: boolean;
}

export interface CacheInfo {
  cached: boolean;
  cache_age_seconds: number;
  cache_expires_in_seconds: number;
  next_refresh_at: string;
}

// In-memory cache with TTL
interface CacheEntry {
  data: LiveSeoMetrics;
  timestamp: number;
  expires_at: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_REFRESH_THRESHOLD_MS = 4 * 60 * 1000; // Refresh after 4 minutes

/**
 * Call Python SEO API to fetch live metrics
 */
async function fetchLiveMetricsFromPython(
  days: number = 30
): Promise<LiveSeoMetrics> {
  const pythonApiUrl = process.env.SEO_API_URL || "http://localhost:8000";
  const apiKey = process.env.SEO_API_KEY;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    // Call the Python SEO API dashboard endpoint
    const response = await fetch(
      `${pythonApiUrl}/api/seo/dashboard?days=${days}`,
      {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Python API response to dashboard format
    return transformPythonResponse(data);
  } catch (error) {
    console.error("[SEO Live Metrics] Error fetching from Python API:", error);

    // Return fallback data on error
    return getFallbackMetrics(error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Transform Python API response to TypeScript dashboard format
 */
function transformPythonResponse(pythonData: any): LiveSeoMetrics {
  const timestamp = new Date().toISOString();

  // Extract GA4 data
  const ga4Data = pythonData.ga4 || {};
  const ga4Available = ga4Data.status === "success";

  // Extract GSC data
  const gscData = pythonData.gsc || {};
  const gscAvailable = gscData.status === "success";

  // Extract Bing data
  const bingData = pythonData.bing || {};
  const bingAvailable = bingData.status === "success";

  // Determine overall status
  const availableCount = [ga4Available, gscAvailable, bingAvailable].filter(Boolean).length;
  const status = availableCount === 3 ? "success" : availableCount > 0 ? "partial" : "error";

  return {
    timestamp,
    status,
    sources: {
      ga4: {
        available: ga4Available,
        healthy: ga4Available,
        last_updated: ga4Data.last_updated || timestamp,
        error_message: ga4Data.error,
      },
      gsc: {
        available: gscAvailable,
        healthy: gscAvailable,
        last_updated: gscData.last_updated || timestamp,
        error_message: gscData.error,
      },
      bing: {
        available: bingAvailable,
        healthy: bingAvailable,
        last_updated: bingData.last_updated || timestamp,
        error_message: bingData.error,
      },
    },
    traffic: {
      active_users: ga4Data.active_users || 0,
      sessions: ga4Data.sessions || 0,
      engagement_rate: ga4Data.engagement_rate || 0,
      conversions: ga4Data.conversions || 0,
      bounce_rate: ga4Data.bounce_rate || 0,
      avg_session_duration: ga4Data.avg_session_duration || 0,
      trend: ga4Data.traffic_trend || "stable",
      change_percentage: ga4Data.traffic_change_pct || 0,
    },
    search: {
      total_impressions: gscData.total_impressions || 0,
      total_clicks: gscData.total_clicks || 0,
      avg_ctr: gscData.avg_ctr || 0,
      avg_position: gscData.avg_position || 0,
      top_queries: gscData.top_queries || [],
      indexed_pages: gscData.indexed_pages || 0,
      crawl_errors: gscData.crawl_errors || 0,
    },
    rankings: {
      keywords_tracked: bingData.keywords_tracked || 0,
      keywords_top_3: bingData.keywords_top_3 || 0,
      keywords_top_10: bingData.keywords_top_10 || 0,
      keywords_top_50: bingData.keywords_top_50 || 0,
      avg_position: bingData.avg_position || 0,
      position_improvements: bingData.position_improvements || 0,
      position_drops: bingData.position_drops || 0,
    },
    health: {
      core_web_vitals_score: pythonData.health_score?.cwv_score || 0,
      seo_health_score: pythonData.health_score?.overall || 0,
      issues_critical: pythonData.issues?.critical || 0,
      issues_warning: pythonData.issues?.warning || 0,
      issues_info: pythonData.issues?.info || 0,
      sitemap_status: gscData.sitemap_status || "healthy",
      mobile_friendly: pythonData.mobile_friendly !== false,
    },
    cache_info: {
      cached: false,
      cache_age_seconds: 0,
      cache_expires_in_seconds: CACHE_TTL_MS / 1000,
      next_refresh_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    },
  };
}

/**
 * Get fallback metrics when live data is unavailable
 */
function getFallbackMetrics(errorMessage: string): LiveSeoMetrics {
  const timestamp = new Date().toISOString();

  return {
    timestamp,
    status: "error",
    sources: {
      ga4: {
        available: false,
        healthy: false,
        last_updated: null,
        error_message: errorMessage,
      },
      gsc: {
        available: false,
        healthy: false,
        last_updated: null,
        error_message: errorMessage,
      },
      bing: {
        available: false,
        healthy: false,
        last_updated: null,
        error_message: errorMessage,
      },
    },
    traffic: {
      active_users: 0,
      sessions: 0,
      engagement_rate: 0,
      conversions: 0,
      bounce_rate: 0,
      avg_session_duration: 0,
      trend: "stable",
      change_percentage: 0,
    },
    search: {
      total_impressions: 0,
      total_clicks: 0,
      avg_ctr: 0,
      avg_position: 0,
      top_queries: [],
      indexed_pages: 0,
      crawl_errors: 0,
    },
    rankings: {
      keywords_tracked: 0,
      keywords_top_3: 0,
      keywords_top_10: 0,
      keywords_top_50: 0,
      avg_position: 0,
      position_improvements: 0,
      position_drops: 0,
    },
    health: {
      core_web_vitals_score: 0,
      seo_health_score: 0,
      issues_critical: 0,
      issues_warning: 0,
      issues_info: 0,
      sitemap_status: "error",
      mobile_friendly: false,
    },
    cache_info: {
      cached: false,
      cache_age_seconds: 0,
      cache_expires_in_seconds: 0,
      next_refresh_at: timestamp,
    },
  };
}

/**
 * Get cached metrics or fetch fresh data
 */
async function getCachedMetrics(
  cacheKey: string,
  days: number,
  forceRefresh: boolean = false
): Promise<LiveSeoMetrics> {
  const now = Date.now();
  const cached = cache.get(cacheKey);

  // Return cached data if valid and not forced refresh
  if (!forceRefresh && cached && cached.expires_at > now) {
    const cacheAgeSeconds = Math.floor((now - cached.timestamp) / 1000);
    const cacheExpiresInSeconds = Math.floor((cached.expires_at - now) / 1000);

    return {
      ...cached.data,
      cache_info: {
        cached: true,
        cache_age_seconds: cacheAgeSeconds,
        cache_expires_in_seconds: cacheExpiresInSeconds,
        next_refresh_at: new Date(cached.expires_at).toISOString(),
      },
    };
  }

  // Fetch fresh data
  const metrics = await fetchLiveMetricsFromPython(days);

  // Cache the result
  cache.set(cacheKey, {
    data: metrics,
    timestamp: now,
    expires_at: now + CACHE_TTL_MS,
  });

  // Clean up old cache entries
  for (const [key, entry] of cache.entries()) {
    if (entry.expires_at < now) {
      cache.delete(key);
    }
  }

  return metrics;
}

/**
 * GET /api/seo/live-metrics - Fetch live SEO metrics for dashboard
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Parse query parameters
  const days = parseInt(url.searchParams.get("days") || "30");
  const forceRefresh = url.searchParams.get("refresh") === "true";

  // Validate parameters
  if (days < 1 || days > 365) {
    return json(
      { error: "days parameter must be between 1 and 365" },
      { status: 400 }
    );
  }

  try {
    // Generate cache key based on parameters
    const cacheKey = `live-metrics:${days}`;

    // Get metrics (cached or fresh)
    const metrics = await getCachedMetrics(cacheKey, days, forceRefresh);

    // Return with appropriate cache headers
    const cacheControl = forceRefresh
      ? "no-cache, no-store, must-revalidate"
      : `private, max-age=${CACHE_REFRESH_THRESHOLD_MS / 1000}`;

    return json(metrics, {
      headers: {
        "Cache-Control": cacheControl,
        "X-Cache-Status": metrics.cache_info.cached ? "HIT" : "MISS",
        "X-Data-Status": metrics.status,
      },
    });
  } catch (error) {
    console.error("[SEO Live Metrics] Loader error:", error);

    return json(
      getFallbackMetrics(error instanceof Error ? error.message : "Unknown error"),
      {
        status: 200, // Return 200 with error state to allow UI to handle gracefully
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Cache-Status": "ERROR",
          "X-Data-Status": "error",
        },
      }
    );
  }
};