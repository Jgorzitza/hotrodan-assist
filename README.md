# Hot Rod AN — RAG + Omnichannel Assistants

Start here: read `HANDOVER.md` for the full specs, milestones, and service layout. See `agents.md` for the condensed agent playbook.

## Quickstart (local)
```
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -U llama-index openai "chromadb>=0.5" \
               llama-index-vector-stores-chroma llama-index-readers-web \
               llama-index-readers-file pyyaml
cp .env.example .env
python discover_urls.py
python ingest_site_chroma.py
python query_chroma_router.py "EFI swap ~400 hp; pump LPH, 10 micron, AN sizes?"
```

- Populate `.env` with service credentials (OpenAI, Zoho, Shopify). `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, and `SHOPIFY_SHOP` must be filled before running the sync service.
- Shopify CLI users can run `shopify app config use shopify.app.toml` followed by `shopify app deploy` to apply config, then `shopify app webhook trigger orders/create` to send signed test events to `http://localhost:8003/shopify/webhook`.

## Tests
```
python run_goldens.py  # offline corrections-only; no API calls
```

- When the virtual environment is not active, prefix commands with `.venv/bin/` (e.g., `./.venv/bin/python run_goldens.py`).

## Repo highlights
- Retrieval stack: LlamaIndex + Chroma scripts in repo root (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`).
- Quality guardrails: `corrections/corrections.yaml`, `goldens/qa.yaml`, `run_goldens.py`.
- Service stubs: FastAPI apps under `app/` (rag-api, assistants, sync, approval-app).
- Specs & docs: `HANDOVER.md`, `HANDOVER_ALL_IN_ONE.md`, and `agents.md`.
