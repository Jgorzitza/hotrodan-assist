# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hot Rod AN is a RAG (Retrieval Augmented Generation) + Omnichannel Assistants platform for automotive parts e-commerce. The system integrates LlamaIndex + ChromaDB for knowledge retrieval with FastAPI microservices for inventory management, SEO analytics, sales insights, and Shopify integration.

**Start here**: Read `README.md` for quickstart and `HANDOVER.md` (if present) for full specs.

## Common Commands

### Python RAG Services

```bash
# Activate virtual environment
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Run RAG ingestion pipeline
python discover_urls.py                    # Discover URLs from sitemap
python ingest_site_chroma.py              # Ingest documents into ChromaDB
python query_chroma_router.py "query"     # Test RAG queries

# Run individual services (from repo root)
python -m uvicorn app.rag_api.main:app --host 0.0.0.0 --port 8001
python -m uvicorn inventory_api:app --host 0.0.0.0 --port 8004
python -m uvicorn app.sync.main:app --host 0.0.0.0 --port 8003

# Run regression tests (no API calls)
python run_goldens.py
```

### JavaScript/TypeScript (Node.js + Remix Dashboard)

```bash
# Install dependencies
npm ci                    # Clean install all dependencies
make install             # Install all packages/apps recursively

# Code quality
npm run lint             # Lint all code
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format with Prettier
npm run typecheck        # TypeScript type checking

# Testing
npm test -- --run        # Run unit/integration tests (Vitest)
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E with UI mode
python test_e2e_inventory.py  # Python inventory E2E tests

# Run single test file
npx vitest run path/to/test.ts
npx playwright test e2e/specific-test.spec.ts

# Dashboard development (in apps/dashboard/)
shopify app dev --store=afafsaf.myshopify.com
```

### Docker Compose Services

```bash
# Start all services
make start               # or: docker-compose up -d

# Stop all services
make stop                # or: docker-compose down

# View logs
make logs                # All services
make logs-api            # RAG API only
make logs-dashboard      # Dashboard only

# Health checks
make health              # Check all service endpoints
```

### Makefile Shortcuts

```bash
make help                # Show all available commands
make bootstrap           # Full bootstrap setup
make quick               # build + test + lint
make ci                  # Full CI pipeline locally
```

## Architecture Overview

### Python Services (FastAPI)

**RAG API** (`app/rag_api/`)
- Core retrieval system using LlamaIndex + ChromaDB
- Multi-model support: OpenAI or FastEmbed (fallback)
- Configuration in `rag_config.py` checks for valid `OPENAI_API_KEY`
- Entry point: `app/rag_api/main.py`

**Sync Service** (`app/sync/`)
- Normalizes Zoho and Shopify webhook events into Postgres
- Forwards events to assistants service
- Webhook signature validation for Shopify
- Entry point: `app/sync/main.py`

**Inventory API** (`inventory_api.py` at root)
- Production inventory management with 10+ modules
- Includes: stock sync, safety stock, demand forecasting, purchase orders, backorder policy, cycle counts, BOM/kitting, audit ledger, lead time variability
- All modules in `sync/` directory

**Assistants Service** (`app/assistants/`)
- OpenAI Assistants API integration with RAG
- Adapter pattern for vendor isolation (`adapters.py`)
- RAG integration layer (`rag_integration.py`)

**SEO API** (`app/seo_api/`)
- Bulk SEO analysis, content crawling, performance tracking
- Competitor analysis and AI content generation
- Content calendar automation

**Other Services**: `app/approval_app/`, `app/connectors/`, `app/enterprise/`

### Advanced RAG Pipeline

**Document Processing** (`rag_pipeline/document_pipeline.py`)
- Deduplication via SHA-256 content hashing
- TOC-aware splitting for documentation
- Semantic chunking with configurable size/overlap
- Used by all ingestion flows

**RAG Configuration** (`rag_config.py`)
- Auto-detects OpenAI API key validity (rejects placeholder keys)
- Falls back to FastEmbed when OpenAI unavailable
- Sets global `Settings.llm` and `Settings.embed_model`
- Two modes: `"openai"` (full generation) or `"retrieval-only"` (bullets only)

### Frontend (Remix + Shopify Polaris)

**Dashboard** (`apps/dashboard/`)
- Shopify Admin-embedded app
- Built with Remix + Polaris components
- Routes for inventory, sales, SEO, settings
- Mock data mode: `USE_MOCK_DATA=true` in `.env`
- MCP integration: Set `ENABLE_MCP=true` with credentials

