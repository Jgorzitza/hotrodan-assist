import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { getMcpTelemetrySnapshot } from "~/lib/mcp/telemetry.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  void request;
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  const snapshot = getMcpTelemetrySnapshot();
  return json({ ok: true, telemetry: snapshot }, { status: 200 });
};