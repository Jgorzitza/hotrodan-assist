# MVP Alignment Sweep (2025-09-27 11:45 MDT)

## Purpose
Evaluate Section 0 scope vs. MVP needs, trim in-progress bloat, and re-sequence agent focus so each surface ships only what materially supports the first operator-ready milestone.

## MVP Guardrails
- Deliver operator-facing dashboard slices that unblock fulfillment (Orders) and triage (Inbox) once Sync write APIs land.
- Keep Sales/SEO surfaces informative but lightweight until live data contracts harden—tables + existing Polaris components are sufficient for MVP.
- Maintain RAG freshness (ingest + goldens) so AI drafts stay trustworthy; no new retrieval experiments until production data loop closes.
- Ensure secrets + settings persistence exists only to the level required for Shopify + MCP toggles; defer enterprise-grade rotation/KMS until post-MVP.

## Immediate Directives
1. **Sync/Webhooks** – Prioritise finalising the write API payloads (`assign`, `fulfill`, `returns`, `support`) and documenting response envelopes. Defer BullMQ/Upstash worker build-out; keep handlers synchronous with mock fallbacks until MVP. Update prompt once payload schema is frozen.
2. **Orders Dashboard** – As soon as Sync confirms payloads, swap the mocks for live API calls and extend Vitest coverage for the real responses. Skip new features (bulk exports, additional tabs) until after MVP.
3. **Sales Dashboard** – Halt the Polaris Viz upgrade and background export queueing. Focus on contracting with Data-layer for the live analytics query; keep the existing table/summary UI.
4. **Data-layer** – Finish the Shopify Admin query module and `withStoreSession` wiring needed by Orders/Sales. Retention jobs + cron orchestration move to backlog.
5. **Settings** – Limit scope to thresholds, toggles, and credential storage required for Shopify/MCP. Document (but don’t implement) the KMS migration.
6. **Webhooks Queue** – Leave BullMQ worker stubs in place but feature-flagged off; document the MVP expectation (synchronous processing + Prisma persistence only).
7. **RAG** – Continue monitoring sitemap timestamps; only trigger ingest/goldens when deltas appear to avoid burning cycles.

## Deferred / To Backlog
- Polaris Viz 2025.x upgrade + streaming background exports.
- Upstash/BullMQ worker processors for Zoho + analytics refresh.
- Advanced retention/rotation jobs in Settings/Data-layer.
- Inventory charting upgrades until analytics feed is live.

## Cross-Team Contracts
- Update `prompts/dashboard/route-sales.md` and `prompts/dashboard/webhooks.md` immediate focus to reflect the trimmed scope.
- `coordination/dependency-matrix.md` entry for Sync/Webhooks should call out the frozen payload schema commitment before Orders resumes feature work.
- Data-layer to publish Shopify analytics query response shape (shared between Sales + Overview) before Sales restarts live wiring.

## Next Checkpoint
- Re-evaluate backlog once Sync payloads are merged and Sales live data scaffolding lands, or by 2025-09-28 12:00 MDT.
