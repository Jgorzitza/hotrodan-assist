# RAG Metrics Reference

Exposed metrics
- JSON: GET /metrics (fields: query_count, avg_response_time_ms, error_count, error_rate, last_query_time, queries_by_hour, recent_response_times_ms)
- Prometheus: GET /prometheus (example families)
  - rag_requests_total{route="query"}
  - rag_rate_limited_total
  - process_* (from Python runtime)
  - python_gc_* (from client)

Scrape target
- http://localhost:8001/prometheus

Operational use
- Alert if rag_requests_total does not increase over expected intervals during active periods
- Alert if error_rate > 1% sustained over 5 minutes
- Track p95 latency externally via synthetic tests and record in coordination notes

Dashboards
- Panel suggestions:
  - Requests by route over time (rag_requests_total delta)
  - Error rate (%) (error_count / query_count from JSON metrics)
  - Avg response time (ms)
  - Recent response times distribution
  - Rate-limited count trend (rag_rate_limited_total)
