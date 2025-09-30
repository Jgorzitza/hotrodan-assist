# Storefront MCP Boundary

## Objective
Establish the guardrails for the first customer-facing release of the Storefront experience that surfaces RAG-backed answers, FAQ updates, and product availability from Shopify while staying tightly integrated with the approval workflow. The MCP defines exactly what must ship together to be valuable, safe, and operable for real customers.

## Desired Outcomes
- Customers can ask fitment/product questions on the storefront (chat widget + inline FAQ) and receive drafts approved by operators.
- Operators can trust the surfaced answers because they reference vetted sources (Chroma, Shopify sync, corrections, goldens).
- The storefront continuously reflects latest inventory, FAQ content, and correction overrides without manual deployment steps.

## Context & Scope History
- Email approval loop launched first to prove draft quality and corrections workflow; storefront channel is the second workload leveraging the same backbone.
- Prior storefront automation attempts broke due to stale data and lack of guardrails; this MCP enforces quality gates before exposing to customers.
- Shopify storefront is already instrumented with GTM/GA; the widget must integrate without breaking existing analytics or performance budgets.

## Personas & Primary Journeys
- **Retail Customer (Anonymous/Returning)**: initiates chat, receives AI-assisted responses, may escalate to human; expects fast fitment confirmations.
- **Operator (Support Agent)**: reviews drafts in Approval App, edits where needed, approves replies, adds corrections/goldens when gaps found.
- **Knowledge Ops Editor**: curates FAQ entries, tracks corrections backlog, ensures tone/style alignment.
- **Storefront Engineer**: maintains widget, performance budgets, SEO integrity, and deployment pipeline.
- **Product Manager**: monitors KPIs, prioritizes expansions (e.g., proactive outreach, personalization) once MCP proves value.

## Example Scenarios
1. **Fitment Confirmation**: Customer asks “Will the 400 LPH pump work on my LS swap?” → draft references Chroma docs + Shopify inventory; operator approves; response sent within 2 minutes.
2. **Low Confidence Edge Case**: Customer uploads unusual turbo setup details → draft confidence < threshold; widget notifies customer of manual follow-up; operator adds correction for new SKU and responds.
3. **Inventory Update**: Shopify marks `AN-10-hose` out of stock → webhook updates cache; subsequent chats automatically mention restock ETA; FAQ entry updated after approval.
4. **FAQ Addition**: Repeated questions about ethanol compatibility → operator flags; Knowledge Ops approves FAQ update; storefront auto-publishes with JSON-LD.
5. **Incident Drill**: OpenAI outage triggers 5xx; automatic fallback message triggered; on-call publishes status update and runs incident checklist.

## Critical Capabilities (In Scope)
1. **Chat Widget (MVP)**
   - Embedded widget on hotrodan.com pages (desktop + mobile responsive).
   - Authenticates anonymously with session fingerprinting; escalates to operator when confidence < threshold.
   - Captures customer email optionally for follow-up; consents stored for future marketing flows.
2. **FAQ Surface**
   - Auto-refreshes FAQ answers as `/faq/propose` items are approved and published.
   - JSON-LD `FAQPage` schema injected for SEO.
3. **Draft Review Loop**
   - Chat drafts flow through Approval App inbox; `Approve & send` pushes message to storefront widget.
   - Edits update corrections/goldens pipeline automatically (no manual YAML edits required for basic cases).
4. **Shopify Sync (Read-Only)**
   - Nightly + webhook delta updates for products, variants, inventory, pricing.
   - `/customer_summary` endpoint exposes stock, lead time, and price to prompt.
5. **Observability & Guardrails**
   - Basic dashboard (Grafana or lightweight FastAPI UI) for latency, answer rate, escalations, cost per message.
   - Confidence gating with fallback to operator: low confidence triggers “We’re checking, expect a follow-up.”

## Explicit Exclusions (Out of Scope for MCP)
- Payments or checkout flows inside the chat.
- Deep user personalization requiring customer login (future post-MCP).
- Proactive outbound messaging or marketing automations.
- Multi-language support beyond English.
- Voice interface or phone integration.

## Entry Criteria
- Offline goldens covering top 20 storefront intents pass without regression.
- Corrections YAML includes all safety-critical overrides (fuel compatibility, pump sizing, AN line specs).
- Shopify API credentials validated in non-production environment; rate limits profiled.
- Approval App baseline workflow (approve/edit/send) live for email channel.

## Exit Criteria
- ≥90% of storefront chats responded within 2 minutes (human + AI combined).
- ≥80% operator satisfaction on draft quality (measured via post-approval survey toggle).
- FAQ auto-update pipeline publishes at least one approved item end-to-end.
- No P0 incidents during 1-week controlled beta.

