import { describe, expect, it } from "vitest";
import { buildDashboardHomeScenario } from "./dashboardHome";

describe("buildDashboardHomeScenario", () => {
  it("returns base scenario with single SLA breach", () => {
    const result = buildDashboardHomeScenario("base");
    if ("error" in result) {
      throw new Error("Expected base scenario to return data payload");
    }
    expect(result.inbox.awaitingReview).toBe(3);
    const breachCount = result.inbox.threads.filter((thread) => thread.slaBreach).length;
    expect(breachCount).toBe(1);
    expect(result.systemHealth.errorRatePct).toBeLessThan(5);
  });

  it("returns error payload when requested", () => {
    const result = buildDashboardHomeScenario("error");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error.status).toBe(503);
  });
});
