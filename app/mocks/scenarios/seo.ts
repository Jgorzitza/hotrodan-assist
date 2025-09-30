import type { MockState, SeoScenario } from "../../types/dashboard";
import { buildSeoScenario } from "../seo";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getSeoScenario(state: MockState = "base"): SeoScenario {
  return buildSeoScenario(state);
}

export const SEO_SCENARIOS = SCENARIOS;
