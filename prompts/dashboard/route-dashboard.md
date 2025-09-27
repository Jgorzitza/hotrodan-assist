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
- Sales sparkline renders with `@shopify/polaris-viz` and mock trend data until Admin adapters land.
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
- [x] Swap sparkline placeholder to `@shopify/polaris-viz` once the dependency is available.

## Status / Notes
- Owner: Dashboard Home agent (Codex)
- Blockers: Real Admin adapters pending data layer contract.
- Links: `dashboard/app/routes/app._index.tsx`, `dashboard/app/mocks/dashboard.ts`.
- Notes: Added `~/lib/date-range` helper and wired loaders/routes to resolve the shared `range` token; dashboard links now append both `range` and normalized period params so `/sales`, `/orders`, `/inbox`, `/inventory`, and `/seo` open with matching filters. Sales sparkline continues to render via Polaris Viz and prefetch now respects the canonical range URL; MCP banner still downgrades gracefully when toggles are disabled.
- Tests: `npm run lint` (dashboard) — ✅; `npm exec vitest run app/routes/__tests__/app.orders.test.ts --config vitest.config.ts` (expected WS warning only).
- Immediate focus: smoke the updated deep links in the embedded shell to ensure the shared range token persists across routes, and reuse `buildDashboardRangeSelection` for any new range-aware routes to avoid duplicated parsing logic.
