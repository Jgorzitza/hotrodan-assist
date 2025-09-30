import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimes = new Trend('response_times');

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Increase to 50 users
    { duration: '2m', target: 100 },   // Peak at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
    errors: ['rate<0.05'],             // Less than 5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Test 1: Get orders list
  let ordersResponse = http.get(`${BASE_URL}/sync/orders`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(ordersResponse, {
    'orders status is 200': (r) => r.status === 200,
    'orders response time < 2s': (r) => r.timings.duration < 2000,
    'orders has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.orders !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(ordersResponse.status !== 200);
  responseTimes.add(ordersResponse.timings.duration);

  sleep(1);

  // Test 2: Get orders with filters
  let filteredResponse = http.get(`${BASE_URL}/sync/orders?status=pending&pageSize=25`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(filteredResponse, {
    'filtered orders status is 200': (r) => r.status === 200,
    'filtered response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(filteredResponse.status !== 200);
  responseTimes.add(filteredResponse.timings.duration);

  sleep(1);

  // Test 3: Get orders alerts (SSE endpoint test)
  let alertsResponse = http.get(`${BASE_URL}/sync/orders/alerts`, {
    headers: { 'Accept': 'application/json' },
    timeout: '5s',
  });

  check(alertsResponse, {
    'alerts status is 200': (r) => r.status === 200,
    'alerts response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(alertsResponse.status !== 200);
  responseTimes.add(alertsResponse.timings.duration);

  sleep(2);

  // Test 4: Customer summary endpoint
  let customerResponse = http.get(`${BASE_URL}/customer_summary?email=test@example.com`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(customerResponse, {
    'customer summary status is 200': (r) => r.status === 200,
    'customer response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(customerResponse.status !== 200);
  responseTimes.add(customerResponse.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/home/justin/llama_rag/load_tests/results/dashboard-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const colors = opts.enableColors !== false;

  let out = '\n';
  out += `${indent}====== Dashboard API Load Test Summary ======\n\n`;

  const http_reqs = data.metrics.http_reqs?.values;
  if (http_reqs) {
    out += `${indent}Total Requests: ${http_reqs.count}\n`;
    out += `${indent}Requests/sec: ${http_reqs.rate.toFixed(2)}\n`;
  }

  const http_req_duration = data.metrics.http_req_duration?.values;
  if (http_req_duration) {
    out += `${indent}Avg Response Time: ${http_req_duration.avg.toFixed(2)}ms\n`;
    out += `${indent}P95 Response Time: ${http_req_duration['p(95)'].toFixed(2)}ms\n`;
    out += `${indent}P99 Response Time: ${http_req_duration['p(99)'].toFixed(2)}ms\n`;
  }

  const http_req_failed = data.metrics.http_req_failed?.values;
  if (http_req_failed) {
    out += `${indent}Error Rate: ${(http_req_failed.rate * 100).toFixed(2)}%\n`;
  }

  out += `\n${indent}=========================================\n`;

  return out;
}