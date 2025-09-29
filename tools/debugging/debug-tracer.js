#!/usr/bin/env node

/**
 * Trace-first debugging utility for Llama RAG project
 * Provides comprehensive tracing, logging, and debugging capabilities
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class DebugTracer {
  constructor(options = {}) {
    this.options = {
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile || false,
      logFile: options.logFile || 'debug-trace.log',
      enablePerformance: options.enablePerformance !== false,
      enableStackTrace: options.enableStackTrace || false,
      maxTraceDepth: options.maxTraceDepth || 10,
      ...options
    };
    
    this.traces = [];
    this.performanceMarks = new Map();
    this.traceDepth = 0;
    this.startTime = performance.now();
    
    this.setupLogging();
  }

  setupLogging() {
    if (this.options.enableFile) {
      this.logStream = fs.createWriteStream(this.options.logFile, { flags: 'a' });
      this.logStream.write(`\n=== Debug Session Started: ${new Date().toISOString()} ===\n`);
    }
  }

  /**
   * Start tracing a function or operation
   */
  trace(operation, metadata = {}) {
    const traceId = this.generateTraceId();
    const startTime = performance.now();
    
    this.traceDepth++;
    
    const trace = {
      id: traceId,
      operation,
      metadata,
      startTime,
      depth: this.traceDepth,
      timestamp: new Date().toISOString(),
      type: 'start'
    };
    
    this.addTrace(trace);
    
    // Return a function to end the trace
    return (result = null, error = null) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const endTrace = {
        id: traceId,
        operation,
        metadata,
        startTime,
        endTime,
        duration,
        depth: this.traceDepth,
        timestamp: new Date().toISOString(),
        type: 'end',
        result,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null
      };
      
      this.addTrace(endTrace);
      this.traceDepth--;
      
      return result;
    };
  }

  /**
   * Add a trace entry
   */
  addTrace(trace) {
    this.traces.push(trace);
    
    if (this.options.enableConsole) {
      this.logToConsole(trace);
    }
    
    if (this.options.enableFile && this.logStream) {
      this.logToFile(trace);
    }
  }

  /**
   * Log trace to console
   */
  logToConsole(trace) {
    const indent = '  '.repeat(Math.max(0, trace.depth - 1));
    const prefix = trace.type === 'start' ? '→' : '←';
    const duration = trace.duration ? ` (${trace.duration.toFixed(2)}ms)` : '';
    
    let message = `${indent}${prefix} ${trace.operation}${duration}`;
    
    if (trace.metadata && Object.keys(trace.metadata).length > 0) {
      message += ` [${JSON.stringify(trace.metadata)}]`;
    }
    
    if (trace.error) {
      message += ` ERROR: ${trace.error.message}`;
    }
    
    console.log(message);
    
    if (trace.error && this.options.enableStackTrace) {
      console.log(`${indent}  Stack: ${trace.error.stack}`);
    }
  }

  /**
   * Log trace to file
   */
  logToFile(trace) {
    const logEntry = JSON.stringify(trace) + '\n';
    this.logStream.write(logEntry);
  }

  /**
   * Mark a performance checkpoint
   */
  mark(name, metadata = {}) {
    const timestamp = performance.now();
    this.performanceMarks.set(name, {
      timestamp,
      metadata,
      timeSinceStart: timestamp - this.startTime
    });
    
    const mark = {
      type: 'mark',
      name,
      timestamp,
      metadata,
      timeSinceStart: timestamp - this.startTime
    };
    
    this.addTrace(mark);
    
    return mark;
  }

  /**
   * Measure time between two marks
   */
  measure(startMark, endMark) {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);
    
    if (!start || !end) {
      throw new Error(`Mark not found: ${startMark} or ${endMark}`);
    }
    
    const duration = end.timestamp - start.timestamp;
    
    const measurement = {
      type: 'measure',
      startMark,
      endMark,
      duration,
      timestamp: new Date().toISOString()
    };
    
    this.addTrace(measurement);
    
    return measurement;
  }

  /**
   * Log a debug message
   */
  debug(message, data = {}) {
    const debugEntry = {
      type: 'debug',
      message,
      data,
      timestamp: new Date().toISOString(),
      depth: this.traceDepth
    };
    
    this.addTrace(debugEntry);
  }

  /**
   * Log an error with full context
   */
  error(error, context = {}) {
    const errorEntry = {
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString(),
      depth: this.traceDepth
    };
    
    this.addTrace(errorEntry);
  }

  /**
   * Log a warning
   */
  warn(message, data = {}) {
    const warnEntry = {
      type: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
      depth: this.traceDepth
    };
    
    this.addTrace(warnEntry);
  }

  /**
   * Generate a unique trace ID
   */
  generateTraceId() {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all traces
   */
  getTraces() {
    return this.traces;
  }

  /**
   * Get traces by type
   */
  getTracesByType(type) {
    return this.traces.filter(trace => trace.type === type);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const traces = this.getTracesByType('end');
    const totalDuration = traces.reduce((sum, trace) => sum + trace.duration, 0);
    const averageDuration = traces.length > 0 ? totalDuration / traces.length : 0;
    
    return {
      totalTraces: this.traces.length,
      completedOperations: traces.length,
      totalDuration,
      averageDuration,
      slowestOperation: traces.reduce((slowest, trace) => 
        trace.duration > slowest.duration ? trace : slowest, 
        { duration: 0 }
      ),
      performanceMarks: Array.from(this.performanceMarks.entries())
    };
  }

  /**
   * Export traces to file
   */
  exportTraces(filename = null) {
    const exportFile = filename || `debug-traces-${Date.now()}.json`;
    const exportData = {
      summary: this.getPerformanceSummary(),
      traces: this.traces,
      options: this.options,
      sessionStart: new Date(this.startTime).toISOString()
    };
    
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`Traces exported to: ${exportFile}`);
    
    return exportFile;
  }

  /**
   * Clear all traces
   */
  clear() {
    this.traces = [];
    this.performanceMarks.clear();
    this.traceDepth = 0;
    this.startTime = performance.now();
  }

  /**
   * Close the tracer and cleanup
   */
  close() {
    if (this.logStream) {
      this.logStream.write(`\n=== Debug Session Ended: ${new Date().toISOString()} ===\n`);
      this.logStream.end();
    }
  }
}

// Create a global tracer instance
const globalTracer = new DebugTracer();

// Export the class and global instance
module.exports = {
  DebugTracer,
  tracer: globalTracer
};

// Add global convenience methods
global.trace = (operation, metadata) => globalTracer.trace(operation, metadata);
global.debug = (message, data) => globalTracer.debug(message, data);
global.mark = (name, metadata) => globalTracer.mark(name, metadata);
global.measure = (startMark, endMark) => globalTracer.measure(startMark, endMark);
global.warn = (message, data) => globalTracer.warn(message, data);
global.error = (error, context) => globalTracer.error(error, context);

console.log('Debug tracer loaded. Available globals: trace, debug, mark, measure, warn, error');
