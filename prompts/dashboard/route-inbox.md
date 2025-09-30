# Dashboard Route: Inbox

## Purpose
- Single place for approvers to triage AI-generated drafts from email + chat before they are sent.
- Surface highest-SLA items first, expose confidence/model/cost metadata, and provide fast paths to approve, edit, escalate, or add notes.

## Primary Objects & Fields
- **Draft** (pending answer produced by `/assistants/draft`). Required per item:
  - `draft_id`
  - `channel` (`email` | `chat` | future `sms`/`social`)
  - `conversation_id`
  - `customer_display` (name/email + optional avatar initials)
  - `subject` (email subject) or `chat_topic`
  - `incoming_excerpt` (first ~160 chars of customer message, HTML stripped)
  - `draft_excerpt` (first ~160 chars of drafted reply)
  - `confidence` (`0-1` float)
  - `llm_model` (ex: `gpt-4o-mini`, `gpt-5`)
  - `estimated_tokens_in`, `estimated_tokens_out`, `usd_cost`
  - `created_at` (UTC ISO string)
  - `sla_deadline` (UTC ISO) — optional; derive `time_remaining`
  - `status` (`pending`, `needs_review`, `escalated`, `sent`)
  - `tags` (array; e.g. `refund`, `inventory`, `high_value`)
  - `auto_escalated` (bool) + `auto_escalation_reason`
  - `assigned_to`, `escalation_reason`
  - `time_remaining_seconds`, `overdue`
- **Detail extras** (returned by `/dashboard/inbox/{draft_id}`):
  - `incoming_text`, `draft_text`
  - `source_snippets` (array of {title, url, relevance_score})
  - `conversation_summary` (last exchanges)
  - `order_context` (structured customer/shop data)
  - `notes`, `learning_notes`
  - `audit_log`, `metadata`, `model_latency_ms`, `sent_at`

## Data Contracts / API Calls
1. `GET /dashboard/inbox?status=pending,needs_review&channel=email,chat`
   ```json
   {
     "items": [
       {
         "draft_id": "d123",
         "channel": "email",
         "conversation_id": "zoho:abc123",
         "customer_display": "Katy W. <katy@example.com>",
         "subject": "Return label for AN-8 kit",
         "incoming_excerpt": "Hey team, the fittings...",
         "draft_excerpt": "Hi Katy - Thanks for reaching out...",
         "confidence": 0.82,
         "llm_model": "gpt-4o-mini",
         "estimated_tokens_in": 1112,
         "estimated_tokens_out": 428,
         "usd_cost": 0.0132,
         "created_at": "2024-06-04T23:55:11Z",
         "sla_deadline": "2024-06-05T00:25:11Z",
         "status": "pending",
         "tags": ["returns", "shopify"],
         "auto_escalated": false,
         "auto_escalation_reason": null,
         "time_remaining_seconds": 1800,
         "overdue": false,
         "assigned_to": null,
         "escalation_reason": null
       }
     ],
     "next_cursor": "...",
     "total": 25
   }
   ```
   - `status` accepts comma-separated values or `all`; defaults to `pending`.
   - `channel` filter optional, supports comma-separated values.
   - Paginate 25 at a time, sorted by `sla_deadline` then `created_at`.
   - Always include `X-Refresh-After` header (seconds) for polling cadence (default 30).
2. `GET /dashboard/inbox/{draft_id}` → expanded payload described above.
3. `GET /dashboard/inbox/stats`
   ```json
   {
     "pending": 18,
     "needs_review": 5,
     "escalated": 2,
     "sent": 41,
     "sent_today": 9,
     "avg_confidence_pending": 0.74,
     "overdue": 3,
     "generated_at": "2024-06-04T23:59:59Z"
   }
   ```
   - Accepts optional `channel` filter.
   - Drives header metrics (`Pending`, `Avg confidence`, `Today sent`, overdue badge).
4. Mutations (unchanged contracts, but enriched server-side behavior):
   - `/assistants/approve` (`{draft_id, approver_user_id, send_copy_to_customer?, escalate_to_specialist?, escalation_reason?, assign_to?}`)
   - `/assistants/edit` (`{draft_id, editor_user_id, final_text, learning_notes?, send_copy_to_customer?}`)
   - `/assistants/escalate` (`{draft_id, requester_user_id, reason, assigned_to?}`)
   - `/assistants/notes` (`{draft_id, author_user_id, text}`)

