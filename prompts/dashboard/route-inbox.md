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
- Leverage `USE_MOCK_DATA` to supply deterministic inbox scenarios (empty, heavy load, outage).
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
- [ ] Filters for channel/status/assigned, persisted via URL params.
- [ ] Draft approval form with approve/edit actions + optimistic updates.
- [x] Metrics header aligned with overview widget counters.
- [x] Documented TODOs inline for AI training signal + MCP integration (future).

## Status / Notes
- Owner: Codex (Section 0 bootstrap)
- Blockers: filters + approve/edit workflow.
- Notes: `dashboard/app/routes/app.inbox.tsx` renders metrics + list from mock scenarios; provider stub in `app/lib/inbox/providers.ts` ready for swap-in. Loader now respects `filter` + `pageSize` params and surfaces mock-state banners via `getInboxData`.
- Reminder: Ensure privacy guardrails—never expose full PII in mock data.
- Next: layer in filters, implement approve/edit actions using provider client + persist feedback metrics.
