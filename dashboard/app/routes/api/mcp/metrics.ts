import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getMcpTelemetrySnapshot } from "~/lib/mcp/telemetry.server";

export async function loader(_args: LoaderFunctionArgs) {
  const snapshot = getMcpTelemetrySnapshot();
  return json({ ok: true, telemetry: snapshot, generatedAt: new Date().toISOString() });
}