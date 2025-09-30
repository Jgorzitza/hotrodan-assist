import { describe, expect, it } from "vitest";
import { buildInventoryScenario } from "./inventory";

describe("buildInventoryScenario", () => {
  it("returns base inventory with mixed statuses", () => {
    const result = buildInventoryScenario("base");
    if ("error" in result) throw new Error("expected inventory list");
    expect(result.length).toBeGreaterThan(0);
    const statuses = new Set(result.map((item) => item.status));
    expect(statuses.has("warning")).toBe(true);
  });

  it("drops to empty array when mock state empty", () => {
    const result = buildInventoryScenario("empty");
    if ("error" in result) throw new Error("expected empty inventory list");
    expect(result).toHaveLength(0);
  });

  it("surfaces error payload", () => {
    const result = buildInventoryScenario("error");
    expect("error" in result).toBe(true);
  });
});
