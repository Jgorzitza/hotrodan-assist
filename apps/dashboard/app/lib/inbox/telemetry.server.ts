import { randomUUID } from "node:crypto";

import type {
  InboxConnectionTelemetryEvent,
  InboxConnectionTelemetryPayload,
} from "~/types/dashboard";

const MAX_BUFFER_SIZE = 200;

const events: InboxConnectionTelemetryEvent[] = [];

export const recordInboxConnectionTelemetry = (
  payload: InboxConnectionTelemetryPayload,
): InboxConnectionTelemetryEvent => {
  const entry: InboxConnectionTelemetryEvent = {
    id: randomUUID(),
    ...payload,
  };

  events.push(entry);
  if (events.length > MAX_BUFFER_SIZE) {
    events.shift();
  }

  return entry;
};

export const listInboxConnectionTelemetry = (): InboxConnectionTelemetryEvent[] => [...events];

export const resetInboxConnectionTelemetry = () => {
  events.length = 0;
};
