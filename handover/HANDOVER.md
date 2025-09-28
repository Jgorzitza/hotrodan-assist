
HOT ROD AN — RAG + OMNICHANNEL ASSISTANTS (ALL‑IN‑ONE HANDOVER)
================================================================

Owner: justin
Primary goal: 10× customer support/output with a human‑in‑the‑loop assistant that drafts answers for email + chat, learns from edits, stays current with our website/Shopify data, and auto‑updates the FAQ.


TL;DR
-----
- RAG engine: LlamaIndex + Chroma (persistent) — keep as canonical source of truth.
  - Embeddings: text-embedding-3-small
  - Chunking: 1500 chars / 150 overlap
  - Index ID: hotrodan
  - Vector collection: hotrodan_docs
- Freshness: Crawler + incremental ingest from hotrodan.com (blogs, products, help/faq). Shopify Web Bot Auth headers supported.
- Quality gates: Corrections layer (corrections/corrections.yaml) + offline golden tests (goldens/qa.yaml, run_goldens.py).
- Models (routing): default gpt-4o-mini; escalate to gpt-5 / gpt-5-mini / gpt-4.1 on complex queries.
- Approval App: single UI to approve or edit drafts from email + chat. Approve → send; Edit → send & learn.
- LlamaHub: you MAY use LlamaHub readers/tools where they save time (Web/Sitemap, File/PDF, Intercom, Shopify tool/ETL). Keep Chroma + corrections + goldens intact.


REPO MAP (WHAT EXISTS TODAY)
----------------------------
- RAG core & scripts
  - discover_urls.py, ingest_site_chroma.py, ingest_incremental_chroma.py
  - query_chroma_router.py (generalized prompt + dynamic addendum + corrections pre‑check)
  - rag_config.py, router_config.pyQ
- Quality
  - corrections/corrections.yaml (high‑priority overrides)
  - goldens/qa.yaml, run_goldens.py (offline; no API calls; timeouts)
- Service stubs
  - app/rag-api/main.py — FastAPI wrapper for queries
  - app/assistants/main.py — drafts/approve/edit endpoints (UI calls these)
  - app/sync/main.py — webhook stubs (Zoho in, Shopify webhooks)
  - Dockerfiles + requirements for each service (below)
- Ops
  - .env.example, docker-compose.yml, .github/workflows/ci.yml (offline goldens in CI)
- Note: chroma/ and storage/ are ignored going forward (kept local only).


QUICKSTART (LOCAL DEV)
----------------------
1) Dependencies
   pip install -U llama-index openai "chromadb>=0.5" \
                  llama-index-vector-stores-chroma \
                  llama-index-readers-web llama-index-readers-file \
                  pyyaml llama-index-embeddings-fastembed fastembed

2) Env
   cp .env.example .env
   # fill at least: OPENAI_API_KEY (leave empty only if you accept FastEmbed
   # fallback + retrieval-only answers from rag-api)

3) Build vectors (optional if fresh)
   python discover_urls.py
   python ingest_site_chroma.py

4) Smoke query
   python query_chroma_router.py "EFI swap ~400 hp; pump LPH, return vs returnless, 10 micron filter, AN sizes?"

5) Offline golden tests (no LLM calls)
   python run_goldens.py

6) Remix dashboard checks (run from repo root)
   npm install  # first-time only
   npm run lint
   npm test -- --run
   npm run test:e2e -- --list  # enumerates Playwright smoke specs; requires PLAYWRIGHT_BASE_URL to execute

Supporting scripts
- `scripts/shopify_webhook_replay.sh` simulates signed Shopify webhooks for staging/dev tunnels when the CLI is unavailable.
- Dashboard test scaffolding lives under `app/tests/` (Vitest) and `e2e/` (Playwright); see `prompts/dashboard/testing.md` for the full plan.

Docker Compose (local)
----------------------
docker compose up --build -d
# rag-api -> POST http://localhost:8001/query  with JSON: {"question":"..."}


USE LLAMAHUB WHERE IT HELPS (EXPLICIT)
--------------------------------------
Prefer these loaders/tools over custom code when they fit. Keep Chroma + corrections + goldens unchanged.

Web / Sitemap (replace or augment our crawler)
- Install:  pip install llama-index-readers-web
- Example:
```
from llama_index.core import VectorStoreIndex
from llama_index.readers.web import SimpleWebPageReader
urls = ["https://hotrodan.com/blogs/an-hose-101", "https://hotrodan.com/pages/faq"]
docs = SimpleWebPageReader(html_to_text=True).load_data(urls)
index = VectorStoreIndex.from_documents(docs)
```

