# MCP Credential Persistence (Pre-MVP)

## Current Mock State
- `resolveMcpConfigFromEnv` prefers per-shop overrides from `StoreSettings.connectionMetadata` and falls back to env vars (`MCP_API_URL`, `MCP_API_KEY`, `MCP_TIMEOUT_MS`, `MCP_MAX_RETRIES`).
- The settings UI (`app.routes/app.settings.tsx`) lets merchants paste an MCP API key and override transport settings; submissions are routed through `SettingsRepository`.
- Under mock mode (`USE_MOCK_DATA=true`) secrets are stored in-memory via `MockStoreSettingsRepository`; encryption helpers in `lib/security/secrets.server.ts` prepend `mock::` and base64 encode the payload for tests only.
- The Prisma-backed repository persists credentials in the `StoreSecret` table (`provider = mcp`) and MCP overrides inside `StoreSettings.connectionMetadata.mcpOverrides`.
- Feature access requires both the global env toggle (`ENABLE_MCP`) and the per-shop toggle in `FeatureToggles.enableMcpIntegration`; if mocks remain enabled the client short-circuits to `createMockMcpClient`.

## Production Secure Storage Requirements
- Replace the mock `encryptSecret`/`decryptSecret` helpers with a real KMS-backed service (Shopify secrets or AWS KMS) so the `StoreSecret.ciphertext` column contains opaque ciphertext. Capture the encryption version alongside the payload for future rotations.
- All writes to MCP secrets and overrides must record an audit entry (see `prompts/dashboard/route-settings.md:26`); extend the repository to emit audit logs that include actor, before/after values (masked), and request source.
- Store the MCP API key per shop only; runtime access should always fetch through the repository instead of reading raw env vars once live credentials land.
- Enforce server-side validation before saving: reject keys that are shorter than a minimum length, contain whitespace, or match known mock prefixes. Surface actionable errors in the settings form.
- When mocks are disabled, loaders that call `getMcpClient` must ensure `ENABLE_MCP=true`, a stored API key exists, and the override endpoint (or env fallback) is HTTPS.

## Migration Plan Once Real Creds Arrive
1. Introduce a `SecretsAdapter` abstraction that wraps the chosen KMS/client; thread it through `SettingsRepository` so both mock and Prisma paths share the same interface.
2. Backfill existing development stores: migrate any API keys currently in env files into `StoreSecret` via a one-off script (use `resolveMcpConfigFromEnv` to locate seeds, then persist through the repository to trigger masking and audit hooks).
3. Harden the settings action: after saving an MCP secret or overrides, enqueue a background `test-connection` job that uses `McpClient.ping()` with the new config and records the result through `recordConnectionTest`.
4. Update Vitest suites to run with `USE_MOCK_DATA=false` for at least one scenario so Prisma-backed persistence is exercised. Add regression tests for key rotation (old key archived, new key masked) and override precedence (stored values beating env).
5. Document the operational playbook: how to rotate keys, how to invalidate a compromised key, and how to recover if the secret store is unreachable (fallback to mocks, display banner, etc.).

## Outstanding Questions / Dependencies
- Confirm which secret manager (Shopify Vault vs AWS KMS) we target and whether we receive per-shop or per-app credentials.
- Determine who owns issuing production MCP API keys and how rotation reminders should be scheduled (`rotationReminderAt` currently optional).
- Align with the Program Manager on audit log schema so MCP override changes feed downstream telemetry before turning on live fetches.
