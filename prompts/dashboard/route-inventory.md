# Route `/inventory`

## Scope
Demand planning cockpit that highlights stock buckets and powers PO drafting:
- Summary cards: total SKUs at risk, weeks of cover, open PO budget.
- Buckets: **Need urgently (<48h)**, **Manufacturer air (≈30d lead)**, **Manufacturer sea (≈60d lead)**, **Overstock / promo**.
- SKU drill-in: velocity trend, on-hand + inbound, projected stockout date, recommended reorder quantity.
- Vendor planner: group items by supplier with editable draft quantities and planner notes.

## Deliverables
- Remix loader returning an `InventoryDashboardPayload` with bucket arrays, vendor groupings, and summary metrics backed by mock data.
- Polaris UI with summary cards, segmented bucket tabs, `IndexTable` for SKU metrics, and a detail drawer for SKU insights.
- Purchase order planner table with inline quantity editing and a Remix action that persists mock drafts + returns toast feedback.
- Export action stub that streams CSV (mock) for the current bucket/vendor selection.
- Integration hooks for `inventory/math.ts` helpers plus TODO markers for background job scheduling.

## Technical Notes
- Define shared types (zod or TypeScript) for loader/action payloads alongside the route module.
- Call into `inventory/math.ts` to compute safety stock, reorder points, and recommended order quantities; keep TODOs for real implementations.
- Provide placeholders for Shopify inventory levels + inbound PO sync as well as demand trend visualization (Polaris `LineChart` or skeleton).
- Ensure loader results support optimistic refresh after action mutations (Revalidate remix hooks).

## Dependencies
- `prompts/dashboard/data-layer.md` for inventory queries.
- `prompts/dashboard/seed-data.md` inventory mock dataset.
- `prompts/dashboard/database.md` `ProductVelocity`, `PurchaseOrder`, `Vendor` schema notes.

## Tasks
- [ ] Model loader payload + mock data for buckets, summary metrics, and vendor plans.
- [ ] Build Polaris layout with summary cards, bucket tabs, SKU tables, and detail drawer.
- [ ] Implement PO planner action with inline editing, optimistic toast, and CSV export stub.
- [ ] Document TODO integrations (Shopify inventory, inbound POs, background jobs, real math helpers).
- [ ] Update shared overview/dashboard prompt once the route is end-to-end ready.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