File / PDF (install guides, spec sheets)
- Install:  pip install llama-index-readers-file
- Example:
```
from llama_index.readers.file import PDFReader
docs = PDFReader().load_data(["/path/to/guide.pdf"])
```

Intercom (if we choose it for chat/help-center)
- Use the Intercom reader to import help-center/KB content directly.

Shopify
- Use a LlamaHub Shopify tool/reader or Airbyte-Shopify for faster ingestion.
- Regardless of ingestion path: expose facts via /customer_summary and cache tables (customers, orders, inventory_items).

Rule of thumb: if a LlamaHub loader gets structured docs faster, use it. Retrieval (Chroma), overrides (corrections), and tests (goldens) remain our quality backbone.


SYSTEM GOALS (WHAT TO BUILD NEXT)
---------------------------------
1) Zoho Email integration
   - Ingest incoming + sent mail (Zoho OAuth2 API).
   - Generate drafts with Shopify facts + RAG snippets + style profile; show sources.
   - Approval App: Approve & send or Edit & send; edits feed learning (facts + tone).

2) Website chat
   - SaaS (Intercom/Crisp/Chatwoot) or in-house widget.
   - Same draft → approve/edit → send loop; edits = learning.

3) Shopify API
   - Sync customers/orders/fulfillments; inventory & pricing (webhooks + nightly backfill).
   - Drafts must include order status/tracking, availability, and pricing answers.

4) Auto-update FAQ
   - Propose Q/A from high-volume intents & often-edited drafts.
   - Approve in UI; publish to Shopify Pages with FAQPage JSON-LD.

5) Demand mining
   - Track requests for unavailable products (email/chat) → weekly report (top 20 + trend + projected revenue).

6) Approval App (single UI)
   - Inbox of drafts from email + chat with confidence/model/cost.
   - Detail: thread (left), draft editor + Sources + Shopify Facts (right).
   - Buttons: Approve & send, Edit & send, Reject.
   - Confidence gate: low-confidence drafts require edit/escalation.
   - Learning from edits: update per-user + brand style_profile; add corrections; create/refresh goldens.


ARCHITECTURE
------------
Services (FastAPI):
- rag-api — wraps query router; /query, /sources
- assistants — drafts/approve/edit; channel adapters (ZohoEmail, Chat)
- sync — Zoho & Shopify webhooks + schedulers
- approval-app — React/Next UI (to scaffold)

Data stores:
- Postgres (primary): conversations, messages, drafts, edits, approvals, style_profiles, customers, orders, inventory_items, faq_entries, corrections, product_requests, model_runs, audit_log.
- Chroma (vector store for site content).
- Redis (queues/caching).
- Object storage (optional: raw HTML snapshots, attachments).

Queues: Celery/RQ for background jobs.
Secrets: .env locally; Docker secrets later.


MINIMAL ENDPOINTS TO IMPLEMENT
------------------------------
- POST /assistants/draft       → create draft (RAG + Shopify + style_profile)
- POST /assistants/approve     → approve & send via channel adapter
- POST /assistants/edit        → edit & send; compute diff; learning signals
- POST /email/incoming         → Zoho webhook → upsert, enqueue draft
- POST /email/sent             → Zoho webhook → store human final; learning
- POST /chat/message           → chat inbound → enqueue draft
- GET  /customer_summary?email= → merged Shopify facts for prompts
- POST /faq/propose            → FAQ pipeline (propose)
- POST /faq/publish            → FAQ pipeline (publish)
- GET  /report/demand          → weekly product-request report
- GET  /report/ops             → ops/cost/latency metrics


DATA MODEL (TABLES SUMMARY)
---------------------------
users, conversations, messages, drafts, approvals, edits, learning_events,
customers, orders, inventory_items, faq_entries, corrections, product_requests,
model_runs, audit_log

Codex: generate Alembic migrations from this spec.


LEARNING LOOP (HOW THE AGENT “LEARNS”)
--------------------------------------
- Corrections layer: human-authored overrides; short-circuit answers on pattern match (mirrored to YAML for RAG).
- Style profiles: per-user + brand features (greeting, sign-off, sentence length, bullet density, tone descriptors). Edits update these profiles.
- Golden tests: every correction adds/updates a golden case; CI runs offline to prevent regressions.


PROMPT (REFERENCE)
------------------
System (email/chat drafts):
“Retail EFI specialist. Provide a concise direct answer, steps/links, and clear next actions. Always cover pump sizing (LPH vs target hp/fuel), return vs returnless, regulator placement, ≤10 μm pressure-side filtration, typical AN line sizes, and PTFE-lined hose compatibility for gasoline, diesel, E85, methanol, and other fuels. Use sources when citing. Match operator’s style_profile if provided.”


