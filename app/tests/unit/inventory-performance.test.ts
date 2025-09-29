import { describe, expect, it, beforeEach } from "vitest";
import {
  OptimizedVelocityAnalyzer,
  OptimizedReorderCalculator,
  PerformanceMonitor,
  DEFAULT_PERFORMANCE_CONFIG,
} from "../../../apps/dashboard/app/lib/inventory/performance";
import type { InventorySkuDemand } from "../../../apps/dashboard/app/types/dashboard";

// Helper function to create mock SKU data
const createMockSku = (id: string, velocity: number): InventorySkuDemand => ({
  id,
  title: `Product ${id}`,
  sku: `SKU-${id}`,
  vendorId: `vendor-${Math.floor(Math.random() * 3) + 1}`,
  vendorName: `Vendor ${Math.floor(Math.random() * 3) + 1}`,
  status: "healthy",
  bucketId: "sea",
  onHand: Math.floor(Math.random() * 500) + 50,
  inbound: Math.floor(Math.random() * 100),
  committed: Math.floor(Math.random() * 50),
  coverDays: Math.floor(Math.random() * 30) + 7,
  safetyStock: Math.floor(Math.random() * 50) + 10,
  reorderPoint: Math.floor(Math.random() * 200) + 50,
  recommendedOrder: Math.floor(Math.random() * 100),
  stockoutDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  unitCost: {
    amount: Math.random() * 100 + 10,
    currency: "USD",
    formatted: "$" + (Math.random() * 100 + 10).toFixed(2),
  },
  velocity: {
    turnoverDays: Math.floor(Math.random() * 30) + 7,
    sellThroughRate: Math.random() * 0.8 + 0.1,
    lastWeekUnits: velocity,
  },
  trend: Array.from({ length: 6 }, (_, i) => ({
    label: `W-${6 - i}`,
    units: Math.floor(Math.random() * 50) + 10,
  })),
});

// Helper function to create large dataset
const createLargeDataset = (size: number): InventorySkuDemand[] => {
  return Array.from({ length: size }, (_, i) => 
    createMockSku(`sku-${i}`, Math.random() * 200 + 10)
  );
};

