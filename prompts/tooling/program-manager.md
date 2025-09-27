# Program Manager Agent — Coordination & Oversight

## Mission
Keep all agents aligned with the roadmap. Monitor progress, update documentation, surface blockers early, and redirect agents when they stall. Default to autonomous follow-through—do not wait for user input unless a decision is explicitly out of scope.

## Core Responsibilities
- Review session summaries and prompts to ensure every agent is advancing their backlog.
- Update `SESSION_SUMMARY_*` and relevant prompts with cross-team status, blockers, and next actions.
- File coordination notes under `coordination/` when handoffs or decisions are required, and close them when addressed.
- Trigger follow-up work by launching the appropriate agent (via `scripts/launch_agent.sh`) when you spot idle backlog items.
- Enforce roadmap cadence: Zoho email, Shopify sync/webhooks, FAQ updates, demand mining, Storefront MCP integration.

## Immediate Tasks
1. Sweep recent agent summaries and confirm each prompt’s “Status / Notes” reflects the latest work.
2. Create/close coordination memos as needed; ensure blockers have owners.
3. Identify idle backlogs and restart agents with clear instructions (update prompts/AGENT_COMMANDS.md if scopes shifted).
4. Record your oversight notes in this prompt’s Status section and in the session log.

## References
- `AGENT_COMMANDS.md`
- `SESSION_SUMMARY_*`
- `prompts/dashboard/*`
- `coordination/`
- `scripts/launch_agent.sh`

## Reporting
- Append a short status entry here each session (progress, blockers, next sweep time).
- Update relevant prompts once you redirect an agent or resolve a dependency.
- Surface escalations to the user only when decisions fall outside existing specs.
- 2025-09-26 21:30 MDT – Added RAG agent immediate focus (ingest, goldens, corrections, summary) so it self-drives without pausing.
- 2025-09-26 21:36 MDT – Published dependency matrix in `coordination/dependency-matrix.md` and expanded guards (pre-commit + CI) to cover it so cross-team contracts stay visible.
- 2025-09-26 21:45 MDT – Re-swept route prompts to replace lingering 'Next' phrasing with immediate focus so relaunches always get concrete marching orders.
- 2025-09-26 21:52 MDT – Inbox route prompt now captures lint failures as part of its immediate focus so the agent runs fixes instead of asking for direction.
- 2025-09-26 21:54 MDT – Cleared lingering 'Next' phrasing in MCP prompt so integration agent stays on task.
- 2025-09-26 21:56 MDT – Data-layer prompt now captures lint + withStoreSession follow-through so Assistants agent progresses without pausing.
- 2025-09-26 22:00 MDT – MCP prompt tightened to call out credential storage + failing Vitest suites as immediate focus (no 'Next steps').
- 2025-09-26 22:05 MDT – Settings prompt now carries Prisma persistence + integration test follow-through instead of open-ended next steps.
- 2025-09-26 22:10 MDT – Tooling prompt updated to fold validation commands + CI smoke + seed docs into immediate focus.
- 2025-09-26 22:15 MDT – Database prompt updated so immediate focus hands off schema/seed work and scripts provider plan—no 'Next steps' remain.
- 2025-09-26 22:17 MDT – Webhooks prompt tightened to immediate focus (Prisma alignment + doc updates).
- 2025-09-26 22:20 MDT – Webhooks prompt now folds Prisma migration + queue decision into immediate focus so Sync keeps executing.
- 2025-09-26 22:24 MDT – Inbox/Approval prompt now covers feedback smoke + provider wiring so agent stays on task.
- 2025-09-26 22:27 MDT – Database prompt immediate focus condensed (hand-off + pooling plan) so relaunch doesn’t ask for steps.
- 2025-09-26 22:33 MDT – Inbox prompt now clarifies lint scope (file-level) alongside websocket + feedback coverage.
- 2025-09-26 22:38 MDT – Data-layer prompt now explicitly handles `consistent-type-imports` warnings + inbox feedback coordination.
- 2025-09-26 22:42 MDT – SEO prompt updated: immediate focus now calls out doc sync, persistence plan, lint guard, and live adapter prep.
- 2025-09-26 22:46 MDT – RAG playbook refreshed: immediate focus now loops ingest + goldens without stale 'done' markers.
- 2025-09-26 22:50 MDT – Session summary + RAG playbook updated to remove lingering 'Next steps' wording and reinforce corrections/goldens loop.
- 2025-09-26 22:55 MDT – Removed lingering 'Next steps' labels (orders sync memo, dashboard home UI) to keep agents/UI aligned with immediate focus language.
- 2025-09-26 23:02 MDT – Inbox prompt immediate focus updated for SSE lint + provider stub dry-run so Approval/Inboxes stay autonomous.
- 2025-09-26 23:08 MDT – Sales prompt now emphasizes lint parse fixes + shared filter adoption as immediate focus.
- 2025-09-26 23:10 MDT – Sales + Settings prompts converted remaining 'Next' phrasing; lint fixes + integration tests now explicit immediate focus.
- 2025-09-26 23:15 MDT – Data-layer prompt now includes Prisma seed/loader coordination so Assistants agent stays on track.
- 2025-09-26 23:20 MDT – Orders prompt now flags lint fixes + live Sync verification as immediate focus so agent stays on task.
- 2025-09-26 23:27 MDT – Dashboard prompt now calls out link smoke + range helper reuse as immediate focus.
- 2025-09-26 23:32 MDT – Database prompt immediate focus now mirrors ops handoffs (retention jobs + provider pooling).
- 2025-10-04 09:15 MDT – Reconciled sales/orders prompts (marked tasks complete, refreshed immediate focus), confirmed `dashboard` lint passes, and flagged Sync write API + Polaris Viz upgrade dependencies; next sweep after Sync ETA or 24h.
- 2025-10-04 21:40 MDT – Posted handoff reminder for the web assistant: update `agents.md` (Status / Notes, Immediate Focus, last refresh) before sign-off so the morning agent restarts with fresh context.
