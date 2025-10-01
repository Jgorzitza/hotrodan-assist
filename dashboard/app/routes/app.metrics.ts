import type { LoaderFunctionArgs } from "@remix-run/node";
import { exportPrometheus } from "~/lib/metrics/metrics.server";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }
  const body = exportPrometheus();
  return new Response(body, { status: 200, headers: { "Content-Type": "text/plain; version=0.0.4" } });
};