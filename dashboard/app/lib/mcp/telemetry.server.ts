import { inc } from "~/lib/metrics/metrics.server";
import { publishInboxActionEvent } from "~/lib/inbox/events.server";
import { publishInboxActionEvent } from "~/lib/inbox/events.server";
import type { TelemetryHooks } from "./client.server";
import type { McpTelemetryEvent } from "./types";
const key = (name: string, tags: Record<string, string | number | undefined>) => {
  const parts = Object.entries(tags)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",");
  return parts ? `${name}{${parts}}` : name;
};

export const buildMcpMetricsTelemetry = (): TelemetryHooks => ({
  onRequest: ({ resource }) => {
    inc(key("mcp_requests_total", { resource, phase: "request" }));
  },
  onResponse: ({ resource, status }) => {
    const outcome = status && status >= 200 && status < 400 ? "success" : "error";
    inc(key("mcp_requests_total", { resource, phase: "response", outcome }));
  },
  onRetry: ({ resource, attempt }) => {
    inc(key("mcp_retries_total", { resource }));
    inc(key("mcp_retries_attempt_total", { resource, attempt }));
  },
  onError: ({ resource }) => {
    inc(key("mcp_errors_total", { resource }));
  },
  onRateLimitDelay: ({ context }) => {
    inc(key("mcp_rate_limit_delays_total", { shop: context.shopDomain }));
  },
  onBreakerOpen: ({ context, resource }) => {
    inc(key("mcp_breaker_open_total", { shop: context.shopDomain, resource }));
  },
  onBreakerHalfOpen: ({ context, resource }) => {
    inc(key("mcp_breaker_half_open_total", { shop: context.shopDomain, resource }));
  },
  onBreakerClose: ({ context, resource }) => {
    inc(key("mcp_breaker_close_total", { shop: context.shopDomain, resource }));
  },
});

const mask = (value: string | undefined) => (value ? value.replace(/https?:\/\//, "") : undefined);

type Common = {
  endpoint?: string;
};

type Counters = {
  requests: number;
  successes: number;
  failures: number;
  retries: number;
  openCircuits: number;
};

const counters: Record<string, Counters> = {};

const keyFor = (shop?: string, endpoint?: string) => `${shop ?? "unknown"}::${endpoint ?? ""}`;

const ensure = (key: string) => {
  if (!counters[key]) {
    counters[key] = { requests: 0, successes: 0, failures: 0, retries: 0, openCircuits: 0 };
  }
  return counters[key]!;
};

const publish = (
  type:
    | "mcp:request:start"
    | "mcp:request:success"
    | "mcp:request:retry"
    | "mcp:request:error"
    | "mcp:circuit:open"
    | "mcp:circuit:half_open"
    | "mcp:circuit:closed",
  event: McpTelemetryEvent & {
    context: { shopDomain?: string; requestId?: string };
    requestId?: string;
    durationMs?: number;
  },
  endpoint?: string,
) => {
  publishInboxActionEvent({
    success: true,
    message: "",
    event: {
      type,
      timestamp: new Date().toISOString(),
      payload: {
        resource: event.resource,
        attempt: event.attempt,
        status: event.status,
        error: event.error ? String((event.error as Error).message ?? event.error) : undefined,
        requestId: event.requestId,
        shop: event.context?.shopDomain,
        endpoint: mask(endpoint),
        durationMs: (event as any).durationMs,
      },
    },
  });
};

export const createMcpTelemetryHooks = (base?: Common): TelemetryHooks => ({
  onRequest(e) {
    const k = keyFor(e.context?.shopDomain, base?.endpoint);
    ensure(k).requests += 1;
    publish("mcp:request:start", e, base?.endpoint);
  },
  onResponse(e) {
    const k = keyFor(e.context?.shopDomain, base?.endpoint);
    ensure(k).successes += 1;
    publish("mcp:request:success", e, base?.endpoint);
  },
  onRetry(e) {
    const k = keyFor(e.context?.shopDomain, base?.endpoint);
    ensure(k).retries += 1;
    publish("mcp:request:retry", e, base?.endpoint);
  },
  onError(e) {
    const k = keyFor(e.context?.shopDomain, base?.endpoint);
    ensure(k).failures += 1;
    publish("mcp:request:error", e, base?.endpoint);
  },
});

export const getMcpTelemetrySnapshot = () => JSON.parse(JSON.stringify(counters)) as Record<string, Counters>;
