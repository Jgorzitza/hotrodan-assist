# Program Manager Status Dashboard

| Agent | Owner | Focus Branch | Last Sweep | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Tooling – Prod Pipeline | Tooling | chore/prod-pipeline | 2025-10-02T04:42Z | DOING | Monitor instructions switched to python3; shim optional, verifying CI artifact uploads |
| Dashboard (Remix + Polaris) | Dashboard | chore/repo-canonical-layout | 2025-10-02T04:25Z | BLOCKED | `/app/metrics` timed out at 04:25Z; `/api/mcp/health` 404 still pending fix |
| MCP Connectors | MCP | feature/mcp-client | 2025-10-02T04:20Z | DOING | `/api/mcp/health` still 404 in smoke; MCP refining health route + telemetry |
| RAG & Corrections | RAG | feature/rag-refresh | 2025-10-02T04:29Z | ✅ Green | RAG `/health` + `/prometheus` 200 at 04:29Z; continue monitoring for flaps |
| Approvals App | Approvals | feature/approval-app | 2025-10-02T04:37Z | BLOCKED | `/assistants/events` still 404 (verified 04:37Z) despite restart notes |
| Inventory Planner UI | Inventory | feature/route-inventory | 2025-10-02T04:30Z | BLOCKED | `/api/inventory/health` 404 (route missing in build manifest); rename to dot-route |
| SEO Insights UI | SEO | feature/route-seo | 2025-10-01 | TODO | Credentials gating; mocks fallback; error surfaces |
| Sales Analytics UI | Sales | feature/route-sales | 2025-10-01 | TODO | CLV + forecast planned; blocked pending connectors |
| Program Manager – Coordinator | Manager | chore/coordination | 2025-10-01 | ✅ Active | Backlog, directions, dashboard updated; next sweep +5m |

> Update `Last Sweep`, `Status`, and `Notes` whenever you process agent notes or memos.
