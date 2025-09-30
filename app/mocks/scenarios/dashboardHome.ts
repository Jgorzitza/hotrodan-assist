import type { DashboardHomeScenario, MockState } from "../../types/dashboard";
import { buildDashboardHomeScenario } from "../dashboardHome";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getDashboardHomeScenario(state: MockState = "base"): DashboardHomeScenario {
  return buildDashboardHomeScenario(state);
}

export const DASHBOARD_HOME_SCENARIOS = SCENARIOS;