## Acceptance Test Matrix
- **Chat Draft Loop**: Trigger chat message in staging, verify draft surfaces in Approval App, approval returns response to widget within SLA.
- **FAQ Publish Path**: Approve proposed FAQ item and confirm storefront reflects update with JSON-LD validation.
- **Shopify Sync Accuracy**: Simulate inventory change via webhook; ensure `/customer_summary` and draft responses include new quantity within 5 minutes.
- **Confidence Gating**: Force low-confidence scenario; widget displays “We’re checking” message and operator follow-up notification fires.
- **Observability**: Induce synthetic latency spike; confirm dashboard visualization and alert notification to on-call within 2 minutes.

## Interfaces & Contracts
- **Assistants Service**
  - `POST /assistants/draft` invoked by storefront chat when new message arrives.
  - `POST /assistants/edit|approve` triggered from Approval App; success triggers webhook to storefront widget.
- **Sync Service**
  - Shopify webhooks (`orders/create`, `inventory_levels/update`) delivered to `/sync/shopify/*` endpoints.
  - Nightly job ensures full refresh for missed webhooks.
- **Storefront Widget Service**
  - WebSocket channel for live updates from assistants service.
  - REST fallback: `GET /chat/{session_id}/transcript`.
- **Data Storage**
  - Postgres: sessions, messages, approvals, faq_entries, product cache.
  - Chroma: `hotrodan_docs` vector collection, refreshed via ingest workflow.

## API Contract Details
- **POST /assistants/draft**
  - Request: `{ "channel": "storefront", "session_id": "uuid", "message": "string", "metadata": { "url": "string", "email": "string|null", "confidence_hint": "float|null" } }`
  - Response: `{ "draft_id": "uuid", "message": "string", "confidence": "float", "sources": [{"type": "chroma|shopify|correction", "reference": "string"}] }`
  - Errors: `429` throttled; `503` on upstream model failure (widget displays fallback).
- **POST /assistants/approve**
  - Request: `{ "draft_id": "uuid", "operator_id": "uuid", "final_message": "string", "confidence": "float" }`
  - Response: `204` on success; triggers WebSocket payload `{ "session_id": "uuid", "message": "string", "sources": [...] }`.
- **POST /assistants/edit**
  - Request: `{ "draft_id": "uuid", "operator_id": "uuid", "edits": [{"before": "string", "after": "string"}], "final_message": "string" }`
  - Response: `204`; stores edit diff for learning loop.
- **GET /customer_summary?email=...**
  - Response: `{ "customer": {...}, "orders": [...], "inventory": [...], "promotions": [...] }`; caching TTL 5 minutes.
- **Storefront WebSocket Payload**
  - `{ "type": "draft_update", "session_id": "uuid", "status": "pending|approved|escalated", "message": "string", "confidence": "float", "sources": [...] }`.

## Architectural Constraints
- Use existing FastAPI services; no new microservice unless justified.
- Deploy via Docker Compose for MCP; Kubernetes optional later.
- Follow existing corrections + goldens learning loop.
- No direct database writes from frontend; everything via APIs.

## Dependencies
- Shopify API access (app credentials + webhook topics configured).
- Approval App MVP (email pipeline) live to reuse auth, role-based access.
- Corrections + goldens pipeline maintained (owned by Knowledge Ops squad).
- Content ingest (crawler + incremental) stable and monitored.

## Assumptions
- Approval App continues to serve as the single operator surface across channels; no parallel tooling to maintain.
- Chroma remains the authoritative vector store; no mid-MCP migration to alternative retrieval stack.
- Operators available 8am–8pm CT to maintain confidence gating loop; after-hours fallback can defer responses.
- Shopify storefront performance budget can accommodate additional widget script without degrading Core Web Vitals.
- Legal/privacy review can complete before Week 3 to avoid launch delays.

## Ownership & Stakeholders
- **Storefront Squad (DRI: TBD)**: owns widget UX, embedding, and SEO compliance.
- **Assistants Squad (DRI: TBD)**: maintains draft generation endpoints and learning loop.
- **Sync Squad (DRI: TBD)**: ensures Shopify ingest reliability and `/customer_summary` freshness.
- **Knowledge Ops (DRI: TBD)**: curates corrections, goldens, and FAQ editorial standards.
- **SRE/Platform (DRI: TBD)**: observability stack, alerting, and incident runbooks.
- **Legal & Compliance**: reviews transcript storage, consent capture, and privacy notices.

