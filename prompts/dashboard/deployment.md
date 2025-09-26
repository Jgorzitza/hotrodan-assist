# Deployment & DevOps Plan

## Scope
Define the end-to-end path for packaging and operating the Shopify Remix dashboard. This covers a production-grade Docker image, Fly.io and Render deployment runbooks, environment toggles between the dev store and the live store, and operational guardrails (scaling, monitoring, smoke validation).

## Deliverables
- Multi-stage Dockerfile template targeting Node 20, wired for `npm run build` and `npm run start`.
- Deployment workflows for Fly.io and Render covering app provisioning, secret management, and data services (Postgres/Redis/Chroma persistence).
- Environment variable matrix spelling out dev store vs live store values for app URLs, credentials, and data stores.
- Scaling + observability checklist (cron/background tasks, concurrency, logging drains, uptime monitors).
- Link to the post-deploy smoke checklist in `prompts/dashboard/testing.md` for validation after each release.

## Containerization

### Multi-stage Dockerfile Template
```
# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bullseye AS base
ENV NODE_ENV=production
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runtime
# copy production node_modules (without devDeps)
COPY --from=deps /app/node_modules ./node_modules
# bring over compiled Remix assets
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/server ./server
COPY package.json ./
EXPOSE 8080
CMD ["npm", "run", "start"]
```

**Usage notes**
- Ensure `npm run build` outputs the server bundle under `build/` and `server/`. Adjust COPY paths as needed for the Remix project layout.
- Add any runtime-only dependencies (Prisma engines, `prisma generate`, etc.) as extra stages prior to the final COPY.
- Local smoke test before deploying: `docker build -t dashboard-remix .` then `docker run --env-file=.env -p 8080:8080 dashboard-remix`.

## Hosting

### Fly.io Workflow
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh` and authenticate with `fly auth login`.
2. Bootstrap app (one-time):
   ```
   fly launch \
     --name dashboard-remix \
     --dockerfile Dockerfile \
     --no-deploy
   ```
3. Provision Postgres and attach:
   ```
   fly postgres create --name dashboard-remix-db --initial-cluster-size 1 --vm-size shared-cpu-2x
   fly postgres attach --postgres-app dashboard-remix-db
   ```
   This seeds `DATABASE_URL` in Fly secrets; override with Prisma-compatible URL if required.
4. Configure secrets (dev store vs live store values from the matrix below):
   ```
   fly secrets set \
     APP_URL=https://dashboard-remix.fly.dev \
     SHOPIFY_SHOP=dev-shop.myshopify.com \
     SHOPIFY_ACCESS_TOKEN=*** \
     SHOPIFY_WEBHOOK_SECRET=*** \
     OPENAI_API_KEY=*** \
     ZOHO_CLIENT_ID=*** \
     ZOHO_CLIENT_SECRET=*** \
     ZOHO_REFRESH_TOKEN=*** \
     ZOHO_ORG_ID=***
   ```
5. Set persistence for Chroma/other data:
   ```
   fly volumes create chroma_data --size 10 --region dfw
   ```
   Add to `fly.toml`:
   ```toml
   [[mounts]]
   source = "chroma_data"
   destination = "/data/chroma"
   ```
6. Deploy:
   ```
   fly deploy --dockerfile Dockerfile --build-secret SHOPIFY_API_KEY=$SHOPIFY_API_KEY
   ```
   Include additional build secrets if `npm run build` needs them.
7. Scale and observe:
   ```
   fly scale count 2
   fly scale memory 512
   fly scale vm shared-cpu-2x
   fly logs
   ```
8. Wire observability: configure log drains (Datadog, Better Stack) or run a Vector sidecar. Enable Fly metrics and alerts on CPU, memory, and HTTP 5xx.

### Render Workflow
1. Create a Docker web service in Render pointing at this repo (Dockerfile above).
2. Provision managed Postgres and Redis instances; Render injects `DATABASE_URL` and `REDIS_URL` automatically.
3. In Render → Environment, set secrets from the matrix below. Use `Secret Files` for `.env` style exports if preferred.
4. Optional `render.yaml` blueprint:
   ```yaml
   services:
     - type: web
       name: dashboard-remix
       env: docker
       dockerfilePath: Dockerfile
       plan: starter
       envVars:
         - key: APP_URL
           value: https://dashboard-remix.onrender.com
         - key: SHOPIFY_SHOP
           sync: false
         - key: SHOPIFY_ACCESS_TOKEN
           sync: false
   databases:
     - name: dashboard-remix-db
       plan: starter
   ```
   Apply via `render blueprint apply render.yaml` once Render CLI is configured.
5. Enable auto-deploy on `main` and set a health check route `/health` (implemented in Remix loaders/actions).
6. Create a Background Worker service if long-running sync jobs or queue processors are needed.
7. Stream logs to your observability stack (Datadog, Better Stack, Splunk) using Render integrations or sidecars.

## Environment Strategy

### Dev vs Production Matrix
| Variable | Dev Store / Staging | Live Store / Production | Notes |
| --- | --- | --- | --- |
| `APP_URL` | `https://dashboard-remix-staging.fly.dev` or `https://dashboard-remix.onrender.com` | Custom domain (e.g., `https://dashboard.hotrodan.com`) with HTTPS + HSTS | Update Shopify app redirect URLs whenever this changes. |
| `SHOPIFY_SHOP` | `dev-hotrod.myshopify.com` | `hotrod-performance.myshopify.com` | Keep dev + prod installs separated to avoid data bleed. |
| `SHOPIFY_ACCESS_TOKEN` | Token generated from the Shopify dev store | Production token (least-privilege scopes) | Rotate with Shopify CLI and store in secret manager. |
| `SHOPIFY_WEBHOOK_SECRET` | Secret from the dev store webhook registration | Production webhook secret | Update Fly/Render secrets after rotating at Shopify. |
| `SHOPIFY_API_VERSION` | `2024-10` (ensure compatibility) | Same | Align versions to avoid schema drift. |
| `OPENAI_API_KEY` | Sandbox key with throttled usage | Production key with higher quota | Consider separate OpenAI projects for staging vs prod. |
| `POSTGRES_URL` | Local docker-compose or Fly/Render staging Postgres | Managed production Postgres (Fly Postgres, Render Postgres, or RDS) | Run migrations on deploy (`npm run prisma:migrate`). |
| `REDIS_URL` | Optional (local Redis docker, Render Starter Redis) | Managed Redis (Upstash/Fly Machines/Render) | Required if using session or job queues. |
| `CHROMA_PATH` / `PERSIST_DIR` | `/data/chroma` on staging volume | `/data/chroma` on production volume | Size volumes based on embedding count; keep ingest pipeline ready for rebuilds. |
| `ZOHO_*` | Sandbox org credentials | Production org credentials | Label secrets for quick rotation; restrict access per environment. |
| `SHOPIFY_BOT_SIGNATURE*` | Test signatures for dev webhooks | Production-signed values | Keep the agent URL aligned with environment (`SHOPIFY_BOT_SIGNATURE_AGENT`). |

