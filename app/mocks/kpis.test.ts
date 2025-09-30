import { describe, expect, it } from "vitest";
import { buildKpiScenario } from "./kpis";

describe("buildKpiScenario", () => {
  it("returns base cards with trend data", () => {
    const result = buildKpiScenario("base");
    if ("error" in result) throw new Error("expected KPI cards");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].trend.length).toBeGreaterThan(1);
  });

  it("can return an error payload", () => {
    const result = buildKpiScenario("error");
    expect("error" in result).toBe(true);
  });
});
