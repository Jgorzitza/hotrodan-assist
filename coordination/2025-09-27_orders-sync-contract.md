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

## Immediate focus
1. Orders loader now consumes `/sync/orders`; alerts stream wired via `/sync/orders/alerts` with reconnection/backoff.
2. Extend optimistic tests (returns/inventory) after Sync finalizes write API payloads for returns + inventory escalations.
