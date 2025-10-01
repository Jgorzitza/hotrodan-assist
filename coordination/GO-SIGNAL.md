# 🚀 GO-SIGNAL — High-Velocity Mode Active (2025-10-01)

Project root (canonical): /home/justin/llama_rag

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Immediate Actions (Critical Path)
1) Tooling — Production Pipeline (DOING)
   - Containerize services; CI/CD; health checks; monitoring/alerts
2) Dashboard — Live Data Integration (DOING)
   - Remove USE_MOCK_DATA; wire live MCP; error boundaries; CSP
3) MCP — Production Monitoring (DOING)
   - Rate limit/retry; timeouts/pooling; error tracking; SLO dashboards

## Polling Commands (run every 5 minutes)
```bash
ls -la coordination/GO-SIGNAL.md coordination/AGENT-INSTRUCTIONS.md || true
head -40 plans/agents/[your-agent]/direction.md || true
```

## Report Progress
- Append to feedback/[your-agent].md immediately when work completes.
- If blocked, state the blocker and proceed with fallback tasks from your direction file.
