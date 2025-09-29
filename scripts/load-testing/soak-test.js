#!/usr/bin/env node
/**
 * Soak Testing Framework for Long-term Stability
 * Quality Engineer Implementation
 */

const LoadTester = require('./load-test');

class SoakTester extends LoadTester {
  constructor(options = {}) {
    super({
      ...options,
      duration: options.duration || 300, // 5 minutes default
      concurrentUsers: options.concurrentUsers || 5,
      rampUpTime: options.rampUpTime || 30 // Gradual ramp up
    });
    
    this.thresholds = {
      maxResponseTime: 2000, // Higher threshold for soak tests
      maxErrorRate: 0.5, // Lower error rate tolerance
      minRequestsPerSecond: 5,
      maxMemoryUsage: 80, // MB
      maxCpuUsage: 70 // %
    };
    
    this.monitoring = {
      memoryUsage: [],
      cpuUsage: [],
      startTime: Date.now()
    };
  }

  async monitorSystem() {
    const usage = process.memoryUsage();
    this.monitoring.memoryUsage.push({
      timestamp: Date.now(),
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    });
  }

  async runSoakTest(endpoints) {
    console.log(`🌊 Starting soak test with ${this.concurrentUsers} concurrent users for ${this.duration} seconds`);
    
    const startTime = Date.now();
    const endTime = startTime + (this.duration * 1000);
    
    // Start monitoring
    const monitorInterval = setInterval(() => {
      this.monitorSystem();
    }, 10000); // Every 10 seconds
    
    // Run the load test
    await this.runLoadTest(endpoints);
    
    clearInterval(monitorInterval);
    
    // Calculate system metrics
    this.calculateSystemMetrics();
    return this.results;
  }

  calculateSystemMetrics() {
    if (this.monitoring.memoryUsage.length === 0) return;
    
    const memoryUsage = this.monitoring.memoryUsage;
    const avgMemory = memoryUsage.reduce((sum, m) => sum + m.rss, 0) / memoryUsage.length;
    const maxMemory = Math.max(...memoryUsage.map(m => m.rss));
    
    this.results.systemMetrics = {
      averageMemoryUsage: Math.round(avgMemory),
      maxMemoryUsage: maxMemory,
      memoryGrowth: maxMemory - memoryUsage[0].rss,
      duration: Date.now() - this.monitoring.startTime
    };
  }

  checkThresholds() {
    const violations = super.checkThresholds();
    
    if (this.results.systemMetrics) {
      if (this.results.systemMetrics.maxMemoryUsage > this.thresholds.maxMemoryUsage) {
        violations.push(`Max memory usage ${this.results.systemMetrics.maxMemoryUsage}MB exceeds threshold ${this.thresholds.maxMemoryUsage}MB`);
      }
      
      if (this.results.systemMetrics.memoryGrowth > 50) {
        violations.push(`Memory growth ${this.results.systemMetrics.memoryGrowth}MB indicates potential memory leak`);
      }
    }
    
    return violations;
  }

  generateRecommendations() {
    const recommendations = super.generateRecommendations();
    
    if (this.results.systemMetrics) {
      if (this.results.systemMetrics.memoryGrowth > 30) {
        recommendations.push('Investigate potential memory leaks in long-running processes');
      }
      
      if (this.results.systemMetrics.maxMemoryUsage > 100) {
        recommendations.push('Consider memory optimization or horizontal scaling');
      }
    }
    
    recommendations.push('Monitor system resources during peak usage');
    recommendations.push('Implement circuit breakers for external dependencies');
    recommendations.push('Set up alerting for performance degradation');
    
    return recommendations;
  }

  async run() {
    const endpoints = [
      { endpoint: '/health', options: { method: 'GET' } },
      { endpoint: '/api/health', options: { method: 'GET' } },
      { endpoint: '/', options: { method: 'GET' } }
    ];

    await this.runSoakTest(endpoints);
    const passed = this.generateReport();
    
    if (!passed) {
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const options = {
    baseUrl: process.env.SOAK_TEST_BASE_URL || 'http://localhost:3000',
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 5,
    duration: parseInt(process.env.TEST_DURATION) || 300, // 5 minutes
    rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 30
  };
  
  const tester = new SoakTester(options);
  tester.run().catch(console.error);
}

module.exports = SoakTester;
