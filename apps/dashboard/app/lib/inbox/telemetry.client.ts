import type {
  InboxConnectionStatus,
  InboxConnectionTelemetryEventType,
  InboxConnectionTelemetryPayload,
  MockScenario,
} from "~/types/dashboard";

const TELEMETRY_ENDPOINT = "/app/inbox/telemetry";

const dispatchPayload = (payload: InboxConnectionTelemetryPayload) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
      return;
    }

    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("inbox telemetry: dispatch failed", error);
    }
  }
};

type LogParams = {
  type: InboxConnectionTelemetryEventType;
  status: InboxConnectionStatus;
  attempt: number;
  consecutiveFailures: number;
  scenario: MockScenario;
  useMockData: boolean;
  retryDelayMs?: number;
  latencyMs?: number;
  reason?: string;
};

export const logInboxConnectionTelemetry = (params: LogParams) => {
  const payload: InboxConnectionTelemetryPayload = {
    ...params,
    timestamp: new Date().toISOString(),
  };

  dispatchPayload(payload);
};
