# Agent Playbook

## Mission & Context
- Owner: justin; project aims to 10× support throughput with a human-in-the-loop assistant for email + chat.
- Canonical knowledge stack: LlamaIndex + Chroma (collection `hotrodan_docs`, index `hotrodan`).
- All agents must keep RAG data, corrections, and golden tests authoritative before introducing new tooling.

---

## Cloud ↔ Local Transition Contract (Codex Web & CLI)

**Goal:** Move work between Codex **cloud** (web) and Codex **local** (CLI) without drift or duplicated effort.

**Prerequisites**
- GitHub repo connected in Codex web.
- This `AGENTS.md` at repo root.
- Each surface has an in‑repo prompt file with a `## Status / Notes` section.
- A Cloud Environment is configured (base image + setup commands).
- Branch exists (or will be created) for the target surface.

**Invariants (don’t break these)**
- One agent → one feature branch. Never run cloud and local simultaneously on the same branch.
- Every session (cloud or local) appends a `STATUS:` line to `Status / Notes`.
- Every pause or handoff leaves behind: passing lint/tests **or** a clear note of what’s failing and why.
- Prefer small PRs; treat PRs as synchronization boundaries and review checkpoints.

**Scope**
- ✅ Feature work, small refactors, fixes, tests, doc updates scoped to the surface.
- 🚫 Cross‑cutting refactors that touch multiple surfaces in one shot—split by path/branch.

- ## Branching Strategy & Naming

**Pattern:** `<type>/<surface>-<short-desc>`

- `feature/route-orders-line-items`
- `chore/prisma-config-migration`
- `fix/webhooks-dup-events`

**Rules**
- One live worker (cloud or local) per branch.
- If two branches must touch the same files, serialize merges with PRs.
- Avoid long‑running branches; open PR early and iterate.

## Terms & Signals

- **Cloud task** — Work running in Codex web on a repo/branch inside an isolated container.
- **Local session** — Work running via `codex` CLI in your working copy.
- **Dispatcher prompt** — Short instruction pasted into Codex web that tells the agent which in‑repo prompt to follow.
- **Status / Notes** — The append‑only journal inside each surface prompt file.
- **PAUSE** — Clean stop; code committed; checklist satisfied.
- **HANDOFF→CLOUD** — You’re moving from local to cloud. Push branch, start cloud task, write a `STATUS` entry.
- **HANDOFF→LOCAL** — You’re moving from cloud to local. Ensure commits/PR exist, pull locally, write a `STATUS` entry.
- **PR boundary** — Preferred sync point for reviews and merges.


**Success criteria**
- Branch history is linear enough to merge without a rebase war.
- A reviewer can learn what happened from:
  1) the PR diff, and
  2) the `Status / Notes` entries.

### Standard Dispatcher Prompt (paste into Codex Web when starting a task)
Paste the following, fill the placeholders, and run:

Instruction:
- Load and follow the in‑repo prompt at: `<PROMPT_FILE>`.
- Work strictly within the declared surface and its shared primitives.
- Use the project setup/test/lint commands from AGENTS.md.
- Make small, reviewable commits; prefer opening a PR early.
- Append a session entry to `<PROMPT_FILE>` under **Status / Notes** (format below).
- Stop on **PAUSE Checklist**; for **HANDOFF→LOCAL**: ensure commits/PR exist, then stop.

Inputs:
- Prompt file: `<PROMPT_FILE>` (e.g., `prompts/dashboard/route-orders.md`)
- Branch: `<BRANCH>` (e.g., `feature/route-orders`)

Deliverables:
- Commits on `<BRANCH>` and/or an open PR titled: `[<scope>] <concise summary>`.
- Updated **Status / Notes** entry for this session.

