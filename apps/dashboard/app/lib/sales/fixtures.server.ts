import { analyticsSalesFixtures } from "~/mocks/fixtures/analytics.sales";
import { mapAnalyticsResponse } from "~/lib/sales/analytics.server";
import type { AnalyticsSalesResponse } from "~/types/analytics";
import type { MockScenario, SalesDataset, SalesGranularity } from "~/types/dashboard";
import type { DashboardRangeSelection } from "~/lib/date-range";

type FixtureKey = keyof typeof analyticsSalesFixtures;

const SCENARIO_TO_FIXTURE: Record<MockScenario, FixtureKey> = {
  base: "base",
  warning: "warning",
  empty: "empty",
  error: "error",
};

const resolveFixtureKey = (scenario: MockScenario): FixtureKey => {
  return SCENARIO_TO_FIXTURE[scenario] ?? "base";
};

export type BuildSalesFixtureOptions = {
  scenario: MockScenario;
  granularity: SalesGranularity;
  range?: Pick<DashboardRangeSelection, "label" | "start" | "end"> & { days: number };
};

export const buildSalesFixtureDataset = (
  options: BuildSalesFixtureOptions,
): SalesDataset => {
  const fixtureKey = resolveFixtureKey(options.scenario);
  const payload: AnalyticsSalesResponse = structuredClone(analyticsSalesFixtures[fixtureKey]);
  payload.granularity = options.granularity;

  if (options.range) {
    payload.range = {
      label: options.range.label,
      start: options.range.start,
      end: options.range.end,
    };
  }

  return mapAnalyticsResponse(payload);
};
