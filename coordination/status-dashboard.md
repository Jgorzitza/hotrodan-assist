# Program Manager Status Dashboard

| Agent | Owner | Focus Branch | Last Sweep | Status | Notes |
| --- | --- | --- | --- | --- | --- |
 | Tooling – Prod Pipeline | Tooling | chore/prod-pipeline | 2025-10-03T02:30Z | DOING | Monitor instructions switched to python3; shim optional, verifying CI artifact uploads | 
 | Dashboard (Remix + Polaris) | Dashboard | chore/repo-canonical-layout | 2025-10-03T02:30Z | BLOCKED | `/app/metrics` 000; dev server not listening on :8080 | 
 | MCP Connectors | MCP | feature/mcp-client | 2025-10-03T02:30Z | BLOCKED | Connectors health 000; no local listener on :8003 | 
 | RAG & Corrections | RAG | feature/rag-refresh | 2025-10-03T02:30Z | BLOCKED | RAG `/health` 000; :8001 offline | 
 | Approvals App | Approvals | feature/approval-app | 2025-10-03T02:30Z | BLOCKED | `/health` 000; SSE fix pending | 
 | Inventory Planner UI | Inventory | feature/route-inventory | 2025-10-03T02:30Z | BLOCKED | `/api/inventory/health` 404 earlier; now dev offline (000) | 
| SEO Insights UI | SEO | feature/route-seo | 2025-10-01 | TODO | Credentials gating; mocks fallback; error surfaces |
| Sales Analytics UI | Sales | feature/route-sales | 2025-10-01 | TODO | CLV + forecast planned; blocked pending connectors |
 | Program Manager – Coordinator | Manager | chore/coordination | 2025-10-03T02:30Z | ✅ Active | Backlog, directions, dashboard updated; next sweep +5m | 

> Update `Last Sweep`, `Status`, and `Notes` whenever you process agent notes or memos.
