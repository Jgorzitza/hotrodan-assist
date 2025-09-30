# Data Layer & Modules

## Scope
Define typed service modules powering Shopify Admin queries, SEO adapters, inbox integrations, and utility helpers consumed by Remix routes.

## Deliverables
- `app/lib/shopify/admin.server.ts`: Admin GraphQL client factory with retry + query cost backoff.
- `app/lib/shopify/queries.ts`: typed query builders for KPIs, orders by status, inventory low-stock, customer repeat metrics.
- `app/lib/seo/{ga4,gsc,bing}.server.ts`: adapters exposing mock + live methods that normalize analytics responses.
- `app/lib/seo/aggregate.server.ts`: helper combining adapter payloads into canonical `SeoInsight`, `SeoKeywordRow`, `SeoPageRow` structures.
- `app/lib/inbox/providers.server.ts`: channel adapter stubs (email, FB/IG, TikTok) returning mock ticket data.
- `app/lib/inventory/math.ts`: velocity, stockout date, reorder point, safety stock calculations.
- `app/lib/mcp/{types,client}.ts`: Storefront MCP boundary with typed tool definitions and mock client.

## SEO Aggregation Notes
- Loader contract expects `mergeSeoAnalytics({ property, source, range, severityThresholds })` which calls GA4/GSC/Bing adapters and merges by canonical key.
- Canonical identifiers:
  - Keyword → lowercase query string.
  - Page → normalized URL path (strip protocol/domain, ensure trailing slash consistency).
- Aggregation rules:
  - Sum numeric metrics (`clicks`, `impressions`, `entrances`).
  - Average ranking metrics (`position`, `lcp` placeholder) weighted by impressions.
  - Maintain per-source breakdown in `sourceMeta` array for tooltip drilldowns.
- Severity scoring helper (`scoreSeoInsight`) takes delta magnitude, index status, and settings thresholds (pulled from `/settings` loader or defaults) to label insights as `now`, `soon`, or `later`.
- Adapters should expose `supportsMetric(metricKey)` to guard UI from displaying unavailable columns per source (e.g., Bing missing conversions).
- Provide TODO markers for OAuth token retrieval and caching (Redis or Prisma-backed) before hitting real APIs.
- Normalized return type:
  ```ts
  export interface SeoAggregate {
    insights: SeoInsight[];
    actions: SeoActionItem[];
    keywords: SeoKeywordRow[];
    pages: SeoPageRow[];
    sourceMeta: Record<SeoMetricSource, SourceSummary>;
    generatedAt: string;
  }
  ```
- `SourceSummary` should surface adapter latency, record counts, last refreshed timestamp, and any warnings (quota nearing, missing scopes).
- TODO: Add instrumentation hook to emit metrics to future telemetry service.

## Shopify Data Contracts
- `SalesOverview`, `OrderFlag`, `InventorySnapshot`, `InboxTicket`, `SeoInsight`, `McpRecommendation` definitions live under `app/types/dashboard.ts` to avoid circular imports.
- Provide Zod schemas alongside TypeScript interfaces (`app/types/dashboard.server.ts`) to validate external payloads (Shopify Admin responses, SEO adapters).
- GraphQL query builders should export generics: `queryShopify<T>(client, query, variables)` returning typed data with runtime validation (Zod optional now, TODO for later).

## Caching & Rate Limits
- Introduce `app/lib/cache.server.ts` with interface supporting `get`, `set`, `withCache` using Prisma or Redis depending on env; stub implementation can be in-memory during mock phase.
- SEO aggregation should cache per store + property + range for at least 15 minutes; bust cache when new data is requested with `?forceRefresh=1` or when settings change.
- Admin GraphQL queries should respect query cost budget of 1000 per minute. Provide helper that inspects `extensions.cost` and delays if approaching limits.
- TODO: Evaluate GA4 batch reporting API vs realtime to reduce quota burn once live keys available.

## Admin GraphQL Queries
- `GET_DASHBOARD_KPIS` → totals, comparisons (YoY/MoM/WoW) using `salesPerformance`.
- `GET_ORDERS_BY_STATUS` → filters for unshipped, delivery issues, completed buckets with timeline data.
- `GET_INVENTORY_OVERVIEW` → `inventoryLevels` + `productVariants` to compute velocity/stockout.
- `GET_CUSTOMER_REPEAT_METRICS` → returning customer stats and cohort repeat rate.
- Each query builder should return `{ query, variables }` typed objects to keep loaders declarative.

## Implementation Guidelines
- Wrap Shopify client with `p-limit` to avoid exceeding query cost; exponential backoff on 429/5xx responses.
- Provide `withStoreSession(shopDomain, callback)` helper to fetch tokens from Prisma `Store` and inject into adapters.
- Adapters return `{ data, meta }` where `meta` contains request timing, sampling, and quota usage for telemetry.
- When `USE_MOCK_DATA` is true, adapter factory resolves to mock implementation that reads from `app/mocks/` helpers.

## Tasks
- [ ] Draft Admin GraphQL client factory with rate limiter stub.
- [ ] Enumerate GraphQL queries and TypeScript types required by routes.
- [ ] Implement SEO adapter interfaces + aggregate helper with mock pipeline.
- [ ] Flesh out inbox provider and inventory math modules.
- [ ] Define MCP types/client and showcase example usage in dashboard widget.
- [ ] Document integration points in `overview.md` as modules become ready.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Next Check-in: Link actual module paths once generated; confirm `/settings` exposes severity threshold values before scoring runs against live APIs.
