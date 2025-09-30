/**
 * k6 Load Test - Inventory API
 * Tests inventory API performance under load
 * Target: p95 < 500ms for API endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const apiSuccessRate = new Rate('inventory_api_success');
const apiDuration = new Trend('inventory_api_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 150 },
    { duration: '3m', target: 150 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'inventory_api_success': ['rate>0.99'],
  },
};

const BASE_URL = __ENV.INVENTORY_API_URL || 'http://localhost:8004';

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health responds in < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.5);

  const stockRes = http.get(`${BASE_URL}/api/v1/inventory/stock-levels`);
  const stockSuccess = check(stockRes, {
    'stock status is 200': (r) => r.status === 200,
    'stock responds in < 500ms': (r) => r.timings.duration < 500,
  });
  apiSuccessRate.add(stockSuccess);
  apiDuration.add(stockRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'logs/k6-inventory-api-summary.json': JSON.stringify(data),
  };
}
