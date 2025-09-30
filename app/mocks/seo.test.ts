import { describe, expect, it } from "vitest";
import { buildSeoScenario } from "./seo";

describe("buildSeoScenario", () => {
  it("returns base SEO report with keyword insights", () => {
    const result = buildSeoScenario("base");
    if ("error" in result) throw new Error("expected SEO report");
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.lighthouse.performance).toBeGreaterThan(0);
  });

  it("returns error payload for error state", () => {
    const result = buildSeoScenario("error");
    expect("error" in result).toBe(true);
  });
});
