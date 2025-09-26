import { describe, expect, it } from "vitest";

import {
  buildDashboardMocks,
  getDashboardOverview,
  getInboxScenario,
  getInventoryScenario,
  getOrdersScenario,
  getSalesScenario,
  getSeoScenario,
  resolveScenario,
  scenarioFromSearchParams,
} from "../index";

import { DEFAULT_RANGE_END } from "../factories/dates";

const toComparable = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;

describe("sales mocks", () => {
  it("returns deterministic payloads for the same seed", () => {
    const first = getSalesScenario({ scenario: "base", seed: 1 });
    const second = getSalesScenario({ scenario: "base", seed: 1 });

    expect(toComparable(first)).toEqual(toComparable(second));
  });

  it("produces empty state when requested", () => {
    const empty = getSalesScenario({ scenario: "empty" });

    expect(empty.state).toBe("empty");
    expect(empty.totals.currentTotal.amount).toBe(0);
    expect(empty.trend.length).toBe(0);
  });
});

describe("order mocks", () => {
  it("applies warning modifiers to flagged orders", () => {
    const warning = getOrdersScenario({ scenario: "warning", seed: 2 });
    const flagged = warning.orders.filter(
      (order) => order.status === "processing",
    );

    expect(warning.state).toBe("warning");
    expect(flagged.length).toBeGreaterThan(0);
    expect(
      flagged.some((order) => order.fulfillmentStatus === "unfulfilled"),
    ).toBe(true);
    expect(
      flagged.some((order) => /delayed/i.test(order.timeline.at(-1)?.message ?? "")),
    ).toBe(true);
  });
});

describe("inventory mocks", () => {
  it("flags warning scenarios with alerts", () => {
    const dataset = getInventoryScenario({ scenario: "warning", seed: 3 });

    expect(dataset.state).toBe("warning");
    expect(dataset.alert).toMatch(/low-stock/i);
    expect(dataset.summary.low).toBeGreaterThan(0);
    expect(dataset.items.length).toBeGreaterThan(0);
  });
});

describe("inbox mocks", () => {
  it("populates overdue metrics in warning scenario", () => {
    const dataset = getInboxScenario({ scenario: "warning", seed: 4 });

    expect(dataset.state).toBe("warning");
    expect(dataset.alert).toMatch(/volume/i);
    expect(dataset.tickets.some((ticket) => ticket.slaBreached)).toBe(true);
  });
});

describe("dashboard overview", () => {
  it("maps scenario data into overview metrics", async () => {
    const overview = await getDashboardOverview("28d", "warning");

    expect(overview.metrics).toHaveLength(4);
    expect(overview.orders).toHaveLength(3);
    expect(overview.mcpRecommendation).toMatch(/lagging/i);
  });

  it("produces seeded sparkline data", () => {
    const first = buildDashboardMocks({ scenario: "base", seed: 5 });
    const second = buildDashboardMocks({ scenario: "base", seed: 5 });

    expect(first.sales.trend.map((point) => point.total.amount)).toEqual(
      second.sales.trend.map((point) => point.total.amount),
    );
  });
});

describe("seo mocks", () => {
  it("returns critical insights for warning scenarios", () => {
    const dataset = getSeoScenario({ scenario: "warning", seed: 6 });

    expect(dataset.state).toBe("warning");
    expect(dataset.alert).toMatch(/core web vitals/i);
    expect(dataset.insights.some((insight) => insight.severity === "critical")).toBe(true);
  });
});

describe("helpers", () => {
  it("resolves scenario from search params", () => {
    const params = new URLSearchParams({ mockState: "warning" });
    expect(scenarioFromSearchParams(params)).toBe("warning");
    expect(resolveScenario(null)).toBe("base");
  });

  it("exposes a fixed reference date for deterministic ranges", () => {
    expect(DEFAULT_RANGE_END.toISOString()).toBe("2024-02-15T00:00:00.000Z");
  });
});
