# Route `/inbox` — AI-Assisted Support Queue

## Scope
Centralize customer inquiries across channels with AI drafting + approval workflow:
- Unified queue combining Shopify contact form, email, and social (stubs for FB/IG/TikTok).
- Metrics header: Outstanding, Overdue >12h, Closed today, AI approvals pending, Idea candidates.
- Conversation list with filters (channel, status, sentiment, assigned user).
- Conversation detail panel with AI draft, approve/edit loop, message timeline, attachments.
- Feedback capture: thumbs-up/down on AI drafts to feed training metrics.

## Deliverables
- Remix loader providing queue summaries and conversations from mock data.
- Polaris `Page`, `Layout`, `PageActions`, `IndexTable` (or resource list) with segmented filters.
- Draft approval UI (RichText/Markdown editor) with action handlers recording approval vs edit.
- Metrics panel components reused on overview widget.
- Error boundary for adapter outages + fallback manual entry form.

## Technical Notes
- Leverage `MCP_FORCE_MOCKS` to supply deterministic inbox scenarios (empty, heavy load, outage).
- Action handler should persist edits to mock store and surface success toast; TODO comment for integration with `app/lib/inbox/providers` + `AiDraft` Prisma model.
- Implement `useFetcher` for approve/edit actions to avoid full reload.
- Provide `meta` description referencing AI workflow guardrails.
- Include channel badges + SLA indicators; overdue >12h threshold should pull from settings.

## Dependencies
- `seed-data.md` inbox scenarios.
- `data-layer.md` inbox provider interfaces + AI draft logging.
- `route-settings.md` for overdue threshold + feature toggles.

## Tasks
- [x] Loader returning queue metrics + conversation list (pagination TBD).
- [x] Filters for channel/status/assigned, persisted via URL params.
- [x] Draft approval form with approve/edit actions + optimistic updates.
- [x] Metrics header aligned with overview widget counters.
- [x] Documented TODOs inline for AI training signal + MCP integration (future).

## Status / Notes
- Owner: Codex (Approval App UI agent)
- Blockers: none; feedback telemetry backlog tracked separately.
- Notes: `dashboard/app/routes/app.inbox.tsx` now wires channel/status/assignee filters via search params, renders timeline + attachment context from the updated mocks, and powers approve/edit/feedback actions with `useFetcher` + optimistic state. Draft persistence lives in `app/mocks/inbox-drafts.server.ts` (feedback history included) with smoke coverage under `dashboard/app/routes/__tests__/app.inbox.test.ts`. Fresh pass introduced `app/lib/inbox/events.server.ts` + `app/routes/app.inbox.stream.ts` to broadcast SSE updates, and the route subscribes via `EventSource` so feedback/draft changes land without reload. Vitest smoke coverage now includes `dashboard/app/routes/__tests__/app.inbox.stream.test.ts` to validate the handshake and live event bridge.
- Reminder: Ensure privacy guardrails—never expose full PII in mock data.
- Immediate focus: align the SSE bridge with the live Assistants provider once credentials land, layer in a connection health indicator/toast fallback for EventSource failures, and map mock draft persistence onto the real provider-backed store (AiDraft model) behind a feature flag.
