import type { MockState, SalesRouteScenario } from "../../types/dashboard";
import { buildSalesScenario } from "../sales";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getSalesScenario(state: MockState = "base"): SalesRouteScenario {
  return buildSalesScenario(state);
}

export const SALES_SCENARIOS = SCENARIOS;
