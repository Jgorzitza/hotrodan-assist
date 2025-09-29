import { dashboardCache, cacheKeys, withCache, type CacheOptions } from "./cache";
import type { EnhancedMetricData } from "~/components/EnhancedMetricCard";
import type { CohortData } from "~/components/CohortAnalysis";

export type DataServiceConfig = {
  baseUrl: string;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
};

export type ApiResponse<T> = {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
  etag?: string;
};

export type MetricsRequest = {
  range: string;
  compare?: string;
  filters?: Record<string, any>;
};

export type CohortRequest = {
  range: string;
  cohortType?: "signup" | "purchase" | "custom";
  filters?: Record<string, any>;
};

export type PresetRequest = {
  userId?: string;
  includePublic?: boolean;
};

class DataService {
  private config: DataServiceConfig;

  constructor(config: Partial<DataServiceConfig> = {}) {
    this.config = {
      baseUrl: "/api",
      timeout: 30000,
      retries: 3,
      cacheEnabled: true,
      ...config,
    };
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    retries = this.config.retries
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const etag = response.headers.get("etag") || undefined;

      return {
        data,
        success: true,
        timestamp: Date.now(),
        etag,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && this.isRetryableError(error)) {
        // Exponential backoff
        const delay = Math.pow(2, this.config.retries - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  private isRetryableError(error: any): boolean {
    if (error.name === "AbortError") return false;
    if (error.message?.includes("HTTP 5")) return true;
    if (error.message?.includes("NetworkError")) return true;
    return false;
  }

  // Metrics API
  async getMetrics(request: MetricsRequest): Promise<ApiResponse<EnhancedMetricData[]>> {
    const { range, compare, filters } = request;
    const url = new URL(`${this.config.baseUrl}/metrics`);
    
    url.searchParams.set("range", range);
    if (compare) url.searchParams.set("compare", compare);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const cacheKey = cacheKeys.metrics(range, compare);
    const cacheOptions: CacheOptions = {
      ttl: 5 * 60 * 1000, // 5 minutes
      version: "1.0.0",
    };

    if (this.config.cacheEnabled) {
      return withCache(cacheKey, () => this.fetchWithRetry<EnhancedMetricData[]>(url.toString()), cacheOptions);
    }

    return this.fetchWithRetry<EnhancedMetricData[]>(url.toString());
  }

  // Cohort API
  async getCohortData(request: CohortRequest): Promise<ApiResponse<CohortData[]>> {
    const { range, cohortType = "signup", filters } = request;
    const url = new URL(`${this.config.baseUrl}/cohort`);
    
    url.searchParams.set("range", range);
    url.searchParams.set("cohortType", cohortType);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const cacheKey = cacheKeys.cohort(range);
    const cacheOptions: CacheOptions = {
      ttl: 10 * 60 * 1000, // 10 minutes
      version: "1.0.0",
    };

    if (this.config.cacheEnabled) {
      return withCache(cacheKey, () => this.fetchWithRetry<CohortData[]>(url.toString()), cacheOptions);
    }

    return this.fetchWithRetry<CohortData[]>(url.toString());
  }

  // Presets API
  async getPresets(request: PresetRequest = {}): Promise<ApiResponse<any[]>> {
    const { userId, includePublic = true } = request;
    const url = new URL(`${this.config.baseUrl}/presets`);
    
    if (userId) url.searchParams.set("userId", userId);
    url.searchParams.set("includePublic", String(includePublic));

    const cacheKey = cacheKeys.presets();
    const cacheOptions: CacheOptions = {
      ttl: 15 * 60 * 1000, // 15 minutes
      version: "1.0.0",
    };

    if (this.config.cacheEnabled) {
      return withCache(cacheKey, () => this.fetchWithRetry<any[]>(url.toString()), cacheOptions);
    }

    return this.fetchWithRetry<any[]>(url.toString());
  }

  // Dashboard data (combined)
  async getDashboardData(request: MetricsRequest): Promise<ApiResponse<{
    metrics: EnhancedMetricData[];
    cohort: CohortData[];
    insights: any;
  }>> {
    const { range, compare, filters } = request;
    const url = new URL(`${this.config.baseUrl}/dashboard`);
    
    url.searchParams.set("range", range);
    if (compare) url.searchParams.set("compare", compare);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const cacheKey = cacheKeys.dashboard(range, compare);
    const cacheOptions: CacheOptions = {
      ttl: 3 * 60 * 1000, // 3 minutes
      version: "1.0.0",
    };

    if (this.config.cacheEnabled) {
      return withCache(cacheKey, () => this.fetchWithRetry(url.toString()), cacheOptions);
    }

    return this.fetchWithRetry(url.toString());
  }

  // Cache management
  invalidateMetrics(range?: string, compare?: string): void {
    if (range) {
      dashboardCache.delete(cacheKeys.metrics(range, compare));
    } else {
      dashboardCache.invalidate(/^metrics:/);
    }
  }

  invalidateCohort(range?: string): void {
    if (range) {
      dashboardCache.delete(cacheKeys.cohort(range));
    } else {
      dashboardCache.invalidate(/^cohort:/);
    }
  }

  invalidatePresets(): void {
    dashboardCache.delete(cacheKeys.presets());
  }

  invalidateDashboard(range?: string, compare?: string): void {
    if (range) {
      dashboardCache.delete(cacheKeys.dashboard(range, compare));
    } else {
      dashboardCache.invalidate(/^dashboard:/);
    }
  }

  invalidateAll(): void {
    dashboardCache.clear();
  }

  // Batch operations
  async getBatchData(requests: {
    metrics?: MetricsRequest;
    cohort?: CohortRequest;
    presets?: PresetRequest;
  }): Promise<{
    metrics?: ApiResponse<EnhancedMetricData[]>;
    cohort?: ApiResponse<CohortData[]>;
    presets?: ApiResponse<any[]>;
  }> {
    const promises: Promise<any>[] = [];
    const keys: string[] = [];

    if (requests.metrics) {
      promises.push(this.getMetrics(requests.metrics));
      keys.push("metrics");
    }

    if (requests.cohort) {
      promises.push(this.getCohortData(requests.cohort));
      keys.push("cohort");
    }

    if (requests.presets) {
      promises.push(this.getPresets(requests.presets));
      keys.push("presets");
    }

    const results = await Promise.allSettled(promises);
    const response: any = {};

    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === "fulfilled") {
        response[key] = result.value;
      } else {
        response[key] = {
          data: null,
          success: false,
          error: result.reason?.message || "Unknown error",
          timestamp: Date.now(),
        };
      }
    });

    return response;
  }

