import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type {
  InboxActionResponse,
  InboxConnectionStatus,
  InboxDraft,
  InboxDraftFeedback,
  InboxTicket,
} from "~/types/dashboard";

type InboxEventListener = (payload: InboxStreamEnvelope) => void;

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type InboxStreamHandshake = {
  id: string;
  type: "handshake";
  timestamp: string;
  provider: {
    id: string;
    label: string;
    transport: "sse";
    version: string;
  };
  capabilities: Array<"drafts" | "feedback" | "attachments">;
  bridge?: {
    status: InboxConnectionStatus;
  };
};

type BuildHandshakeOptions = {
  provider?: Partial<InboxStreamHandshake["provider"]>;
  capabilities?: InboxStreamHandshake["capabilities"];
  bridgeStatus?: InboxConnectionStatus;
};

export type InboxStreamActionEvent = {
  id: string;
  type: "event";
  timestamp: string;
  event: NonNullable<InboxActionResponse["event"]>;
  message?: InboxActionResponse["message"];
  ticket?: InboxTicket;
  draft?: InboxDraft;
  feedback?: InboxDraftFeedback;
};

export type InboxStreamEnvelope = InboxStreamHandshake | InboxStreamActionEvent;

export const subscribeToInboxStream = (listener: InboxEventListener) => {
  emitter.addListener("message", listener);
  return () => {
    emitter.removeListener("message", listener);
  };
};

export const publishInboxActionEvent = (response: InboxActionResponse) => {
  if (!response.success || !response.event) {
    return;
  }

  const payload: InboxStreamActionEvent = {
    id: randomUUID(),
    type: "event",
    timestamp: response.event.timestamp,
    event: response.event,
    message: response.message,
    ticket: response.ticket,
    draft: response.draft,
    feedback: response.feedback,
  };

  emitter.emit("message", payload);
};

export const buildInboxHandshake = (options: BuildHandshakeOptions = {}): InboxStreamHandshake => {
  const providerDefaults: InboxStreamHandshake["provider"] = {
    id: "mock-inbox-provider",
    label: "Mock Inbox Provider",
    transport: "sse",
    version: "0.1.0",
  };

  const provider = {
    ...providerDefaults,
    ...(options.provider ?? {}),
  } satisfies InboxStreamHandshake["provider"];

  const capabilities = options.capabilities ?? (["drafts", "feedback"] as const);

  return {
    id: randomUUID(),
    type: "handshake",
    timestamp: new Date().toISOString(),
    provider,
    capabilities: [...capabilities],
    bridge: options.bridgeStatus
      ? {
          status: options.bridgeStatus,
        }
      : undefined,
  };
};

export const resetInboxStreamListeners = () => {
  emitter.removeAllListeners("message");
};
