# Route `/orders` — Fulfillment Control Tower

## Scope
Build an operational workspace for fulfillment leads handling pick/pack/ship, stalled payments, and returns. Must cover:
- SLA-focused backlog buckets: awaiting fulfillment, awaiting tracking, overdue, holds (payment, inventory, address, manual check).
- Priority overlays for VIP/rush orders with aging + ship-by countdown.
- Shipment health panel: tracking pending, carrier delays, delivered today.
- Returns + post-sale follow up: pending stages, refund exposure, recurring reasons.
- Inventory friction callouts linking to `/inventory` and suggested workarounds.
- Global filters: date range, channel (online/pos/draft), tag (VIP/rush), owner (assistant/human/unassigned).

## Deliverables
- Remix loader/action pair reading mock orders, shipments, and returns from seed helpers; expose aggregated metrics + paginated order list.
- Polaris UI: `Page`, `Layout`, `Card`, `IndexTable`, `DataTable`, `Badge`, `Banner`, `Tag`, `InlineGrid`, `Tabs`, `SkeletonDisplayText`.
- Orders table with selectable rows, inline priority + issue badges, bulk actions (assign, mark shipped, request support follow-up).
- Detail drawer/modal showing customer info, fulfillment history, support thread links, and timeline of events.
- Shipment + returns cards with CTA buttons (e.g., "Add tracking", "Trigger follow-up") wired to actions with optimistic feedback.
- Toast + banner surfaces for data gaps (e.g., tracking sync failures) and escalations.

## Data Contracts
- **Loader Response (`/dashboard/orders?tab=...`)**
  ```json
  {
    "period": { "label": "Last 7 days", "start": "ISO-8601", "end": "ISO-8601" },
    "metrics": {
      "total_orders": 42,
      "awaiting_fulfillment": 6,
      "awaiting_tracking": 3,
      "overdue": 4,
      "overdue_pct": 0.19,
      "avg_fulfillment_hours": 16.4,
      "breaches": 2
    },
    "orders": {
      "items": [
        {
          "id": "gid://shopify/Order/123",
          "order_number": "#4721",
          "placed_at": "ISO-8601",
          "ship_by": "ISO-8601",
          "status": "awaiting_fulfillment",
          "priority": "vip",
          "value_usd": 1890,
          "issue": "inventory",
          "assigned_to": "unassigned",
          "age_hours": 28.5,
          "support_thread": "conversation:c812",
          "timeline": [
            { "ts": "ISO-8601", "event": "payment_captured" },
            { "ts": "ISO-8601", "event": "inventory_hold", "details": "AN-8 hose kit backordered" }
          ]
        }
      ],
      "page_info": { "cursor": "opaque", "has_next_page": true }
    },
    "shipments": {
      "tracking_pending": [{ "order_number": "#4726", "expected_ship_date": "ISO-8601", "owner": "assistant" }],
      "delayed": [{ "order_number": "#4712", "carrier": "UPS", "delay_hours": 26, "last_update": "ISO-8601" }],
      "delivered_today": 9
    },
    "returns": {
      "pending": [{ "order_number": "#4705", "stage": "inspection", "reason": "hose length", "age_days": 3.0 }],
      "refunds_due": 2,
      "refund_value_usd": 640
    },
    "inventory_blocks": [{ "sku": "AN8-KIT", "name": "AN-8 Hose Kit", "orders_waiting": 4, "on_hand": 0, "eta": "ISO-8601" }],
    "alerts": ["Tracking sync skipped last run"],
    "data_gaps": []
  }
  ```
- **Actions**
  - `POST /dashboard/orders/assign` → body `{ orderIds: string[], assignee: string }`.
  - `POST /dashboard/orders/mark-fulfilled` → body `{ orderIds: string[], tracking: { number: string, carrier: string } }`.
  - `POST /dashboard/orders/request-support` → body `{ orderId: string, conversationId?: string, note: string }`.
  - `POST /dashboard/orders/returns` → body `{ orderId: string, action: "approve_refund" | "deny" | "request_inspection", note?: string }`.
  - Responses: `{ success: boolean, toast: { status: "success"|"error", message: string }, updatedOrder?: Order }` with TODOs for background queue handoff once async work queues exist.

