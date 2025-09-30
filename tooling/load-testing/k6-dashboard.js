/**
 * k6 Load Test - Dashboard Routes
 * Tests dashboard performance under load with 100+ concurrent users
 * Target: p95 < 2s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const dashboardLoadRate = new Rate('dashboard_load_success');
const dashboardDuration = new Trend('dashboard_load_duration');

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'http_req_failed': ['rate<0.01'],    // Error rate should be below 1%
    'dashboard_load_success': ['rate>0.99'], // 99% success rate
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.DASHBOARD_URL || 'http://localhost:3000';

export default function () {
  // Test dashboard home
  const dashboardRes = http.get(`${BASE_URL}/app`);
  const dashboardSuccess = check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard loads in < 2s': (r) => r.timings.duration < 2000,
    'dashboard has content': (r) => r.body.length > 0,
  });
  dashboardLoadRate.add(dashboardSuccess);
  dashboardDuration.add(dashboardRes.timings.duration);

  sleep(1);

  // Test inventory page
  const inventoryRes = http.get(`${BASE_URL}/app/inventory`);
  check(inventoryRes, {
    'inventory status is 200': (r) => r.status === 200,
    'inventory loads in < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // Test sales page
  const salesRes = http.get(`${BASE_URL}/app/sales`);
  check(salesRes, {
    'sales status is 200': (r) => r.status === 200,
    'sales loads in < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(2);

  // Test orders page
  const ordersRes = http.get(`${BASE_URL}/app/orders`);
  check(ordersRes, {
    'orders status is 200': (r) => r.status === 200,
    'orders loads in < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'logs/k6-dashboard-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n' + indent + '✓ Dashboard Load Test Summary\n\n';
  
  summary += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s\n`;
  summary += indent + `Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += indent + 'Response Times:\n';
  summary += indent + `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += indent + `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += indent + `  max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;
  
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  if (p95 < 2000) {
    summary += indent + '✅ PASS: p95 < 2s target met\n';
  } else {
    summary += indent + '❌ FAIL: p95 exceeds 2s target\n';
  }
  
  return summary;
}