MILESTONES (EXECUTION PLAN)
---------------------------
Week 1 — Stand up services & DB
- Compose db, redis, rag-api, assistants, sync, approval-app. Alembic init; health checks; CI runs offline goldens.

Week 2 — Email + draft pipeline
- Zoho inbound/outbound; assistants.draft; Approval App MVP (inbox/detail/approve/edit/send). Shopify sync; /customer_summary.

Week 3 — Chat + FAQ
- Chat integration (SaaS or in-house). FAQ proposer + JSON-LD publisher; “FAQ Drafts” tab in the Approval App.

Week 4 — Demand mining + guardrails
- Weekly demand report; cost/latency logging; confidence gate; A/B (gpt-5-mini vs 4o-mini). Hardening: retries, rate-limit, audit log, RBAC.

Definition of Done
- Drafts appear in Approval App for email + chat within seconds; Approve/Edit sends in the correct channel; edits persist & improve style; FAQ publishes from the same UI; goldens pass; costs are logged.


NON‑NEGOTIABLES
---------------
- Show sources in every draft; store them.
- Confidence gate blocks blind approvals on low‑signal retrieval.
- Every factual fix → correction + golden.
- Keep LlamaIndex + Chroma as the canonical RAG path unless we agree to change.


SECRETS & ENV
-------------
Fill .env from .env.example (never commit .env):
OPENAI_API_KEY, SHOPIFY_*, ZOHO_*, POSTGRES_URL, REDIS_URL, CHROMA_PATH, PERSIST_DIR, INDEX_ID, COLLECTION, SHOPIFY_BOT_SIGNATURE_*


GIT/SSH QUICK SETUP (OPTIONAL BUT HANDY)
----------------------------------------
# One-time identity
git config --global user.name "Jgorzitza"
git config --global user.email "jgorzitza@outlook.com"

# Add SSH key for GitHub (already created as /home/justin/.ssh/id_ed25519_github)
eval "$(ssh-agent -s)"
ssh-add /home/justin/.ssh/id_ed25519_github
# Ensure ~/.ssh/config uses that key for github.com

# Push
git remote add origin git@github.com:Jgorzitza/<REPO>.git
git push -u origin main


==== EMBEDDED FILES (COPY INTO REPO AS‑IS) ====


[FILE] .env.example
-------------------
```
OPENAI_API_KEY=

SHOPIFY_SHOP=
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_API_VERSION=2024-10

ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORG_ID=

POSTGRES_URL=postgresql+psycopg2://postgres:postgres@db:5432/app
REDIS_URL=redis://redis:6379/0

CHROMA_PATH=/data/chroma
PERSIST_DIR=/data/storage
INDEX_ID=hotrodan
COLLECTION=hotrodan_docs

SHOPIFY_BOT_SIGNATURE_INPUT=
SHOPIFY_BOT_SIGNATURE=
SHOPIFY_BOT_SIGNATURE_AGENT=https://shopify.com
```


[FILE] .gitignore
-----------------
```
# Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
.eggs/
.venv/
venv/
env/
.env
.env.*

# LlamaIndex / Chroma artifacts
chroma/
storage/
data/chroma/
data/storage/

# OS/editor
.DS_Store
Thumbs.db
.idea/
.vscode/

# Node (if Approval App uses it)
node_modules/
pnpm-lock.yaml
yarn.lock
npm-debug.log*
```


[FILE] docker-compose.yml
-------------------------
```
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    ports: [ "5432:5432" ]

  redis:
    image: redis:7
    ports: [ "6379:6379" ]

  rag-api:
    build: ./app/rag-api
    env_file: .env
    volumes: [ "./data:/data", "./:/workspace" ]
    ports: [ "8001:8001" ]
    depends_on: [ db, redis ]

  assistants:
    build: ./app/assistants
    env_file: .env
    volumes: [ "./:/workspace" ]
    ports: [ "8002:8002" ]
    depends_on: [ db, redis, rag-api ]

  sync:
    build: ./app/sync
    env_file: .env
    volumes: [ "./:/workspace" ]
    ports: [ "8003:8003" ]
    depends_on: [ db, redis ]

  approval-app:
    build: ./app/approval-app
    env_file: .env
    ports: [ "5173:5173" ]
    depends_on: [ assistants ]

volumes:
  pgdata:
```


[FILE] .github/workflows/ci.yml
-------------------------------
```
name: CI
on: [push, pull_request]
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -U llama-index openai "chromadb>=0.5" llama-index-vector-stores-chroma llama-index-readers-web llama-index-readers-file pyyaml
      - run: OFFLINE_CORRECTIONS_ONLY=1 python run_goldens.py
```


