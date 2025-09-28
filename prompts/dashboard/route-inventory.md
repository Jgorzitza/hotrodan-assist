# Route `/inventory` — Demand Planning

## Scope
Deliver a cockpit for demand planning and PO drafting:
- Buckets: Need urgently (<48h), Manufacturer air (≈30d), Manufacturer sea (≈60d), Overstock / promo.
- Metrics per SKU: velocity, safety stock, reorder point, projected stockout date, recommended reorder quantity.
- Vendor purchase-order planner with inline quantity edits, notes, and draft totals.
- SKU drill-in modal with demand trend placeholder and bucket context.
- Stubs for CSV export and action hooks that will later connect to background jobs + live Shopify inventory.

## Deliverables
- Remix loader returning an `InventoryDashboardPayload` (summary metrics, bucket metadata, SKU detail, vendor drafts) from mock data.
- Polaris UI composed of `Page`, `Layout`, `Tabs`, `IndexTable`, `Card`, `Modal`, `Banner`, and inline controls.
- Action handler supporting draft-save (mock persistence) and CSV export stubbed via JSON payload for client-side download.
- Inline editing for vendor drafts (quantities + notes) with optimistic UI and success badge feedback.
- Detail modal surfacing computed metrics and a temporary trend block (replace with Polaris `LineChart` later).

## Technical Notes
- Inventory mocks now use `app/lib/inventory/math.ts` to derive safety stock, reorder point, and stockout dates; buckets & vendors seeded with deterministic faker data.
- Loader/action both respect `USE_MOCK_DATA`; when false, they authenticate via Admin API stub before accessing mock builders.
- URL param `bucket` drives tab selection; actions accept `bucketId` / `vendorId` for targeted CSV exports.
- CSV export currently returns CSV text in JSON for client-side download; swap to streamed response once real data volume is wired.
- TODOs: replace trend placeholder with Polaris chart, persist drafts in real store, wire background jobs for bucket recompute + CSV exports >5k rows.

## Dependencies
- `seed-data.md` inventory scenarios + vendor metadata.
- `data-layer.md` inventory math + Shopify queries.
- `route-settings.md` thresholds for low stock/overstock.

## Tasks
- [x] Loader hooking into inventory overview mocks (math helpers ready for live wiring).
- [x] Summary cards + bucket tabs with URL-param persistence.
- [x] SKU `IndexTable` with detail modal and mock trend block.
- [x] PO planner action + inline editing with optimistic feedback.
- [x] CSV export stub + documentation.
- [ ] Swap mock trend block for Polaris chart + real analytics feed.
- [ ] Integrate live persistence (Shopify draft orders / background jobs) once data layer lands.

## Status / Notes
- Owner: Codex (Section 0 bootstrap)
- Blockers: pending live analytics + persistence layer to replace mock CSV + trend placeholder.
- Notes: `dashboard/app/routes/app.inventory.tsx` now renders bucket tabs, SKU table, detail modal, vendor planner, and an MCP signals card. Signals hydrate via `getMcpClient` when `ENABLE_MCP` and the settings toggle are enabled; otherwise copy nudges users to configure credentials. `dashboard/app/mocks/inventory.ts` supplies deterministic payloads per `mockState`. CSV export generates client-side download; TODO to stream once real data size known.
- Immediate focus: instrument chart visualization, hook real Shopify data, swap MCP mocks for the live endpoint once credentials land, and fold route into end-to-end testing once Admin credentials available.
