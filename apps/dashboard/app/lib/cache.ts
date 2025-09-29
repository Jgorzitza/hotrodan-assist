export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version: string;
  etag?: string;
};

export type CacheOptions = {
  ttl?: number; // Default TTL in milliseconds
  version?: string; // Cache version for invalidation
  etag?: string; // ETag for conditional requests
  staleWhileRevalidate?: boolean; // Serve stale data while revalidating
};

export type CacheConfig = {
  defaultTTL: number;
  maxAge: number;
  staleWhileRevalidate: boolean;
  version: string;
};

export type RevalidationStrategy = 
  | "immediate" // Revalidate immediately
  | "background" // Revalidate in background
  | "on-demand" // Revalidate only when requested
  | "interval"; // Revalidate at intervals

export type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  revalidations: number;
  size: number;
  hitRate: number;
};

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    revalidations: 0,
    size: 0,
    hitRate: 0,
  };
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxAge: 30 * 60 * 1000, // 30 minutes
    staleWhileRevalidate: true,
    version: "1.0.0",
  };
  private revalidationQueue = new Set<string>();
  private intervalId?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.startCleanupInterval();
  }

  set<T>(key: string, data: T, options?: CacheOptions): void {
    const now = Date.now();
    const ttl = options?.ttl ?? this.config.defaultTTL;
    
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      version: options?.version ?? this.config.version,
      etag: options?.etag,
    });

    this.updateStats();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    const isStale = now - entry.timestamp > this.config.maxAge;

    if (isExpired && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    if (isStale && this.config.staleWhileRevalidate) {
      this.scheduleRevalidation(key);
    }

    this.stats.hits++;
    this.updateStats();
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;
    
    if (isExpired && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.evictions++;
      this.updateStats();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      revalidations: 0,
      size: 0,
      hitRate: 0,
    };
  }

  invalidate(pattern?: string): number {
    let count = 0;
    
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }
    } else {
      count = this.cache.size;
      this.cache.clear();
    }

    this.stats.evictions += count;
    this.updateStats();
    return count;
  }

  invalidateByVersion(version: string): number {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.version !== version) {
        this.cache.delete(key);
        count++;
      }
    }

    this.stats.evictions += count;
    this.updateStats();
    return count;
  }

  scheduleRevalidation(key: string): void {
    if (this.revalidationQueue.has(key)) return;
    
    this.revalidationQueue.add(key);
    
    // Revalidate in background
    setTimeout(() => {
      this.revalidate(key);
    }, 0);
  }

  async revalidate(key: string): Promise<boolean> {
    if (!this.revalidationQueue.has(key)) return false;
    
    this.revalidationQueue.delete(key);
    this.stats.revalidations++;
    this.updateStats();
    
    // Emit revalidation event
    this.emitRevalidationEvent(key);
    
    return true;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private startCleanupInterval(): void {
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now - entry.timestamp > entry.ttl;
      const isMaxAge = now - entry.timestamp > this.config.maxAge;
      
      if (isExpired && !this.config.staleWhileRevalidate) {
        this.cache.delete(key);
        cleaned++;
      } else if (isMaxAge && this.config.staleWhileRevalidate) {
        this.scheduleRevalidation(key);
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.updateStats();
    }
  }

  private emitRevalidationEvent(key: string): void {
    // Emit custom event for revalidation
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cache-revalidation", {
        detail: { key, timestamp: Date.now() }
      }));
    }
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.cache.clear();
    this.revalidationQueue.clear();
  }
}

// Global cache instance
export const dashboardCache = new DashboardCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxAge: 30 * 60 * 1000, // 30 minutes
  staleWhileRevalidate: true,
  version: "1.0.0",
});

// Cache key generators
export const cacheKeys = {
  metrics: (range: string, compare?: string) => 
    `metrics:${range}${compare ? `:compare:${compare}` : ""}`,
  cohort: (range: string) => `cohort:${range}`,
  presets: () => "presets:all",
  user: (id: string) => `user:${id}`,
  dashboard: (range: string, compare?: string) => 
    `dashboard:${range}${compare ? `:compare:${compare}` : ""}`,
};

// Cache utilities
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(":")}`;
}

export function isCacheValid(entry: CacheEntry<any>): boolean {
  const now = Date.now();
  return now - entry.timestamp <= entry.ttl;
}

export function isCacheStale(entry: CacheEntry<any>, maxAge?: number): boolean {
  const now = Date.now();
  const age = now - entry.timestamp;
  return age > (maxAge ?? 30 * 60 * 1000); // Default 30 minutes
}

export function shouldRevalidate(entry: CacheEntry<any>): boolean {
  return isCacheStale(entry) && !isCacheValid(entry);
}

// Cache middleware for API calls
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cached = dashboardCache.get<T>(key);
  
  if (cached && !shouldRevalidate(dashboardCache.cache.get(key)!)) {
    return cached;
  }

  try {
    const data = await fetcher();
    dashboardCache.set(key, data, options);
    return data;
  } catch (error) {
    // If we have stale data, return it
    if (cached && dashboardCache.config.staleWhileRevalidate) {
      return cached;
    }
    throw error;
  }
}

// Cache invalidation helpers
export function invalidateMetricsCache(range?: string): void {
  if (range) {
    dashboardCache.delete(cacheKeys.metrics(range));
  } else {
    dashboardCache.invalidate(/^metrics:/);
  }
}

export function invalidateCohortCache(range?: string): void {
  if (range) {
    dashboardCache.delete(cacheKeys.cohort(range));
  } else {
    dashboardCache.invalidate(/^cohort:/);
  }
}

export function invalidateDashboardCache(): void {
  dashboardCache.invalidate(/^dashboard:/);
}

export function invalidateAllCache(): void {
  dashboardCache.clear();
}

// Cache warming
export async function warmCache(keys: string[], fetchers: (() => Promise<any>)[]): Promise<void> {
  const promises = keys.map(async (key, index) => {
    try {
      const data = await fetchers[index]();
      dashboardCache.set(key, data);
    } catch (error) {
      console.warn(`Failed to warm cache for key ${key}:`, error);
    }
  });

  await Promise.allSettled(promises);
}

// Cache persistence (localStorage)
export function persistCache(): void {
  if (typeof window === "undefined") return;

  try {
    const cacheData = Array.from(dashboardCache.cache.entries());
    localStorage.setItem("dashboard-cache", JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to persist cache:", error);
  }
}

export function restoreCache(): void {
  if (typeof window === "undefined") return;

  try {
    const cacheData = localStorage.getItem("dashboard-cache");
    if (!cacheData) return;

    const entries = JSON.parse(cacheData);
    for (const [key, entry] of entries) {
      // Only restore if not expired
      if (isCacheValid(entry)) {
        dashboardCache.cache.set(key, entry);
      }
    }
  } catch (error) {
    console.warn("Failed to restore cache:", error);
  }
}

// Auto-persist on changes
if (typeof window !== "undefined") {
  // Persist cache every 30 seconds
  setInterval(persistCache, 30000);
  
  // Restore cache on load
  restoreCache();
}
