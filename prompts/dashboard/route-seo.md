# Route `/seo`

## Scope
SEO operations cockpit powered by GA4, Google Search Console, and Bing adapters with mock data in development:
- Global controls for property, source, date range, severity, search type, and mock scenario toggle.
- Insight cards highlighting content trends, keyword movers, page health, indexation anomalies, and Core Web Vitals placeholders.
- Action list segmented by severity (**Now**, **Soon**, **Later**) with owner/due badges and quick links.
- Keyword and page performance tables with source badges, position deltas, conversion/bounce metrics, and CSV export.
- Credential banner when any adapter lacks OAuth configuration.

## Deliverables
- Remix loader (`dashboard/app/routes/seo.tsx`) calling `mergeSeoAnalytics` to aggregate adapter results.
- Polaris UI with filters, severity snapshot card, insight/action sections, `DataTable` components, and empty-state handling.
- CSV export resource route (`dashboard/app/routes/seo.export.ts`) reusing mock builders and current filters.
- Mock dataset helpers (`dashboard/app/mocks/seo/*`) aligned with shared types for deterministic scenarios.
- Adapter stubs + aggregator (`dashboard/app/lib/seo/*`) ready to swap from mocks to real APIs.

## Technical Notes
- Filters sync to URL params; mock scenarios selectable via `?mockState=` for QA.
- When `USE_MOCK_DATA` is true (default), loaders pull from mock factories; adapters throw TODO errors if invoked live.
- Severity scoring currently driven by mock data; thresholds configurable once `/settings` route exposes values.
- Source filtering applied server-side (keywords/pages filtered post-aggregation).
- CSV builder includes metadata header lines (`# source: gsc`, etc.) for traceability.
- Cache helper (`withCache`) memoizes live adapter responses (15m placeholder TTL) once real APIs are wired.
- TODOs required before production: OAuth token retrieval, persistent cache (Redis/Prisma), pagination for large datasets, MCP recommendations hookup.

## Dependencies
- `prompts/dashboard/data-layer.md`: defines adapter + caching expectations.
- `prompts/dashboard/seed-data.md`: documents mock factories and scenarios.
- `prompts/dashboard/route-settings.md`: credential storage and severity threshold inputs.
- `prompts/dashboard/overview.md`: update status once live APIs wired.

## Tasks
- [x] Define shared SEO types, mock helpers, and aggregation loader.
- [x] Build Polaris UI (filters, cards, tables, banner, empty states) backed by mocks.
- [x] Implement CSV export route respecting filters.
- [x] Add inline TODO comments for OAuth wiring, caching, MCP hooks, and background refresh jobs.
- [x] Update overview/testing docs with implementation status and scenarios.

## Data Contracts
- `SeoDashboardFilters`: `{ property; source; range; severity; searchType; mockState }`.
- `SeoInsight`: `{ id; title; description; metric; delta; deltaDirection; severity; sourceMeta; relatedUrl? }`.
- `SeoActionItem`: `{ id; insightId?; title; recommendation; severity; ownerHint?; suggestedDue? }`.
- `SeoKeywordRow`: `{ query; clicks; impressions; ctr; position; positionDelta; landingUrl; source; lastUpdated }`.
- `SeoPageRow`: `{ path; title; entrances; exits; conversions; conversionRate; bounceRate; indexStatus; topReferrers; source }`.
- `SeoAuthState`: `{ hasGa4Auth; hasGscAuth; hasBingAuth }`.
- `SeoAggregate`: `{ filters; insights; actions; keywords; pages; auth; sourceMeta; generatedAt }`.

## Component Breakdown
- `SeoFilters`: Polaris `Select` cluster for property/source/date/severity/search type + mock toggle.
- `SeveritySnapshot`: badge summary of counts (Now/Soon/Later).
- `SeoInsightCards`: cards with severity + metric badges and CTA link.
- `SeoActionList`: severity-ordered list with owner/due badges.
- `SeoKeywordTable`: `DataTable` with source badge column and position delta formatting.
- `SeoPageTable`: `DataTable` with conversion/bounce percentages and index status badge.
- `SeoCredentialBanner`: critical card linking to `/settings` when any adapter disconnected.
- `SeoExportButtons`: inline buttons per table hitting `/seo/export` (future fetcher for streaming).
- `SeoEmptyState`: Polaris `EmptyState` for zero-data scenarios.
- Tests: `dashboard/app/tests/seo.aggregate.test.ts` (`npx vitest run --config dashboard/vitest.config.ts`).

## Mock Scenarios
- `base`: default mix of insights/actions with all providers connected.
- `warning`: heightened coverage errors + Bing auth gap.
- `empty`: zero keyword/page rows for empty-state testing.
- `error`: adapters unavailable; banner should surface connection prompt.
- Scenario override via `?mockState=warning` (and others) supported in loader + mocks.

## Telemetry
- Stub plan: log loader execution time, adapter latency, severity distribution (TODO integrate structured logger).
- Track CSV export events (`seo_export_keywords`, `seo_export_pages`) with filters once analytics pipeline ready.
- Future: MCP recommendation click tracking + export job metrics.

## Implementation Snapshot
- Loader + UI: `dashboard/app/routes/seo.tsx` (uses `mergeSeoAnalytics`, Polaris components).
- Export handler: `dashboard/app/routes/seo.export.ts`.
- Aggregation + adapters: `dashboard/app/lib/seo/{aggregate,ga4,gsc,bing}.server.ts` and `types.ts`.
- Mocks: `dashboard/app/mocks/seo/{index,scenarios}.ts` with deterministic data + CSV builder.
- Shared constants: `dashboard/app/utils/constants.server.ts`.

## Status / Notes
- Owner: _unassigned_
- Blockers: need OAuth + caching design, MCP integration plan.
- Next Check-in: inline TODOs + overview/testing docs update after hooking real adapters.
