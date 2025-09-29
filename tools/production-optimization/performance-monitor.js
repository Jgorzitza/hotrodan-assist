#!/usr/bin/env node

/**
 * Production Performance Monitor for Llama RAG
 * Monitors application performance, memory usage, and system metrics
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class ProductionPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      logFile: options.logFile || 'performance-monitor.log',
      metricsFile: options.metricsFile || 'performance-metrics.json',
      alertThresholds: {
        memoryUsage: options.memoryThreshold || 0.8, // 80%
        cpuUsage: options.cpuThreshold || 0.9, // 90%
        responseTime: options.responseThreshold || 1000, // 1 second
        errorRate: options.errorThreshold || 0.05, // 5%
      },
      ...options,
    };

    this.metrics = {
      startTime: Date.now(),
      requests: [],
      errors: [],
      memorySnapshots: [],
      cpuSnapshots: [],
      responseTimes: [],
    };

    this.isRunning = false;
    this.intervalId = null;
    this.setupLogging();
  }

  setupLogging() {
    this.logStream = fs.createWriteStream(this.options.logFile, { flags: 'a' });
    this.logStream.write(
      `\n=== Performance Monitor Started: ${new Date().toISOString()} ===\n`
    );
  }

  start() {
    if (this.isRunning) {
      console.log('Performance monitor is already running');
      return;
    }

    console.log('Starting production performance monitor...');
    this.isRunning = true;

    // Start periodic monitoring
    this.intervalId = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.saveMetrics();
    }, this.options.interval);

    // Monitor process events
    this.setupProcessMonitoring();

    console.log('Performance monitor started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Performance monitor is not running');
      return;
    }

    console.log('Stopping performance monitor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.saveFinalReport();
    this.logStream.end();
    console.log('Performance monitor stopped');
  }

  collectMetrics() {
    const timestamp = Date.now();

    // Memory metrics
    const memoryUsage = process.memoryUsage();
    this.metrics.memorySnapshots.push({
      timestamp,
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    });

    // CPU metrics (simplified)
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuSnapshots.push({
      timestamp,
      user: cpuUsage.user,
      system: cpuUsage.system,
    });

    // Keep only last 100 snapshots
    if (this.metrics.memorySnapshots.length > 100) {
      this.metrics.memorySnapshots = this.metrics.memorySnapshots.slice(-100);
    }
    if (this.metrics.cpuSnapshots.length > 100) {
      this.metrics.cpuSnapshots = this.metrics.cpuSnapshots.slice(-100);
    }
  }

  checkThresholds() {
    const currentMemory = this.getCurrentMemoryUsage();
    const currentCpu = this.getCurrentCpuUsage();
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.getCurrentErrorRate();

    const alerts = [];

    // Memory threshold check
    if (currentMemory > this.options.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage ${(currentMemory * 100).toFixed(1)}% exceeds threshold ${(this.options.alertThresholds.memoryUsage * 100).toFixed(1)}%`,
        value: currentMemory,
        threshold: this.options.alertThresholds.memoryUsage,
      });
    }

    // CPU threshold check
    if (currentCpu > this.options.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU usage ${(currentCpu * 100).toFixed(1)}% exceeds threshold ${(this.options.alertThresholds.cpuUsage * 100).toFixed(1)}%`,
        value: currentCpu,
        threshold: this.options.alertThresholds.cpuUsage,
      });
    }

    // Response time threshold check
    if (avgResponseTime > this.options.alertThresholds.responseTime) {
      alerts.push({
        type: 'responseTime',
        severity: 'medium',
        message: `Average response time ${avgResponseTime}ms exceeds threshold ${this.options.alertThresholds.responseTime}ms`,
        value: avgResponseTime,
        threshold: this.options.alertThresholds.responseTime,
      });
    }

    // Error rate threshold check
    if (errorRate > this.options.alertThresholds.errorRate) {
      alerts.push({
        type: 'errorRate',
        severity: 'high',
        message: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${(this.options.alertThresholds.errorRate * 100).toFixed(1)}%`,
        value: errorRate,
        threshold: this.options.alertThresholds.errorRate,
      });
    }

    // Handle alerts
    alerts.forEach(alert => {
      this.handleAlert(alert);
    });
  }

  handleAlert(alert) {
    const alertMessage = `[${alert.severity.toUpperCase()}] ${alert.message}`;

    // Log alert
    console.warn(alertMessage);
    this.logStream.write(`${new Date().toISOString()} - ${alertMessage}\n`);

    // Save alert to metrics
    this.metrics.alerts = this.metrics.alerts || [];
    this.metrics.alerts.push({
      ...alert,
      timestamp: Date.now(),
    });
  }

  // Request tracking methods
  trackRequest(requestInfo) {
    const request = {
      timestamp: Date.now(),
      method: requestInfo.method,
      url: requestInfo.url,
      statusCode: requestInfo.statusCode,
      responseTime: requestInfo.responseTime,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip,
    };

    this.metrics.requests.push(request);
    this.metrics.responseTimes.push(request.responseTime);

    // Keep only last 1000 requests
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests = this.metrics.requests.slice(-1000);
    }
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
  }

  trackError(errorInfo) {
    const error = {
      timestamp: Date.now(),
      message: errorInfo.message,
      stack: errorInfo.stack,
      url: errorInfo.url,
      method: errorInfo.method,
      statusCode: errorInfo.statusCode,
    };

    this.metrics.errors.push(error);

    // Keep only last 500 errors
    if (this.metrics.errors.length > 500) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }
  }

  // Metric calculation methods
  getCurrentMemoryUsage() {
    const latest =
      this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1];
    if (!latest) return 0;

    // Simple memory usage calculation (heap used / heap total)
    return latest.heapUsed / latest.heapTotal;
  }

  getCurrentCpuUsage() {
    const latest =
      this.metrics.cpuSnapshots[this.metrics.cpuSnapshots.length - 1];
    if (!latest) return 0;

    // Simplified CPU usage calculation
    const totalCpu = latest.user + latest.system;
    return totalCpu / 1000000; // Convert to percentage (simplified)
  }

  getAverageResponseTime() {
    if (this.metrics.responseTimes.length === 0) return 0;

    const sum = this.metrics.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.metrics.responseTimes.length;
  }

  getCurrentErrorRate() {
    const totalRequests = this.metrics.requests.length;
    const totalErrors = this.metrics.errors.length;

    if (totalRequests === 0) return 0;

    return totalErrors / totalRequests;
  }

  getUptime() {
    return Date.now() - this.metrics.startTime;
  }

  // Reporting methods
  getPerformanceReport() {
    const uptime = this.getUptime();
    const memoryUsage = this.getCurrentMemoryUsage();
    const cpuUsage = this.getCurrentCpuUsage();
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.getCurrentErrorRate();

    return {
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000),
      },
      metrics: {
        memoryUsage: {
          percentage: (memoryUsage * 100).toFixed(2),
          rss:
            this.metrics.memorySnapshots[
              this.metrics.memorySnapshots.length - 1
            ]?.rss || 0,
          heapUsed:
            this.metrics.memorySnapshots[
              this.metrics.memorySnapshots.length - 1
            ]?.heapUsed || 0,
          heapTotal:
            this.metrics.memorySnapshots[
              this.metrics.memorySnapshots.length - 1
            ]?.heapTotal || 0,
        },
        cpuUsage: {
          percentage: (cpuUsage * 100).toFixed(2),
          user:
            this.metrics.cpuSnapshots[this.metrics.cpuSnapshots.length - 1]
              ?.user || 0,
          system:
            this.metrics.cpuSnapshots[this.metrics.cpuSnapshots.length - 1]
              ?.system || 0,
        },
        responseTime: {
          average: Math.round(avgResponseTime),
          min:
            this.metrics.responseTimes.length > 0
              ? Math.min(...this.metrics.responseTimes)
              : 0,
          max:
            this.metrics.responseTimes.length > 0
              ? Math.max(...this.metrics.responseTimes)
              : 0,
        },
        requests: {
          total: this.metrics.requests.length,
          perSecond: this.metrics.requests.length / (uptime / 1000),
        },
        errors: {
          total: this.metrics.errors.length,
          rate: (errorRate * 100).toFixed(2),
        },
      },
      alerts: this.metrics.alerts || [],
      thresholds: this.options.alertThresholds,
    };
  }

  saveMetrics() {
    const report = this.getPerformanceReport();

    fs.writeFileSync(this.options.metricsFile, JSON.stringify(report, null, 2));

    // Log current metrics
    this.logStream.write(
      `${new Date().toISOString()} - Memory: ${report.metrics.memoryUsage.percentage}%, CPU: ${report.metrics.cpuUsage.percentage}%, Response: ${report.metrics.responseTime.average}ms\n`
    );
  }

  saveFinalReport() {
    const report = this.getPerformanceReport();
    const finalReportFile = `performance-final-report-${Date.now()}.json`;

    fs.writeFileSync(finalReportFile, JSON.stringify(report, null, 2));
    console.log(`Final performance report saved to: ${finalReportFile}`);
  }

  setupProcessMonitoring() {
    // Monitor process exit
    process.on('exit', () => {
      this.saveFinalReport();
    });

    // Monitor uncaught exceptions
    process.on('uncaughtException', error => {
      this.trackError({
        message: error.message,
        stack: error.stack,
        url: 'process',
        method: 'uncaughtException',
      });
      this.handleAlert({
        type: 'uncaughtException',
        severity: 'critical',
        message: `Uncaught exception: ${error.message}`,
        value: 1,
        threshold: 0,
      });
    });

    // Monitor unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.trackError({
        message: `Unhandled rejection: ${reason}`,
        stack: reason.stack || 'No stack trace',
        url: 'process',
        method: 'unhandledRejection',
      });
      this.handleAlert({
        type: 'unhandledRejection',
        severity: 'critical',
        message: `Unhandled rejection: ${reason}`,
        value: 1,
        threshold: 0,
      });
    });
  }
}

// Export for use in other modules
module.exports = ProductionPerformanceMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new ProductionPerformanceMonitor({
    interval: 10000, // 10 seconds for testing
    logFile: 'production-performance.log',
    metricsFile: 'production-metrics.json',
  });

  monitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down performance monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Keep the process running
  setInterval(() => {
    // Simulate some activity
    const report = monitor.getPerformanceReport();
    console.log(
      `Memory: ${report.metrics.memoryUsage.percentage}%, Response: ${report.metrics.responseTime.average}ms, Errors: ${report.metrics.errors.total}`
    );
  }, 30000);
}
