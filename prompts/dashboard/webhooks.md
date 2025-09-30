# Webhooks Control Plane

## Scope
- Provide a dashboard surface to monitor inbound Shopify + Zoho webhooks alongside future connectors.
- Track subscription metadata (topic, callback URL, secret status) and flag handshake or delivery failures.
- Expose delivery history with filters, payload preview, and replay actions that re-enqueue processing via `app/sync`.
- Guide operators through secret rotation, manual handshake retries, and provider-side subscription refreshes.
- Surface health metrics (latency, failure rate) and link to alerting runbooks when thresholds are breached.

## Deliverables
- Remix route `app/routes/dashboard.webhooks.tsx` with loader returning `WebhookDashboardPayload` (subscriptions, stats, deliveries) and actions for replay, rotate, and handshake retry.
- Data-layer modules `WebhookSubscriptionRepository`, `WebhookDeliveryRepository`, and `WebhookReplayService` connecting Postgres models to the dashboard and `app/sync` queue stubs.
- `app/mocks/webhooks.ts` factories (base, failing, empty scenarios) wired into `seed-data` and `USE_MOCK_DATA` toggle.
- Polaris UI composition: summary cards, filterable table, payload drawer/modal, rotation dialog, inline banners for degraded health.
- Runbook links + API contract notes for the FastAPI sync service (`app/sync/main.py`) covering replay and handshake endpoints.

## Storage & Schema
- Tables: `webhook_subscriptions` (id, source, topic, callback_url, status, secret_digest, handshake_url, last_verified_at, consecutive_failures, metadata JSONB) and `webhook_deliveries` (id, subscription_id, event_id, status, attempt_count, last_attempted_at, response_code, latency_ms, payload_path, error_message, initiated_by).
- Persist payload bodies to object storage (`s3://webhooks/{subscription}/{event}.json`) with local disk fallback while mocks run; keep a 4KB preview column in Postgres for quick lookup.
- Optional `webhook_replay_jobs` table (id, delivery_id, requested_by, requested_at, status) if we need audit-friendly queue persistence before RQ/Celery workers ship.
- Index on `(subscription_id, last_attempted_at DESC)` and `(source, status)` for loader filters; add partial index for `status = 'failing'` to power alerts.
- Secrets stored via `secrets.server.ts` helper; never persist plaintext webhook secrets, only salted hashes + metadata.

## Event Flow & Replay
- Inbound events hit `app/sync` (`/zoho/incoming`, `/shopify/webhook`); verify signatures (`X-Shopify-Hmac-Sha256`, Zoho `Authorization`) using secrets from settings, then persist delivery rows and enqueue processing job.
- Loader aggregates stats: last delivery timestamp, 24h success rate, consecutive failures per subscription, and average latency pulled from `webhook_deliveries`.
- Replay action POSTs to new FastAPI endpoint `/webhooks/replay/{delivery_id}` (to implement) that reads stored payload, revalidates signature, and republishes to the processing queue; update delivery status + append replay attempt metadata.
- Handshake retry triggers `/webhooks/handshake/{subscription_id}` calling provider APIs (Shopify REST `POST /admin/api/2024-10/webhooks/{id}/migrate.json`, Zoho validation endpoint) with TODO until real clients land.
- All user actions log to `audit_log` with `performed_by`, `action`, `target_id`, and diff snapshot of changed fields.

## UI / UX
- Route layout: KPI cards (Active subscriptions, Failing topics, Avg latency 24h), filters (source, topic, status), table listing recent deliveries with Polaris `DataTable` + pagination.
- Subscription accordions show callback URL, secret age, last handshake, recent failure timeline, and buttons for Rotate secret, Retry handshake, Replay latest.
- Delivery table columns: Event time, Topic, Source, Status badge (`Success`, `Warning`, `Error`), Response code, Latency, Actions menu (View payload, Replay, Copy event ID).
- Payload viewer modal displays prettified JSON with copy + download, showing truncation notice when preview clipped.
- Empty state CTA invites operators to fire Shopify test webhook; error state surfaces inline banner with link to sync service logs.
- Toast confirmations on replay/rotation success; disable buttons + show loading state while actions submit (use optimistic UI for replay success path when mocks are enabled).

## Operational Safeguards
- Secret rotation flow requires double-entry confirmation, notes rotation timestamp, and calls `secrets.server.ts` to hash + store metadata; success message reminds operators to update provider-side secret.
- Rate-limit replays to one per delivery every 5 minutes, max 10 per operator per hour; display warning banner when thresholds hit.
- Default payload retention 7 days; add toggle to extend to 30 days with compliance warning (note object storage cost + privacy obligations).
- Surface sync service version (`app/sync` git SHA) and ensure dashboard warns when versions drift beyond one deploy.
- Hook webhook failure alerts into `prompts/dashboard/deployment.md` runbook (PagerDuty/Better Stack) with threshold: >5 consecutive failures or success rate < 90% over 1h.

## Testing & QA
- Unit tests for repositories ensuring filtering, pagination, and secret masking behave correctly; cover replay audit logging.
- Loader/action tests simulating replay + rotation using `USE_MOCK_DATA` scenarios (success, failure, rate-limited).
- Playwright flow: mark subscription failing via mock, confirm banner + toast after replay clears failure state, verify payload modal renders.
- Contract tests between Remix action and FastAPI replay endpoint (request/response schema, error propagation) using stub clients.
- Add smoke step to deployment checklist: trigger Shopify test webhook, replay once, confirm dashboard metrics update.

## Dependencies
- `prompts/dashboard/data-layer.md` for repository and secret helper contracts.
- `prompts/dashboard/seed-data.md` for mock factories feeding loaders and UI states.
- `prompts/dashboard/deployment.md` for alerting hooks, env vars (`SHOPIFY_WEBHOOK_SECRET`, Zoho tokens), and runbook references.
- `prompts/dashboard/route-settings.md` for secret storage + integration toggles surfaced alongside webhooks.
- `app/sync/main.py` FastAPI stubs and future replay/handshake endpoints.

## Tasks
- [ ] Define repository interfaces + mock implementations for subscriptions and deliveries.
- [ ] Scaffold Remix loader/action for `/dashboard/webhooks` with filters, replay, handshake, rotation logic.
- [ ] Build Polaris UI (cards, filters, tables, payload modal, rotation dialog) and wire optimistic feedback.
- [ ] Implement `app/mocks/webhooks.ts` scenarios and register with `USE_MOCK_DATA` gate.
- [ ] Extend `app/sync/main.py` with replay + handshake endpoints and document provider API touchpoints.
- [ ] Document alert thresholds + retention policy; update deployment runbook references.
- [ ] Add automated tests (unit + Playwright) covering failure + replay flows.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Coordinate with sync service + settings route to keep secret rotation, audit logging, and provider credentials in sync.
