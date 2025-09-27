# Route `/` — Dashboard Home

## Scope
Build the embedded Polaris experience for the main dashboard landing page. It must surface:
- Sales Overview widget (GMV, Orders, AOV, Refunds, YoY/MoM/WoW comparisons, sparkline charts).
- Orders Attention buckets (Open & Unfulfilled, Tracking issues, Delivery issues).
- Customer Inquiries snapshot (outstanding, >12h overdue, AI approvals pending).
- Inventory snapshot (low stock threshold, POs in-flight, overstock prompts).
- SEO highlights (traffic delta, rising queries/pages, critical issues).
- Global date range selector synced to URL params and shared across other routes.

## Deliverables
- Remix loader/action stubs pulling mock data from `seed-data` helpers.
- Polaris page shell with App Bridge `Frame`, top-level nav hook-in, date range picker component.
- Reusable widget components (cards, KPI tiles, sparkline wrapper) ready for live data.
- Link-through interactions to `/sales`, `/orders`, `/inbox`, `/inventory`, `/seo` preserving filters.
- TODO markers where real data wiring will connect to Admin GraphQL + MCP.

## Technical Notes
- Use Polaris `Page`, `Layout`, `Card`, `BlockStack`, `DataTable`, `InlineStack`, `Text`, `Badge`.
- Sparkline placeholder via lightweight chart lib (e.g., `@shopify/polaris-viz` or `recharts`); include mock dataset.
- Date range state stored via search params + Remix `useSearchParams`; share helper with other routes.
- Emphasize 1.5s load target → prefetch mock data in loader and render skeletons while loading.

## Dependencies
- `seed-data.md` definitions for sales, orders, inbox, inventory, SEO.
- Shared date utils (ensure `data-layer.md` exposes helper signature).

## Tasks
- [x] Define loader returning typed mock response and URL param parsing (`dashboard/app/routes/app._index.tsx`).
- [x] Build Polaris layout with navigation breadcrumbs + range picker.
- [x] Implement widget components with mock content and click handlers (orders, inbox, inventory, SEO).
- [x] Document integration points (Admin GraphQL queries, MCP call for recommendations).
- [x] Update `overview.md` status once UI skeleton renders with mocks.
- [ ] Swap sparkline placeholder to `@shopify/polaris-viz` once the dependency is available.

## Status / Notes
- Owner: Dashboard Home agent (Codex)
- Blockers: Waiting on `@shopify/polaris-viz` adoption to render the sales sparkline; real Admin adapters pending data layer contract.
- Links: `dashboard/app/routes/app._index.tsx`, `dashboard/app/mocks/dashboard.ts`.
- Notes: Loader shares the `range` query param with other routes and respects `USE_MOCK_DATA`; orders buckets preserve deep-link filters via `href` targets. When `ENABLE_MCP` and the settings toggle are on, the loader hydrates the MCP insight card; otherwise it coaches users to enable the integration. Sparkline still placeholder text—replace with Polaris Viz once package lands and confirm shared range helper lives alongside `/sales` + `/orders` filters.
- Tests: Previous session validated with `npm run lint --workspace dashboard` and `npm exec vitest run --root dashboard --config ../vitest.config.ts`.
