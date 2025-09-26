# Dashboard Build Overview

## Current Snapshot
- Section 0 scaffold landed under `dashboard/` (Shopify Remix template, TypeScript, npm). Linking to the Partners app still pending interactive CLI login.
- Planning docs for data layer, routes, testing, deployment, and seed data are staged in `prompts/dashboard/`; owners unassigned.
- Outstanding repo hygiene from earlier handoff (tracked `.pyc`, README env alignment) untouched.

## Track Status
- **Remix Scaffold (Section 0)** — in progress; template pulled, dependencies installed. TODO: CLI `config link`, env bootstrap, dev server smoke.
- **Routes** — not started. Await agent assignments for `/`, `/sales`, `/orders`, `/inbox`, `/inventory`, `/seo`, `/settings`.
- **Data Layer & Integrations** — not started. Need Admin GraphQL stubs, SEO adapters, webhook wiring, MCP boundary.
- **Database & Seed Data** — not started. Prisma schema + migration scripts pending; mock data contract to follow.
- **Testing & Deployment** — not started beyond planning docs.

## Immediate Needs
1. Log into Shopify CLI locally and run `shopify app config link` for the Dashboard app (dev + live stores already set in spec).
2. Populate `dashboard/.env` + `.env.production` and confirm `.env` is git-ignored.
3. Spin `shopify app dev --store=afafsaf.myshopify.com` to verify embedded shell renders; capture screenshots/logs for the team.
4. Assign route and module owners; point them at dedicated branches/worktrees prepared earlier.

## Coordination Notes
- When multiple agents edit the Remix app, work via the per-route branches (`feature/route-dashboard`, `feature/route-sales`, etc.) to avoid collisions. Merge through PRs against main once reviewed.
- Document progress in each `prompts/dashboard/*.md` file to keep this overview accurate before handoffs.
- Section 0 owner (Codex) will keep setup docs synced until auth + DB wiring stabilize, then hand off ongoing maintenance.
