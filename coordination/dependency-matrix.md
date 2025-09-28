# Cross-Agent Dependency Matrix

> Keep this document updated whenever a contract or interface changes. Every agent launch should reference its row for upstream/downstream requirements.

## Service Contracts
| Surface | Primary Branch | Relies On | Provides To | Notes |
| --- | --- | --- | --- | --- |
| Data & Prisma | feature/prisma-schema | Tooling (Prisma config), Sync (webhook models) | Routes (settings, orders, inventory, SEO) | Owns Prisma schema, migrations, seed harness. |
| Sync & Webhooks | feature/sync-webhooks | Data & Prisma (models), Settings (secrets) | Orders, Inventory, Inbox | Must freeze write API payload schema before Orders resumes live wiring; BullMQ worker remains feature-flagged/off for MVP. |
| Orders Operations | feature/route-orders | Sync (APIs), Inventory (thresholds) | Dashboard overview | Needs shipment/returns APIs + inventory blockers. |
| Inventory Planner | feature/route-inventory | Data layer (analytics feed), MCP (signals) | Orders (inventory blockers), Settings (threshold edits) | PO drafts move to Shopify/background jobs once persistence lands. |
| Settings Admin | feature/route-settings | Data layer (repository, credential bundle), Prisma schema | MCP, SEO, Inventory | Manages thresholds/toggles/secrets; waiting on GA4/GSC/Bing/MCP staging credentials + refreshed Prisma fixtures to exit mock mode. |
| SEO Insights | feature/route-seo | Data layer (SEO adapters), Settings (API keys) | Dashboard/MCP | Requires GA4/GSC/Bing adapters + MCP opportunities. |
| Dashboard Home | feature/route-dashboard | Data layer, MCP, Sync | All route teams | Shared range helper + widget shells. |
| MCP Integration | feature/mcp-client | Settings (toggle/keys) | Dashboard, Inventory, SEO | Provides mock/live client + telemetry hooks. |
| Tooling – Prisma Config | chore/prisma-config-migration | Database agent (schema updates) | Data & Prisma, CI | Ensures CLI + scripts stay aligned. |

## Handshake Checklist
- Update this matrix before requesting a dependency from another team.
- Note contract changes in the relevant prompt and in `coordination/` memos.
- Managers verify entries during daily sweeps; guard prevents accidental removal.
