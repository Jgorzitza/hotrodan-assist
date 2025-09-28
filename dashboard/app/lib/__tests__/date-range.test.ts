import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DASHBOARD_RANGE,
  buildDashboardRangeSelection,
  findDashboardRangeKeyByDays,
  resolveDashboardRange,
  resolveDashboardRangeKey,
  withDashboardRangeParam,
} from "../date-range";

describe("withDashboardRangeParam", () => {
  it("appends the range query to paths without params", () => {
    const href = withDashboardRangeParam("/app/orders", "28d");
    expect(href).toBe("/app/orders?range=28d");
  });

  it("preserves shared mockState query params when present", () => {
    const searchParams = new URLSearchParams({ mockState: "warning" });
    const href = withDashboardRangeParam("/app/orders?tab=tracking", "7d", { searchParams });

    expect(href).toBe("/app/orders?tab=tracking&mockState=warning&range=7d");
  });

  it("ignores unrelated search params by default", () => {
    const searchParams = new URLSearchParams({ foo: "bar", mockState: "error" });
    const href = withDashboardRangeParam("/app/seo", "90d", { searchParams });

    expect(href).toBe("/app/seo?mockState=error&range=90d");
  });

  it("allows opting into additional shared query params", () => {
    const searchParams = new URLSearchParams({ scenario: "empty" });
    const href = withDashboardRangeParam("/app/seo", "14d", {
      searchParams,
      includeKeys: ["scenario", "mockState"],
    });

    expect(href).toBe("/app/seo?scenario=empty&range=14d");
  });
});

describe("resolveDashboardRangeKey", () => {
  it("returns the fallback when the candidate is empty", () => {
    expect(resolveDashboardRangeKey(null, "today")).toBe("today");
  });

  it("normalizes invalid values to the default", () => {
    expect(resolveDashboardRangeKey("invalid" as string, DEFAULT_DASHBOARD_RANGE)).toBe(
      DEFAULT_DASHBOARD_RANGE,
    );
  });

  it("accepts valid range keys", () => {
    expect(resolveDashboardRangeKey("7d", DEFAULT_DASHBOARD_RANGE)).toBe("7d");
  });

  it("returns the default fallback when none is provided", () => {
    expect(resolveDashboardRangeKey("not-real" as string)).toBe(DEFAULT_DASHBOARD_RANGE);
  });
});

describe("resolveDashboardRange", () => {
  it("derives a selection from search params and clamps to UTC days", () => {
    const referenceDate = new Date("2024-02-29T12:00:00.000Z");
    const selection = resolveDashboardRange(new URLSearchParams({ range: "7d" }), "today", referenceDate);

    expect(selection).toMatchObject({
      key: "7d",
      label: "Last 7 days",
      days: 7,
    });
    expect(selection.end).toBe("2024-02-29T00:00:00.000Z");
    expect(selection.start).toBe("2024-02-23T00:00:00.000Z");
  });

  it("falls back to the provided range when params are missing", () => {
    const referenceDate = new Date("2024-03-01T08:00:00.000Z");
    const selection = resolveDashboardRange(new URLSearchParams(), "today", referenceDate);

    expect(selection.key).toBe("today");
    expect(selection.start).toBe("2024-03-01T00:00:00.000Z");
    expect(selection.end).toBe("2024-03-01T00:00:00.000Z");
  });

  it("normalizes invalid keys back to the fallback", () => {
    const referenceDate = new Date("2024-04-10T09:30:00.000Z");
    const selection = resolveDashboardRange(
      new URLSearchParams({ range: "not-a-key" }),
      "7d",
      referenceDate,
    );

    expect(selection.key).toBe("7d");
    expect(selection.start).toBe("2024-04-04T00:00:00.000Z");
    expect(selection.end).toBe("2024-04-10T00:00:00.000Z");
  });

  it("uses the current date when no reference is provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-10T12:00:00.000Z"));

    const selection = resolveDashboardRange(new URLSearchParams({ range: "28d" }));

    expect(selection).toMatchObject({ key: "28d", days: 28 });
    expect(selection.end).toBe("2024-07-10T00:00:00.000Z");
    expect(selection.start).toBe("2024-06-13T00:00:00.000Z");

    vi.useRealTimers();
  });
});

describe("buildDashboardRangeSelection", () => {
  it("creates a selection anchored to the reference date", () => {
    const referenceDate = new Date("2024-06-15T18:00:00.000Z");
    const selection = buildDashboardRangeSelection("28d", referenceDate);

    expect(selection).toMatchObject({
      key: "28d",
      label: "Last 28 days",
      days: 28,
    });
    expect(selection.end).toBe("2024-06-15T00:00:00.000Z");
    expect(selection.start).toBe("2024-05-19T00:00:00.000Z");
  });
});

describe("findDashboardRangeKeyByDays", () => {
  it("resolves exact matches", () => {
    expect(findDashboardRangeKeyByDays(7)).toBe("7d");
    expect(findDashboardRangeKeyByDays(90)).toBe("90d");
  });

  it("rounds and clamps to the nearest preset", () => {
    expect(findDashboardRangeKeyByDays(27.6)).toBe("28d");
    expect(findDashboardRangeKeyByDays(0)).toBe("today");
  });
});
