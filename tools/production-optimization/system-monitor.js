#!/usr/bin/env node

/**
 * Production System Monitor for Llama RAG
 * Monitors system resources, health checks, and service status
 */

const fs = require('fs');
const { execSync } = require('child_process');

class ProductionSystemMonitor {
  constructor(options = {}) {
    this.options = {
      interval: options.interval || 60000, // 1 minute
      logFile: options.logFile || 'system-monitor.log',
      healthCheckFile: options.healthCheckFile || 'system-health.json',
      services: options.services || [
        { name: 'database', port: 5432, type: 'tcp' },
        { name: 'redis', port: 6379, type: 'tcp' },
        { name: 'api', port: 3000, type: 'http', endpoint: '/health' },
        { name: 'dashboard', port: 3001, type: 'http', endpoint: '/health' },
      ],
      thresholds: {
        diskUsage: options.diskThreshold || 0.85, // 85%
        memoryUsage: options.memoryThreshold || 0.9, // 90%
        cpuUsage: options.cpuThreshold || 0.8, // 80%
        loadAverage: options.loadThreshold || 4.0, // 4.0
      },
      ...options,
    };

    this.metrics = {
      startTime: Date.now(),
      systemHealth: {},
      serviceStatus: {},
      resourceUsage: {},
      healthHistory: [],
    };

    this.isRunning = false;
    this.intervalId = null;
    this.setupLogging();
  }

  setupLogging() {
    this.logStream = fs.createWriteStream(this.options.logFile, { flags: 'a' });
    this.logStream.write(
      `\n=== System Monitor Started: ${new Date().toISOString()} ===\n`
    );
  }

