#!/usr/bin/env node

/**
 * Production Error Tracker for Llama RAG
 * Comprehensive error tracking, alerting, and reporting system
 */

const fs = require('fs');
const path = require('path');

class ProductionErrorTracker {
  constructor(options = {}) {
    this.options = {
      logFile: options.logFile || 'error-tracker.log',
      errorFile: options.errorFile || 'error-details.json',
      alertFile: options.alertFile || 'error-alerts.json',
      maxErrors: options.maxErrors || 1000,
      alertThresholds: {
        errorRate: options.errorRateThreshold || 0.05, // 5%
        consecutiveErrors: options.consecutiveErrorThreshold || 10,
        criticalErrorRate: options.criticalErrorThreshold || 0.01, // 1%
      },
      alertChannels: options.alertChannels || ['log', 'file'],
      ...options,
    };

    this.errors = [];
    this.alerts = [];
    this.errorStats = {
      total: 0,
      byType: {},
      bySeverity: {},
      byHour: {},
      recentErrors: [],
    };

    this.setupLogging();
    this.setupErrorHandling();
  }

  setupLogging() {
    this.logStream = fs.createWriteStream(this.options.logFile, { flags: 'a' });
    this.logStream.write(
      `\n=== Error Tracker Started: ${new Date().toISOString()} ===\n`
    );
  }

