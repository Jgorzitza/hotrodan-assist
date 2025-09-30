# Seed & Mock Data Plan

## Goals
- Provide deterministic, type-safe mock data powering every dashboard route until live integrations exist.
- Mirror the shapes consumed by Remix loaders and UI components so replacing mocks with live adapters is a drop-in change.
- Capture realistic ranges, outliers, and status permutations so QA can validate happy, empty, warning, and error states.

## Dataset Inventory
- `app/mocks/sales.ts`: totals (daily/weekly/monthly), trend deltas, channel attribution, forecast variance scenarios.
- `app/mocks/orders.ts`: paginated orders with status mix (Paid, Processing, Fulfilled, Refunded), timeline events, fulfillment SLA edge cases.
- `app/mocks/inbox.ts`: support tickets, priority flags, sentiment, assignment, canned responses for empty and overdue queues.
- `app/mocks/inventory.ts`: catalog summaries, low-stock alerts, backorder and preorder examples, velocity metrics.
- `app/mocks/kpis.ts`: reusable KPI cards (AOV, conversion, returning customers) with threshold metadata for warning states.
- `app/mocks/seo/*`: keyword rankings, crawl issues, content opportunities, severity scoring inputs per source (GA4, GSC, Bing).
- `app/mocks/settings.ts`: merchant profile, plan limits, feature flags, SEO credential flags.
- `app/mocks/shared.ts`: helpers for currency formatting, seeded faker setup, reusable date ranges.

## File Layout
```
app/
  mocks/
    index.ts              // central exports + USE_MOCK_DATA gate
    factories/
      dates.ts            // deterministic date helpers
      numbers.ts          // seeded number utilities
    sales.ts
    orders.ts
    inbox.ts
    inventory.ts
    seo/
      insights.ts
      keywords.ts
      pages.ts
      actions.ts
      exports.ts
    settings.ts
    kpis.ts
```

## SEO Mock Dataset Blueprint
- Shared enums: `SeoMetricSource = 'ga4' | 'gsc' | 'bing' | 'combined'`; `SeoDateRangeKey = '7d' | '28d' | '90d' | 'custom'`.
- `getMockSeoInsights({ property, source, range })` → list of `{ id, title, description, metric, metricUnit, delta, deltaDirection, severity, source, relatedUrl }`.
- `getMockSeoActions({ severity })` → prioritized remediation items with `{ id, insightId, title, recommendation, severity, ownerHint, suggestedDue }`.
- `getMockSeoKeywords({ property, range, source })` → keyword rows with clicks, impressions, ctr, position, positionDelta, landingUrl, source badge.
- `getMockSeoPages({ property, range, source })` → page metrics with entrances, exits, conversions, bounceRate, topReferrers, indexStatus.
- `getMockSeoAuthState()` → `{ hasGa4Auth, hasGscAuth, hasBingAuth }` for banner toggles.
- `buildSeoCsv({ dataset, filters, rows })` → string builder that prefixes metadata lines (`# source: gsc`, `# range: 28d`) before headers and data rows.
- Include at least one empty dataset scenario per helper to drive skeleton/empty UI states via `mockState` query parameter.

## Data Generation Strategy
- Use `@faker-js/faker` with deterministic seeds per dataset (e.g., `faker.seed(42)` for base, `faker.seed(4242)` for warnings).
- Prefer factory functions returning typed records (`SalesOverview`, `SeoKeywordRow`) over static JSON so we can tweak counts per scenario.
- Export scenario-specific helpers like `getSeoScenario('warning')` that flip severity thresholds and include credential gaps.
- Keep payload sizes under 100 rows per table to maintain sub-second loader times; provide pagination metadata, even if mocks load all rows.

## Integration Pattern
- Toggle mocks via `USE_MOCK_DATA` (server env). When true, loaders call mock factories; otherwise they delegate to live adapters.
- Allow override via `?mockState=empty` in dev; each factory should accept `state?: 'base' | 'empty' | 'warning' | 'error'`.
- Route loaders should include `sourceMeta` field to help UI render badges and pass-through to CSV builder.

## Tasks
- [ ] Define TypeScript interfaces per dataset and export from `app/types/dashboard.ts`.
- [ ] Scaffold `app/mocks/` directory and shared faker utilities.
- [ ] Implement primary scenario factories for each dataset (base, empty, warning, error).
- [ ] Wire `USE_MOCK_DATA` gating into Remix loaders and document usage in `README`.
- [ ] Add unit tests under `app/mocks/__tests__` ensuring deterministic outputs and shape parity.
- [ ] Document developer workflow for switching scenarios.
- [ ] Flesh out SEO mock helpers + CSV builder described above and link to `/seo` loader implementation.

## Documentation & Handoff
- Reference these mock entry points in route docs under `prompts/dashboard` when scaffolding loaders.
- Update this file when new datasets or fields are added; note when mocks must cover additional edge cases (e.g., Core Web Vitals once real metrics ship).
- Consider creating `scripts/snapshot-mocks.ts` to emit JSON for QA automation if needed.