## Staffing & Capacity Plan
- **Storefront Engineering**: 1 senior FE (widget + analytics) + 0.5 shared QA.
- **Assistants Backend**: 1 backend engineer (routing, prompts, approval webhooks).
- **Sync/Data**: 0.5 engineer covering Shopify ingest + caching.
- **Knowledge Ops**: 1 editor for FAQ, corrections, goldens during pilot.
- **Product/Design**: 0.5 PM + 0.5 designer for UX, comms, and feedback loops.
- **SRE/Platform**: on-call coverage plus 0.25 engineer for observability setup.

## Implementation Outline
1. **Widget Delivery**: build React widget shell, integrate WebSocket + REST fallback, instrument basic analytics events.
2. **Routing Layer**: extend `query_chroma_router.py` to support storefront channel metadata and confidence scoring tuned for chat.
3. **Approval App Integration**: add chat channel queue, thread context view, and webhook back to storefront widget on approval/edit.
4. **Shopify Data Flow**: configure webhooks, nightly backfill job, and cache tier that respects rate limits; surface normalized data to prompts.
5. **FAQ Pipeline Automation**: trigger propose → approve → publish automations, ensure CDN purge on publish.
6. **Observability & Alerts**: add latency/error dashboards, confidence distribution tracking, and operator queue depth alarms.

## Implementation Checklist
- [ ] Feature flag scaffolding for widget rollout.
- [ ] Session persistence + anonymous ID routing implemented.
- [ ] Assistants prompt updated with storefront tone + required safety checks.
- [ ] Approval App channel filter and WebSocket push verified in staging.
- [ ] Shopify webhook subscriptions created (inventory, products, orders).
- [ ] CDN purge automation wired for FAQ publish events.
- [ ] Observability dashboards + alerts deployed in staging.
- [ ] Run acceptance test matrix and capture evidence.
- [ ] Beta operator training complete with signoffs.

## Data Flow Overview
1. Customer submits chat message via widget → message stored in Postgres with session context.
2. Widget calls `POST /assistants/draft` with storefront channel metadata → assistants service enriches prompt with Shopify + Chroma context.
3. Draft persisted and surfaced to operator in Approval App → operator edits/approves.
4. Approval App calls `POST /assistants/approve|edit` → assistants service pushes final response to widget via WebSocket + logs learning signals.
5. Corrections/goldens pipeline updates offline assets → next ingest run refreshes Chroma context and FAQ surfaces auto-refresh.
6. Observability stack captures latency/confidence metrics → alerts trigger if thresholds breached.

## Data Schema Snapshot (Postgres)
- **sessions**: `id`, `channel`, `session_token`, `customer_email`, `created_at`, `status`.
- **messages**: `id`, `session_id`, `sender` (`customer|assistant|operator`), `body`, `confidence`, `sources`, `created_at`.
- **drafts**: `id`, `session_id`, `message_id`, `model`, `confidence`, `status`, `created_at`, `approved_at`.
- **approvals**: `id`, `draft_id`, `operator_id`, `action` (`approve|edit|reject`), `notes`, `created_at`.
- **edits**: `id`, `draft_id`, `diff`, `applied_by`, `created_at`.
- **faq_entries**: `id`, `question`, `answer`, `status`, `published_at`, `source_correction_id`.
- **product_cache**: `sku`, `title`, `inventory_qty`, `price`, `lead_time`, `updated_at`.
- **learning_events**: `id`, `draft_id`, `event_type`, `payload`, `created_at`.

## Environment & Deployment Strategy
- **Dev**: isolated sandbox with mock Shopify/OpenAI endpoints; rapid iteration for widget + API changes.
- **Staging**: mirrors production topology; runs nightly ingest against staging Shopify store; primary environment for acceptance tests.
- **Production**: single region deployment via Docker Compose stack; blue/green widget rollout using feature flags.
- Deployments automated through CI pipeline with infrastructure linting, unit/integration tests, and manual approval gate before production.
- Rollback: toggle feature flag for widget disable; revert Compose services using previous tagged release; document recovery within runbook.

## Non-Functional Requirements
- **Performance**: widget bundle < 150KB gzipped; first AI draft available within 5 seconds median from customer send to operator view; p95 approval turnaround < 60 seconds during staffed hours.
- **Reliability**: 99.5% availability for assistants/sync services 8am–8pm CT; queue depth alarms when pending drafts > 10 for > 5 minutes; durable storage for chat transcripts.
- **Security**: enforce HTTPS/TLS 1.2+, signed webhook payloads, per-service API keys rotated quarterly, RBAC aligned with Approval App roles.
- **Accessibility**: WCAG 2.1 AA compliance, keyboard focus states, transcripts exportable for screen readers.
- **Maintainability**: infra defined in IaC (docker-compose + env templates); logging structured (JSON) for searchability.

