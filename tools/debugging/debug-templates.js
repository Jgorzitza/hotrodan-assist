#!/usr/bin/env node

/**
 * Debug templates for common debugging scenarios in Llama RAG
 */

const { DebugTracer } = require('./debug-tracer');

class DebugTemplates {
  constructor() {
    this.tracer = new DebugTracer({
      enableConsole: true,
      enableFile: true,
      logFile: 'debug-session.log',
      enableStackTrace: true
    });
  }

  /**
   * Template for debugging API requests
   */
  debugApiRequest(url, options = {}) {
    const endTrace = this.tracer.trace(`API Request: ${options.method || 'GET'} ${url}`, {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body
    });

    return {
      onSuccess: (response) => {
        endTrace(response, null);
        this.tracer.debug('API Request Success', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        return response;
      },
      onError: (error) => {
        endTrace(null, error);
        this.tracer.error(error, {
          url,
          method: options.method || 'GET',
          options
        });
        throw error;
      }
    };
  }

  /**
   * Template for debugging database operations
   */
  debugDatabaseOperation(operation, query, params = []) {
    const endTrace = this.tracer.trace(`Database ${operation}`, {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      paramCount: params.length,
      params: params.slice(0, 3) // Show first 3 params
    });

    return {
      onSuccess: (result) => {
        endTrace(result, null);
        this.tracer.debug('Database Operation Success', {
          rowCount: result.rowCount || result.length,
          operation
        });
        return result;
      },
      onError: (error) => {
        endTrace(null, error);
        this.tracer.error(error, {
          operation,
          query,
          params
        });
        throw error;
      }
    };
  }

  /**
   * Template for debugging function execution
   */
  debugFunction(func, functionName = func.name || 'anonymous') {
    return async (...args) => {
      const endTrace = this.tracer.trace(`Function: ${functionName}`, {
        argCount: args.length,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg)).slice(0, 3)
      });

      try {
        const result = await func(...args);
        endTrace(result, null);
        this.tracer.debug('Function Success', {
          functionName,
          resultType: typeof result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : undefined
        });
        return result;
      } catch (error) {
        endTrace(null, error);
        this.tracer.error(error, {
          functionName,
          args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg))
        });
        throw error;
      }
    };
  }

  /**
   * Template for debugging async operations
   */
  debugAsyncOperation(operationName, operation) {
    const endTrace = this.tracer.trace(`Async Operation: ${operationName}`);

    return operation()
      .then(result => {
        endTrace(result, null);
        this.tracer.debug('Async Operation Success', {
          operationName,
          resultType: typeof result
        });
        return result;
      })
      .catch(error => {
        endTrace(null, error);
        this.tracer.error(error, {
          operationName
        });
        throw error;
      });
  }

  /**
   * Template for debugging loops
   */
  debugLoop(loopName, iterations, loopFunction) {
    this.tracer.mark(`${loopName}-start`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const iterationTrace = this.tracer.trace(`${loopName} iteration ${i + 1}/${iterations}`);
      
      try {
        const result = loopFunction(i);
        iterationTrace(result, null);
        results.push(result);
      } catch (error) {
        iterationTrace(null, error);
        this.tracer.error(error, {
          loopName,
          iteration: i,
          totalIterations: iterations
        });
        throw error;
      }
    }
    
    this.tracer.mark(`${loopName}-end`);
    const measurement = this.tracer.measure(`${loopName}-start`, `${loopName}-end`);
    
    this.tracer.debug('Loop Completed', {
      loopName,
      iterations,
      totalDuration: measurement.duration,
      averagePerIteration: measurement.duration / iterations
    });
    
    return results;
  }

  /**
   * Template for debugging promise chains
   */
  debugPromiseChain(chainName, promise) {
    const endTrace = this.tracer.trace(`Promise Chain: ${chainName}`);

    return promise
      .then(result => {
        endTrace(result, null);
        this.tracer.debug('Promise Chain Success', {
          chainName,
          resultType: typeof result
        });
        return result;
      })
      .catch(error => {
        endTrace(null, error);
        this.tracer.error(error, {
          chainName
        });
        throw error;
      });
  }

  /**
   * Template for debugging memory usage
   */
  debugMemoryUsage(label = 'Memory Check') {
    const memoryUsage = process.memoryUsage();
    
    this.tracer.debug(label, {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)} MB`
    });

    return memoryUsage;
  }

  /**
   * Template for debugging performance bottlenecks
   */
  debugPerformance(testName, testFunction) {
    this.tracer.mark(`${testName}-start`);
    
    return testFunction()
      .then(result => {
        this.tracer.mark(`${testName}-end`);
        const measurement = this.tracer.measure(`${testName}-start`, `${testName}-end`);
        
        this.tracer.debug('Performance Test', {
          testName,
          duration: measurement.duration,
          resultType: typeof result
        });
        
        return { result, performance: measurement };
      })
      .catch(error => {
        this.tracer.error(error, { testName });
        throw error;
      });
  }

  /**
   * Template for debugging error handling
   */
  debugErrorHandling(context, errorHandler) {
    return (error) => {
      this.tracer.error(error, {
        context,
        errorType: error.constructor.name,
        errorMessage: error.message,
        stackTrace: error.stack
      });

      return errorHandler(error);
    };
  }

  /**
   * Template for debugging configuration loading
   */
  debugConfigLoading(configPath) {
    const endTrace = this.tracer.trace(`Config Loading: ${configPath}`);

    try {
      const config = require(configPath);
      endTrace(config, null);
      
      this.tracer.debug('Config Loaded Successfully', {
        configPath,
        configKeys: Object.keys(config),
        configSize: JSON.stringify(config).length
      });
      
      return config;
    } catch (error) {
      endTrace(null, error);
      this.tracer.error(error, {
        configPath,
        operation: 'config-loading'
      });
      throw error;
    }
  }

  /**
   * Export debug session
   */
  exportSession(filename = null) {
    return this.tracer.exportTraces(filename);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return this.tracer.getPerformanceSummary();
  }

  /**
   * Close debug session
   */
  close() {
    this.tracer.close();
  }
}

// Example usage and testing
if (require.main === module) {
  const debugTemplates = new DebugTemplates();

  // Test API request debugging
  console.log('\n=== Testing API Request Debugging ===');
  const apiDebug = debugTemplates.debugApiRequest('https://api.example.com/users', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' }
  });

  // Simulate success
  apiDebug.onSuccess({
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    data: { users: [] }
  });

  // Test function debugging
  console.log('\n=== Testing Function Debugging ===');
  const testFunction = (x, y) => x + y;
  const debuggedFunction = debugTemplates.debugFunction(testFunction, 'add');
  debuggedFunction(5, 3);

  // Test memory debugging
  console.log('\n=== Testing Memory Debugging ===');
  debugTemplates.debugMemoryUsage('Initial Memory');

  // Test performance debugging
  console.log('\n=== Testing Performance Debugging ===');
  debugTemplates.debugPerformance('Test Operation', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'test result';
  });

  // Export session
  console.log('\n=== Exporting Debug Session ===');
  const exportFile = debugTemplates.exportSession();
  console.log('Debug session exported to:', exportFile);

  // Show summary
  console.log('\n=== Debug Session Summary ===');
  console.log(JSON.stringify(debugTemplates.getSummary(), null, 2));

  debugTemplates.close();
}

module.exports = DebugTemplates;
