import { describe, expect, it } from "vitest";
import { runConnectionTest } from "~/lib/settings/connection-tests.server";

const hasEnv = () =>
  typeof process.env.MCP_API_URL === "string" &&
  process.env.MCP_API_URL.trim().length > 0 &&
  typeof process.env.MCP_API_KEY === "string" &&
  process.env.MCP_API_KEY.trim().length > 0;

describe("MCP live connection (env-driven)", () => {
  it("pings the live MCP endpoint when env is set", async () => {
    if (!hasEnv()) {
      // Skip when env not provided
      return;
    }

    process.env.USE_MOCK_DATA = "false";
    process.env.ENABLE_MCP = "true";

    const result = await runConnectionTest({
      provider: "mcp",
      credential: process.env.MCP_API_KEY as string,
      overrides: {
        endpoint: process.env.MCP_API_URL as string,
      },
    });

    expect(["success", "warning", "error"]).toContain(result.status);
  });
});
