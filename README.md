# Hot Rod AN — RAG + Omnichannel Assistants

Consult **HANDOVER.md** or **HANDOVER_ALL_IN_ONE.md** for the full product and engineering brief. This README stays focused on local development tasks.

## Quickstart
```bash
pip install -U \
  llama-index openai "chromadb>=0.5" \
  llama-index-vector-stores-chroma \
  llama-index-readers-web llama-index-readers-file
cp .env.example .env
python discover_urls.py
python ingest_site_chroma.py
python query_chroma_router.py "EFI swap ~400 hp; pump LPH, 10 micron, AN sizes?"
```

## Services
| Service | Port | Purpose |
| --- | --- | --- |
| rag-api | 8001 | Query API that wraps `query_chroma_router.py`. |
| assistants | 8002 | Draft/approve/edit endpoints plus dashboard aggregation routes. |
| dashboard | 8003 | Stand-alone Markdown renderer for dashboard payloads. |
| sync | — | Webhook + scheduler stubs. |
| approval-app | 5173 | React/Next UI scaffold (placeholder). |

Bring everything up locally:
```bash
docker compose up --build
```

## Tests
Offline goldens remain the main regression guard:
```bash
python run_goldens.py
```

Prompt renderers include lightweight unit tests:
```bash
python3 -m unittest tests/test_dashboard_prompts.py tests/test_assistants_dashboard.py
```

## Prompt Preview
Quickly preview dashboard copy without hitting the API:
```bash
python3 scripts/render_dashboard_samples.py home
python3 scripts/render_dashboard_samples.py sales
```
Pass a custom payload JSON file as the second argument to inspect live data.

## Repo Highlights
- Retrieval + routing: `query_chroma_router.py`, `rag_config.py`, `router_config.py`.
- Corrections + goldens: `corrections/corrections.yaml`, `goldens/qa.yaml`.
- Dashboard prompts/specs: `prompts/dashboard/*` with Markdown contracts.
- Dashboard renderers: `app/dashboard/*` (reused by `assistants` service or via `/dashboard/*`).