  // Prefetch data
  async prefetchData(requests: {
    metrics?: MetricsRequest;
    cohort?: CohortRequest;
    presets?: PresetRequest;
  }): Promise<void> {
    const promises: Promise<any>[] = [];

    if (requests.metrics) {
      promises.push(this.getMetrics(requests.metrics));
    }

    if (requests.cohort) {
      promises.push(this.getCohortData(requests.cohort));
    }

    if (requests.presets) {
      promises.push(this.getPresets(requests.presets));
    }

    await Promise.allSettled(promises);
  }

  // Update configuration
  updateConfig(config: Partial<DataServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): DataServiceConfig {
    return { ...this.config };
  }
}

// Default instance
export const dataService = new DataService();

// Factory function for creating custom instances
export function createDataService(config: Partial<DataServiceConfig>): DataService {
  return new DataService(config);
}

// Utility functions
export async function prefetchDashboardData(range: string, compare?: string): Promise<void> {
  await dataService.prefetchData({
    metrics: { range, compare },
    cohort: { range },
    presets: { includePublic: true },
  });
}

export function invalidateDashboardCache(range?: string, compare?: string): void {
  dataService.invalidateDashboard(range, compare);
  dataService.invalidateMetrics(range, compare);
  dataService.invalidateCohort(range);
}

export function getCacheStats() {
  return dashboardCache.getStats();
}

export function getCacheConfig() {
  return dashboardCache.getConfig();
}

export function updateCacheConfig(config: Partial<typeof dashboardCache.config>) {
  dashboardCache.updateConfig(config);
}
