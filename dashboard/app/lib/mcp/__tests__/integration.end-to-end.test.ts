import { describe, expect, it, vi } from "vitest";

import { createMcpClient } from "../client.server";
import { McpResourceType } from "../types";
import * as events from "../../inbox/events.server";
import { createMcpTelemetryHooks } from "../telemetry.server";

describe("MCP end-to-end (client + telemetry)", () => {
  it("publishes SSE telemetry on request success", async () => {
    const spy = vi.spyOn(events, "publishInboxActionEvent").mockImplementation(() => void 0);

    const payload = { data: [], generatedAt: "2025-01-01T00:00:00.000Z", source: "test-double", confidence: 0.9 };
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const client = createMcpClient({
      useMocks: false,
      endpoint: "https://mcp.example",
      fetchFn,
      telemetry: createMcpTelemetryHooks({ endpoint: "https://mcp.example" }),
    });

    const result = await client.getInventorySignals({ shopDomain: "demo-shop.myshopify.com", params: {}, resource: McpResourceType.InventorySignal });

    expect(result.confidence).toBe(0.9);
    expect(spy).toHaveBeenCalled();
    const calls = spy.mock.calls.map((c) => c[0]?.event?.type).filter(Boolean);
    expect(calls).toContain("mcp:request:start");
    expect(calls).toContain("mcp:request:success");

    spy.mockRestore();
  });
});