## Testing & Validation
- **Unit & Contract Tests**: cover new FastAPI endpoints and widget API contracts using pytest + HTTPX client.
- **Integration Tests**: run end-to-end flows in staging with mocked Shopify and OpenAI responses; verify approval loop and FAQ publish path.
- **Offline Goldens**: expand `goldens/qa.yaml` with storefront intents (fitment, availability, returns); block deploy on regressions.
- **Load & Resilience**: simulate peak storefront traffic (100 concurrent chats) and webhook bursts to confirm latency <2s and no dropped jobs.
- **UX Acceptance**: run moderated usability sessions with operators and 3 beta customers; capture satisfaction metrics.

## Rollout Plan
1. **Internal Alpha**: restrict widget to staff IPs; run dry runs with seeded conversations; iterate on prompts and corrections.
2. **Private Beta**: enable for select returning customers (via parameterized link); monitor metrics daily; close P0 bugs before broader exposure.
3. **Public Launch**: remove gating; announce via banner; keep on-call rotation for first 2 weeks; collect qualitative feedback.
4. **Post-Launch Hardening**: review metrics after 30 days; implement backlog items (multi-language, personalization) once MCP stabilized.

## Open Questions
1. Do we enforce chat identity via Shopify customer login when known, or keep anonymous? Need privacy review.
2. What SLA do we communicate to customers when draft confidence is low?
3. Should FAQ updates trigger cache invalidation on CDN automatically or via manual publish flow?
4. Are there legal requirements for storing chat transcripts (retention, PII masking)?
5. How do we handle attachments (images of engine bays, invoices) within MCP scope?

## Risks & Mitigations
- **Incorrect Product Recommendations**: enforce corrections/goldens; add operator double-check flag for new SKUs.
- **Latency Spikes**: introduce queue monitoring + fallback message if draft >15s.
- **Shopify Rate Limits**: cache inventory lookups with TTL; stagger nightly sync.
- **Operator Overload**: implement on-call rotation + notify when queue > threshold.
- **Security/Privacy**: ensure HTTPS only, rotate API keys, redact PII before storage where required.

## Milestones
- **Week 1**: Embed chat widget stub, connect to assistants draft endpoint (sandbox); observability hooks stubbed.
- **Week 2**: Approval App integration for chat channel; confidence gating live; Shopify sync read-only complete.
- **Week 3**: FAQ auto-update path (propose → approve → publish) live; JSON-LD testing complete.
- **Week 4**: Beta launch with limited traffic; monitor metrics; close open questions; finalize MCP signoff.

## Timeline & Key Dates
- **T-6 weeks**: Kickoff, staffing confirmed, discovery with operators/customers.
- **T-4 weeks**: Shopify webhook access provisioned; widget prototype behind feature flag.
- **T-3 weeks**: Internal alpha start; confidence thresholds tuned; DPIA in progress.
- **T-2 weeks**: Launch readiness review; incident tabletop completed; FAQ automation staging signoff.
- **T-1 week**: Private beta expansion; monitoring/alerting thresholds locked.
- **Launch (T0)**: Public widget enabled; on-call war room active.
- **T+2 weeks**: Beta retrospective; decision on next tranche (personalization, proactive outreach).

## Measurement
- Chat adoption: # sessions/day.
- Auto-resolved vs escalated rate.
- Average draft approval time.
- FAQ freshness lag (ingest → publish).
- Operator edit delta length (proxy for draft quality).

## Analytics & Reporting
- Central dashboard combining chat volume, approval latency, confidence distribution, and FAQ publish cadence.
- Weekly KPI report distributed to leadership with narrative on anomalies and operator sentiment.
- A/B experiment logging (draft model variants) tracked for conversion to resolved chats.
- Data warehouse snapshot (daily) storing aggregated metrics for long-term trend analysis.
- Alert thresholds documented alongside dashboards for faster tuning.

## Monitoring KPI Definitions
- **Draft Latency (p50/p95)**: time from customer send → draft visible to operator; Alert when p95 > 12s for 10 minutes.
- **Approval Turnaround**: time from draft creation → operator decision; Alert when median > 90s under staffed hours.
- **Escalation Rate**: percentage of chats requiring manual follow-up; watch for >30% spike day-over-day.
- **FAQ Publish Velocity**: number of approved FAQ entries per week; target ≥2 during beta.
- **Error Rate**: proportion of API calls returning 5xx/429; Alert when >2% over 5 minutes.
- **Confidence Distribution**: weekly review to adjust threshold or training.

