# 🚀 GO-SIGNAL — High-Velocity Mode Active (2025-10-01)

Last Updated: 2025-10-01 15:58 UTC • Next Sweep: 16:03 UTC

Project root (canonical): /home/justin/llama_rag

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Immediate Actions (Critical Path)

CEO Directive — Production Today (2025-10-01)
- Agents: Resume 5-minute polling for manager updates immediately
- Read each cycle:
  1) Production Today — Priority Override (2025-10-01)
  2) CEO Dependencies — Today
  3) Manager and Integration notes (coordination/inbox/manager|integration/2025-10-01-notes.md)
- Continue executing current tasks; log progress in feedback/<agent>.md and coordination/inbox/<agent>/<date>-notes.md
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
- Append to feedback/[your-agent].md every 5 minutes with proof-of-work (diff/test/artifact) or blocker + fallback started.
- If blocked, state the blocker and proceed with fallback tasks from your direction file.

## Compliance Enforcement
- If no proof-of-work appears in feedback within 10 minutes, the cycle is marked non-compliant and escalated in blockers-log.
- Continuous work is mandatory: pick the next task immediately from “Next 5 Tasks” in your direction.
- Automation: A scheduled monitor (Agent Proof Monitor) runs every 5 minutes to enforce proof-of-work and append escalations automatically.
