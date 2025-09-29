/**
 * Production Inventory Monitoring Dashboard
 * Real-time monitoring and alerting for inventory system
 */

export type InventoryMetrics = {
  total_queries: number;
  cache_hits: number;
  cache_misses: number;
  parallel_queries: number;
  avg_response_time: number;
  total_processing_time: number;
  cache_hit_rate: number;
  parallel_efficiency: number;
  success_rate: number;
  error_count: number;
};

export type ServiceHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    analytics_engine: string;
    mcp_integration: string;
  };
  performance_metrics: InventoryMetrics;
};

export type Alert = {
  id: string;
  type: 'performance' | 'error' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  action_required: string;
};

export class InventoryMonitor {
  private metrics: InventoryMetrics | null = null;
  private health: ServiceHealth | null = null;
  private alerts: Alert[] = [];
  private updateInterval: number = 30000; // 30 seconds
  private intervalId: NodeJS.Timeout | null = null;

  constructor(updateInterval: number = 30000) {
    this.updateInterval = updateInterval;
  }

  async startMonitoring(): Promise<void> {
    console.log('🔍 Starting inventory monitoring...');
    
    // Initial health check
    await this.updateHealth();
    
    // Set up periodic updates
    this.intervalId = setInterval(async () => {
      await this.updateHealth();
      await this.checkAlerts();
    }, this.updateInterval);
    
    console.log('✅ Inventory monitoring started');
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Inventory monitoring stopped');
  }

  private async updateHealth(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8004/health');
      if (response.ok) {
        this.health = await response.json();
        this.metrics = this.health.performance_metrics;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.health = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        components: {
          analytics_engine: 'error',
          mcp_integration: 'error'
        },
        performance_metrics: {} as InventoryMetrics
      };
    }
  }

  private async checkAlerts(): Promise<void> {
    if (!this.metrics) return;

    const newAlerts: Alert[] = [];

    // Check performance alerts
    if (this.metrics.avg_response_time > 5.0) {
      newAlerts.push({
        id: `perf-${Date.now()}`,
        type: 'performance',
        severity: this.metrics.avg_response_time > 10.0 ? 'critical' : 'high',
        title: 'High Response Time',
        description: `Average response time is ${this.metrics.avg_response_time.toFixed(2)}s`,
        timestamp: new Date().toISOString(),
        resolved: false,
        action_required: 'Consider scaling up or optimizing queries'
      });
    }

    // Check cache performance
    if (this.metrics.cache_hit_rate < 50) {
      newAlerts.push({
        id: `cache-${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${this.metrics.cache_hit_rate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
        action_required: 'Review caching strategy and TTL settings'
      });
    }

    // Check error rate
    if (this.metrics.error_count > 10) {
      newAlerts.push({
        id: `error-${Date.now()}`,
        type: 'error',
        severity: 'high',
        title: 'High Error Count',
        description: `${this.metrics.error_count} errors detected`,
        timestamp: new Date().toISOString(),
        resolved: false,
        action_required: 'Investigate error logs and fix issues'
      });
    }

    // Add new alerts
    this.alerts = [...this.alerts, ...newAlerts];
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getHealth(): ServiceHealth | null {
    return this.health;
  }

  getMetrics(): InventoryMetrics | null {
    return this.metrics;
  }

  getAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return this.alerts;
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  getPerformanceSummary(): {
    status: string;
    responseTime: number;
    cacheHitRate: number;
    successRate: number;
    totalQueries: number;
  } {
    if (!this.metrics) {
      return {
        status: 'unknown',
        responseTime: 0,
        cacheHitRate: 0,
        successRate: 0,
        totalQueries: 0
      };
    }

    return {
      status: this.health?.status || 'unknown',
      responseTime: this.metrics.avg_response_time,
      cacheHitRate: this.metrics.cache_hit_rate,
      successRate: this.metrics.success_rate,
      totalQueries: this.metrics.total_queries
    };
  }

  async optimizePerformance(skuCount: number): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8004/performance/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sku_count: skuCount })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Performance optimization failed:', error);
      return false;
    }
  }

  async getInventorySignals(skuIds: string[]): Promise<any[]> {
    try {
      const response = await fetch(`http://localhost:8004/mcp/signals?sku_ids=${skuIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        return data.signals || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get inventory signals:', error);
      return [];
    }
  }

  async getShopifyProducts(limit: number = 100, page: number = 1): Promise<any[]> {
    try {
      const response = await fetch(`http://localhost:8004/mcp/shopify/products?limit=${limit}&page=${page}`);
      if (response.ok) {
        const data = await response.json();
        return data.products || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get Shopify products:', error);
      return [];
    }
  }
}

// Export singleton instance
export const inventoryMonitor = new InventoryMonitor();
