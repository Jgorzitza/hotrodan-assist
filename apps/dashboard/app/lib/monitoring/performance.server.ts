/**
 * Performance Monitoring for Dashboard
 */

type PerformanceMetric = {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;

  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getAverage(operation: string): number {
    const ops = this.metrics.filter(m => m.operation === operation);
    if (ops.length === 0) return 0;
    return ops.reduce((sum, m) => sum + m.duration, 0) / ops.length;
  }

  getP95(operation: string): number {
    const ops = this.metrics
      .filter(m => m.operation === operation)
      .map(m => m.duration)
      .sort((a, b) => a - b);
    
    if (ops.length === 0) return 0;
    return ops[Math.floor(ops.length * 0.95)] || 0;
  }

  getSuccessRate(operation: string): number {
    const ops = this.metrics.filter(m => m.operation === operation);
    if (ops.length === 0) return 100;
    return (ops.filter(m => m.success).length / ops.length) * 100;
  }

  getSummary() {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const summary: Record<string, any> = {};
    
    operations.forEach(op => {
      summary[op] = {
        avg: this.getAverage(op),
        p95: this.getP95(op),
        successRate: this.getSuccessRate(op),
        count: this.metrics.filter(m => m.operation === op).length,
      };
    });
    
    return summary;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  let success = true;
  
  try {
    return await fn();
  } catch (error) {
    success = false;
    throw error;
  } finally {
    performanceMonitor.record({
      operation,
      duration: performance.now() - start,
      timestamp: new Date(),
      success,
    });
  }
}
