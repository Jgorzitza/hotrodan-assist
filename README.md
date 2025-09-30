# Hot Rod AN — RAG + Omnichannel Assistants

Start here: see **HANDOVER.md** for full specs, milestones, and service layout.

## Quickstart (local)
```
pip install -U llama-index openai "chromadb>=0.5" llama-index-vector-stores-chroma \
               llama-index-readers-web llama-index-readers-file
cp .env.example .env
python discover_urls.py
python ingest_site_chroma.py
python query_chroma_router.py "EFI swap ~400 hp; pump LPH, 10 micron, AN sizes?"
```

## Tests
```
python run_goldens.py  # offline corrections-only; no API calls
# Data layer unit/integration tests (requires local Postgres/Redis):
pytest tests
```

## Data Layer
- ORM models live under `data/models/`; repositories and services under `data/repositories` and `data/services`.
- Configure `DATABASE_URL` (or `POSTGRES_URL`) in `.env`; Docker compose uses the same defaults.
- Run migrations: `alembic upgrade head` (see `alembic.ini` / `migrations/`).
- Create new migrations: `alembic revision --autogenerate -m "describe change"`.
- Repositories expose helper methods for conversations, drafts, and Shopify facts.
- Redis cache helpers live in `data/cache.py`; filesystem blob helper in `data/blob_store.py`.

## Additional docs
- **HANDOVER_ALL_IN_ONE.md** — full spec bundle.
- `prompts/dashboard/data-layer.md` — roadmap for data-layer modules and operations.

## Background jobs & sync
- Celery app defined in `jobs/`; start workers via `celery -A jobs.tasks worker -l info`.
- Zoho webhook → `/zoho/incoming`; Shopify webhooks → `/shopify/webhook` with optional HMAC via `SHOPIFY_WEBHOOK_SECRET`.
- Set `SYNC_USE_CELERY=0` locally to process webhooks inline without Celery.
- Customer facts endpoint: `GET /customer_summary?email=` (or `customer_id=`) served by `app/assistants` for prompts/UI hydration.
