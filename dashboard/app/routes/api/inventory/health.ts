import type { LoaderFunctionArgs } from "@remix-run/node";

// Minimal inventory health endpoint
// - Supports mock-friendly query (?shop=hotrodan.com) to avoid requiring auth in tests
// - Returns a simple structured payload
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  const useMock = String(process.env.USE_MOCK_DATA || "true").toLowerCase() !== "false";

  const payload = {
    ok: true,
    shop: shopParam ?? "unknown",
    timestamp: new Date().toISOString(),
    useMockData: useMock,
    components: {
      routes: "healthy",
      csvExport: "available",
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};