describe("OptimizedVelocityAnalyzer", () => {
  let analyzer: OptimizedVelocityAnalyzer;
  let mockSkus: InventorySkuDemand[];

  beforeEach(() => {
    analyzer = new OptimizedVelocityAnalyzer(DEFAULT_PERFORMANCE_CONFIG);
    mockSkus = createLargeDataset(100);
  });

  it("should calculate velocity deciles efficiently", async () => {
    const deciles = await analyzer.calculateVelocityDecilesOptimized(mockSkus);
    
    expect(deciles).toHaveLength(10);
    expect(deciles[0]?.decile).toBe(1);
    expect(deciles[9]?.decile).toBe(10);
    
    // Check that deciles are ordered by velocity (descending)
    for (let i = 0; i < deciles.length - 1; i++) {
      expect(deciles[i]?.minVelocity).toBeGreaterThanOrEqual(deciles[i + 1]?.minVelocity || 0);
    }
  });

  it("should use caching for repeated calculations", async () => {
    // First calculation
    const deciles1 = await analyzer.calculateVelocityDecilesOptimized(mockSkus, true);
    const stats1 = analyzer.getCacheStats();
    
    // Second calculation with same data
    const deciles2 = await analyzer.calculateVelocityDecilesOptimized(mockSkus, true);
    const stats2 = analyzer.getCacheStats();
    
    expect(deciles1).toEqual(deciles2);
    expect(stats2.size).toBeGreaterThanOrEqual(stats1.size);
  });

  it("should handle large datasets efficiently", async () => {
    const largeDataset = createLargeDataset(1000);
    const start = performance.now();
    
    const deciles = await analyzer.calculateVelocityDecilesOptimized(largeDataset);
    
    const duration = performance.now() - start;
    
    expect(deciles).toHaveLength(10);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it("should clear cache correctly", () => {
    analyzer.clearCache();
    const stats = analyzer.getCacheStats();
    expect(stats.size).toBe(0);
  });
});

describe("OptimizedReorderCalculator", () => {
  let calculator: OptimizedReorderCalculator;
  let mockSkus: InventorySkuDemand[];

  beforeEach(() => {
    calculator = new OptimizedReorderCalculator(DEFAULT_PERFORMANCE_CONFIG);
    mockSkus = createLargeDataset(100);
  });

  it("should calculate reorder points for batch of SKUs", async () => {
    const reorderPoints = await calculator.calculateReorderPointsBatch(mockSkus);
    
    expect(reorderPoints.size).toBe(mockSkus.length);
    
    // Check that all SKUs have reorder points
    mockSkus.forEach(sku => {
      expect(reorderPoints.has(sku.id)).toBe(true);
      expect(reorderPoints.get(sku.id)).toBeGreaterThan(0);
    });
  });

  it("should handle large datasets efficiently", async () => {
    const largeDataset = createLargeDataset(1000);
    const start = performance.now();
    
    const reorderPoints = await calculator.calculateReorderPointsBatch(largeDataset);
    
    const duration = performance.now() - start;
    
    expect(reorderPoints.size).toBe(1000);
    expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
  });

  it("should calculate different reorder points for different service levels", async () => {
    const reorderPoints90 = await calculator.calculateReorderPointsBatch(mockSkus, 0.90);
    const reorderPoints95 = await calculator.calculateReorderPointsBatch(mockSkus, 0.95);
    const reorderPoints99 = await calculator.calculateReorderPointsBatch(mockSkus, 0.99);
    
    // Higher service levels should generally result in higher reorder points
    let higherCount = 0;
    mockSkus.forEach(sku => {
      const rop90 = reorderPoints90.get(sku.id) || 0;
      const rop95 = reorderPoints95.get(sku.id) || 0;
      const rop99 = reorderPoints99.get(sku.id) || 0;
      
      if (rop95 >= rop90 && rop99 >= rop95) {
        higherCount++;
      }
    });
    
    // At least 80% should follow the expected pattern
    expect(higherCount / mockSkus.length).toBeGreaterThan(0.8);
  });
});

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  it("should measure operation timing", () => {
    const endTimer = monitor.startTimer("test-operation");
    
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait for ~10ms
    }
    
    const duration = endTimer();
    
    expect(duration).toBeGreaterThan(5);
    expect(duration).toBeLessThan(50);
    
    const metrics = monitor.getMetrics();
    expect(metrics["test-operation"]).toBeDefined();
    expect(metrics["test-operation"].count).toBe(1);
  });

  it("should track multiple operations", () => {
    monitor.recordMetric("op1", 100);
    monitor.recordMetric("op1", 200);
    monitor.recordMetric("op2", 150);
    
    const metrics = monitor.getMetrics();
    
    expect(metrics["op1"].count).toBe(2);
    expect(metrics["op1"].average).toBe(150);
    expect(metrics["op1"].max).toBe(200);
    expect(metrics["op1"].min).toBe(100);
    
    expect(metrics["op2"].count).toBe(1);
    expect(metrics["op2"].average).toBe(150);
  });

  it("should clear metrics", () => {
    monitor.recordMetric("test", 100);
    expect(monitor.getMetrics()["test"]).toBeDefined();
    
    monitor.clearMetrics();
    expect(Object.keys(monitor.getMetrics())).toHaveLength(0);
  });
});

describe("Performance Integration", () => {
  it("should handle end-to-end performance requirements", async () => {
    const largeDataset = createLargeDataset(1000);
    const analyzer = new OptimizedVelocityAnalyzer(DEFAULT_PERFORMANCE_CONFIG);
    const calculator = new OptimizedReorderCalculator(DEFAULT_PERFORMANCE_CONFIG);
    const monitor = new PerformanceMonitor();
    
    const endTimer = monitor.startTimer("full-analysis");
    
    // Run both analyses
    const [deciles, reorderPoints] = await Promise.all([
      analyzer.calculateVelocityDecilesOptimized(largeDataset),
      calculator.calculateReorderPointsBatch(largeDataset),
    ]);
    
    const duration = endTimer();
    
    // Performance assertions
    expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    expect(deciles).toHaveLength(10);
    expect(reorderPoints.size).toBe(1000);
    
    // Verify cache is being used
    const cacheStats = analyzer.getCacheStats();
    expect(cacheStats.size).toBeGreaterThan(0);
    
    console.log(`Performance test completed in ${duration.toFixed(2)}ms`);
    console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
  });
});
