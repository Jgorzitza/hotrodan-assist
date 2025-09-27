# Webhooks & Background Sync

## Scope
Handle Shopify webhook subscriptions, HMAC verification, routing, and persistence. Cover registration during OAuth/install, handler architecture, retry strategy, and local testing workflow.

## Target Topics
- `orders/create`
- `orders/fulfilled`
- `fulfillments/update`
- `products/update`
- `app/uninstalled`

## Deliverables
- Registration helper executed on install (`afterAuth`) that ensures topics subscribed with correct delivery URL, API version, and secret.
- HMAC verification middleware capturing raw body (`X-Shopify-Hmac-Sha256`) and rejecting invalid signatures.
- Handler modules per topic writing to Prisma models (`OrderFlag`, `ProductVelocity`, `Store` token cleanup, etc.).
- Background enqueue pattern for heavier processing (e.g., regenerate analytics, refresh inventory velocity) — use simple Remix resource route/cron stub for now.
- Local + staging testing commands using `shopify app webhook trigger` and `curl` scripts with sample payloads.

## Technical Notes
- Use `@shopify/shopify-app-remix/server` utilities: `registerWebhooks`, `authenticate.webhook`, `DeliveryMethod.Http`.
- Store webhook subscriptions in DB keyed by `topic` + `shop`; upsert tokens on changes.
- Parse raw body before JSON to compute HMAC; in Remix, use `request.clone().arrayBuffer()` pattern.
- Handler should respond within 5s; kick heavy jobs to async worker (Remix action hitting queue stub).
- Implement idempotency: track `X-Shopify-Webhook-Id` to avoid duplicate processing (store in `WebhookEvent` table or Redis).
- `app/uninstalled` must delete shop sessions, tokens, cached data, and disable scheduled jobs.
- Provide feature flag to toggle webhooks for local dev using mock payloads.

## Testing Workflow
- Local: `shopify app dev --store=afafsaf.myshopify.com` (tunnel) + `shopify app webhook trigger orders_create`.
- Staging: Use Shopify CLI or `scripts/shopify_webhook_replay.sh orders/updated` to send signed payloads (falls back to curl + HMAC generation).
- Document expected DB mutations per topic + Vitest coverage for signature helper (`app/tests/unit/webhook-signature.test.ts`).

## Tasks
- [x] Implement registration helper invoked post-install.
- [x] Build HMAC verification middleware with tests.
- [x] Create handler skeletons per topic writing to mock persistence.
- [x] Add background processing stub (Remix resource route) for heavy tasks.
- [x] Write local testing scripts + documentation in README/testing plan.
- [x] Update `overview.md` + `database.md` references once handlers wired.

## Status / Notes
- Owner: Sync & Webhooks agent (Codex)
- Progress: Shopify `afterAuth` now calls the webhook registrar (topics: orders/products/fulfillments/app uninstall) and records results; new `webhooks.*` route handlers persist to Prisma (registrations via the new `WebhookRegistry` table, flags/velocity leveraging `Store` relations) and enqueue background jobs via `/queue/webhooks`; BullMQ + Upstash driver is feature-flagged behind `WEBHOOK_QUEUE_DRIVER=bullmq` with a worker stub in `app/workers/webhooks.worker.ts`, diagnostics route now reads live BullMQ jobs (falling back to memory in dev), and test coverage added in `app/lib/webhooks/__tests__/queue.server.test.ts` alongside the existing handler suite.
- Tests: `CI=1 npx vitest run --config vitest.config.ts app/lib/webhooks/__tests__/handlers.server.test.ts app/lib/webhooks/__tests__/queue.server.test.ts`
- Blockers: Need to implement real processors inside the BullMQ worker (Zoho sync + analytics refresh) and ensure uninstall flow drains the Upstash queue and associated Redis keys.
- Immediate focus: wire worker processors with feature-flagged dispatchers, exercise an end-to-end replay via `scripts/shopify_webhook_replay.sh` hitting the BullMQ path, and extend integration coverage once worker side-effects land.
