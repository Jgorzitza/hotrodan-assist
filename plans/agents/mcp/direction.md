# MCP Integrations Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## ✅ TASK COMPLETE - NEXT PHASE READY
**CURRENT STATUS**: ✅ mcp.fallback-task COMPLETE
**NEXT TASK**: mcp.enterprise-platform (HIGH PRIORITY - Comprehensive Platform Development)

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - mcp.enterprise-platform
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: mcp.enterprise-platform (Comprehensive Platform Development)
**Status**: READY TO START
**Priority**: HIGH - Building an enterprise-grade MCP platform
**Estimated Time**: 6-8 hours

## Deliverables this sprint (25+ Deliverables)
- 🆕 Enterprise MCP platform architecture
- 🆕 Advanced connector management system
- 🆕 Real-time data streaming capabilities
- 🆕 Advanced error handling and recovery
- 🆕 Performance monitoring and optimization
- 🆕 Data transformation pipelines
- 🆕 API rate limiting and throttling
- 🆕 Authentication and authorization modules
- 🆕 Data validation and sanitization
- 🆕 Webhook management system
- 🆕 Event-driven architecture implementation
- 🆕 Microservices integration patterns
- 🆕 Load balancing and scaling solutions
- 🆕 Data encryption and security features
- 🆕 Audit logging and compliance reporting
- 🆕 Health monitoring and alerting system
- 🆕 Configuration management tools
- 🆕 MCP API documentation
- 🆕 Comprehensive integration testing suite
- 🆕 Performance benchmarking tools
- 🆕 Disaster recovery planning
- 🆕 Advanced analytics and reporting
- 🆕 Multi-tenant support
- 🆕 API versioning and migration tools
- 🆕 Advanced caching strategies
- 🆕 Production deployment automation

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Add rate limiting and retry policies for all connectors.
- Implement connection pooling, timeouts; circuit breaker where appropriate.
- Wire error tracking and metrics dashboards per connector.
Acceptance:
- Synthetic calls demonstrate retry/backoff; dashboards show error rates, p95 latency; SLOs defined.

## Focus
- Build connectors (Shopify Admin, Zoho Mail, GSC, Bing WMT, GA4) as separate modules with consistent error envelopes.
- Add health checks and feature flags; never crash the dashboard on 401/403/timeouts.
- Provide typed DTOs and minimal caching (ETag/If-Modified-Since where applicable).

## First Actions Now
- Run MCP mocks and reliability suites:
```bash
npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  dashboard/app/lib/mcp/__tests__/*.test.ts \
  dashboard/app/lib/connectors/__tests__/registry.server.test.ts \
  dashboard/app/lib/streaming/__tests__/*.test.ts
```
- Live validation (requires secrets provided):
```bash
npx prisma generate --schema dashboard/prisma/schema.prisma
ENABLE_MCP=true USE_MOCK_DATA=false \
MCP_API_URL={{MCP_API_URL}} MCP_API_KEY={{MCP_API_KEY}} \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  dashboard/app/lib/mcp/__tests__/live-connection.test.ts
```

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/mcp.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Finalize rate limit/retry/pooling defaults; config via env
2) Expose connector health and metrics to dashboard routes
3) Add circuit breaker dashboards + alerts
4) Write integration tests over registry + protocol contracts
5) Prepare live-connect playbook gated by creds
- Add rate limiting and retries to all connectors; set sane timeouts.
- Implement connection pooling and circuit breaker where applicable.
- Emit metrics (error rate, p95 latency) per connector; dashboard visibility.
- Append test runs + metrics screenshots to feedback/mcp.md.

## Production Today — Priority Override (2025-10-01)

First Directive — MCP Live Validation + Tunnel (with CEO)
- Work directly with the CEO to obtain MCP_API_URL and MCP_API_KEY for live validation.
- Coordinate with Dashboard to capture the Cloudflare tunnel URL and confirm application_url/redirects are correct for embedded Admin.
- Execute the live validation suite immediately after envs are set; attach outputs and next steps to feedback/mcp.md and coordination/inbox/mcp/DATE-notes.md.

Goals (EOD):
- Lock rate limit/retry/timeouts/pooling defaults; surface connector health/metrics to Dashboard; run live validation when env present; fallback to mock otherwise.

Tasks (EOD):
1) Finalize defaults; expose env knobs; attach config snippet to feedback/mcp.md.
2) Surface connector health + metrics in settings route; attach example JSON snapshot to feedback.
3) Execute live validation with MCP_API_URL/MCP_API_KEY when provided; else record blocked status and keep mocks.

Acceptance:
- vitest live-connection test passes when env provided.
- /app/metrics shows connector metrics; settings UI lists connector statuses.
- Clear fallback behaviour (no crashes) when live env missing.

### CEO Dependencies — Today
- Provide MCP_API_URL and MCP_API_KEY for live validation.
