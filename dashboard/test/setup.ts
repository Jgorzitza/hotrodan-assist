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
