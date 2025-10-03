# Hot Rod AN — Internal Ops Dashboard

Our north star is documented in [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md). We are building an embedded Shopify Admin dashboard that unifies RAG-powered assistance, approvals, and analytics so a single operator can steer the business.

## Repository Layout (`~/llama_rag`)
```text
~/llama_rag/
├── app/                 # FastAPI services: rag-api, assistants, sync, approval-app
├── dashboard/           # Remix + Polaris admin experience
├── corrections/         # RAG corrections applied during golden tests
├── docs/                # Canonical product & operations documentation
├── feedback/            # Agent proof-of-work logs (one file per agent)
├── plans/               # RPG graph, backlog, agent directions
├── scripts/             # Ops tools (health grid, fetch_mcp_token, load testing)
├── tests/ & e2e/        # Unit and Playwright suites
├── archive/legacy/      # Historical handovers and superseded specs (read-only)
└── artifacts/, tmp/,…   # Generated data, baselines, and local scratch space
```

## Local Setup
```bash
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -U llama-index openai "chromadb>=0.5" \
               llama-index-vector-stores-chroma llama-index-readers-web \
               llama-index-readers-file pyyaml \
               llama-index-embeddings-fastembed fastembed
cp .env.example .env                  # fill in service credentials (see docs/environment-variables.md)
python discover_urls.py               # crawl site content
python ingest_site_chroma.py          # build Chroma index
python query_chroma_router.py "EFI swap ~400 hp; pump LPH, 10 micron, AN sizes?"

# Dashboard (Remix + Polaris)
npm install
npm run lint
npm test -- --run
```

Key credentials (`OPENAI_API_KEY`, `SHOPIFY_*`, `ZOHO_*`, analytics tokens) live in `.env`; never commit secrets. Mock mode defaults keep the dashboard usable while live connectors are wired (`MCP_FORCE_MOCKS=true`).

## Quality Gates
- **RAG**: `python run_goldens.py`
- **Dashboard**: `npm run lint`, `npx vitest run --root dashboard --config dashboard/vitest.config.ts`
- **Playwright smoke**: `npm run test:e2e -- --list` (or the smoke target once live creds land)
- **Ops health**: `bash scripts/health_grid.sh` and `python scripts/live_check.py`

CI runs these lanes via `.github/workflows/ci.yml`; artifacts are published under `test-results/`.

## Canonical Sources
- Strategy: [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md)
- Architecture notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Components & patterns: [`docs/COMPONENTS.md`](docs/COMPONENTS.md), [`docs/PATTERNS.md`](docs/PATTERNS.md)
- Troubleshooting & runbooks: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md), [`docs/runbook.md`](docs/runbook.md)
- Decisions log: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Cleanup ledger: [`docs/cleanup/inventory-20251002.md`](docs/cleanup/inventory-20251002.md)

## Planning & Agent Coordination
- RPG topology: [`plans/rpg.json`](plans/rpg.json)
- Backlog: [`plans/tasks.backlog.yaml`](plans/tasks.backlog.yaml)
- Directions: [`plans/agents/<agent>/direction.md`](plans/agents/) (manager-owned)
- Feedback cadence: [`feedback/<agent>.md`](feedback/) (append proof-of-work every 5 minutes)
- Launch prompts: [`agent_launch_commands.md`](agent_launch_commands.md) — obey GO-gate instructions before starting any session.

For legacy prompts, handovers, and historical context, refer to `archive/legacy/` (read-only). Update the canonical docs whenever you ship a “molecule”: code, tests, docs, and decisions travel together.
