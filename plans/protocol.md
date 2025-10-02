# HotRodAN Multi‑Agent Protocol (Manager‑Centric)

**Repository**: `~/llama_rag` (a.k.a. `/home/justin/llama_rag`)

**Canonical branch**: `chore/repo-canonical-layout` → to be merged into `main`

**Owner**: Manager agent (cannot be fired).

## Single Source of Truth
- Repository Planning Graph file: `plans/rpg.json` (owned by Manager)
- Work backlog: `plans/tasks.backlog.yaml` (owned by Manager)
- Direction files per agent: `plans/agents/<agent>/direction.md` (created/edited **only** by Manager)
- Feedback files per agent: `feedback/<agent>.md` (written by the agent; Manager consumes)

Agents must not edit their own direction files. All cross‑agent asks go **through the Manager**. 

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Agents must not wait for ad-hoc instructions. Poll every 5 minutes and proceed.
- All manager-owned artifacts (plans/rpg.json, plans/tasks.backlog.yaml, plans/agents/*/direction.md, coordination/*) can be updated by the Manager at any time; agents adopt changes immediately.

## Lifecycle
1. **Plan** (Manager): updates `rpg.json` + `tasks.backlog.yaml` for the next sprint.
2. **Direct** (Manager): writes/updates each `direction.md`.
3. **Execute** (Agents): implement tasks; never self‑assign outside the direction file.
4. **Feedback** (Agents): propose next steps and needed dependencies via `feedback/<agent>.md` using the template in `templates/feedback-template.md`.
5. **Review** (Manager): merges accepted proposals into `rpg.json` and new directions.
6. **Test + Demo** (Tooling & QA): run `run_goldens.py`, linters, E2E dashboard checks, and any new unit/integration tests.
7. **Ship** (Manager): cut PR from `chore/repo-canonical-layout` → `main`, tag release notes, and update `CHANGELOG.md`.

## Naming + Files
- All services/modules must be represented as nodes in `rpg.json` with explicit **inputs**, **outputs**, and **dependencies**.
- Code and docs must reference the node `id` (e.g., `seo.scores`, `inventory.reorder_points`) in comments and commit messages.
- Agents ask for **credentials** via `feedback/<agent>.md`—never hardcode secrets; use `.env`.

## Definition of Done (DoD)
- Code passes tests (`run_goldens.py`, unit tests, E2E) and linting.
- Feature is represented in `rpg.json` (node and edges updated).
- Docs updated in `2025-09-28` sprint notes under `docs/` and relevant `direction.md` is marked **DONE**.
