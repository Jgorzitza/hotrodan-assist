import { describe, expect, it } from "vitest";
import { buildOrdersScenario } from "./orders";

describe("buildOrdersScenario", () => {
  it("provides base orders with pagination", () => {
    const result = buildOrdersScenario("base");
    if ("error" in result) throw new Error("expected data payload");
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });

  it("returns empty list when requested", () => {
    const result = buildOrdersScenario("empty");
    if ("error" in result) throw new Error("expected empty data payload");
    expect(result.nodes).toHaveLength(0);
  });

  it("yields error payload for error scenario", () => {
    const result = buildOrdersScenario("error");
    expect("error" in result).toBe(true);
  });
});
