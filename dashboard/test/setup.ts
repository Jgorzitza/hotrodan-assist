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
if (!('DATABASE_URL' in process.env)) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}