[FILE] app/rag-api/requirements.txt
-----------------------------------
```
fastapi
uvicorn[standard]
openai
llama-index
llama-index-vector-stores-chroma
llama-index-readers-web
llama-index-readers-file
chromadb>=0.5
python-dotenv
```


[FILE] app/rag-api/Dockerfile
-----------------------------
```
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8001
CMD ["uvicorn", "app.rag-api.main:app", "--host", "0.0.0.0", "--port", "8001"]
```


[FILE] app/rag-api/main.py
--------------------------
```
from fastapi import FastAPI
from pydantic import BaseModel
import os, chromadb
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

INDEX_ID=os.getenv("INDEX_ID","hotrodan")
CHROMA_PATH=os.getenv("CHROMA_PATH","/data/chroma")
PERSIST_DIR=os.getenv("PERSIST_DIR","/data/storage")
COLLECTION=os.getenv("COLLECTION","hotrodan_docs")

app = FastAPI()

class QueryIn(BaseModel):
    question: str
    top_k: int = 10

@app.on_event("startup")
def setup():
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)

@app.post("/query")
def query(q: QueryIn):
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(COLLECTION, metadata={"hnsw:space":"cosine"})
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage = StorageContext.from_defaults(vector_store=vector_store, persist_dir=PERSIST_DIR)
    index = load_index_from_storage(storage, index_id=INDEX_ID)

    system_hint = ("Retail EFI specialist. Cover pump sizing (LPH vs hp & fuel), "
                   "return vs returnless, regulator placement, ≤10 μm pressure-side filtration, "
                   "AN line sizes, PTFE-lined hose for gasoline/diesel/E85/methanol. Be concise.")
    qe = index.as_query_engine(response_mode="compact", similarity_top_k=q.top_k)
    resp = qe.query(system_hint + "\\n\\nQuestion: " + q.question)
    return {
        "answer": str(resp),
        "sources": [n.metadata.get("source_url","unknown") for n in getattr(resp,"source_nodes",[])],
    }
```


[FILE] app/assistants/requirements.txt
--------------------------------------
```
fastapi
uvicorn[standard]
openai
pydantic
python-dotenv
httpx
```


[FILE] app/assistants/Dockerfile
--------------------------------
```
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8002
CMD ["uvicorn", "app.assistants.main:app", "--host", "0.0.0.0", "--port", "8002"]
```


[FILE] app/assistants/main.py
-----------------------------
```
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
app = FastAPI()
DRAFTS = {}; COUNTER = 0

class DraftCreate(BaseModel):
    channel: str  # "email" | "chat"
    conversation_id: str
    incoming_text: str
    customer_email: Optional[str] = None
    context: Dict = {}

class Approve(BaseModel):
    draft_id: str
    approver_user_id: str

class Edit(BaseModel):
    draft_id: str
    editor_user_id: str
    final_text: str

@app.post("/assistants/draft")
def draft(body: DraftCreate):
    global COUNTER
    COUNTER += 1
    did = f"d{COUNTER}"
    DRAFTS[did] = {"text": "DRAFT_PLACEHOLDER", "sources": [], "channel": body.channel,
                   "conversation_id": body.conversation_id, "created_at": datetime.utcnow().isoformat()}
    return {"draft_id": did}

@app.post("/assistants/approve")
def approve(body: Approve):
    # send via ZohoEmailAdapter / ChatAdapter (to be implemented)
    return {"sent_msg_id": "ext-approve-stub"}

@app.post("/assistants/edit")
def edit(body: Edit):
    # compute diff, learn, send via adapter (to be implemented)
    return {"sent_msg_id": "ext-edit-stub"}
```


[FILE] app/sync/requirements.txt
--------------------------------
```
fastapi
uvicorn[standard]
python-dotenv
httpx
```


[FILE] app/sync/Dockerfile
--------------------------
```
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8003
CMD ["uvicorn", "app.sync.main:app", "--host", "0.0.0.0", "--port", "8003"]
```


[FILE] app/sync/main.py
-----------------------
```
from fastapi import FastAPI, Request
app = FastAPI()

@app.post("/zoho/incoming")
async def zoho_incoming(req: Request):
    payload = await req.json()
    # upsert conversation/message; enqueue assistants.draft (to be implemented)
    return {"ok": True}

@app.post("/shopify/webhook")
async def shopify_webhook(req: Request):
    # verify HMAC; update customers/orders/inventory (to be implemented)
    return {"ok": True}
```


END OF FILE