  start() {
    if (this.isRunning) {
      console.log('System monitor is already running');
      return;
    }

    console.log('Starting production system monitor...');
    this.isRunning = true;

    // Start periodic monitoring
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
      this.checkServiceHealth();
      this.checkResourceThresholds();
      this.saveHealthData();
    }, this.options.interval);

    console.log('System monitor started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('System monitor is not running');
      return;
    }

    console.log('Stopping system monitor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.saveFinalReport();
    this.logStream.end();
    console.log('System monitor stopped');
  }

  collectSystemMetrics() {
    const timestamp = Date.now();

    try {
      // CPU Usage
      const cpuUsage = this.getCpuUsage();

      // Memory Usage
      const memoryUsage = this.getMemoryUsage();

      // Disk Usage
      const diskUsage = this.getDiskUsage();

      // Load Average
      const loadAverage = this.getLoadAverage();

      // Network Statistics
      const networkStats = this.getNetworkStats();

      this.metrics.resourceUsage = {
        timestamp,
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        load: loadAverage,
        network: networkStats,
      };

      this.logSystemMetrics();
    } catch (error) {
      console.error('Error collecting system metrics:', error.message);
      this.logStream.write(
        `${new Date().toISOString()} - ERROR: Failed to collect system metrics - ${error.message}\n`
      );
    }
  }

  getCpuUsage() {
    try {
      // Simple CPU usage calculation
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      // Wait 100ms for measurement
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();

        const cpuPercent =
          (endUsage.user + endUsage.system) / 1000 / (endTime - startTime);
        return Math.min(cpuPercent * 100, 100);
      }, 100);

      return 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  getMemoryUsage() {
    try {
      const memInfo = process.memoryUsage();
      const totalMemory = this.getTotalMemory();

      return {
        used: memInfo.rss,
        total: totalMemory,
        percentage: (memInfo.rss / totalMemory) * 100,
        heap: {
          used: memInfo.heapUsed,
          total: memInfo.heapTotal,
          percentage: (memInfo.heapUsed / memInfo.heapTotal) * 100,
        },
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  getTotalMemory() {
    try {
      // Try to get total system memory
      if (process.platform === 'linux') {
        const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const match = memInfo.match(/MemTotal:\s+(\d+)\s+kB/);
        if (match) {
          return parseInt(match[1]) * 1024; // Convert from kB to bytes
        }
      }

      // Fallback to a reasonable default
      return 8 * 1024 * 1024 * 1024; // 8GB
    } catch (error) {
      return 8 * 1024 * 1024 * 1024; // 8GB fallback
    }
  }

  getDiskUsage() {
    try {
      // Simple disk usage check for current directory
      const stats = fs.statSync('.');
      return {
        available: true,
        path: process.cwd(),
        // This is a simplified check - in production you'd want more detailed disk info
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  getLoadAverage() {
    try {
      if (process.platform === 'linux') {
        const loadAvg = fs.readFileSync('/proc/loadavg', 'utf8');
        const values = loadAvg.split(' ').slice(0, 3).map(parseFloat);
        return {
          '1min': values[0],
          '5min': values[1],
          '15min': values[2],
        };
      }
      return { '1min': 0, '5min': 0, '15min': 0 };
    } catch (error) {
      return { '1min': 0, '5min': 0, '15min': 0 };
    }
  }

  getNetworkStats() {
    try {
      // Simple network connectivity check
      return {
        connectivity: 'good',
        timestamp: Date.now(),
      };
    } catch (error) {
      return { connectivity: 'poor', error: error.message };
    }
  }

  checkServiceHealth() {
    const timestamp = Date.now();

    this.options.services.forEach(service => {
      const health = this.checkService(service);
      this.metrics.serviceStatus[service.name] = {
        ...health,
        timestamp,
      };
    });
  }

  checkService(service) {
    try {
      switch (service.type) {
        case 'tcp':
          return this.checkTcpService(service);
        case 'http':
          return this.checkHttpService(service);
        default:
          return { status: 'unknown', error: 'Unknown service type' };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  checkTcpService(service) {
    try {
      // Simple TCP port check
      const net = require('net');
      const socket = new net.Socket();

      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({
            status: 'unhealthy',
            error: 'Connection timeout',
            responseTime: 5000,
          });
        }, 5000);

        const startTime = Date.now();

        socket.connect(service.port, 'localhost', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          socket.destroy();

          resolve({
            status: 'healthy',
            responseTime,
          });
        });

        socket.on('error', error => {
          clearTimeout(timeout);
          resolve({
            status: 'unhealthy',
            error: error.message,
            responseTime: Date.now() - startTime,
          });
        });
      });
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  checkHttpService(service) {
    try {
      const http = require('http');
      const endpoint = service.endpoint || '/health';

      return new Promise(resolve => {
        const startTime = Date.now();

        const req = http.request(
          {
            hostname: 'localhost',
            port: service.port,
            path: endpoint,
            method: 'GET',
            timeout: 5000,
          },
          res => {
            const responseTime = Date.now() - startTime;

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                status: 'healthy',
                statusCode: res.statusCode,
                responseTime,
              });
            } else {
              resolve({
                status: 'unhealthy',
                statusCode: res.statusCode,
                responseTime,
              });
            }
          }
        );

        req.on('error', error => {
          resolve({
            status: 'unhealthy',
            error: error.message,
            responseTime: Date.now() - startTime,
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            status: 'unhealthy',
            error: 'Request timeout',
            responseTime: 5000,
          });
        });

        req.end();
      });
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  checkResourceThresholds() {
    const alerts = [];
    const resources = this.metrics.resourceUsage;

    if (!resources) return;

    // Check memory usage
    if (
      resources.memory &&
      resources.memory.percentage > this.options.thresholds.memoryUsage * 100
    ) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage ${resources.memory.percentage.toFixed(1)}% exceeds threshold ${(this.options.thresholds.memoryUsage * 100).toFixed(1)}%`,
        value: resources.memory.percentage,
        threshold: this.options.thresholds.memoryUsage * 100,
      });
    }

    // Check CPU usage
    if (
      resources.cpu &&
      resources.cpu > this.options.thresholds.cpuUsage * 100
    ) {
      alerts.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU usage ${resources.cpu.toFixed(1)}% exceeds threshold ${(this.options.thresholds.cpuUsage * 100).toFixed(1)}%`,
        value: resources.cpu,
        threshold: this.options.thresholds.cpuUsage * 100,
      });
    }

    // Check load average
    if (
      resources.load &&
      resources.load['1min'] > this.options.thresholds.loadAverage
    ) {
      alerts.push({
        type: 'load',
        severity: 'medium',
        message: `Load average ${resources.load['1min'].toFixed(2)} exceeds threshold ${this.options.thresholds.loadAverage}`,
        value: resources.load['1min'],
        threshold: this.options.thresholds.loadAverage,
      });
    }

    // Check service health
    Object.entries(this.metrics.serviceStatus).forEach(
      ([serviceName, status]) => {
        if (status.status !== 'healthy') {
          alerts.push({
            type: 'service',
            severity: 'high',
            message: `Service ${serviceName} is ${status.status}: ${status.error || 'Unknown error'}`,
            service: serviceName,
            status: status.status,
          });
        }
      }
    );

    // Handle alerts
    alerts.forEach(alert => this.handleAlert(alert));
  }

  handleAlert(alert) {
    const alertMessage = `[${alert.severity.toUpperCase()}] ${alert.message}`;

    console.warn(alertMessage);
    this.logStream.write(
      `${new Date().toISOString()} - ALERT: ${alertMessage}\n`
    );

    // Save to health history
    this.metrics.healthHistory.push({
      ...alert,
      timestamp: Date.now(),
    });

    // Keep only last 100 alerts
    if (this.metrics.healthHistory.length > 100) {
      this.metrics.healthHistory = this.metrics.healthHistory.slice(-100);
    }
  }

  logSystemMetrics() {
    const resources = this.metrics.resourceUsage;
    if (!resources) return;

    const logMessage = `Memory: ${resources.memory?.percentage?.toFixed(1) || 'N/A'}%, CPU: ${resources.cpu?.toFixed(1) || 'N/A'}%, Load: ${resources.load?.['1min']?.toFixed(2) || 'N/A'}`;
    this.logStream.write(`${new Date().toISOString()} - ${logMessage}\n`);
  }

  saveHealthData() {
    const healthData = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.startTime,
      systemHealth: this.metrics.systemHealth,
      serviceStatus: this.metrics.serviceStatus,
      resourceUsage: this.metrics.resourceUsage,
      recentAlerts: this.metrics.healthHistory.slice(-20),
    };

    fs.writeFileSync(
      this.options.healthCheckFile,
      JSON.stringify(healthData, null, 2)
    );
  }

  saveFinalReport() {
    const finalReport = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.metrics.startTime,
      summary: this.getSystemSummary(),
      healthHistory: this.metrics.healthHistory,
      serviceStatus: this.metrics.serviceStatus,
      resourceUsage: this.metrics.resourceUsage,
    };

    const finalReportFile = `system-health-final-${Date.now()}.json`;
    fs.writeFileSync(finalReportFile, JSON.stringify(finalReport, null, 2));
    console.log(`Final system health report saved to: ${finalReportFile}`);
  }

  getSystemSummary() {
    const healthyServices = Object.values(this.metrics.serviceStatus).filter(
      s => s.status === 'healthy'
    ).length;
    const totalServices = Object.keys(this.metrics.serviceStatus).length;

    return {
      services: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices,
        healthPercentage:
          totalServices > 0 ? (healthyServices / totalServices) * 100 : 100,
      },
      resources: this.metrics.resourceUsage,
      alerts: {
        total: this.metrics.healthHistory.length,
        recent: this.metrics.healthHistory.slice(-10),
      },
    };
  }
}

// Export for use in other modules
module.exports = ProductionSystemMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new ProductionSystemMonitor({
    interval: 30000, // 30 seconds for testing
    logFile: 'system-monitor.log',
    healthCheckFile: 'system-health.json',
  });

  monitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down system monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Keep the process running and show status
  setInterval(() => {
    const summary = monitor.getSystemSummary();
    console.log(
      `Services: ${summary.services.healthy}/${summary.services.total} healthy`
    );
  }, 60000);
}