## Layout (Desktop-first)
1. **Header bar**
   - Title `Inbox`
   - Filter chips: `All`, `Email`, `Chat`, (future) `High SLA`, `Escalated`.
   - Quick stats: `Pending`, `Avg confidence`, `Today sent`, `Overdue` badge.
   - Primary CTA: `New draft` (manual compose).
2. **Main grid** (40/60 split)
   - Left: virtualized queue table. Columns: Channel icon, Customer, Subject/Topic, Confidence pill, Model, Cost, Time remaining, Tags.
   - Row interactions: single click opens detail; double-click triggers approve modal.
   - Column sorting; default `Time remaining` ascending.
   - Bulk actions: `Approve`, `Assign`, `Dismiss`.
   - Empty/error/loading states defined (skeleton rows, inline error banner).
3. **Right detail drawer**
   - Customer snapshot (orders, LTV, sentiment).
   - Conversation timeline: latest customer message + drafted reply, raw HTML/plain toggle.
   - `Sources` accordion (links + snippet preview).
   - Model metadata: model, tokens, cost, inference time, auto-escalation reason.
   - Action buttons: `Approve & Send`, `Edit & Send`, `Request escalation`, `Mark as needs info`.
   - Notes section (multi-user, timestamped) and audit trail footer.

## Mobile Considerations
- Stacked card list; detail opens via modal.
- Keep approve/edit buttons sticky at bottom.
- Fold secondary metadata (sources, audit) into accordions.

## Realtime / Polling
- Poll list endpoint every 30s unless `X-Refresh-After` indicates shorter cadence.
- Websocket (`/ws/inbox`) broadcasts `draft.created`, `draft.sent`, `draft.escalated`, `draft.updated` events; UI should merge updates without full reload.

## Sorting & Prioritization Rules
1. Items with negative `time_remaining_seconds` pinned under `Overdue` with red accent.
2. `confidence < 0.6` → warning icon + recommended edits (future integration).
3. Badge `Needs specialist` when `auto_escalated=true` or escalation status set.

## Flows
- **Approve**: optimistic removal + POST `/assistants/approve`; rollback on failure. Optional `send_copy_to_customer` confirmation.
- **Edit**: open rich text editor seeded with draft; POST `/assistants/edit` with `learning_notes`; lock draft while rerun occurs if needed.
- **Escalate**: requires comment, optional assignment; triggers webhook (`/webhooks/escalations`) and highlights row.
- **Notes**: inline composer; appends to draft, emits websocket `draft.updated`.

## Observability
- Metrics: queue depth, avg confidence, approval vs edit rate, mean time in queue, escalation rate.
- Front-end telemetry: API latency, error surfaces, time-to-decision per draft (Datadog segment `dashboard.inbox`).

## Permissions
- Only show drafts if user role includes `can_review_drafts`.
- Hide cost/model metadata for roles without `can_view_costs`.

## Open Questions
1. Need inline diff vs original customer message during edit?
2. Should low-confidence drafts force checklist before approve?
3. Require API for bulk assignment beyond UI support?

## TODO (handoff to engineering)
- Implement `GET /dashboard/inbox` + detail endpoint.
- Add websocket push for live updates.
- Flesh out audit log data model (who viewed, who snoozed, etc.).
- Decide on markdown vs HTML rendering for drafts.
- Keep inbox regression tests current (`tests/test_assistants_inbox.py`, `app/assistants/tests/test_inbox_routes.py`).

## Status / Notes
- Owner: Codex (Section 0 bootstrap)
- Blockers: Frontend still needs to consume `metrics.confidence_histogram` and expose active mock scenario selector; histogram bucket spec may still evolve but backend ships low/medium/high today.
- Notes: Added `app/assistants/mock_data.py` with seeded `default`/`heavy`/`empty` scenarios and `seed_mock_scenario` loader for demos/tests; websocket + SSE streams now handshake with delivery adapter metadata, supported event list, and live metrics snapshots, and broadcasts include enriched feedback payloads with histogram snapshots. Smoke coverage exercises handshake/ping flows and SSE feedback updates (pytest commands noted below pending env deps).
- Reminder: Ensure privacy guardrails—never expose full PII in mock data.
- Next: Hook dashboard fetchers to the SSE/websocket handshake metadata (delivery channels, mock scenarios) for optimistic list refresh, align UI feedback widgets with the enriched event payloads, and prep adapter registry shims for live provider credentials.
