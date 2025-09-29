import { describe, expect, it } from "vitest";

import { getDashboardOverview } from "../dashboard";
import { buildDashboardMocks } from "../builder";
import { DEFAULT_DASHBOARD_RANGE } from "~/lib/date-range";

describe("dashboard overview mocks", () => {
  it("normalizes sparkline totals to numeric values", async () => {
    const scenario = "base" as const;
    const overview = await getDashboardOverview("28d", scenario);
    const mocks = buildDashboardMocks({ scenario });

    const expectedSparkline = mocks.sales.trend.map((point) =>
      Number.parseFloat(point.total.amount.toFixed(2)),
    );

    expect(overview.sparkline).toEqual(expectedSparkline);
  });

  it("falls back to the default range when the input is invalid", async () => {
    const overview = await getDashboardOverview("not-a-range", "base");
    expect(overview.range).toBe(DEFAULT_DASHBOARD_RANGE);
  });

  it("counts rising pages based on keyword movement", async () => {
    const scenario = "base" as const;
    const overview = await getDashboardOverview("28d", scenario);
    const mocks = buildDashboardMocks({ scenario });

    const expectedRisingPages = mocks.seo.keywords
      .filter((keyword) => keyword.delta > 0)
      .reduce((pages, keyword) => {
        if (keyword.topPage) {
          pages.add(keyword.topPage);
        }
        return pages;
      }, new Set<string>()).size;

    expect(overview.seo.risingPages).toBe(expectedRisingPages);
  });
});
