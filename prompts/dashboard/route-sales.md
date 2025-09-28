# Route `/sales` — Revenue Analytics

## Scope
Deliver a deep-dive analytics surface focused on sales trends, product performance, and customer cohorts. Must support:
- Drilldowns: Date → Collection → Product → Variant (SKU) with breadcrumbs.
- KPI bands (GMV, Orders, AOV, Refunds, conversion, repurchase rate).
- Cohort highlights: top repeat customers, highest-order-value, time-to-second-purchase.
- Product tables: best sellers, laggards, overstock risk, attach-rate insights.
- Export: CSV/TSV for filtered datasets.

## Deliverables
- Remix route module with loader fetching mock analytics via data layer.
- Polaris UI: `Page`, `Tabs`, `Card`, `DataTable`, `Filters`, `Pagination`, `InlineGrid` for KPI tiles.
- Drilldown navigation preserving `dateRange`, `collectionId`, `productId`, `variantId` via search params.
- Chart components using `@shopify/polaris-viz` (sparkline, bar chart) with fallback skeletons.
- CSV export action stub (loader `action` returning `text/csv`) with TODO for background job if large payloads.

## Technical Notes
- Loader should parse query params with defaults (`period=28d`, `compare=previous_period`).
- Prefetch product drilldown data when hovering rows using Remix `prefetch`. Document how to avoid N+1 API calls.
- Use `seed-data` analytics scenarios; shape must align with Admin GraphQL query outputs for quick swap later.
- Add `meta` export for SEO route breadcrumbs within Shopify Admin.
- Include error boundaries for API failures (show toast + retry button).

## Dependencies
- `data-layer.md` Admin API queries for sales + product stats.
- `seed-data.md` sales & KPI scenarios.
- Shared date utilities + KPI component library from dashboard home route.

## Tasks
- [x] Define loader with param validation (zod) and mock data fetch.
- [x] Compose KPI header + filters (date range, channel, compare).
- [x] Implement drilldown tables with persisted params + `Link` wrappers.
- [x] Wire CSV export action and document TODO for async job.
- [x] Hook into overview widget to prefetch `/sales` data on click.
- [x] Update `overview.md` once skeleton + export stub ship.
- [x] Adopt shared dashboard filter helpers (range/query contract) alongside `/app` + `/orders` once extracted.

## Status / Notes
- Owner: Sales analytics agent (Codex)
- Blockers: Data-layer still needs to expose the live `/analytics/sales` endpoint + fixture payload so we can validate the adapter; Polaris Viz upgrade and background CSV streaming remain post-MVP items.
- Notes: Loader now parses `period`, `compare`, and drilldown params via zod and hydrates nested collection/product/variant datasets; breadcrumbs + drilldown tables persist selection through search params and expose best sellers/laggards/attach-rate/overstock insights. CSV export action returns the current drilldown view with TODO to stream via background worker when payloads grow (deferred). Dashboard overview prefetches the `/app/sales` route so the drilldown data is warm when navigating from "View sales". Shared date-range helpers are live across `/app`, `/app/orders`, and `/app/sales`. `npm run lint` from `dashboard/` passed 2025-10-04.
- Tests: `npm exec vitest run app/routes/__tests__/app.sales.test.ts` (seccomp WebSocket warning is expected; suite passes).
- Immediate focus: lock the live analytics query contract with Data-layer, keep the current tables/summary UI for MVP, and prep the loader/tests to switch to the live analytics adapter as soon as the contract lands (Polaris Viz + streaming work remains deferred).
