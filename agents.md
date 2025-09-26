# Agent Playbook

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
- `ingest_site_chroma.py` → bootstrap ingest into persistent Chroma + storage.
- `ingest_incremental_chroma.py` → compares sitemap last-mod times, deletes stale docs, reingests updates (tracks `ingest_state.json`).
- `rag_config.py` → shared Settings (chunk size 1500/overlap 150, embed `text-embedding-3-small`).

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

## Setup Checklist
### Python Environment
- Install core deps: `pip install -U llama-index openai "chromadb>=0.5" llama-index-vector-stores-chroma llama-index-readers-web llama-index-readers-file pyyaml`.
- Optional: create virtualenv; keep environment local (no `.env` committed).

### Environment Variables
- Copy template: `cp .env.example .env`.
- Populate at minimum: `OPENAI_API_KEY`; add Shopify bot signature trio and Zoho credentials when integrations ship.
- New adapters expect: `ZOHO_ACCOUNT_ID`, `ZOHO_DEFAULT_FROM`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and Shopify Admin creds (`SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`).
- Shopify webhooks require `SHOPIFY_WEBHOOK_SECRET` (used for HMAC verification) and the sync service now stores customers/orders/inventory in Postgres.
- `shopify.app.toml` defines CLI configuration (scopes, webhook subscriptions pointing at `http://localhost:8003/shopify/webhook`). Run `shopify app config use shopify.app.toml` and `shopify app deploy` after editing to sync with Shopify.
- Default paths expect data persisted under `./data` when running via Docker.

### Data Refresh Workflow
1. `python discover_urls.py` to pull sitemap URLs.
2. `python ingest_site_chroma.py` for bootstrap, or `python ingest_incremental_chroma.py` for updates.
3. Confirm Chroma (`chroma/`) and storage (`storage/` or `/data/*` in containers) exist; never commit these directories.

### Query & Review
- Run sample: `python query_chroma_router.py "EFI swap ~400 hp; pump LPH, return vs returnless, 10 micron, AN sizes?"`.
- Expect source URLs listed after every answer; verify corrections trigger when applicable.

### Testing
- Execute `python run_goldens.py`; CI mirrors this offline regimen.
- Add new golden cases whenever you add corrections or fix regressions.

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

## Known Gaps & TODOs
- Implement Alembic migrations for the new Postgres tables before production deploys.
- Add retries/queueing for Zoho & Shopify deliveries (currently single-shot).
- Extend Approval App with auth, filtering, and real-time updates.
- No automatic confidence gating yet; define retrieval thresholds once metrics are available.

## Reference Docs
- `HANDOVER_ALL_IN_ONE.md` → canonical spec and embedded file copies.
- `HANDOVER.md` → should mirror the all-in-one brief once updated.
- Keep this `agents.md` updated as workflows evolve.
