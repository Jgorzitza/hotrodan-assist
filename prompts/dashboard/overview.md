# Dashboard Build Overview

## Current Snapshot
- Section 0 scaffold lives under `dashboard/` (Shopify Remix template, TypeScript, npm) and is now linked to the Partners app (`client_id=d919fc39ded7df2bd0ba2fe02b666b25`).
- `shopify app dev --store=afafsaf.myshopify.com` runs cleanly; Prisma migrations applied and the embedded admin shell renders from the local tunnel (`http://localhost:36761`).
- Local helper modules for mock settings, security helpers, and typed contracts were added under `dashboard/app/{lib,mocks,types}` to unblock downstream feature work.
- Repo-level docs updated with CLI bootstrap steps; `/orders` control-tower spec now lives in `prompts/dashboard/route-orders.md` with data contracts + observability notes.

## Immediate Needs
1. Fill in `dashboard/.env` and `.env.production` with the issued API keys, `DATABASE_URL`, and tunnel hostname before pushing to shared environments.
2. Capture screenshots of the embedded shell and attach them to the Section 0 notes (`prompts/dashboard.codex.md`) for reference.
3. Assign route and module owners; each should branch off the pre-created `feature/route-*` worktrees and keep their prompt doc in sync (start with `/orders` to stand up the control tower).
4. Prep `shopify app dev --store=fm8vte-ex.myshopify.com` smoke once production credentials are greenlit.

## Coordination Notes
- Multiple agents should continue working via the per-route branches (`feature/route-dashboard`, `feature/route-sales`, etc.) to avoid collisions; merge back through PRs into `main`.
- Update the relevant `prompts/dashboard/*.md` file at the end of each working session so this overview stays accurate.
- Section 0 owner (Codex) will hand off setup maintenance after auth + DB wiring is production-ready; until then keep env/config changes serialized through this branch.