## Communication & Governance Plan
- Weekly triad sync (Storefront, Assistants, Product) to review metrics, blockers, and decisions.
- Daily async standup in `#storefront-assistants` for status updates during beta window.
- Bi-weekly stakeholder demo highlighting draft quality, FAQ updates, and incident learnings.
- Launch readiness checklist reviewed 2 weeks prior to public launch with signoff from Product, Legal, Support, and SRE.
- Central decision log updated after each governance meeting; link shared in team wiki.

## Training & Change Management
- Operator onboarding session covering widget workflow, escalation paths, and editing best practices.
- Knowledge base updates with step-by-step guides and troubleshooting tips for storefront drafts.
- Quick reference cards highlighting confidence cues and when to add corrections/goldens.
- Feedback loop: operators submit issues via form feeding backlog triage; responses within 24 hours during beta.
- Storefront FAQ for customers updated to explain new chat functionality and data use basics.

## Operational Readiness Checklist
- On-call rotation established for storefront + assistants with escalation tree documented.
- Runbooks published covering widget outage, Shopify sync lag, and approval queue backlog.
- Dashboards wired into shared observability stack with alert thresholds reviewed by SRE + product.
- Chaos tabletop exercise scheduled prior to beta covering assistants outage and webhook failure scenarios.

## Cost & Budget Tracking
- Baseline OpenAI usage targets defined per chat (draft + revisions) with monthly budget cap.
- Shopify API call utilization monitored; alerts when approaching 80% of rate limit allocations.
- Hosting cost breakdown (compute, storage, observability) reviewed monthly with Platform team.
- Documented mitigation plan if costs exceed thresholds (model downgrades, caching adjustments, throttling).
- Finance partner looped into monthly KPI review to reconcile spend vs forecast.

## Data Handling & Compliance
- Customer messages stored in Postgres with 90-day retention; older transcripts archived to encrypted object storage.
- PII (email, phone) redacted in training snippets and observability logs.
- GDPR/CCPA consent banner updated to cover chat capture; opt-out flows documented.
- DPIA triggered before public launch; legal to sign off on transcript retention and escalation handling.

## Incident Response & Support
- Severity matrix aligned with global incident policy; storefront chat outage = Sev1 during business hours.
- Primary pager: Assistants on-call; secondary: Storefront engineer; comms channel: `#hotrodan-incidents`.
- Customer comms templates drafted for outages >15 minutes or data exposure events.
- Post-incident review must update corrections/goldens or monitoring as mitigation items.

## Backlog & Future Enhancements
- Proactive outreach when inventory replenishes for out-of-stock requests.
- Multi-language draft support leveraging locale-specific corrections.
- Deeper personalization by linking authenticated Shopify customers to order history in prompts.
- Attachment handling (image OCR, document parsing) to interpret user-provided context.
- Integration with marketing automation once consent tracking hardens.

## Maintenance & Iteration Cadence
- Bi-weekly review of corrections/goldens updates with Knowledge Ops to prune stale overrides.
- Monthly ingest health audit ensuring crawl coverage and Chroma refresh success.
- Quarterly prompt review workshop evaluating draft tone, accuracy, and escalation trends.
- Rotating post-mortem review of incidents to feed reliability backlog.
- Annual architecture review assessing scale needs (Kubernetes migration, multi-region failover).

## Decision Log & Pending Approvals
- Widget framework: React micro-frontend embedded via script tag — approved by Storefront + Platform.
- Confidence threshold default (0.65) — pending calibration during alpha.
- FAQ auto-publish cadence (immediate vs batch) — requires Knowledge Ops signoff.
- Transcript retention policy (90-day online, 1-year cold storage) — pending Legal approval.
- Shopify webhook retries via Celery vs native Shopify retry — decision due Week 1.

## Next Steps
1. Fill DRI placeholders across squads and circulate ownership matrix for signoff.
2. Schedule DPIA/legal review session and finalize transcript retention + consent language.
3. Calibrate confidence threshold + escalation policy during internal alpha; document resulting guardrails.
4. Stand up beta feedback loop (operator survey + customer follow-up) and finalize rollback playbook.

## Glossary
- **MCP**: Minimum Containable Product — release boundary ensuring customer value with guardrails.
- **DPIA**: Data Protection Impact Assessment required for processing personal data.
- **DRI**: Directly Responsible Individual accountable for delivery area.
- **Chroma**: Persistent vector store housing ingested site content for retrieval.
- **Corrections**: YAML-defined overrides delivering deterministic responses for critical queries.
- **Goldens**: Offline regression test cases ensuring prompt quality remains stable.
- **Confidence Threshold**: Model-derived score determining if draft can auto-send or requires human review.
