# Trace-First Debugging Guide

This guide provides comprehensive debugging templates and patterns for the Llama RAG project.

## Overview

The trace-first debugging approach emphasizes:
1. **Instrumentation First**: Add tracing before problems occur
2. **Structured Logging**: Consistent, searchable log formats
3. **Performance Monitoring**: Built-in timing and performance metrics
4. **Error Context**: Rich error information with full context
5. **Session Management**: Exportable debug sessions for analysis

## Quick Start

### Basic Usage

```javascript
// Load the debug tracer
const { tracer } = require('./tools/debugging/debug-tracer');

// Simple function tracing
const endTrace = tracer.trace('my-function');
try {
  const result = await myFunction();
  endTrace(result);
  return result;
} catch (error) {
  endTrace(null, error);
  throw error;
}
```

### Using Debug Templates

```javascript
const DebugTemplates = require('./tools/debugging/debug-templates');
const debug = new DebugTemplates();

// Debug API requests
const apiDebug = debug.debugApiRequest('https://api.example.com/data');
fetch('https://api.example.com/data')
  .then(apiDebug.onSuccess)
  .catch(apiDebug.onError);

// Debug functions
const debuggedFunction = debug.debugFunction(myFunction, 'myFunction');
const result = await debuggedFunction(arg1, arg2);
```

## Debug Templates

### 1. API Request Debugging

```javascript
const apiDebug = debug.debugApiRequest(url, options);

fetch(url, options)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(apiDebug.onSuccess)
  .catch(apiDebug.onError);
```

**What it traces:**
- Request details (URL, method, headers)
- Response status and headers
- Request/response timing
- Error details with full context

### 2. Database Operation Debugging

```javascript
const dbDebug = debug.debugDatabaseOperation('SELECT', query, params);

client.query(query, params)
  .then(result => {
    dbDebug.onSuccess(result);
    return result.rows;
  })
  .catch(dbDebug.onError);
```

**What it traces:**
- SQL query (truncated for readability)
- Parameter count and values
- Result row count
- Query execution time
- Database errors with full query context

### 3. Function Execution Debugging

```javascript
const debuggedFunction = debug.debugFunction(myFunction, 'myFunction');
const result = await debuggedFunction(arg1, arg2);
```

**What it traces:**
- Function name and arguments
- Execution time
- Return value type and structure
- Errors with argument context

### 4. Async Operation Debugging

```javascript
const operation = debug.debugAsyncOperation('file-upload', () => uploadFile(file));
const result = await operation;
```

**What it traces:**
- Operation name and timing
- Success/failure status
- Result type information

### 5. Loop Debugging

```javascript
const results = debug.debugLoop('process-items', items.length, (index) => {
  return processItem(items[index]);
});
```

**What it traces:**
- Loop name and iteration count
- Per-iteration timing
- Total loop duration
- Average time per iteration
- Individual iteration errors

### 6. Promise Chain Debugging

```javascript
const chain = debug.debugPromiseChain('data-processing', 
  fetchData()
    .then(transformData)
    .then(saveData)
);
const result = await chain;
```

**What it traces:**
- Chain name and timing
- Success/failure status
- Result information

### 7. Memory Usage Debugging

```javascript
debug.debugMemoryUsage('before-processing');
await processLargeDataset();
debug.debugMemoryUsage('after-processing');
```

**What it traces:**
- RSS memory usage
- Heap total and used
- External memory
- Array buffer usage

### 8. Performance Testing

```javascript
const { result, performance } = await debug.debugPerformance('algorithm-test', () => {
  return runAlgorithm(data);
});
console.log(`Algorithm took ${performance.duration}ms`);
```

**What it traces:**
- Test name and duration
- Result type information
- Performance metrics

### 9. Error Handling Debugging

```javascript
const errorHandler = debug.debugErrorHandling('user-authentication', (error) => {
  // Custom error handling logic
  return handleAuthError(error);
});

try {
  await authenticateUser(credentials);
} catch (error) {
  errorHandler(error);
}
```

**What it traces:**
- Error context
- Error type and message
- Stack trace
- Custom handling results

### 10. Configuration Loading Debugging

```javascript
const config = debug.debugConfigLoading('./config/database.json');
```

**What it traces:**
- Config file path
- Loaded configuration keys
- Configuration size
- Loading errors

## Advanced Features

### Custom Tracing