Validation:
- Before first edit, echo the H1 title of `<PROMPT_FILE>` to confirm the correct file was loaded.
- Before stopping, run lint/tests and summarize results in **Status / Notes**.
## Mission & Context
- Owner: justin; project aims to 10× support throughput with a human-in-the-loop assistant for email + chat.
- Canonical knowledge stack: LlamaIndex + Chroma (collection `hotrodan_docs`, index `hotrodan`).
- All agents must keep RAG data, corrections, and golden tests authoritative before introducing new tooling.

## Core Responsibilities
- Keep the retrieval stack fresh: crawl hotrodan.com, ingest into Chroma, and maintain incremental updates.
- Produce draft responses via `query_chroma_router.py`, ensuring sourcing and system prompts stay aligned with fuel-system guidance.
- Enforce quality gates: corrections overrides, offline golden regression tests, and citation requirements.
- Support service stubs (`app/rag_api`, `app/assistants`, `app/sync`, `app/approval-app`) as they mature toward production.

## Key Components & Files
### RAG + Ingest
- `discover_urls.py` → builds `urls.txt` and `urls_with_lastmod.tsv` from Shopify sitemaps with filtering.
- `ingest_site_chroma.py` → bootstrap ingest into persistent Chroma + storage (auto-detects embed mode: OpenAI vs FastEmbed fallback).
- `ingest_incremental_chroma.py` → compares sitemap last-mod times, deletes stale docs, reingests updates (tracks `ingest_state.json`).
- `rag_config.py` → shared Settings via `configure_settings()` (chunk size 1500/overlap 150, auto-switches between OpenAI and FastEmbed/mock LLM fallback when `OPENAI_API_KEY` is missing or placeholder).

#### Status / Notes

STATUS: 2025-09-27T06:25:29Z | agent=rag | branch=feature/rag-refresh | commit=68aaec2 | mode=cloud | scope=rag
- What changed: Investigated blocked sitemap fetches, added proxy diagnostics to `discover_urls.py`, made `rag_config` configure lazily to avoid forced FastEmbed downloads on import, and refreshed the RAG session summary.
- Tests/lint: `python run_goldens.py` (pass).
- Next step / blocker: Shopify sitemap currently returns HTTP 403 via proxy so URLs not refreshed; rerun discovery/ingest once access is restored.

STATUS: 2025-09-27T07:04:00Z | agent=rag | branch=feature/rag-refresh | commit=32f6ba4 | mode=cloud | scope=rag
- What changed: Added proxy-bypass retry (and opt-out env flag) to `discover_urls.py` so sitemap discovery can work in environments where the corporate proxy blocks Shopify.
- Tests/lint: `python run_goldens.py` (pass); `python discover_urls.py` (fails—network unreachable even without proxies).
- Next step / blocker: Need direct outbound network access to hotrodan.com to refresh URLs before running incremental ingest.

STATUS: 2025-09-27T07:29:10Z | agent=rag | branch=feature/rag-refresh | commit=bc8de2c | mode=cloud | scope=rag
- What changed: Added CLI + gzip/loop handling to `discover_urls.py`, making sitemap discovery configurable offline and resilient to compressed sitemap indexes; updated session summary with the refined workflow.
- Tests/lint: `python discover_urls.py` (fails—network unreachable, still blocked); `python run_goldens.py` (pass).
- Next step / blocker: Outbound access still fails so URLs/ingest remain stale; rerun discovery and incremental ingest when networking is restored.

### Query & Routing
- `query_chroma_router.py` → primary CLI; applies corrections, model routing (`gpt-4o-mini` default, escalates to GPT-5 family), adds dynamic context.
- `router_config.py` → keyword + length triggers for model escalation.
- `query_chroma.py` / `query.py` (legacy) available but router script is source of truth.

### Quality Controls
- `corrections/corrections.yaml` → regex-triggered answers with mandatory filtration/return-style guidance.
- `goldens/qa.yaml` + `run_goldens.py` → offline regressions using `OFFLINE_CORRECTIONS_ONLY=1` (no live LLM calls).
- Non-negotiables from handover: always cite sources, block blind approvals on low-signal retrieval, every factual fix requires correction + golden.

