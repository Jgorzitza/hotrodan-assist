# Findings & Direction — HotRodAN

**What exists (chore/repo-canonical-layout)**: FastAPI service stubs, RAG scripts (LlamaIndex + Chroma),
corrections + golden tests, a Remix dashboard scaffold with Shopify CLI config, and agent docs (handover/agents).

**What’s missing**: unified Manager‑centric planning, a clean branch baseline, and agent‑specific direction/feedback
channels. The pack in this folder gives you that baseline plus a seed RPG and backlog.

## Top Recommendations
1. Treat `plans/rpg.json` as a living blueprint — all features and data flows must be reflected there.
2. Keep Manager the *only* authority that writes direction files; employees only log feedback.
3. Wire credential‑gated connectors behind feature flags and make the dashboard resilient to 401/403/timeouts.
4. Land the **Approvals** loop early; it creates the human‑in‑the‑loop flywheel for tone + correctness.
5. Keep golden tests green and grow them steadily; add Playwright smoke tests for every new dashboard route.

## Next 48h Plan
- Merge `chore/repo-canonical-layout` → `main` after archiving legacy direction files.
- Implement Settings + health checks in the dashboard; validate MCP connectivity.
- Index site content and pass `run_goldens.py`.
- Turn on Approvals with Zoho; surface inbox in the dashboard.
- Stand up SEO opportunities list with mock → real data toggle.

## Attachments
- `plans/protocol.md` — rules of engagement.
- `plans/rpg.json` — seed planning graph.
- `plans/tasks.backlog.yaml` — backlog for the sprint.
- `plans/agents/*/direction.md` — initial directions for all agents.
- `templates/feedback-template.md` — how agents talk to Manager.
- `agent_launch_commands.md` — how to boot agents across tools.
- `commands/cleanup-and-merge.md` — exact git steps.

— Generated 2025-09-28
