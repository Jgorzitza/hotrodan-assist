/**
 * Simple caching layer for Shopify API responses
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const shopifyCache = new SimpleCache();

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = shopifyCache.get<T>(key);
  if (cached !== null) {
    console.log(`📦 Cache HIT: ${key}`);
    return cached;
  }

  console.log(`🔍 Cache MISS: ${key}`);
  const data = await fetcher();
  shopifyCache.set(key, data, ttl);
  return data;
}
