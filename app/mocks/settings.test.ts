import { describe, expect, it } from "vitest";
import { buildSettingsScenario } from "./settings";

describe("buildSettingsScenario", () => {
  it("returns base settings with team members", () => {
    const result = buildSettingsScenario("base");
    if ("error" in result) throw new Error("expected settings payload");
    expect(result.team.length).toBeGreaterThan(0);
    expect(Object.keys(result.featureFlags).length).toBeGreaterThan(0);
  });

  it("returns error payload when requested", () => {
    const result = buildSettingsScenario("error");
    expect("error" in result).toBe(true);
  });
});
