import type { InventorySkuDemand, VelocityDecile } from "../../types/dashboard";
import { calculateVelocityDeciles } from "./math";

/**
 * Performance-optimized inventory calculations for large datasets
 * Designed to handle 1000+ SKUs efficiently
 */

export type PerformanceConfig = {
  maxConcurrentCalculations: number;
  cacheSize: number;
  batchSize: number;
  enableCaching: boolean;
};

export type CachedCalculation = {
  key: string;
  result: any;
  timestamp: number;
  ttl: number;
};

/**
 * In-memory cache for expensive calculations
 */
class CalculationCache {
  private cache = new Map<string, CachedCalculation>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.result;
  }

  set(key: string, result: any, ttl: number = 300000): void { // 5 minutes default
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value || "";
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Optimized velocity decile calculation with caching
 */
export class OptimizedVelocityAnalyzer {
  private cache: CalculationCache;
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.cache = new CalculationCache(config.cacheSize);
  }

  /**
   * Calculate velocity deciles with caching and batching
   */
  async calculateVelocityDecilesOptimized(
    skus: InventorySkuDemand[],
    useCache: boolean = true
  ): Promise<VelocityDecile[]> {
    const cacheKey = `velocity_deciles_${skus.length}_${this.hashSkus(skus)}`;
    
    if (useCache && this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Calculate deciles for the entire dataset (not in batches)
    const deciles = calculateVelocityDeciles(skus);

    if (this.config.enableCaching) {
      this.cache.set(cacheKey, deciles, 600000); // 10 minutes cache
    }

    return deciles;
  }

  /**
   * Create a hash for SKU data to use as cache key
   */
  private hashSkus(skus: InventorySkuDemand[]): string {
    const data = skus.map(sku => `${sku.id}-${sku.velocity.lastWeekUnits}`).join('|');
    return this.simpleHash(data);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: this.config.cacheSize,
    };
  }
}

/**
 * Optimized reorder point calculator with batching
 */
export class OptimizedReorderCalculator {
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  /**
   * Calculate reorder points for large SKU sets efficiently
   */
  async calculateReorderPointsBatch(
    skus: InventorySkuDemand[],
    serviceLevel: number = 0.95
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    // Process in parallel batches
    const batches = this.createBatches(skus, this.config.batchSize);
    const batchPromises = batches.map(batch => 
      this.processBatch(batch, serviceLevel)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Combine results
    batchResults.forEach(batchResult => {
      batchResult.forEach((value, key) => {
        results.set(key, value);
      });
    });
    
    return results;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    skus: InventorySkuDemand[],
    serviceLevel: number
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    // Process each SKU in the batch
    for (const sku of skus) {
      const reorderPoint = this.calculateSingleReorderPoint(sku, serviceLevel);
      results.set(sku.id, reorderPoint);
    }
    
    return results;
  }

  private calculateSingleReorderPoint(
    sku: InventorySkuDemand,
    serviceLevel: number
  ): number {
    // Use existing ROP calculation logic
    const dailySales = sku.velocity.lastWeekUnits / 7;
    const leadTimeDays = 30; // Default, should come from vendor data
    const demandStdDev = this.estimateDemandStandardDeviation(sku);
    
    const zScore = this.getZScore(serviceLevel);
    const leadTimeDemand = dailySales * leadTimeDays;
    const safetyStock = zScore * demandStdDev * Math.sqrt(leadTimeDays);
    
    return Math.ceil(leadTimeDemand + safetyStock);
  }

  private estimateDemandStandardDeviation(sku: InventorySkuDemand): number {
    // Use trend data to estimate standard deviation
    const trendValues = sku.trend.map(point => point.units);
    if (trendValues.length < 2) return 0;
    
    const mean = trendValues.reduce((sum, val) => sum + val, 0) / trendValues.length;
    const variance = trendValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (trendValues.length - 1);
    return Math.sqrt(variance);
  }

  private getZScore(serviceLevel: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.28, 0.95: 1.65, 0.99: 2.33,
    };
    return zScores[serviceLevel] || 1.65;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(value);
  }

  getAverageTime(operation: string): number {
    const values = this.metrics.get(operation) || [];
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getMetrics(): Record<string, { average: number; count: number; max: number; min: number }> {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((values, operation) => {
      result[operation] = {
        average: this.getAverageTime(operation),
        count: values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      };
    });
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Default performance configuration for production
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxConcurrentCalculations: 10,
  cacheSize: 1000,
  batchSize: 100,
  enableCaching: true,
};
