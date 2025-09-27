import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetInboxStreamListeners,
  subscribeToInboxStream,
} from "../../lib/inbox/events.server";
import type { InboxStreamEnvelope } from "../../lib/inbox/events.server";
import { resetInboxDraftStore } from "../../mocks/inbox-drafts.server";

const authenticateAdminMock = vi.fn();

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
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
});
