import { describe, expect, it, vi } from "vitest";

import type { InboxStreamEnvelope } from "../../lib/inbox/events.server";
import { getInboxScenario } from "../../mocks";

const authenticateAdminMock = vi.fn();
const getSettingsMock = vi.fn();

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

vi.mock("../../lib/settings/repository.server", () => ({
  __esModule: true,
  storeSettingsRepository: {
    getSettings: getSettingsMock,
  },
}));

const loadStreamModules = async () => {
  const [eventsModule, streamModule, bridgeModule] = await Promise.all([
    import("../../lib/inbox/events.server"),
    import("../app.inbox.stream"),
    import("../../lib/inbox/assistants.stream.server"),
  ]);

  return {
    streamLoader: streamModule.loader,
    publishInboxActionEvent: eventsModule.publishInboxActionEvent,
    resetInboxStreamListeners: eventsModule.resetInboxStreamListeners,
    resetAssistantsStream: bridgeModule.resetAssistantsEventStream,
  };
};

type StreamTestModules = Awaited<ReturnType<typeof loadStreamModules>> & {
  fetchMock?: ReturnType<typeof vi.fn>;
};

const originalFetch = globalThis.fetch;

const setupStreamTest = async (options?: {
  useMockData?: boolean;
  settings?: {
    toggles?: {
      enableAssistantsProvider?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  streamResponseFactory?: () => Response;
  assistantsBaseUrl?: string | null;
}) => {
  const useMockData = options?.useMockData ?? true;
  process.env.USE_MOCK_DATA = useMockData ? "true" : "false";

  authenticateAdminMock.mockReset();
  getSettingsMock.mockReset();

  if (!useMockData) {
    authenticateAdminMock.mockResolvedValue({ session: { shop: "test-shop" } });
    getSettingsMock.mockResolvedValue(
      options?.settings ?? {
        toggles: {
          enableAssistantsProvider: true,
        },
      },
    );
    const baseUrlOption = options?.assistantsBaseUrl;
    if (baseUrlOption === null) {
      delete process.env.ASSISTANTS_SERVICE_URL;
    } else {
      process.env.ASSISTANTS_SERVICE_URL = baseUrlOption ?? "https://assistants.test";
    }
  }

  let fetchMock: ReturnType<typeof vi.fn> | undefined;
  if (!useMockData && options?.assistantsBaseUrl !== null) {
    const responseFactory =
      options?.streamResponseFactory ??
      (() =>
        new Response(
          new ReadableStream({
            start() {
              // Keep the stream open for the duration of the test.
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        ));

    fetchMock = vi.fn(async () => responseFactory());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  }

  vi.resetModules();

  const modules = await loadStreamModules();
  modules.resetInboxStreamListeners();
  if (fetchMock) {
    modules.fetchMock = fetchMock;
  }
  return modules;
};

const teardownStreamTest = (modules: StreamTestModules) => {
  modules.resetInboxStreamListeners();
  modules.resetAssistantsStream();
  delete process.env.USE_MOCK_DATA;
  delete process.env.ASSISTANTS_SERVICE_URL;
  authenticateAdminMock.mockReset();
  getSettingsMock.mockReset();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
};

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
  it("sends a handshake on initial connection", async () => {
    const modules = await setupStreamTest();
    const { streamLoader } = modules;

    try {
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
      const raw = decoder.decode(value ?? new Uint8Array());
      const envelope = extractEnvelope(raw);
      expect(envelope).not.toBeNull();
      expect(envelope?.type).toBe("handshake");
      if (envelope?.type === "handshake") {
        expect(envelope.bridge?.status).toBe("connected");
      }

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("advertises Assistants bridge status in the handshake", async () => {
    const modules = await setupStreamTest({ useMockData: false });
    const { streamLoader } = modules;

    try {
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

      const { value } = await reader.read();
      const raw = decoder.decode(value ?? new Uint8Array());
      const envelope = extractEnvelope(raw);
      expect(envelope?.type).toBe("handshake");
      if (envelope?.type === "handshake") {
        expect(envelope.provider.label).toBe("Assistants Service");
        expect(envelope.bridge?.status).toBe("connecting");
      }

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("reports an offline bridge when the Assistants base URL is missing", async () => {
    const modules = await setupStreamTest({
      useMockData: false,
      assistantsBaseUrl: null,
    });
    const { streamLoader } = modules;

    try {
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

      const { value } = await reader.read();
      const raw = decoder.decode(value ?? new Uint8Array());
      const envelope = extractEnvelope(raw);
      expect(envelope?.type).toBe("handshake");

      if (envelope?.type !== "handshake") {
        throw new Error("Expected handshake payload");
      }

      expect(envelope.bridge?.status).toBe("offline");

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("forwards published inbox action events to the stream", async () => {
    const modules = await setupStreamTest();
    const { streamLoader, publishInboxActionEvent } = modules;

    try {
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
        const raw = decoder.decode(value ?? new Uint8Array());
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
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("emits keepalive pings while the connection remains open", async () => {
    vi.useFakeTimers();
    const modules = await setupStreamTest();
    const { streamLoader } = modules;

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

    try {
      // Consume the handshake
      await reader.read();

      const nextChunk = reader.read();
      vi.advanceTimersByTime(20000);

      const { value, done } = await nextChunk;
      expect(done).toBe(false);
      expect(decoder.decode(value ?? new Uint8Array())).toContain("event: ping");
    } finally {
      await reader.cancel();
      teardownStreamTest(modules);
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  it("advertises the Assistants provider in the handshake when enabled", async () => {
    const modules = await setupStreamTest({ useMockData: false });
    const { streamLoader } = modules;

    try {
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

      const { value } = await reader.read();
      const raw = decoder.decode(value ?? new Uint8Array());
      const envelope = extractEnvelope(raw);
      expect(envelope?.type).toBe("handshake");

      if (envelope?.type !== "handshake") {
        throw new Error("Expected handshake payload");
      }

      expect(envelope.provider.id).toBe("assistants-service");
      expect(envelope.provider.label).toBe("Assistants Service");
      expect(envelope.capabilities).toContain("attachments");
      expect(authenticateAdminMock).toHaveBeenCalled();
      expect(getSettingsMock).toHaveBeenCalled();
      expect(modules.fetchMock).toBeDefined();

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("bridges Assistants stream payloads to connected clients", async () => {
    const encoder = new TextEncoder();
    let pushPayload: ((data: string) => void) | null = null;

    const modules = await setupStreamTest({
      useMockData: false,
      streamResponseFactory: () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              pushPayload = (data: string) => {
                controller.enqueue(encoder.encode(data));
              };
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    });

    const { streamLoader } = modules;

    try {
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

      const timestamp = new Date().toISOString();

      const remoteEvent = {
        type: "event",
        id: "assistants-event-1",
        timestamp,
        message: "Assistants draft updated",
        ticket,
        draft: ticket.aiDraft,
        event: {
          type: "draft:updated" as const,
          timestamp,
          payload: {
            ticketId: ticket.id,
            revision: ticket.aiDraft.revision,
          },
        },
      };

      expect(pushPayload).toBeInstanceOf(Function);
      pushPayload?.(`data: ${JSON.stringify(remoteEvent)}\n\n`);

      let envelope: InboxStreamEnvelope | null = null;
      let safetyCounter = 0;
      while (safetyCounter < 10) {
        const { value, done } = await reader.read();
        expect(done).toBe(false);
        const raw = decoder.decode(value ?? new Uint8Array());
        const candidate = extractEnvelope(raw);
        safetyCounter += 1;

        if (!candidate) {
          continue;
        }

        if (candidate.type === "event" && candidate.event.type === "draft:updated") {
          envelope = candidate;
          break;
        }
      }

      expect(envelope).not.toBeNull();
      if (!envelope || envelope.type !== "event") {
        throw new Error("Expected draft update event from Assistants stream");
      }

      expect(envelope.event.type).toBe("draft:updated");
      expect(envelope.ticket?.id).toBe(ticket.id);
      expect(envelope.message).toContain("Assistants draft updated");

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });

  it("falls back to the mock provider when the Assistants toggle is disabled", async () => {
    const modules = await setupStreamTest({
      useMockData: false,
      settings: {
        toggles: {
          enableAssistantsProvider: false,
        },
      },
    });
    const { streamLoader } = modules;

    try {
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

      const { value } = await reader.read();
      const raw = decoder.decode(value ?? new Uint8Array());
      const envelope = extractEnvelope(raw);
      expect(envelope?.type).toBe("handshake");

      if (envelope?.type !== "handshake") {
        throw new Error("Expected handshake payload");
      }

      expect(envelope.provider.id).toBe("mock-inbox-provider");
      expect(envelope.capabilities).not.toContain("attachments");
      expect(authenticateAdminMock).toHaveBeenCalled();
      expect(getSettingsMock).toHaveBeenCalled();

      await reader.cancel();
    } finally {
      teardownStreamTest(modules);
    }
  });
});