**Environment flips**
- Prior to deployment, update `shopify.app.toml` `application_url` to match `APP_URL`, then run `shopify app deploy`.
- Store secrets in 1Password or Vault and script injection (`fly secrets import < .env.prod`, Render secret files) to reduce manual steps.
- Update `dashboard/.env` or Remix config files only through environment-specific overlays; avoid checking `.env` into git.

## Scaling & Operational Checklist
- **Concurrency:** Start with 2 instances (Fly Machines or Render deploys) behind the load balancer. If using in-memory sessions, enable sticky sessions or move session storage to Redis.
- **Background jobs:** Offload Shopify syncs, Zoho ETL, and AI ingest to worker processes (separate Fly Machine, Render worker, or queue consumers).
- **Cron:** Schedule nightly ingest/regression via Fly scheduled machines or Render cron jobs pointing at the Docker image.
- **Observability:** Emit structured logs with request IDs; forward to Datadog/Better Stack. Add OpenTelemetry/Datadog APM spans around outbound Shopify/OpenAI calls for latency tracking.
- **Alerts:** Uptime probe on `/health`, CPU > 70% sustained, memory swap, DB connection exhaustion, webhook failure spikes. Tie into PagerDuty.
- **Backups & DR:** Enable automated Postgres snapshots (Fly nightly snapshots, Render backups). Re-hydrate Chroma from `ingest_site_chroma.py` if the volume is lost; store embeddings export in object storage weekly.

## Post-Deploy Validation
- Follow the smoke steps in `prompts/dashboard/testing.md` (see the pending smoke checklist task under "Tasks" and the "Entry / Exit Criteria" section) immediately after Fly/Render deploys.
- Capture evidence in the release ticket: deploy ID, smoke run (Playwright or manual), webhook replay results, and log excerpts showing healthy start.

## Tasks
- [x] Draft Dockerfile steps with multi-stage build (deps, build, runtime).
- [x] Provide Fly.io + Render deployment command sequences.
- [x] Document env var matrix for dev store vs live store.
- [x] Note scaling considerations (cron/background jobs, concurrency).
- [x] Link to testing post-deploy smoke checklist.

## Status / Notes
- Owner: Justin (DevOps rotation)
- Blockers: none
