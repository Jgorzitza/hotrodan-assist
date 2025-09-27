import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loader as streamLoader } from "../app.inbox.stream";
import {
  publishInboxActionEvent,
  resetInboxStreamListeners,
  type InboxStreamEnvelope,
} from "../../lib/inbox/events.server";
import { getInboxScenario } from "../../mocks";

const decoder = new TextDecoder();

const extractEnvelope = (raw: string): InboxStreamEnvelope | null => {
  if (raw.startsWith("event: ping")) {
    return null;
  }

  const match = raw.match(/data: (.*)\n\n/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]!) as InboxStreamEnvelope;
  } catch (error) {
    console.error("Failed to parse inbox stream payload", error, raw);
    throw error;
  }
};

describe("app.inbox.stream route", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetInboxStreamListeners();
  });

  afterEach(() => {
    resetInboxStreamListeners();
    delete process.env.USE_MOCK_DATA;
  });

  it("sends a handshake on initial connection", async () => {
    const response = await streamLoader({
      request: new Request("http://localhost/app/inbox/stream"),
      params: {},
      context: {} as never,
    });

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) {
      throw new Error("Expected reader");
    }

    const { value, done } = await reader.read();
    expect(done).toBe(false);
    const raw = decoder.decode(value);
    const envelope = extractEnvelope(raw);
    expect(envelope).not.toBeNull();
    expect(envelope?.type).toBe("handshake");

    await reader.cancel();
  });

  it("forwards published inbox action events to the stream", async () => {
    const response = await streamLoader({
      request: new Request("http://localhost/app/inbox/stream"),
      params: {},
      context: {} as never,
    });

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) {
      throw new Error("Expected reader");
    }

    // Consume the handshake message first
    await reader.read();

    const dataset = getInboxScenario({
      scenario: "base",
      filter: "all",
      channelFilter: "all",
      statusFilter: "all",
      assignedFilter: "all",
      pageSize: 8,
    });

    const [ticket] = dataset.tickets;
    expect(ticket).toBeDefined();

    const eventTimestamp = new Date().toISOString();

    publishInboxActionEvent({
      success: true,
      message: "Draft updated via smoke test",
      ticket,
      draft: ticket.aiDraft,
      event: {
        type: "draft:updated",
        timestamp: eventTimestamp,
        payload: {
          ticketId: ticket.id,
          revision: ticket.aiDraft.revision,
        },
      },
    });

    let envelope: InboxStreamEnvelope | null = null;
    let safetyCounter = 0;
    while (!envelope && safetyCounter < 5) {
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      const raw = decoder.decode(value);
      envelope = extractEnvelope(raw);
      safetyCounter += 1;
    }

    expect(envelope).not.toBeNull();
    expect(envelope?.type).toBe("event");
    if (envelope?.type === "event") {
      expect(envelope.event.type).toBe("draft:updated");
      expect(envelope.event.timestamp).toBe(eventTimestamp);
      expect(envelope.ticket?.id).toBe(ticket.id);
      expect(envelope.draft?.ticketId).toBe(ticket.id);
      expect(envelope.message).toContain("Draft updated");
    }

    await reader.cancel();
  });
});
