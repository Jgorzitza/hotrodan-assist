# Agent Restart Commands & Responsibilities

> For full context and rationale, see **AGENT_PLAYBOOK.md** in this folder.


Keep this document updated as scopes evolve. Before launching a session, confirm your target prompt/doc is current. Pause before hitting the Codex context limit (~750k tokens): run tests, commit work, update the relevant prompt + session summary, then restart.

| Agent | Launch Command | Primary Focus | Pause Checklist |
| --- | --- | --- | --- |
| RAG & Corrections | `codex --prompt handover/AGENTS.md --section "RAG + Ingest" --branch feature/rag-refresh` | Keep ingest scripts, corrections, and goldens authoritative; maintain Chroma freshness | Run `python run_goldens.py`; update `agents.md`; commit ingest changes |
| Assistants API & Drafts | `codex --prompt prompts/dashboard/data-layer.md --focus assistants --branch feature/assistants-db` | Align the DB-backed drafts service with adapters and Approval App contracts | Run new service tests; document API changes in prompts |
| Approval App UI | `codex --prompt prompts/dashboard/route-inbox.md --focus approval-app --branch feature/approval-app` | Keep operator UI synced with Assistants endpoints; add smoke tests | Update templates/docs; log manual QA in `testing.md` |
| Sync & Webhooks Service | `codex --prompt prompts/dashboard/webhooks.md --branch feature/sync-webhooks` | Shopify/Zoho ingest stubs, HMAC validation, registration helper, queue hooks | Run webhook unit tests; capture dependencies in prompts |
| Dashboard Home UI | `codex --prompt prompts/dashboard/route-dashboard.md --branch feature/route-dashboard` | Finish overview widgets, shared filters, sparkline integration | Record UI status in prompt; run dashboard lint/tests |
| Sales Analytics UI | `codex --prompt prompts/dashboard/route-sales.md --branch feature/route-sales` | CSV export, validation, charts, drilldowns, data adapters | Update prompt TODOs; keep mocks deterministic |
| Orders Operations UI | `codex --prompt prompts/dashboard/route-orders.md --branch feature/route-orders` | Detail drawer, optimistic workflows, pagination, contract alignment | Note blockers in prompt; sync with Sync/Webhooks on schemas |
| Inbox UI & Feedback | `codex --prompt prompts/dashboard/route-inbox.md --branch feature/route-inbox` | Filters, approve/edit fetchers, websocket payloads, feedback logging | Update prompt notes; verify mock scenarios |
| Inventory Planner UI | `codex --prompt prompts/dashboard/route-inventory.md --branch feature/route-inventory` | Buckets/tabs UI, PO planner, sparkline/analytics wiring | Run vitest on inventory math; document planner status |
| SEO Insights UI | `codex --prompt prompts/dashboard/route-seo.md --branch feature/route-seo` | CSV export, action mutations, adapter toggles, analytics charts | Update prompt; link to settings dependencies |
| Settings Admin UI | `codex --prompt prompts/dashboard/route-settings.md --branch feature/route-settings` | Secrets workflows, thresholds, connection tests, Prisma wiring | Note Prisma dependency; run relevant tests |
| Data & Prisma | `codex --prompt prompts/dashboard/database.md --branch feature/prisma-schema` | Prisma schema/migrations, seeds, staging rollout, retention guidance | Run Prisma generate/migrate; update deployment docs |
| MCP Integration | `codex --prompt prompts/dashboard/mcp.md --branch feature/mcp-client` | Env toggles, mock tests, loader wiring, prep live fetch path | Add unit tests; document feature flags |
| Tooling – Prisma Config | `codex --prompt prompts/tooling/prisma-config.md --branch chore/prisma-config-migration` | Plan migration from `package.json#prisma` to `prisma.config.ts`; coordinate CI/deploy updates | Capture decisions in coordination docs; file follow-up tasks |
| Program Manager – Coordinator | `codex --prompt prompts/tooling/program-manager.md --branch chore/coordination` | Monitor all agents, enforce roadmap cadence, update prompts/summaries, surface blockers proactively | Review session summaries; open/close coordination notes; ensure agents continue without waiting on user |

### General Reminders
- Work in feature branches matching the command suggestions; push frequently to avoid context loss.
- When you need prompt/status updates, record them in your feedback note under `coordination/inbox/<agent>/<date>-notes.md`; do not edit the prompt files directly.
- Coordinate cross-service changes via append-only feedback notes before touching another agent’s surface; never overwrite someone else’s WIP.
- Scope change requests belong in your own feedback note (see `coordination/agent-feedback-guidelines.md`); do not edit master prompts, `agents.md`, or handover docs directly—Program Manager will review and apply approved updates.
- Default to executing the next planned task without asking for direction; only pause for credentials, legal/feature ambiguity, or destructive operations explicitly requiring user consent.
- When a session gets long, run the Codex `/compact` command to summarize and reclaim context before resuming work.
- At sign-off, summarize work and outstanding blockers in your feedback note so the on-call agent can pick up without re-sweeping prompts.
