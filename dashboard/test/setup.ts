// Normalize critical web platform globals across Node (undici) and jsdom realms
// to avoid instanceof mismatches and missing constructors during tests.
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'node:util';
import { URL as NodeURL, URLSearchParams as NodeURLSearchParams } from 'node:url';

// Ensure TextEncoder/TextDecoder are proper constructors for libraries like `jose` and `msw`.
(Object.assign as any)(globalThis, {
  TextEncoder: NodeTextEncoder,
  TextDecoder: NodeTextDecoder,
});

// Ensure URL and URLSearchParams come from the Node realm so undici's Request
// accepts URLSearchParams instances created in tests (avoids cross-realm instanceof issues).
(Object.assign as any)(globalThis, {
  URL: NodeURL,
  URLSearchParams: NodeURLSearchParams,
});

// Normalize test environment defaults for Path B harness
process.env.VITEST = 'true';
if (!('USE_MOCK_DATA' in process.env)) {
  process.env.USE_MOCK_DATA = 'true';
}
if (!('MCP_FORCE_MOCKS' in process.env)) {
  process.env.MCP_FORCE_MOCKS = 'true';
}

// For vitest runs, use the local SQLite dev DB to keep tests hermetic and
// independent from any root-level DATABASE_URL. prisma.config.ts will pick
// the SQLite schema when DATABASE_URL starts with "file:" and the generated
// client will match.
process.env.DATABASE_URL = 'file:./prisma/dev.db';
// DIRECT_URL/SHADOW_DATABASE_URL are not used for SQLite; unset to avoid noise
delete process.env.DIRECT_URL;
delete process.env.SHADOW_DATABASE_URL;