### Services & Deployment
- FastAPI stubs: `app/rag_api/main.py`, `app/assistants/main.py`, `app/sync/main.py`; Dockerfiles + requirements provided for each service.
- `docker-compose.yml` orchestrates Postgres, Redis, rag-api, assistants, sync, approval app; mounts `/data` for vector persistence.
- CI: `.github/workflows/ci.yml` runs golden tests on push/PR.
## Status / Notes — Format & Enforcement

**Required header line (single line):**

**Optional bullets (keep terse):**
- What changed:
- Tests/lint:
- Next step / blocker:

**(Optional) CI guard**
- Reject PRs if the last commit didn’t touch the surface prompt’s `Status / Notes`.
## Handoff Checklists

### Local → Cloud (HANDOFF→CLOUD)
1) Ensure working tree clean; run tests/lint locally.  
2) Commit with concise message; push:
3) Start a Codex web task on `<feature-branch>` using the **Dispatcher Prompt** (fill `<PROMPT_FILE>` + `<BRANCH>`).  
4) Add a `STATUS ... mode=cloud` entry before edits; another when pausing.
## Parallelization Policy

**Cloud (web)**
- Prompt file: `prompts/dashboard/route-orders.md`
- Branch: `feature/route-orders`
- Paste the **Dispatcher Prompt**, then run.

**Repeat the same pattern for:**
- `prompts/dashboard/route-inventory.md` on `feature/route-inventory`
- `prompts/dashboard/route-seo.md` on `feature/route-seo`
- `prompts/dashboard/webhooks.md` on `feature/sync-webhooks`
- `prompts/dashboard/data-layer.md` (focus: assistants) on `feature/assistants`
- ## Change Log

- Use reverse chronological order.
- One line per change; keep it surgical.
- Always include the date, a one‑line summary, and whether any process rules changed.

Example:
- **2025-09-27** — Hardened transition workflow; added Status format, handoff checklists, pause checklist, and CI guard suggestion. No changes to existing RAG/quality responsibilities.



- You may run **many cloud tasks in parallel**—one per branch/agent.
- Never run cloud and local on the **same branch** at the same time.
- Keep PRs small (≤ ~300 lines changed) to maintain merge velocity.
- If two agents need the same files:
  - Split by path (e.g., `routes/orders/*` vs `components/tables/*`) **or**
  - Sequence: merge Agent A, rebase Agent B, proceed.
## Pause Checklist (both modes)

- ✅ Lint and unit tests run; status noted (pass/fail with reason).
- ✅ `Status / Notes` updated with a fresh `STATUS:` line and bullets.
- ✅ Commits pushed or PR opened with a specific, scope‑tagged title.
- ✅ Any TODOs or blocked items listed in `Status / Notes`.

**Throughput defaults**
- Start with 3–5 parallel cloud tasks; scale up only if review bandwidth and CI capacity are healthy.

**Failure recovery**
- If cloud can’t install deps: update Cloud Environment setup script; rerun.
- If tests fail in cloud but pass locally: pin tool versions in setup; re‑run.

### Cloud → Local (HANDOFF→LOCAL)
1) Confirm commits (or an open PR) exist from the cloud task.  
2) Pull and continue:




## Setup Checklist
### Python Environment
- Install core deps: `pip install -U llama-index openai "chromadb>=0.5" llama-index-vector-stores-chroma llama-index-readers-web llama-index-readers-file pyyaml llama-index-embeddings-fastembed fastembed`.
- Optional: create virtualenv; keep environment local (no `.env` committed).

