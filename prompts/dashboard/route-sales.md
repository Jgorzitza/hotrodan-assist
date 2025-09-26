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
- [ ] Define loader with param validation (zod) and mock data fetch.
- [ ] Compose KPI header + filters (date range, channel, compare).
- [ ] Implement drilldown tables with persisted params + `Link` wrappers.
- [ ] Wire CSV export action and document TODO for async job.
- [ ] Hook into overview widget to prefetch `/sales` data on click.
- [ ] Update `overview.md` once skeleton + export stub ship.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Notes: Coordinate with data layer owner for query naming + types.
