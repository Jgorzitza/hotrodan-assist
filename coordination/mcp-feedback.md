# MCP Integration Agent Feedback Log

Propose changes to `prompts/dashboard/mcp.md` here. Do **not** modify the master prompt without Program Manager sign-off.

## 2025-09-27 Program Manager Directive
- Immediate focus: document secure persistence/credential requirements, keep mocks in place until real MCP creds land, and chase test flakes.
- Include rationale, dependencies, and validation steps with each proposal for review.

## 2025-09-27 Request
- Request: Confirm production secret manager (Shopify Vault vs AWS KMS) and required audit log schema before enabling live MCP fetches.
- Prompt section: prompts/dashboard/mcp.md — Configuration & Security / Immediate focus.
- Dependencies: Need decision from Program Manager to unblock KMS adapter implementation and audit log wiring; impacts settings repository and Vitest coverage plan.
- Validation: Update docs/mcp-secure-persistence.md and settings repository once direction is received; add integration tests covering audit logging + KMS-backed storage.
