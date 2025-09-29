import { TextDecoder } from "node:util";

import type { InboxActionResponse, InboxConnectionStatus } from "~/types/dashboard";

import { publishInboxActionEvent } from "./events.server";

const STREAM_PATH = "/assistants/events";
const INITIAL_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

type AssistantsStreamState = {
  baseUrl: string;
  fetchImpl: typeof fetch;
  abortController: AbortController;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  consecutiveFailures: number;
  logger: Pick<typeof console, "warn" | "error">;
  pendingBuffer: string;
  disposed: boolean;
};

let streamState: AssistantsStreamState | null = null;
let bridgeStatus: InboxConnectionStatus = "offline";

type BridgeStatusPayload = {
  attempt?: number;
  consecutiveFailures?: number;
  retryDelayMs?: number;
  reason?: string;
};

const buildBridgeEventPayload = (
  status: InboxConnectionStatus,
  payload?: BridgeStatusPayload,
) => {
  const body: Record<string, unknown> = { status };
  if (payload) {
    const entries = [
      ["attempt", payload.attempt],
      ["consecutiveFailures", payload.consecutiveFailures],
      ["retryDelayMs", payload.retryDelayMs],
      ["reason", payload.reason],
    ] as const;
    for (const [key, value] of entries) {
      if (value !== undefined) {
        body[key] = value;
      }
    }
  }
  return body;
};

const updateBridgeStatus = (
  status: InboxConnectionStatus,
  payload?: BridgeStatusPayload,
  options?: { force?: boolean; emit?: boolean },
) => {
  const shouldEmit = options?.emit ?? true;
  if (!options?.force && bridgeStatus === status) {
    return;
  }
  bridgeStatus = status;
  if (!shouldEmit) {
    return;
  }

  publishInboxActionEvent({
    success: true,
    message: "",
    event: {
      type: "bridge:status",
      timestamp: new Date().toISOString(),
      payload: buildBridgeEventPayload(status, payload),
    },
  });
};

export const getAssistantsBridgeStatus = () => bridgeStatus;

const getLogger = (custom?: Pick<typeof console, "warn" | "error">) =>
  custom ?? console;

const exponentialBackoff = (attempt: number) => {
  const delay = INITIAL_RECONNECT_DELAY_MS * Math.pow(2, Math.max(attempt - 1, 0));
  return Math.min(delay, MAX_RECONNECT_DELAY_MS);
};

const cleanupState = (state: AssistantsStreamState) => {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
  }
  state.abortController.abort();
  state.disposed = true;
};

const parseSseMessage = (payload: string) => {
  const lines = payload
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    eventType,
    data: dataLines.join("\n"),
  } as const;
};

const deliverEvent = (rawData: string, state: AssistantsStreamState) => {
  try {
    const parsed = JSON.parse(rawData) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const envelope = parsed as {
      type?: string;
      message?: string;
      ticket?: InboxActionResponse["ticket"];
      draft?: InboxActionResponse["draft"];
      feedback?: InboxActionResponse["feedback"];
      event?: InboxActionResponse["event"];
    };

    if (envelope.type !== "event" || !envelope.event) {
      return;
    }

    const response: InboxActionResponse = {
      success: true,
      message: envelope.message || "Action completed",
      ticket: envelope.ticket,
      draft: envelope.draft,
      feedback: envelope.feedback,
      event: envelope.event,
    };

    publishInboxActionEvent(response);
  } catch (error) {
    state.logger.warn("assistants stream: failed to parse event", error);
  }
};

const processBuffer = (state: AssistantsStreamState) => {
  let buffer = state.pendingBuffer;
  let separatorIndex = buffer.indexOf("\n\n");

  while (separatorIndex !== -1) {
    const chunk = buffer.slice(0, separatorIndex).trim();
    buffer = buffer.slice(separatorIndex + 2);

    if (chunk) {
      const message = parseSseMessage(chunk);
      if (message) {
        if (message.eventType === "ping") {
          // ignore keepalives
        } else {
          deliverEvent(message.data, state);
        }
      }
    }

    separatorIndex = buffer.indexOf("\n\n");
  }

  state.pendingBuffer = buffer;
};

