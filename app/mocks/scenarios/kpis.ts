import type { KpiScenario, MockState } from "../../types/dashboard";
import { buildKpiScenario } from "../kpis";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getKpiScenario(state: MockState = "base"): KpiScenario {
  return buildKpiScenario(state);
}

export const KPI_SCENARIOS = SCENARIOS;