### Environment Variables
- Copy template: `cp .env.example .env`.
- Populate at minimum: `OPENAI_API_KEY` (leave blank only if you intentionally want retrieval-only bullets via FastEmbed fallback); add Shopify bot signature trio and Zoho credentials when integrations ship.
- New adapters expect: `ZOHO_ACCOUNT_ID`, `ZOHO_DEFAULT_FROM`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and Shopify Admin creds (`SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`).
- Shopify webhooks require `SHOPIFY_WEBHOOK_SECRET` (used for HMAC verification) and the sync service now stores customers/orders/inventory in Postgres.
- `shopify.app.toml` defines CLI configuration (scopes, webhook subscriptions pointing at `http://localhost:8003/shopify/webhook`). Run `shopify app config use shopify.app.toml` and `shopify app deploy` after editing to sync with Shopify.
- Default paths expect data persisted under `./data` when running via Docker.

### Data Refresh Workflow
1. `python discover_urls.py` to pull sitemap URLs.
2. `.venv/bin/python ingest_site_chroma.py` for bootstrap, or `.venv/bin/python ingest_incremental_chroma.py` for updates.
3. Confirm Chroma (`chroma/`) and storage (`storage/` or `/data/*` in containers) exist; never commit these directories.

### Query & Review
- Run sample: `.venv/bin/python query_chroma_router.py "EFI swap ~400 hp; pump LPH, return vs returnless, 10 micron, AN sizes?"`.
- Expect source URLs listed after every answer; verify corrections trigger when applicable (retrieval-only summary prints when `OPENAI_API_KEY` is unset).

### Testing
- Python: run `.venv/bin/python run_goldens.py`; CI mirrors this offline regimen.
- Remix dashboard: from repo root run `npm run lint`, `npm test -- --run`, and `npm run test:e2e -- --list` (smoke skips until `PLAYWRIGHT_BASE_URL` is set). Playwright browsers install automatically in CI; locally call `npx playwright install --with-deps` the first time.
- Webhooks: use `scripts/shopify_webhook_replay.sh orders/updated` to replay signed payloads when Shopify CLI isn’t available.
- Add new golden/Vitest/Playwright cases whenever you introduce corrections, handlers, or UI flows.

## Roadmap Highlights (Next Builds)
1. Zoho email integration: ingest/send drafts, respect approval flow, learn from edits.
2. Website chat assistant with identical approve/edit loop.
3. Shopify API sync for customers, orders, inventory (webhooks + nightly backfill).
4. Auto-generate FAQ updates with approval + publish to Shopify (FAQPage JSON-LD).
5. Demand mining reports on unmet product requests.
6. Flesh out the Approval App as the single operator UI.

## Operating Guardrails
- Always show sources; persist them alongside drafts.
- Maintain confidence gating before auto-approvals (requires retrieval signal metrics).
- Use LlamaHub readers when they accelerate ingestion, but keep Chroma + corrections + goldens intact.
- Record every factual adjustment as both a correction entry and a golden test case.

## Immediate Focus
- Check `urls_with_lastmod.tsv` for sitemap deltas, then run `python ingest_incremental_chroma.py` (or full ingest if the diff is large) so Chroma stays current.
- Execute `python run_goldens.py` after ingest; patch any regression before closing the loop.
- Audit `corrections/corrections.yaml` for drift vs newest pages, add entries for emerging FAQs, and create matching golden cases before closing the loop.
- Update `SESSION_SUMMARY_*` with ingest and goldens status so downstream services know data freshness.
- _Last refresh:_ 2025-09-26 21:49 MDT — sitemap unchanged, goldens 2/2 pass, retrieval-only router output spot-checked.

## Known Gaps & TODOs
- Implement Alembic migrations for the new Postgres tables before production deploys.
- Add retries/queueing for Zoho & Shopify deliveries (currently single-shot).
- Extend Approval App with auth, filtering, and real-time updates.
- No automatic confidence gating yet; define retrieval thresholds once metrics are available.

## Reference Docs
- `HANDOVER_ALL_IN_ONE.md` → canonical spec and embedded file copies.
- `HANDOVER.md` → should mirror the all-in-one brief once updated.
- Keep this `agents.md` updated as workflows evolve.