const startStream = async (state: AssistantsStreamState) => {
  const url = new URL(STREAM_PATH, state.baseUrl).toString();
  const decoder = new TextDecoder();

  const attemptConnection = async () => {
    if (state.disposed) {
      return;
    }

    const attemptNumber = state.consecutiveFailures + 1;

    updateBridgeStatus(
      attemptNumber === 1 ? "connecting" : "reconnecting",
      {
        attempt: attemptNumber,
        consecutiveFailures: state.consecutiveFailures,
      },
      { force: attemptNumber !== 1 },
    );

    try {
      const response = await state.fetchImpl(url, {
        headers: { Accept: "text/event-stream" },
        signal: state.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Assistants events stream failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("Assistants events stream missing body");
      }

      state.consecutiveFailures = 0;
      updateBridgeStatus("connected", { attempt: attemptNumber });
      const reader = response.body.getReader();
      state.pendingBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (value) {
            state.pendingBuffer += decoder.decode(value, { stream: false });
            processBuffer(state);
          }

          if (!state.abortController.signal.aborted) {
            throw new Error("Assistants events stream ended unexpectedly");
          }
          break;
        }

        state.pendingBuffer += decoder.decode(value, { stream: true });
        processBuffer(state);

        if (state.abortController.signal.aborted) {
          break;
        }
      }
    } catch (error) {
      if (state.abortController.signal.aborted || state.disposed) {
        return;
      }

      state.consecutiveFailures = attemptNumber;
      const delay = exponentialBackoff(state.consecutiveFailures);
      const status: InboxConnectionStatus =
        state.consecutiveFailures >= 3 ? "offline" : "reconnecting";

      updateBridgeStatus(
        status,
        {
          attempt: attemptNumber,
          consecutiveFailures: state.consecutiveFailures,
          retryDelayMs: delay,
          reason: error instanceof Error ? error.message : String(error),
        },
        { force: true },
      );

      state.logger.warn(
        `assistants stream: connection error (attempt ${attemptNumber}), retrying in ${delay}ms`,
        error,
      );

      state.reconnectTimer = setTimeout(() => {
        if (!state.disposed) {
          void attemptConnection();
        }
      }, delay);
    }
  };

  await attemptConnection();
};

type EnsureOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  logger?: Pick<typeof console, "warn" | "error">;
};

export const ensureAssistantsEventStream = (options: EnsureOptions) => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    getLogger(options.logger).warn(
      "assistants stream: fetch implementation unavailable; skipping bridge",
    );
    updateBridgeStatus("offline", { reason: "fetch-unavailable" }, { force: true, emit: false });
    return;
  }

  if (streamState && !streamState.disposed) {
    if (streamState.baseUrl === options.baseUrl) {
      return;
    }
    cleanupState(streamState);
    streamState = null;
  }

  updateBridgeStatus("connecting", { attempt: 1 }, { force: true });

  const state: AssistantsStreamState = {
    baseUrl: options.baseUrl,
    fetchImpl,
    abortController: new AbortController(),
    reconnectTimer: null,
    consecutiveFailures: 0,
    logger: getLogger(options.logger),
    pendingBuffer: "",
    disposed: false,
  };

  streamState = state;
  void startStream(state);
};

export const stopAssistantsEventStream = (options: { emit?: boolean; reason?: string } = {}) => {
  if (!streamState) {
    updateBridgeStatus("offline", undefined, { force: true, emit: options.emit ?? false });
    return;
  }
  cleanupState(streamState);
  streamState = null;
  updateBridgeStatus(
    "offline",
    options.reason ? { reason: options.reason } : undefined,
    { force: true, emit: options.emit ?? false },
  );
};

export const resetAssistantsEventStream = () => {
  stopAssistantsEventStream({ emit: false });
};
