# Data Layer Modules

## 1. Purpose & Principles
- Provide a single, typed source of truth for omnichannel conversations, customer facts, inventory, FAQ proposals, and model outputs.
- Normalize external systems (Zoho, Shopify, website crawls) into Postgres before any business logic touches them.
- Keep retrieval (Chroma) and transactional state (Postgres) separate; sync jobs bridge them through deterministic pipelines.
- Prefer idempotent upserts, append-only logs, and immutable history tables so the assistant can learn safely from edits.
- Every data-flow must emit audit events (`model_runs`, `approvals`, `product_requests`) so Ops can trace which facts powered a draft.

## 2. Storage Overview
| Store | Role | Access Module |
|-------|------|---------------|
| Postgres (`primary`) | canonical system of record | `data/db.py`, `data/models/*.py`, `data/repositories/*.py` |
| Chroma | unstructured retrieval index | existing ingest/query scripts (`ingest_site_chroma.py`, `query_chroma_router.py`) |
| Redis | short-lived caches + work queues | `data/cache.py`, Celery workers (`jobs/`) |
| Object storage (filesystem initial) | raw HTML snapshots, attachments | `data/blob_store.py` |
| Local filesystem (`storage/`, `chroma/`) | dev-only persistence mirrors | existing ingest/query scripts |

## 3. Postgres Modules
### 3.1 Connection & migrations
- `data/db.py`: create SQLAlchemy async engine + session factory; read DSN from `DATABASE_URL`.
- Alembic migration folder under `migrations/`; enforce `alembic upgrade head` as part of CI.
- Seed helpers (`scripts/seed_demo.py`) load sample customers/orders for golden flows.

### 3.2 Core tables (first pass schema)
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `conversations` | `id`, `channel`, `external_thread_id`, `status`, `created_at` | one row per email thread/chat session |
| `messages` | `id`, `conversation_id`, `direction` (`inbound`/`outbound`), `body`, `external_msg_id`, `raw_payload` (JSONB) | store human + assistant text; raw payload preserved for replays |
| `drafts` | `id`, `conversation_id`, `model_run_id`, `body`, `confidence`, `status`, `created_at` | `status` = `pending`/`approved`/`sent`/`superseded`; link to corrections applied |
| `model_runs` | `id`, `model_slug`, `prompt_hash`, `temperature`, `tokens_in`, `tokens_out`, `sources` (JSONB) | attach evaluation metadata & cost |
| `approvals` | `id`, `draft_id`, `approved_by`, `action` (`approve`/`edit`/`reject`), `final_text`, `diff`, `taken_at` | `diff` stores unified diff for learning |
| `style_profiles` | `id`, `owner_user_id`, `tone_config` (JSONB), `last_applied_at` | per-user/brand tone controls |
| `customers` | `id`, `email`, `shopify_id`, `name`, `lifetime_value`, `segment`, `shipping_addresses` (JSONB) | consolidated facts |
| `orders` | `id`, `shopify_id`, `customer_id`, `status`, `tracking_numbers` (JSONB), `last_event_at` | nightly backfill + webhook updates |
| `inventory_items` | `id`, `sku`, `shopify_id`, `quantity_available`, `lead_time_days`, `price_cents` | used for availability answers |
| `faq_entries` | `id`, `question`, `answer`, `status` (`draft`/`published`), `source_intent`, `published_at` | autopublishing pipeline |
| `corrections` | `id`, `pattern`, `answer`, `sources`, `last_verified` | mirror of YAML for UI edits |
| `product_requests` | `id`, `customer_id`, `conversation_id`, `description`, `count`, `trend_score` | fuels demand mining |
| `audit_log` | `id`, `event_type`, `payload` (JSONB), `created_at`, `actor` | catch-all for compliance |

### 3.3 Repositories & services
- `data/repositories/conversation_repo.py`: upsert threads, messages, compute unread counts.
- `data/repositories/draft_repo.py`: draft CRUD + state transitions; fetch with sources/model metadata in one call.
- `data/repositories/customer_repo.py`: hydrate Shopify facts, derived `customer_summary` payload for prompts.
- `data/services/faq_pipeline.py`: propose/publish entries; writes to `faq_entries` + triggers static page sync job.
- `data/services/demand_mining.py`: aggregate `product_requests` weekly.
- `data/cache.py`: Redis helpers for read models + rate limits.
- `data/blob_store.py`: filesystem blob helper to stash HTML snapshots & attachments.

