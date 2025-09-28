# Orders ↔ Sync Contract Notes (2025-09-27)

## Pagination
- Sync exposes `ofs:<base36>` offset cursors via `/sync/orders`.
- Query params supported: `tab`, `pageSize`, `cursor`, `direction`, `status`, `priority`, `assigned_to`, `date_start`, `date_end`.
- Response includes offset cursors plus `shopifyCursor` for rewind handling.

## Shipments cadence
- Driven by Shopify fulfillment webhooks plus a 15-minute poller fallback.
- `tracking_pending` = orders older than 2h without tracking number.
- `delayed` = in-transit shipments with last update >24h.
- Sync emits refresh pings after each webhook and poller tick.

## Timeline events
- Last ten timeline entries emitted with `{ ts, event, details }`, covering payment, inventory hold/release, fulfillment transitions, returns, and support escalations.

## Assignment persistence
- `OrderAssignment` table in Sync service records dashboard owners. Shopify metafields remain read-only for now.

## Returns feed
- State machine: `awaiting_label` → `label_generated` → `in_transit` → `inspection` → `awaiting_refund` → `completed`, with `deny` / `cancelled` terminal paths.
- Orders dashboard actions (`approve_refund`, `deny`, `request_inspection`) POST to Sync; Sync fans out to Shopify/ERP once integrations land.

## Alerts & data gaps
- Alerts arrive via `/sync/orders/alerts` (SSE) with polling fallback; data gaps reuse the same channel.

## Actions (write APIs)
- `/sync/orders/assign` — `{ orderIds, assignee }` recorded in Postgres and queued for Shopify metafield sync.
- `/sync/orders/fulfill` — `{ orderIds, tracking? }` acknowledges fulfillment and clears shipment alerts.
- `/sync/orders/support` — `{ orderId, conversationId?, note }` escalates through support queue and reassigns to assistant.
- `/sync/orders/returns` — `{ orderId, action, note? }` advances the returns state machine and triggers ERP integration.

### v1.2 Request / Response Envelope
- Dashboard app appends `shop_domain` (string) to every POST body before dispatching.
- Responses from all four endpoints share the envelope `{ success: boolean; message?: string; updatedOrders: [] }`.
  - `/sync/orders/assign` → `updatedOrders: Array<{ id: string; assignedTo: string }>`
  - `/sync/orders/fulfill` → `updatedOrders: Array<{ id: string; fulfillmentStatus: string; tracking?: { number: string; carrier: string } }>`
  - `/sync/orders/support` → `updatedOrders: Array<{ id: string; supportThread: string }>`
  - `/sync/orders/returns` → `updatedOrders: []` (no per-order patch today)
- Messages default to "Assigned…"/"Marked…"/"Support requested…"/"Return updated…" when Sync omits `message`.

## Immediate focus (2025-09-27)
1. Sync confirms the assign/fulfill/support/returns payload schema frozen at v1.2 (see processors dispatch notes); Orders dashboard should now flip `USE_MOCK_DATA=false` and wire actions directly to these endpoints, logging any response mismatches here.
2. Extend optimistic/Vitest coverage for returns + inventory escalations against the live payloads; capture regressions and notify Sync if schema adjustments are required.
3. Any proposed prompt focus change must be captured in `coordination/orders-feedback.md` for Program Manager review before updating `prompts/dashboard/route-orders.md`.

## 2025-09-27 Updates
- Orders dashboard actions now use a shared `postOrdersSyncAction` helper so every assign/fulfill/support/returns request hits the v1.2 `/sync/orders/*` endpoints with consistent headers and `shop_domain` context; error surfaces mention the Sync HTTP status/body when failures bubble up.
- Added Vitest coverage for fulfill, support (multi-order), and returns flows while `USE_MOCK_DATA=false`; sync-mode suite passes (`npx vitest run app/routes/__tests__/app.orders.test.ts`), aside from a sandboxed Vite WebSocket port warning that does not block the run.
- Loader now resolves shipment + return entries back to their Shopify order IDs when Sync omits `order_id` (numeric/order-number fallback), so optimistic tracking/return actions keep the right identifiers; added coverage in `app/lib/orders/__tests__/sync.server.test.ts` for numeric and hashtag order references.
- 2025-09-27 15:29 UTC: Re-ran `npx vitest run app/routes/__tests__/app.orders.test.ts` with `USE_MOCK_DATA=false`; assign/fulfill/support/returns endpoints accepted v1.2 payloads without regressions, and the expected Vite WebSocket listen error remains the only warning.
