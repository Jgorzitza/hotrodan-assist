# Agent Commands and Launch Matrix

This document lists all agents, their launch commands, primary focus summary, and a short pause checklist. It is consumed by scripts/launch_agent.sh.

| Role | Command | Focus | Checklist |
| --- | --- | --- | --- |
| Program Manager – Coordinator | scripts/launch_agent.sh manager | Keep status-dashboard current; sweep notes; assign/restart agents per direction | 5‑min poll cadence; append to coordination/inbox/manager/<date>-notes.md |
| RAG & Corrections | scripts/launch_agent.sh rag | Ingest + goldens loop; monitor sitemap lastmod; maintain corrections | Log commands/outputs; skip ingest if no sitemap delta; append to inbox |
| Assistants API & Drafts | scripts/launch_agent.sh assistants | Prisma-backed settings provider; loaders/actions integration | Keep tests green; document schema needs; append inbox note |
| Approval App UI | scripts/launch_agent.sh approval | Inbox UI; SSE provider; feedback telemetry (mocks) | Lint locally; avoid PII; append inbox note |
| Sync & Webhooks Service | scripts/launch_agent.sh sync | Webhook registration; payload schema v1.2; persistence | No BullMQ writes; record envelopes; append inbox note |
| Dashboard Home UI | scripts/launch_agent.sh dashboard | Root Polaris dashboard; deep-link smoke; range helper reuse | USE_MOCK_DATA toggle works; log tunnel attempts; append inbox note |
| Sales Analytics UI | scripts/launch_agent.sh sales | Drilldowns, CSV using mocks; prep for live analytics | Keep loader/tests green; document dependencies |
| Orders Operations UI | scripts/launch_agent.sh orders | Fulfillment dashboard wired to Sync write APIs | Verify live endpoints; log contract findings |
| Inbox UI & Feedback | scripts/launch_agent.sh inbox | Approvals/inbox coordination and feedback logging | Append-only notes; avoid managed file edits |
| Inventory Planner UI | scripts/launch_agent.sh inventory | Planner mocks; vendor/SKU mapping; prep charts/persistence | Deterministic scenarios; append inbox note |
| SEO Insights UI | scripts/launch_agent.sh seo | GA4/GSC/Bing mocks; persistence plan; adapter prep | Credentials gating; lint/tests clean |
| Settings Admin UI | scripts/launch_agent.sh settings | Prisma mock repo; thresholds/toggles; integration tests | No KMS rotation yet; document blockers |
| Data & Prisma | scripts/launch_agent.sh data | Prisma schema/seeds; analytics contracts; shared helpers | prisma generate/seed ok; retention doc only |
| MCP Integration | scripts/launch_agent.sh mcp | Mock MCP client; override precedence tests; telemetry | Stay in mock until creds; document persistence plan |
| Tooling – Prisma Config | scripts/launch_agent.sh tooling | Prisma CLI config; CI hooks; verify-managed-files CI | Document changes; keep CI green |

### General Reminders

- Do not edit manager-owned direction/backlog or managed artifacts directly. Use coordination/… feedback notes; Manager regenerates outputs.
- Maintain 5‑minute polling cadence for GO-SIGNAL and directions.
- Append-only notes under coordination/inbox/<agent>/<YYYY-MM-DD>-notes.md.
- Validate lint/unit tests for any code touched before handing off.
- Never commit real secrets; use environment variables and docs templates only.