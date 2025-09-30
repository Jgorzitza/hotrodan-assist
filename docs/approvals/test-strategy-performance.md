# Performance Test Strategy

## Goals
- Measure throughput and latency under realistic workloads.
- Identify bottlenecks (SQLite locks, CPU usage, auto-rule evaluation time).

## Workload Scenarios
1. **Baseline**: 10 requests/min, sequential approvals.
2. **Burst**: 100 requests/min for 5 minutes (simulate spike).
3. **Sustained Load**: 50 requests/min for 30 minutes.
4. **Concurrent Actions**: 20 concurrent actions on different approvals.

## Tooling
- k6 or Locust for HTTP load tests.
- pytest-benchmark for engine-only microbenchmarks.

## Metrics
- Response time percentiles (p50, p95, p99).
- Error rate.
- DB lock frequency.
- System resource usage (CPU, memory, disk I/O).

## Acceptance Criteria
- p95 latency < 500ms under baseline load.
- Zero DB lock errors under burst scenario.
- Graceful degradation with backpressure (retry or throttle) during sustained load.

## Preparation
- Populate database with sample workflows and approvals.
- Ensure monitoring stack collects metrics.

Prepared during overnight documentation.
