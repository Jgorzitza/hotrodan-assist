# Inventory Performance — p95 Target and Measurement Plan

Target
- p95 route latency: ≤ 400ms under 1000+ SKUs (mock or sampled live data)

Measurement Plan
1) Dataset
   - Use existing mocks to simulate 1000+ SKUs (dashboard/app/mocks/inventory.ts)
   - Optionally, hydrate from live Shopify once credentials are provided
2) Harness
   - Run route-level loaders in isolation using Vitest to gather baseline timings
   - For end-to-end, use a local server and autocannon (or k6) to sample p95
3) Runs
   - 3 warm-up runs, then 5 measured runs per route
   - Record p50/p95/err% and heap usage
4) Reporting
   - Append results and bottlenecks to feedback/inventory.md
   - Capture improvements with diffs and timing tables

Next Steps
- Prepare an e2e perf script (dev-only) that hits inventory routes and collects p95
- Optimize query/mapping hot paths based on results

## Latest Benchmarks — 2025-10-02T17:23Z
- Command: `npx vitest run --root dashboard --config vitest.config.ts dashboard/app/routes/__tests__/api.inventory.perf.test.ts`
- Results (mock dataset, 1200 SKUs, warm-up excluded from sampling):
  - `inventory_generation_ms` p95 ≈ 102.40ms (median ~38.9ms)
  - `csv_export_pagination_ms` p95 ≈ 3.85ms
- Interpretation: Warm-up separation keeps both loaders comfortably inside the ≤400ms target. Inventory generation remains dominated by deterministic SKU synthesis; CSV pagination is effectively instantaneous under mock loads.
- Action: Re-run the perf harness once live Shopify data flows (USE_MOCK_DATA=false) and capture comparative metrics.

### Historical Snapshot — 2025-10-01T22:20Z
- `inventory_generation_ms` p95 ≈ 28.45ms
- `csv_export_pagination_ms` p95 ≈ 4.86ms