### Database & State

- **Postgres**: Main database (via docker-compose)
- **Redis**: Caching layer
- **ChromaDB**: Vector store at `./chroma/` (collection: "hotrodan")
- **SQLite**: Test databases (`monitoring/sales_analytics_monitor.db`, etc.)

## Key Patterns & Conventions

### Environment Variables

- Copy `.env.example` to `.env` before running
- Required for Shopify: `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_SHOP`
- RAG: `OPENAI_API_KEY` (optional, falls back to FastEmbed)
- Config sentinel keys (ignored): `"placeholder"`, `"changeme"`, `"sk-xxxxx"`, etc.

### Testing Strategy

**Python**:
- Regression tests: `run_goldens.py` (offline, uses `corrections/corrections.yaml`, `goldens/qa.yaml`)
- E2E inventory tests: `test_e2e_inventory.py` (class-based, returns bool per test)
- Individual module tests: `test_*.py` files

**JavaScript**:
- Unit/integration: Vitest (`vitest.config.js`)
- E2E: Playwright (`playwright.config.js`)
- Cross-browser: `npm run test:cross-browser`

### Service Communication

- Services discover each other via `app/service_registry/`
- Health endpoints: `/health` on each service
- Webhooks: Shopify webhooks validated via HMAC signature
- MCP: Model Context Protocol integration for Shopify Storefront

### Code Generation

- Plop scaffolder: `npm run scaffold` (templates in `plopfile.js`)
- GraphQL codegen configured (check `package.json` scripts)

## Development Workflow

1. **Setup**: Run `make bootstrap` or manually install Python + Node deps
2. **Services**: Start with `make start` (Docker) or individual uvicorn commands
3. **Development**:
   - Python: Activate `.venv`, edit code, test with `run_goldens.py`
   - Node: Run `npm run dev` or specific service commands
4. **Testing**: Run `make test` or specific test suites
5. **Quality**: Pre-commit hooks via Husky check linting/formatting

## Deployment

- **Docker**: Services defined in `docker-compose.yml`
- **Cloudflare Tunnel**: Dashboard can use tunnel for HTTPS (see `cloudflared` service)
- **Production**: Scripts in `tools/production-optimization/` for monitoring and optimization
- **Shopify**: Deploy with `npm run shopify:deploy`

## Important Files

- `rag_config.py` - Global RAG settings, detects OpenAI vs FastEmbed mode
- `router_config.py` - RAG query router configuration
- `rag_pipeline/document_pipeline.py` - Advanced document processing
- `docker-compose.yml` - All service definitions and dependencies
- `Makefile` - Consolidated development commands
- `.cursorrules` - Auto-acceptance rules (not for general guidance)

## Coordination & Planning

- Agent coordination files in `coordination/` directory
- Agent-specific inboxes: `coordination/inbox/{agent}/`
- Status tracking: `coordination/status-dashboard.md`
- Dependency matrix: `coordination/dependency-matrix.md`

## MCP Integration

Shopify Dev MCP is configured and working. **Always use MCP tools when working with Shopify CLI, APIs, or development tasks.**

**When to use Shopify MCP:**
- Before using Shopify CLI commands (to understand latest syntax and options)
- When working with Shopify Admin API, Storefront API, or GraphQL schemas
- When implementing Polaris components or Liquid templates
- For any Shopify-related development questions

**Available MCP tools:**
- `learn_shopify_api` - **Call this FIRST** for any Shopify API work. Gets up-to-date instructions and establishes conversation context
- `search_docs_chunks` - Search across all shopify.dev documentation
- `fetch_full_docs` - Get complete documentation for specific API resources (e.g., `/docs/api/admin-rest/resources/product`)
- `introspect_graphql_schema` - Explore Shopify GraphQL schemas for types, queries, mutations

**MCP Configuration:**
- Server runs on stdio via `npx @shopify/dev-mcp@latest`
- Environment variables: `POLARIS_UNIFIED=true`, `LIQUID=true`, `LIQUID_VALIDATION_MODE=partial`
- Status: ✓ Connected and ready to use

## Notes

- Python services expect virtual environment activated (`.venv/`)
- Node services use `npm ci` for reproducible installs
- Playwright browsers auto-install in CI; locally run `npx playwright install --with-deps` once
- When `OPENAI_API_KEY` is missing/invalid, RAG returns retrieval-only bullets instead of generated answers
- All inventory modules are production-ready and tested