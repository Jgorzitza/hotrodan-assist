# Route `/inventory` — Demand Planning

## Scope
Provide actionable inventory planning tools:
- Buckets: Need urgently (local supplier <2 days), Manufacturer sea (20d+30d), Manufacturer air (30d+5d).
- Metrics: velocity, stockout date, safety stock, reorder point, overstock warnings with promo suggestions.
- Purchase Order planner drafting recommended POs by vendor.
- Trend charts for product velocity and forecast vs actual.
- Integrations for manual adjustments, CSV import/export, and background sync jobs.

## Deliverables
- Remix loader supplying bucketed inventory data + vendor recommendations from mock dataset.
- Polaris UI: `Page`, `Layout`, `Card`, `Tabs`, `IndexTable`, `Chart` component for trends, `Modal` for PO planner.
- Action endpoints for creating draft POs (mock persistence) and tagging promo suggestions.
- Helper components: `InventoryBadge`, `TrendSparkline`, `RiskCallout`.
- Empty state for fully stocked scenario + skeletons for loading.

## Technical Notes
- Loader should compute bucket thresholds via `app/lib/inventory/math.ts`; ensure math functions accept overrides from settings.
- Provide toggle for viewing data by vendor vs product; persists via URL params.
- PO planner action writes to mock store + returns toast; TODO for integration with actual workflow (possibly Shopify draft orders or external ERP).
- Export route for CSV should stream results; include TODO for background queue when >5k rows.
- Ensure accessibility: table captions, descriptive aria labels on risk badges.

## Dependencies
- `seed-data.md` inventory scenarios + vendor metadata.
- `data-layer.md` inventory math + Shopify queries.
- `route-settings.md` thresholds for low stock/overstock.

## Tasks
- [ ] Loader hooking into inventory math + mock data.
- [ ] Buckets/tabs UI with search + filters.
- [ ] Trend charts and risk callouts.
- [ ] PO planner modal/action stub with optimistic updates.
- [ ] CSV export stub + documentation.
- [ ] Update overview + testing docs once implemented.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Notes: coordinate with data layer to ensure math functions share types with Prisma models.