```javascript
// Start a custom trace
const endTrace = tracer.trace('custom-operation', {
  userId: user.id,
  operationType: 'data-export'
});

// Add debug information
tracer.debug('Processing user data', {
  recordCount: records.length,
  exportFormat: 'csv'
});

// Mark performance points
tracer.mark('validation-start');
await validateData(records);
tracer.mark('validation-end');

// Measure between marks
const validationTime = tracer.measure('validation-start', 'validation-end');
console.log(`Validation took ${validationTime.duration}ms`);

// End the trace
endTrace({ exportedRecords: records.length });
```

### Session Management

```javascript
// Export debug session
const sessionFile = debug.exportSession('debug-session-2025-09-29.json');

// Get performance summary
const summary = debug.getSummary();
console.log(`Total operations: ${summary.totalTraces}`);
console.log(`Average duration: ${summary.averageDuration}ms`);
console.log(`Slowest operation: ${summary.slowestOperation.operation}`);

// Close session
debug.close();
```

## Integration Patterns

### Express.js Middleware

```javascript
const debugMiddleware = (req, res, next) => {
  const endTrace = tracer.trace(`HTTP ${req.method} ${req.path}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.on('finish', () => {
    endTrace({
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};

app.use(debugMiddleware);
```

### Database Connection Wrapping

```javascript
const originalQuery = db.query.bind(db);
db.query = (query, params) => {
  const dbDebug = debug.debugDatabaseOperation('QUERY', query, params);
  return originalQuery(query, params)
    .then(dbDebug.onSuccess)
    .catch(dbDebug.onError);
};
```

### Error Boundary Pattern

```javascript
const withErrorBoundary = (operation, context) => {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      tracer.error(error, {
        context,
        arguments: args,
        operation: operation.name
      });
      throw error;
    }
  };
};
```

## Best Practices

### 1. Trace Early and Often
- Add tracing to critical paths before issues occur
- Trace at module boundaries and integration points
- Include user context and operation metadata

### 2. Use Meaningful Names
- Use descriptive operation names: "user-authentication" not "auth"
- Include relevant context in metadata
- Use consistent naming conventions

### 3. Handle Errors Gracefully
- Always call the trace end function, even on errors
- Include error context and stack traces
- Don't let tracing interfere with error handling

### 4. Performance Considerations
- Use conditional tracing in production
- Avoid tracing in tight loops unless necessary
- Export sessions periodically to prevent memory buildup

### 5. Session Management
- Export debug sessions for analysis
- Use unique filenames with timestamps
- Clean up old debug files regularly

## Debugging Workflow

### 1. Development Phase
```javascript
// Add comprehensive tracing during development
const debug = new DebugTemplates({
  enableConsole: true,
  enableFile: true,
  enableStackTrace: true
});
```

### 2. Testing Phase
```javascript
// Use tracing to verify test scenarios
const testDebug = new DebugTemplates({
  enableConsole: false,
  enableFile: true,
  logFile: 'test-debug.log'
});
```

### 3. Production Monitoring
```javascript
// Lightweight tracing for production
const prodDebug = new DebugTemplates({
  enableConsole: false,
  enableFile: true,
  logFile: 'production-debug.log',
  enableStackTrace: false
});
```

### 4. Issue Investigation
```javascript
// Enhanced tracing for debugging issues
const issueDebug = new DebugTemplates({
  enableConsole: true,
  enableFile: true,
  enableStackTrace: true,
  maxTraceDepth: 20
});
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**: Export sessions regularly and clear traces
2. **Performance Impact**: Use conditional tracing in production
3. **Log File Size**: Implement log rotation and cleanup
4. **Missing Context**: Always include relevant metadata

### Debug Session Analysis

```javascript
// Load and analyze debug session
const session = JSON.parse(fs.readFileSync('debug-session.json'));
const errors = session.traces.filter(t => t.type === 'error');
const slowOperations = session.traces
  .filter(t => t.duration > 1000)
  .sort((a, b) => b.duration - a.duration);

console.log(`Found ${errors.length} errors`);
console.log(`Slowest operation: ${slowOperations[0]?.operation}`);
```

## Integration with CI/CD

### Automated Debug Collection

```yaml
# .github/workflows/debug.yml
- name: Collect Debug Information
  run: |
    node tools/debugging/debug-templates.js
    cp debug-session.json debug-artifacts/
```

### Performance Regression Detection

```javascript
// Compare performance metrics
const baseline = JSON.parse(fs.readFileSync('baseline-performance.json'));
const current = debug.getSummary();

if (current.averageDuration > baseline.averageDuration * 1.2) {
  console.warn('Performance regression detected');
}
```

This comprehensive debugging system provides the tools needed to trace, monitor, and debug the Llama RAG project effectively.
