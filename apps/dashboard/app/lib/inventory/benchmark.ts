import { 
  OptimizedVelocityAnalyzer, 
  OptimizedReorderCalculator, 
  PerformanceMonitor,
  DEFAULT_PERFORMANCE_CONFIG 
} from "./performance";
import type { InventorySkuDemand } from "../../types/dashboard";

/**
 * Performance benchmark for inventory calculations
 * Tests various dataset sizes to validate performance targets
 */

export type BenchmarkResult = {
  datasetSize: number;
  velocityCalculationTime: number;
  reorderCalculationTime: number;
  totalTime: number;
  memoryUsage: number;
  cacheHitRate: number;
};

export class InventoryBenchmark {
  private analyzer: OptimizedVelocityAnalyzer;
  private calculator: OptimizedReorderCalculator;
  private monitor: PerformanceMonitor;

  constructor() {
    this.analyzer = new OptimizedVelocityAnalyzer(DEFAULT_PERFORMANCE_CONFIG);
    this.calculator = new OptimizedReorderCalculator(DEFAULT_PERFORMANCE_CONFIG);
    this.monitor = new PerformanceMonitor();
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runBenchmark(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    const datasetSizes = [100, 500, 1000, 2000, 5000];

    console.log("🚀 Starting Inventory Performance Benchmark");
    console.log("=" .repeat(50));

    for (const size of datasetSizes) {
      console.log(`\n📊 Testing dataset size: ${size} SKUs`);
      
      const result = await this.benchmarkDatasetSize(size);
      results.push(result);
      
      console.log(`   ⏱️  Velocity calculation: ${result.velocityCalculationTime.toFixed(2)}ms`);
      console.log(`   ⏱️  Reorder calculation: ${result.reorderCalculationTime.toFixed(2)}ms`);
      console.log(`   ⏱️  Total time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`   💾 Memory usage: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   🎯 Cache hit rate: ${(result.cacheHitRate * 100).toFixed(1)}%`);
      
      // Performance validation
      if (result.totalTime > 5000) {
        console.log(`   ⚠️  WARNING: Exceeds 5s target for ${size} SKUs`);
      } else {
        console.log(`   ✅ PASS: Meets performance target`);
      }
    }

    console.log("\n" + "=" .repeat(50));
    console.log("📈 Benchmark Summary:");
    this.printSummary(results);

    return results;
  }

  private async benchmarkDatasetSize(size: number): Promise<BenchmarkResult> {
    // Generate test dataset
    const dataset = this.generateTestDataset(size);
    
    // Clear caches
    this.analyzer.clearCache();
    this.monitor.clearMetrics();
    
    // Measure memory before
    const memoryBefore = this.getMemoryUsage();
    
    // Benchmark velocity calculation
    const velocityTimer = this.monitor.startTimer("velocity-calculation");
    await this.analyzer.calculateVelocityDecilesOptimized(dataset);
    const velocityTime = velocityTimer();
    
    // Benchmark reorder calculation
    const reorderTimer = this.monitor.startTimer("reorder-calculation");
    await this.calculator.calculateReorderPointsBatch(dataset);
    const reorderTime = reorderTimer();
    
    // Measure memory after
    const memoryAfter = this.getMemoryUsage();
    
    // Test cache hit rate
    const cacheTimer = this.monitor.startTimer("cached-calculation");
    await this.analyzer.calculateVelocityDecilesOptimized(dataset, true);
    const cacheTime = cacheTimer();
    
    const cacheHitRate = cacheTime < velocityTime * 0.1 ? 1 : 0; // If cached is 10x faster, consider it a hit
    
    return {
      datasetSize: size,
      velocityCalculationTime: velocityTime,
      reorderCalculationTime: reorderTime,
      totalTime: velocityTime + reorderTime,
      memoryUsage: memoryAfter - memoryBefore,
      cacheHitRate,
    };
  }

  private generateTestDataset(size: number): InventorySkuDemand[] {
    const dataset: InventorySkuDemand[] = [];
    
    for (let i = 0; i < size; i++) {
      dataset.push({
        id: `sku-${i}`,
        title: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(6, '0')}`,
        vendorId: `vendor-${Math.floor(Math.random() * 5) + 1}`,
        vendorName: `Vendor ${Math.floor(Math.random() * 5) + 1}`,
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
          formatted: `$${(Math.random() * 100 + 10).toFixed(2)}`,
        },
        velocity: {
          turnoverDays: Math.floor(Math.random() * 30) + 7,
          sellThroughRate: Math.random() * 0.8 + 0.1,
          lastWeekUnits: Math.random() * 200 + 10,
        },
        trend: Array.from({ length: 6 }, (_, i) => ({
          label: `W-${6 - i}`,
          units: Math.floor(Math.random() * 50) + 10,
        })),
      });
    }
    
    return dataset;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0; // Fallback for browser environment
  }

  private printSummary(results: BenchmarkResult[]): void {
    const maxSize = Math.max(...results.map(r => r.datasetSize));
    const maxTime = Math.max(...results.map(r => r.totalTime));
    const avgCacheHitRate = results.reduce((sum, r) => sum + r.cacheHitRate, 0) / results.length;
    
    console.log(`   📊 Largest dataset: ${maxSize} SKUs`);
    console.log(`   ⏱️  Longest calculation: ${maxTime.toFixed(2)}ms`);
    console.log(`   🎯 Average cache hit rate: ${(avgCacheHitRate * 100).toFixed(1)}%`);
    
    // Performance recommendations
    if (maxTime > 3000) {
      console.log(`   💡 RECOMMENDATION: Consider increasing batch size or adding more caching`);
    } else if (avgCacheHitRate < 0.5) {
      console.log(`   💡 RECOMMENDATION: Cache hit rate could be improved`);
    } else {
      console.log(`   ✅ PERFORMANCE: All targets met!`);
    }
  }
}

/**
 * Run the benchmark if this file is executed directly
 */
if (typeof require !== 'undefined' && require.main === module) {
  const benchmark = new InventoryBenchmark();
  benchmark.runBenchmark().catch(console.error);
}
