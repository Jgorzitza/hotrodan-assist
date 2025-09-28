import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  listInboxConnectionTelemetry,
  resetInboxConnectionTelemetry,
} from "../../lib/inbox/telemetry.server";

const authenticateAdminMock = vi.fn();

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

describe("app.inbox.telemetry route", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetInboxConnectionTelemetry();
    warnSpy.mockClear();
    authenticateAdminMock.mockReset();
    authenticateAdminMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetInboxConnectionTelemetry();
    delete process.env.USE_MOCK_DATA;
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("rejects non-POST requests", async () => {
    const { loader } = await import("../app.inbox.telemetry");

    const response = await loader({
      request: new Request("http://localhost/app/inbox/telemetry"),
      params: {},
      context: {} as never,
    });

    expect(response.status).toBe(405);
  });

  it("records telemetry events from the action", async () => {
    const { action } = await import("../app.inbox.telemetry");

    const body = {
      type: "connection:error",
      status: "reconnecting",
      attempt: 2,
      consecutiveFailures: 1,
      scenario: "base",
      useMockData: true,
      timestamp: new Date().toISOString(),
      retryDelayMs: 2000,
      reason: "network-error",
    };

    const response = await action({
      request: new Request("http://localhost/app/inbox/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      params: {},
      context: {} as never,
    });

    expect(response.status).toBe(204);
    const events = listInboxConnectionTelemetry();
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.type).toBe("connection:error");
    expect(event.status).toBe("reconnecting");
    expect(event.attempt).toBe(2);
    expect(event.retryDelayMs).toBe(2000);
    expect(event.reason).toBe("network-error");
  });

  it("returns a 400 when the payload is invalid", async () => {
    const { action } = await import("../app.inbox.telemetry");

    const response = await action({
      request: new Request("http://localhost/app/inbox/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      params: {},
      context: {} as never,
    });

    expect(response.status).toBe(400);
    expect(listInboxConnectionTelemetry()).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });
});