## Technical Notes
- Loader parses `status`, `priority`, `assigned_to`, `date_start`, `date_end`, `cursor`; validate via zod schema and default to "Last 7 days".
- Aggregate metrics computed server-side (overdue %, average fulfillment time) and surfaced in `Fulfillment Pulse` summary tiles.
- Use shared date utilities + currency formatter from data layer; ensure amounts display as `$X.XK` when ≥$1,000.
- Orders table should support sticky first column (order # + priority) and responsive collapse on mobile (use `IndexTable` condensed).
- Implement optimistic updates for status changes; rollback on failure with inline error.
- Provide `useFetcher` hooks for quick inline actions (assign, add tracking, mark refunded).
- Document TODOs for real integrations: Shopify Admin GraphQL (orders/fulfillments), shipping carrier webhook, Zoho email linking.

## Dependencies
- `data-layer.md` — order/fulfillment queries, carrier tracking integration plan.
- `seed-data.md` — mock orders, shipments, returns, and priority scenarios.
- `testing.md` — smoke checklist for fulfillment workflows, regression list.
- `route-inventory.md` — shared inventory block callouts + thresholds.

## Tasks
- [x] Loader with param validation, aggregation, and paginated order fetch.
- [x] Fulfillment Pulse summary tiles + SLA callouts.
- [x] Orders table + detail drawer with inline actions.
- [x] Shipments + returns panels with optimistic mutations.
- [x] Inventory hold callouts linking to `/inventory`.
- [x] Wire toast/banner system for alerts + data gaps.
- [x] Update overview/testing docs once skeleton loads with mocks.

## Observability & Alerts
- Emit metric counters for backlog buckets, SLA breaches, delayed shipments, and refunds awaiting approval (export via StatsD → Datadog dashboards).
- Structured logs (`order_id`, `action`, `actor`, `duration_ms`, `source=dashboard.orders`) for every mutation; include correlation ID from Shopify webhook if present.
- Trigger PagerDuty warning when overdue orders ≥ threshold for >15m or when delayed shipments list contains carrier delay >24h (align thresholds with `route-inventory.md`).
- Surface UI banners sourced from alert stream (Kafka/Redis pub-sub) with acknowledge/learn-more links; fallback to polling if websocket unavailable.

## Open Questions
- Should VIP + rush filters default on during business hours to reduce missed high-priority orders?
- Do we escalate inventory holds automatically to procurement, or should dashboard owners triage first?
- What’s the handshake with accounting for refunds beyond threshold (e.g., >$1K) — require dual approval in UI?
- Will shipment delays feed from carrier webhooks in near-real time, or depend on batch polling? Impacts refresh cadence.

## Status / Notes
- Owner: Orders Control Tower agent (Codex)
- Blockers: None; Sync write API payloads (assign/fulfill/support/returns) frozen at v1.2.
- Sync dependency: `/sync/orders` loader + `/sync/orders/alerts` SSE are live; assign/fulfill/support/returns actions proxy to Sync when mocks disabled.
- Notes: Loader now carries range/channel/tag/owner filters and ships IDs through shipments/returns; UI wires those filters, bulk follow-ups, and optimistic shipment/return actions with updated support modal. Prompts/testing docs refreshed with the new flow. `npm run lint` from `dashboard/` passed 2025-10-04, confirming the latest TypeScript + ESLint fixes landed. Sync mutations now flow through `postOrdersSyncAction`, so assign/fulfill/support/returns hit the live endpoints with consistent headers + error surfacing, and Vitest covers these sync-mode paths. Latest pass (`npx vitest run app/lib/orders/__tests__/sync.server.test.ts`) confirms shipments/returns are normalized back to Shopify order IDs even when Sync only returns numeric or order-number references.
- Immediate focus: finish swapping the loader/actions to the live Sync write APIs now that the payload schema is frozen (log findings in `coordination/2025-09-27_orders-sync-contract.md`), extend Vitest coverage for assign/fulfill/support flows under `USE_MOCK_DATA=false`, and partner with Inventory to keep blocker callouts aligned as thresholds shift.