  setupErrorHandling() {
    // Global error handlers
    process.on('uncaughtException', error => {
      this.trackError({
        type: 'uncaughtException',
        severity: 'critical',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        context: {
          process: 'main',
          event: 'uncaughtException',
        },
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.trackError({
        type: 'unhandledRejection',
        severity: 'critical',
        message: `Unhandled rejection: ${reason}`,
        stack: reason.stack || 'No stack trace available',
        timestamp: Date.now(),
        context: {
          process: 'main',
          event: 'unhandledRejection',
          promise: promise.toString(),
        },
      });
    });
  }

  trackError(errorInfo) {
    const error = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: errorInfo.type || 'unknown',
      severity: errorInfo.severity || 'medium',
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack || 'No stack trace',
      context: errorInfo.context || {},
      metadata: errorInfo.metadata || {},
      resolved: false,
      ...errorInfo,
    };

    // Add to errors array
    this.errors.push(error);

    // Update statistics
    this.updateErrorStats(error);

    // Check for alerts
    this.checkAlerts(error);

    // Log error
    this.logError(error);

    // Save to file
    this.saveErrors();

    // Keep only recent errors
    if (this.errors.length > this.options.maxErrors) {
      this.errors = this.errors.slice(-this.options.maxErrors);
    }

    return error.id;
  }

  updateErrorStats(error) {
    this.errorStats.total++;

    // By type
    this.errorStats.byType[error.type] =
      (this.errorStats.byType[error.type] || 0) + 1;

    // By severity
    this.errorStats.bySeverity[error.severity] =
      (this.errorStats.bySeverity[error.severity] || 0) + 1;

    // By hour
    const hour = new Date(error.timestamp).getHours();
    this.errorStats.byHour[hour] = (this.errorStats.byHour[hour] || 0) + 1;

    // Recent errors (last 100)
    this.errorStats.recentErrors.push({
      id: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp,
    });

    if (this.errorStats.recentErrors.length > 100) {
      this.errorStats.recentErrors = this.errorStats.recentErrors.slice(-100);
    }
  }

  checkAlerts(error) {
    const alerts = [];

    // Check error rate
    const errorRate = this.getCurrentErrorRate();
    if (errorRate > this.options.alertThresholds.errorRate) {
      alerts.push({
        type: 'highErrorRate',
        severity: 'high',
        message: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${(this.options.alertThresholds.errorRate * 100).toFixed(1)}%`,
        value: errorRate,
        threshold: this.options.alertThresholds.errorRate,
        timestamp: Date.now(),
      });
    }

    // Check consecutive errors
    const consecutiveErrors = this.getConsecutiveErrors();
    if (consecutiveErrors >= this.options.alertThresholds.consecutiveErrors) {
      alerts.push({
        type: 'consecutiveErrors',
        severity: 'high',
        message: `${consecutiveErrors} consecutive errors detected`,
        value: consecutiveErrors,
        threshold: this.options.alertThresholds.consecutiveErrors,
        timestamp: Date.now(),
      });
    }

    // Check critical error rate
    const criticalErrorRate = this.getCriticalErrorRate();
    if (criticalErrorRate > this.options.alertThresholds.criticalErrorRate) {
      alerts.push({
        type: 'highCriticalErrorRate',
        severity: 'critical',
        message: `Critical error rate ${(criticalErrorRate * 100).toFixed(1)}% exceeds threshold ${(this.options.alertThresholds.criticalErrorRate * 100).toFixed(1)}%`,
        value: criticalErrorRate,
        threshold: this.options.alertThresholds.criticalErrorRate,
        timestamp: Date.now(),
      });
    }

    // Check for new error types
    if (this.isNewErrorType(error.type)) {
      alerts.push({
        type: 'newErrorType',
        severity: 'medium',
        message: `New error type detected: ${error.type}`,
        value: error.type,
        timestamp: Date.now(),
      });
    }

    // Process alerts
    alerts.forEach(alert => this.handleAlert(alert));
  }

  handleAlert(alert) {
    this.alerts.push(alert);

    // Send to configured channels
    this.options.alertChannels.forEach(channel => {
      switch (channel) {
        case 'log':
          console.error(`[${alert.severity.toUpperCase()}] ${alert.message}`);
          break;
        case 'file':
          this.logStream.write(
            `${new Date().toISOString()} - ALERT: ${alert.message}\n`
          );
          break;
        case 'webhook':
          this.sendWebhookAlert(alert);
          break;
        case 'email':
          this.sendEmailAlert(alert);
          break;
      }
    });

    // Save alerts
    this.saveAlerts();
  }

  sendWebhookAlert(alert) {
    // Implementation for webhook alerts
    console.log(`Webhook alert: ${alert.message}`);
  }

  sendEmailAlert(alert) {
    // Implementation for email alerts
    console.log(`Email alert: ${alert.message}`);
  }

  isNewErrorType(errorType) {
    // Check if this error type appeared in the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrorsOfType = this.errors.filter(
      error => error.type === errorType && error.timestamp > oneHourAgo
    );

    return recentErrorsOfType.length === 1; // First occurrence in the last hour
  }

  getCurrentErrorRate() {
    // Calculate error rate over the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentErrors = this.errors.filter(
      error => error.timestamp > fiveMinutesAgo
    );

    // This is a simplified calculation - in real implementation,
    // you'd need to track total requests to calculate actual error rate
    return recentErrors.length / 100; // Simplified: assume 100 requests per 5 minutes
  }

  getConsecutiveErrors() {
    // Count consecutive errors in the last 10 errors
    const recentErrors = this.errors.slice(-10);
    let consecutive = 0;

    for (let i = recentErrors.length - 1; i >= 0; i--) {
      if (
        recentErrors[i].severity === 'critical' ||
        recentErrors[i].severity === 'high'
      ) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  getCriticalErrorRate() {
    // Calculate critical error rate over the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.errors.filter(
      error => error.timestamp > oneHourAgo
    );
    const criticalErrors = recentErrors.filter(
      error => error.severity === 'critical'
    );

    return recentErrors.length > 0
      ? criticalErrors.length / recentErrors.length
      : 0;
  }

  generateErrorId() {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  logError(error) {
    const logMessage = `${new Date().toISOString()} - [${error.severity.toUpperCase()}] ${error.type}: ${error.message}`;
    this.logStream.write(logMessage + '\n');

    if (error.severity === 'critical') {
      console.error(logMessage);
    } else if (error.severity === 'high') {
      console.warn(logMessage);
    }
  }

  saveErrors() {
    const errorData = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      errors: this.errors.slice(-100), // Keep last 100 errors
      statistics: this.errorStats,
    };

    fs.writeFileSync(
      this.options.errorFile,
      JSON.stringify(errorData, null, 2)
    );
  }

  saveAlerts() {
    const alertData = {
      timestamp: new Date().toISOString(),
      totalAlerts: this.alerts.length,
      alerts: this.alerts.slice(-50), // Keep last 50 alerts
    };

    fs.writeFileSync(
      this.options.alertFile,
      JSON.stringify(alertData, null, 2)
    );
  }

  getErrorReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.errors.length,
        recentErrors: this.errors.slice(-10),
        errorRate: this.getCurrentErrorRate(),
        criticalErrorRate: this.getCriticalErrorRate(),
        consecutiveErrors: this.getConsecutiveErrors(),
      },
      statistics: this.errorStats,
      alerts: this.alerts.slice(-20),
      topErrorTypes: this.getTopErrorTypes(),
      topErrorSources: this.getTopErrorSources(),
    };
  }

  getTopErrorTypes() {
    const typeCounts = this.errorStats.byType;
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  getTopErrorSources() {
    const sourceCounts = {};

    this.errors.forEach(error => {
      const source = error.context?.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }

  resolveError(errorId) {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
      this.saveErrors();
      return true;
    }
    return false;
  }

  getUnresolvedErrors() {
    return this.errors.filter(error => !error.resolved);
  }

  cleanup() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Export for use in other modules
module.exports = ProductionErrorTracker;

// CLI usage
if (require.main === module) {
  const tracker = new ProductionErrorTracker({
    logFile: 'production-errors.log',
    errorFile: 'error-details.json',
    alertFile: 'error-alerts.json',
  });

  // Simulate some errors for testing
  setTimeout(() => {
    tracker.trackError({
      type: 'database',
      severity: 'high',
      message: 'Database connection failed',
      stack:
        'Error: Connection timeout\n    at Database.connect (/app/db.js:10:5)',
      context: { source: 'database', operation: 'connect' },
    });
  }, 1000);

  setTimeout(() => {
    tracker.trackError({
      type: 'api',
      severity: 'medium',
      message: 'API rate limit exceeded',
      stack:
        'Error: Rate limit exceeded\n    at ApiClient.request (/app/api.js:25:10)',
      context: { source: 'api', endpoint: '/users' },
    });
  }, 2000);

  setTimeout(() => {
    const report = tracker.getErrorReport();
    console.log('Error Report:', JSON.stringify(report, null, 2));
    tracker.cleanup();
  }, 5000);
}
