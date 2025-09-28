import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InboxActionResponse } from "~/types/dashboard";

import {
  resetInboxStreamListeners,
  subscribeToInboxStream,
} from "../../lib/inbox/events.server";
import type { InboxStreamEnvelope } from "../../lib/inbox/events.server";
import { resetInboxDraftStore } from "../../mocks/inbox-drafts.server";

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

vi.mock("~/mocks", async () => {
  const actual = await vi.importActual("../../mocks");
  return {
    ...actual,
    scenarioFromRequest: () => "base",
  };
});

describe("app.inbox route", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetInboxDraftStore();
    resetInboxStreamListeners();
    authenticateAdminMock.mockReset();
    authenticateAdminMock.mockResolvedValue(undefined);
    getSettingsMock.mockReset();
    getSettingsMock.mockResolvedValue({
      toggles: {
        enableMcpIntegration: true,
        enableExperimentalWidgets: false,
        enableBetaWorkflows: false,
        enableAssistantsProvider: true,
      },
    });
  });

  afterEach(() => {
    resetInboxDraftStore();
    resetInboxStreamListeners();
    delete process.env.USE_MOCK_DATA;
  });

  it("returns filtered dataset from the loader", async () => {
    const module = await import("../app.inbox");
    const request = new Request(
      "http://localhost/app/inbox?filter=priority&channel=email&status=open&assigned=unassigned&pageSize=8",
    );

    const response = await module.loader({
      request,
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.dataset.filter).toBe("priority");
    expect(payload.dataset.channelFilter).toBe("email");
    expect(payload.dataset.statusFilter).toBe("open");
    expect(payload.dataset.assignedFilter).toBe("unassigned");
    expect(payload.dataset.tickets.every((ticket: { channel: string }) => ticket.channel === "email")).toBe(true);
    expect(payload.refreshAfterSeconds).toBeNull();
  });

  it("updates drafts through the action", async () => {
    const module = await import("../app.inbox");
    const form = new URLSearchParams();
    form.set("intent", "edit");
    form.set("ticketId", "ticket-0");
    form.set("content", "Updated response from test");

    const response = await module.action({
      request: new Request("http://localhost/app/inbox", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
      params: {},
      context: {} as never,
    });

    const payload = (await response.json()) as { success: boolean; ticket?: { aiDraft: { content: string; approved: boolean } } };

    expect(payload.success).toBe(true);
    expect(payload.ticket?.aiDraft.content).toBe("Updated response from test");
    expect(payload.ticket?.aiDraft.approved).toBe(false);
  });

  it("approves drafts when intent is approve", async () => {
    const module = await import("../app.inbox");
    const form = new URLSearchParams();
    form.set("intent", "approve");
    form.set("ticketId", "ticket-0");
    form.set("content", "Ready to send");

    const response = await module.action({
      request: new Request("http://localhost/app/inbox", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
      params: {},
      context: {} as never,
    });

    const payload = (await response.json()) as { success: boolean; ticket?: { aiDraft: { content: string; approved: boolean } } };

    expect(payload.success).toBe(true);
    expect(payload.ticket?.aiDraft.approved).toBe(true);
    expect(payload.ticket?.aiDraft.content).toBe("Ready to send");
  });

  it("records feedback and publishes stream events", async () => {
    const module = await import("../app.inbox");

    const loaderResponse = await module.loader({
      request: new Request("http://localhost/app/inbox"),
      params: {},
      context: {} as never,
    });

    const loaderPayload = (await loaderResponse.json()) as {
      dataset: { tickets: Array<{ id: string; aiDraft: { id: string } }> };
    };

    const [firstTicket] = loaderPayload.dataset.tickets;
    expect(firstTicket).toBeDefined();

    const events: InboxStreamEnvelope[] = [];
    const unsubscribe = subscribeToInboxStream((payload) => {
      events.push(payload);
    });

    const form = new URLSearchParams();
    form.set("intent", "feedback");
    form.set("ticketId", firstTicket.id);
    form.set("draftId", firstTicket.aiDraft.id);
    form.set("vote", "up");
    form.set("comment", "Great draft");

    const response = await module.action({
      request: new Request("http://localhost/app/inbox", {
        method: "POST",
        body: form,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
      params: {},
      context: {} as never,
    });

    unsubscribe();

    const payload = (await response.json()) as {
      success: boolean;
      message: string;
      feedback?: { vote: string; comment?: string };
    };

    expect(payload.success).toBe(true);
    expect(payload.message).toContain("feedback");
    expect(payload.feedback?.vote).toBe("up");

    expect(events.length).toBeGreaterThanOrEqual(1);
    const [event] = events;
    expect(event.type).toBe("event");
    expect(event.event.type).toBe("draft:feedback");
    expect(event.feedback?.vote).toBe("up");
  });

  describe("assistants integration", () => {
    const buildListPayload = () => ({
      drafts: [
        {
          id: "draft-1",
          draft_id: "draft-1",
          channel: "email",
          conversation_id: "conv-1",
          customer_display: "Casey Customer <casey@example.com>",
          subject: "Order status",
          incoming_excerpt: "Where is my order?",
          draft_excerpt: "Thanks for reaching out.",
          created_at: "2024-01-01T00:00:00Z",
          status: "pending",
          tags: ["vip"],
          auto_escalated: false,
          assigned_to: null,
          overdue: false,
        },
      ],
      total: 1,
      next_cursor: null,
      refresh_after_seconds: 30,
    });

    const buildDetailPayload = () => ({
      id: "draft-1",
      draft_id: "draft-1",
      channel: "email",
      conversation_id: "conv-1",
      customer_display: "Casey Customer <casey@example.com>",
      subject: "Order status",
      incoming_excerpt: "Where is my order?",
      incoming_text: "Where is my order?",
      draft_excerpt: "Thanks for reaching out.",
      draft_text: "Thanks for reaching out! Your order ships tomorrow.",
      created_at: "2024-01-01T00:00:00Z",
      status: "pending",
      tags: ["vip"],
      auto_escalated: false,
      assigned_to: null,
      overdue: false,
      audit_log: [
        {
          timestamp: "2024-01-01T00:01:00Z",
          actor: "assistant-service",
          action: "draft.created",
        },
      ],
      notes: [],
      learning_notes: [],
      source_snippets: [
        {
          title: "Shipping FAQ",
          url: "https://example.com/faq",
        },
      ],
    });

    beforeEach(() => {
      process.env.USE_MOCK_DATA = "false";
      process.env.ASSISTANTS_SERVICE_URL = "https://assistants.test";
      if (typeof vi.unstubAllGlobals === "function") {
        vi.unstubAllGlobals();
      }
      vi.resetModules();
      authenticateAdminMock.mockResolvedValue({ session: { shop: "test-shop" } });
      getSettingsMock.mockResolvedValue({
        toggles: {
          enableMcpIntegration: true,
          enableExperimentalWidgets: false,
          enableBetaWorkflows: false,
          enableAssistantsProvider: true,
        },
      });
    });

    afterEach(() => {
      if (typeof vi.unstubAllGlobals === "function") {
        vi.unstubAllGlobals();
      }
      delete process.env.USE_MOCK_DATA;
      delete process.env.ASSISTANTS_SERVICE_URL;
    });

    it("loads dataset from the Assistants service", async () => {
      const listPayload = buildListPayload();
      const detailPayload = buildDetailPayload();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => listPayload,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => detailPayload,
        });

      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const response = await module.loader({
        request: new Request("http://localhost/app/inbox"),
        params: {},
        context: {} as never,
      });

      expect(getSettingsMock).toHaveBeenCalledWith("test-shop");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://assistants.test/assistants/drafts?limit=12&status=all",
      );

      const payload = await response.json();
      expect(payload.useMockData).toBe(false);
      expect(payload.refreshAfterSeconds).toBe(30);
      expect(payload.dataset.tickets).toHaveLength(1);
      const [ticket] = payload.dataset.tickets;
      expect(ticket.id).toBe("draft-1");
      expect(ticket.aiDraft.content).toContain("ships tomorrow");
      expect(ticket.channel).toBe("email");
      expect(ticket.priority).toBe("high");
      expect(ticket.customer.email).toBe("casey@example.com");
    });

    it("forwards assigned filter to Assistants list request", async () => {
      const listPayload = buildListPayload();
      if (listPayload.drafts[0]) {
        listPayload.drafts[0].assigned_to = "Operator A";
      }
      const detailPayload = buildDetailPayload();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => listPayload,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => detailPayload,
        });

      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const response = await module.loader({
        request: new Request("http://localhost/app/inbox?assigned=Operator%20A"),
        params: {},
        context: {} as never,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstCall = fetchMock.mock.calls[0]?.[0];
      expect(firstCall).toBeDefined();
      const listUrl = new URL((firstCall ?? "") as string);
      expect(listUrl.searchParams.get("assigned")).toBe("Operator A");

      const payload = await response.json();
      expect(payload.dataset.tickets).toHaveLength(1);
    });

    it("uses mock dataset when the Assistants feature toggle is disabled", async () => {
      getSettingsMock.mockResolvedValueOnce({
        toggles: {
          enableMcpIntegration: true,
          enableExperimentalWidgets: false,
          enableBetaWorkflows: false,
          enableAssistantsProvider: false,
        },
      });

      const fetchMock = vi.fn(() => {
        throw new Error("fetch should not be invoked when Assistants disabled");
      });
      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const response = await module.loader({
        request: new Request("http://localhost/app/inbox"),
        params: {},
        context: {} as never,
      });

      expect(getSettingsMock).toHaveBeenCalledWith("test-shop");
      expect(fetchMock).not.toHaveBeenCalled();

      const payload = await response.json();
      expect(payload.useMockData).toBe(true);
      expect(payload.refreshAfterSeconds).toBeNull();
      expect(payload.dataset.alert).toContain("Assistants provider disabled");
      expect(payload.dataset.state).toBe("warning");
    });

    it("routes inbox actions to mocks when the Assistants toggle is disabled", async () => {
      getSettingsMock.mockResolvedValueOnce({
        toggles: {
          enableMcpIntegration: true,
          enableExperimentalWidgets: false,
          enableBetaWorkflows: false,
          enableAssistantsProvider: false,
        },
      });

      const fetchMock = vi.fn(() => {
        throw new Error("fetch should not be invoked when Assistants disabled");
      });
      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const form = new URLSearchParams();
      form.set("intent", "approve");
      form.set("ticketId", "ticket-0");
      form.set("content", "Ready to send");

      const response = await module.action({
        request: new Request("http://localhost/app/inbox", {
          method: "POST",
          body: form,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
        params: {},
        context: {} as never,
      });

      expect(fetchMock).not.toHaveBeenCalled();

      const payload = (await response.json()) as InboxActionResponse;
      expect(payload.success).toBe(true);
      expect(payload.ticket?.aiDraft.approved).toBe(true);
    });

    it("approves drafts via the Assistants service", async () => {
      const approvedDetail = {
        ...buildDetailPayload(),
        status: "sent",
        sent_at: "2024-01-01T00:02:00Z",
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "sent" }) })
        .mockResolvedValueOnce({ ok: true, json: async () => approvedDetail });

      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const form = new URLSearchParams();
      form.set("intent", "approve");
      form.set("ticketId", "draft-1");
      form.set("content", "Final approval text");

      const response = await module.action({
        request: new Request("http://localhost/app/inbox", {
          method: "POST",
          body: form,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
        params: {},
        context: {} as never,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const approveCall = fetchMock.mock.calls[0];
      expect(approveCall?.[0]).toBe("https://assistants.test/assistants/approve");
      expect((approveCall?.[1] as RequestInit)?.method).toBe("POST");

      const payload = (await response.json()) as InboxActionResponse;
      expect(payload.success).toBe(true);
      expect(payload.ticket?.aiDraft.approved).toBe(true);
      expect(payload.ticket?.status).toBe("resolved");
    });

    it("records feedback via the Assistants service", async () => {
      const feedbackDetail = {
        ...buildDetailPayload(),
        notes: [
          {
            note_id: "note-1",
            author_user_id: "Operator",
            text: JSON.stringify({ type: "feedback", vote: "up", comment: "Helpful" }),
            created_at: "2024-01-01T00:03:00Z",
          },
        ],
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ note: { note_id: "note-1" } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => feedbackDetail });

      vi.stubGlobal("fetch", fetchMock);

      const module = await import("../app.inbox");

      const form = new URLSearchParams();
      form.set("intent", "feedback");
      form.set("ticketId", "draft-1");
      form.set("draftId", "draft-1");
      form.set("vote", "up");
      form.set("comment", "Helpful");

      const response = await module.action({
        request: new Request("http://localhost/app/inbox", {
          method: "POST",
          body: form,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
        params: {},
        context: {} as never,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstCall = fetchMock.mock.calls[0];
      expect(firstCall?.[0]).toBe("https://assistants.test/assistants/notes");

      const payload = (await response.json()) as InboxActionResponse;
      expect(payload.success).toBe(true);
      expect(payload.feedback?.vote).toBe("up");
      expect(payload.ticket?.aiDraft.feedback?.length).toBeGreaterThan(0);
    });
  });
});