## 4. Sync & ETL Modules
### 4.1 Zoho email
- `sync/zoho_client.py`: OAuth2 refresh, fetch threads/messages, push sent mail.
- `sync/zoho_ingest.py`: normalize payloads → `messages`, `conversations` (idempotent). Capture attachments to blob store.
- Webhook handler (`app/sync/main.py`) queues `process_incoming_email_task` (Celery) or processes inline if `SYNC_USE_CELERY=0`.
- After insert, trigger `DraftRequested` event for assistants service.

### 4.2 Shopify
- `sync/shopify_client.py`: REST + GraphQL wrappers with rate-limit backoff.
- `sync/shopify_ingest.py`: nightly backfill + webhook workers; upsert `customers`, `orders`, `inventory_items`.
- Maintain `shopify_cursors` table for incremental sync checkpoints.

### 4.3 Website content snapshots
- Continue using existing ingest scripts to populate Chroma.
- New helper `sync/site_snapshot.py` captures rendered HTML → object storage → reference in `model_runs.sources`.

### 4.4 Background job framework
- Adopt Celery with Redis broker; tasks live in `jobs/*.py` (`process_incoming_email_task`, `process_shopify_event_task`).
- Critical jobs: `generate_draft`, `apply_corrections`, `refresh_customer_summary`, `rebuild_faq_page` (extend `jobs/tasks.py`).
- All jobs log to `audit_log` with correlation IDs.

## 5. Derived Views & APIs
- `views/customer_summary` (Postgres materialized view): denormalizes customer, latest orders, open drafts; served by `/customer_summary` endpoint.
- `views/faq_candidates`: join frequent intents + manual edits to surface top proposals.
- `views/model_quality`: aggregates token/cost stats per channel & confidence bucket.
- Expose read models via `data/read_models/*.py` returning Pydantic DTOs for FastAPI apps.

## 6. Data Quality & Testing
- Contract tests: fixture payloads from Zoho/Shopify under `tests/data/fixtures/`; run through ingest pipeline to assert DB rows.
- Golden records: extend `goldens/qa.yaml` with structured expectations tied to `model_runs` + `drafts` snapshots.
- Add `tests/data/test_customer_summary.py` verifying summary builder handles missing orders, backorders, guest checkout.
- CI workflow: `pytest tests/data`, `alembic upgrade head --sql` to validate migrations generate clean SQL.

## 7. Operations & Observability
- Metrics: instrument ingest/draft jobs with Prometheus counters (`records_ingested`, `draft_latency_seconds`).
- Alerting: notify on stale cursors (no Shopify delta in 15 min), failed Zoho webhook retries, backlog > 100 drafts.
- Retention: archive closed conversations and related messages older than 18 months to object storage + delete PII via soft-delete flags.
- Disaster recovery: nightly pg_dump → S3; Chroma rehydrated from HTML snapshots + ingest scripts.

## 8. Roadmap & Next Steps
1. Scaffold SQLAlchemy models + Alembic baseline migration.
2. Implement Zoho + Shopify clients with fake-mode for local tests.
3. Ship `customer_summary` endpoint powered by read model & integration test with seeded data. ✅
4. Wire assistants service to persist drafts + approvals, logging `model_runs` and diffs.
5. Build FAQ autopublish loop (propose → approve → push to Shopify Page API).
6. Add demand mining cron job producing weekly CSV + storing metrics in `product_requests` trends.

## 9. Developer Workflow
- Use `make db-up`/`make db-down` for local Postgres via Docker; seed with `make db-seed`.
- Run `poetry run alembic upgrade head` before `uvicorn` services to ensure schema matches.
- Prefer repository methods inside FastAPI handlers; never manipulate SQLAlchemy sessions directly in routers.
- Keep `.env` synced across services (`DATABASE_URL`, `REDIS_URL`, `BLOB_BUCKET`). Update `.env.example` when adding new vars.
- Document every new table + event in this file; keep prompts aligned with real columns for LLM grounding.
