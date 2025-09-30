import { describe, expect, it } from "vitest";
import { buildSalesScenario } from "./sales";

describe("buildSalesScenario", () => {
  it("returns base scenario with positive growth", () => {
    const result = buildSalesScenario("base");
    if ("error" in result) {
      throw new Error("Expected base scenario payload");
    }
    expect(result.revenue.previousPeriodDeltaPct).toBeGreaterThan(0);
    expect(result.assistantPipeline.openOpportunities.length).toBeGreaterThan(0);
  });

  it("exposes warning scenario with critical inventory", () => {
    const result = buildSalesScenario("warning");
    if ("error" in result) {
      throw new Error("Expected warning scenario payload");
    }
    const criticalItems = result.inventoryWatch.filter((item) => item.status === "critical");
    expect(criticalItems.length).toBeGreaterThanOrEqual(1);
    expect(result.revenue.previousPeriodDeltaPct).toBeLessThan(0);
  });

  it("returns error payload when requested", () => {
    const result = buildSalesScenario("error");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.status).toBe(500);
  });
});
