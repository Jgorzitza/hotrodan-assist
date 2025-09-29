import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import {
  recordInboxConnectionTelemetry,
} from "~/lib/inbox/telemetry.server";
import type {
  InboxConnectionStatus,
  InboxConnectionTelemetryEventType,
  InboxConnectionTelemetryPayload,
  MockScenario,
} from "~/types/dashboard";

const CONNECTION_STATUSES: InboxConnectionStatus[] = [
  "connecting",
  "connected",
  "reconnecting",
  "offline",
];

const TELEMETRY_EVENT_TYPES: InboxConnectionTelemetryEventType[] = [
  "connection:attempt",
  "connection:open",
  "connection:handshake",
  "connection:error",
  "connection:retry",
  "connection:offline",
  "connection:manual-retry",
];

const MOCK_SCENARIOS: MockScenario[] = ["base", "empty", "warning", "error"];

const toNumber = (value: unknown, label: string) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
};

const toOptionalNumber = (value: unknown, label: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return toNumber(value, label);
};

const parseBoolean = (value: unknown, label: string) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "false") {
    return value === "true";
  }
  throw new Error(`Invalid ${label}`);
};

const parseTelemetryPayload = (raw: unknown): InboxConnectionTelemetryPayload => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Telemetry payload must be an object");
  }

  const data = raw as Record<string, unknown>;

  const { type, status, attempt, consecutiveFailures, scenario, timestamp, useMockData } = data;

  if (
    typeof type !== "string" ||
    !TELEMETRY_EVENT_TYPES.includes(type as InboxConnectionTelemetryEventType)
  ) {
    throw new Error("Unsupported telemetry event type");
  }

  if (
    typeof status !== "string" ||
    !CONNECTION_STATUSES.includes(status as InboxConnectionStatus)
  ) {
    throw new Error("Unsupported telemetry connection status");
  }

  if (typeof scenario !== "string" || !MOCK_SCENARIOS.includes(scenario as MockScenario)) {
    throw new Error("Unsupported telemetry scenario");
  }

  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    throw new Error("Invalid telemetry timestamp");
  }

  const payload: InboxConnectionTelemetryPayload = {
    type: type as InboxConnectionTelemetryEventType,
    status: status as InboxConnectionStatus,
    attempt: toNumber(attempt, "attempt"),
    consecutiveFailures: toNumber(consecutiveFailures, "consecutiveFailures"),
    scenario: scenario as MockScenario,
    useMockData: parseBoolean(useMockData, "useMockData"),
    timestamp,
  };

  const latencyMs = toOptionalNumber(data.latencyMs, "latencyMs");
  if (latencyMs !== undefined) {
    payload.latencyMs = latencyMs;
  }

  const retryDelayMs = toOptionalNumber(data.retryDelayMs, "retryDelayMs");
  if (retryDelayMs !== undefined) {
    payload.retryDelayMs = retryDelayMs;
  }

  if (data.reason !== undefined) {
    if (typeof data.reason !== "string") {
      throw new Error("Telemetry reason must be a string");
    }
    payload.reason = data.reason;
  }

  return payload;
};

const readBody = async (request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }

  const text = await request.text();
  if (!text) {
    throw new Error("Empty telemetry payload");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error("Invalid telemetry payload");
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  try {
    const body = await readBody(request);
    const payload = parseTelemetryPayload(body);
    recordInboxConnectionTelemetry(payload);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.warn("inbox telemetry: failed to record event", error);
    return json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to record telemetry event",
      },
      { status: 400 },
    );
  }
};
