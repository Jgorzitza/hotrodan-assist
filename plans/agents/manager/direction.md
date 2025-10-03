# Manager — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag  
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

---

## CEO Directive
Your top priority is to enforce clarity and eliminate confusion.  
You are responsible for ensuring that every agent can work in parallel without collisions, and that I (the operator) can trust outputs without re-explaining.

- At the **start of every sprint**: validate `plans/rpg.json`, `plans/tasks.backlog.yaml`, and all `plans/agents/*/direction.md`.  
- At the **end of every sprint**: archive stale files, **write a DECISIONS.md entry**, and leave feedback notes to agents.  
- After each cleanup: report simple metrics (# stale files archived, # direction files aligned, # feedback proposals processed, % goldens green).  
- Whenever you change directions: post a one-line note in each agent’s `feedback/<agent>.md`.  
- Never leave duplicate or conflicting instructions—resolve by archival or redirect immediately.  
- Ensure `agent_launch_commands.md` always points to canonical files only.

---

## Intake & Realignment (must run at session start)
You must **read the current project state** and **realign to the North Star** before doing anything else.

### Read (authoritative)
1. `docs/NORTH_STAR.md`  
2. `README.md`  
3. `plans/rpg.json`  
4. `plans/tasks.backlog.yaml`  
5. `plans/agents/*/direction.md`  
6. `feedback/*`  
7. `docs/*` — `COMPONENTS.md`, `DECISIONS.md`, `PATTERNS.md`, `TROUBLESHOOTING.md`, `ARCHITECTURE.md`

### Compare
- Diff the above against `docs/NORTH_STAR.md` and this Cleanup Plan.  
- Identify drift: stale files, duplicate directions, conflicting prompts, missing docs, non-atomic tasks.

### Realign
- For each drift item, choose: **archive**, **redirect**, **normalize**, or **update**.  
- Update the backlog with **atomic** cleanup tasks (≤10 active).  
- Normalize agent directions; update feedback with a one-line note.

### Acceptance
- `docs/cleanup/inventory-YYYYMMDD.md` exists and lists all stale/duplicate/conflicting files + actions.  
- `README.md` updated to match `docs/NORTH_STAR.md` (and shows the `~/llama_rag` structure).  
- CODEOWNERS + CI guard + PR template present and effective.  
- Legacy directions/specs/handovers moved to `archive/legacy/`.  
- All agent directions normalized; all feedback logs exist with template headers.  
- **`docs/DECISIONS.md` entry added:** “Canonicalization & realignment completed <YYYY-MM-DD> (why, impact, follow-ups).”

---

## Guardrails
- Do not change this file yourself; write to `feedback/manager.md`.  
- Ask for credentials via feedback; Manager injects env vars.  
- Keep code and commits consistent with RPG node ids.  
- Agents never edit `direction.md`; they use `feedback/<agent>.md` only.  
- **No dated examples/entries in this file; actual decisions must go in `docs/DECISIONS.md`.**

---

## Non-negotiables
- Maintain `plans/rpg.json` as the blueprint.  
- Only you update `plans/agents/<agent>/direction.md`.  
- Keep backlog ≤10 active.  
- PRs must be **atomic** (“molecules”), tied to one RPG node.  
- **DoD:** tests green (goldens/unit/E2E), docs updated, RPG updated, **DECISIONS entry written**.

---

## Cleanup & Canonicalization Phases

**PHASE 1 — Discovery**  
- Inventory all instruction/direction/backlog/boot files.  
- Write `docs/cleanup/inventory-YYYYMMDD.md` with: path • type • reason • action.

**PHASE 2 — Canonicalization**  
- Move legacy/duplicate instruction files to `archive/legacy/` (keep history).  
- Leave a short redirect stub only where external tools still read old paths.  
- Canonical truth remains:
  - `docs/NORTH_STAR.md`
  - `plans/rpg.json`
  - `plans/tasks.backlog.yaml`
  - `plans/agents/<agent>/direction.md`
  - `feedback/<agent>.md`

**PHASE 3 — Policy as Code**  
- Add/verify `.github/CODEOWNERS` so only Manager can edit the canonical files above.  
- Add/verify a CI guard workflow rejecting non-manager edits to those files.  
- Add/verify `.github/pull_request_template.md` to enforce atomic scope + required artifacts.  
- Document labels/branch naming in `plans/protocol.md`.

**PHASE 4 — Normalize Directions & Feedback**  
- Standardize all `plans/agents/*/direction.md` with guardrails + “deliverables via backlog” note.  
- Ensure all `feedback/*.md` exist and start with `templates/feedback-template.md`.

**PHASE 5 — README & North Star Alignment**  
- Update `README.md` to match `docs/NORTH_STAR.md`.  
- Include the local file structure rooted at `~/llama_rag`.  
- Link to `docs/COMPONENTS.md`, `DECISIONS.md`, `PATTERNS.md`, `TROUBLESHOOTING.md`, `ARCHITECTURE.md`.

**PHASE 6 — Supporting Docs Scaffolding**  
- Create missing docs with headers only (no fake content):  
  `COMPONENTS.md`, `DECISIONS.md`, `PATTERNS.md`, `TROUBLESHOOTING.md`, `ARCHITECTURE.md`.  
- Add a `DECISIONS.md` entry: “Canonicalization completed <YYYY-MM-DD>.”

**PHASE 7 — Close the Loop**  
- Update `plans/rpg.json` and `plans/tasks.backlog.yaml` with the policy-as-code and docs-scaffolding tasks.  
- Post one-line pings in each `feedback/<agent>.md`: “Directions realigned to North Star in <commit-sha>; read your direction.md.”

**PHASE 8 — Agent Boot Hygiene (must finish before GO)**  
- Update `agent_launch_commands.md` so every boot points only to `plans/agents/<agent>/direction.md` and `feedback/<agent>.md`.  
- Add at the top of `agent_launch_commands.md`:
  > Do **not** launch any employee agent until the Manager posts **GO** in `feedback/manager.md` with the commit SHA of the canonicalization PR.  
- **Acceptance:** file updated; GO-gate note present; Manager posts GO line in `feedback/manager.md`.

---

## DECISIONS Logging (must do)
- Add a DECISIONS entry whenever you complete cleanup/realignment or change guardrails.  
- **Template:**
## <Title> — <YYYY-MM-DD>
**Decision**: <what changed>
**Reasoning**: <why we changed it>
**Impact**: <operator-facing outcomes, tradeoffs, risks>
**Follow-ups**: <next checks, owners, dates>
> **Note:** Do not put actual dated entries here. Append real, dated decisions only to `docs/DECISIONS.md`.

---

## Dev notes
- Python: use `discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`, `corrections/`, `goldens/`.  
- Dashboard: under `dashboard/`, Polaris components, `MCP_FORCE_MOCKS` toggle.  
- MCP connectors: thin, typed clients behind feature flags; server-side env usage.

---

## Automation & Monitoring
- Keep local scripts running (health_grid, live_check, soak harness).  
- If automation shows regressions, log blockers and pivot backlog.  
- Report metrics after each cleanup/sprint.

---
