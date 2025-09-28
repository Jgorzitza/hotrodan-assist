import { scenarioFromRequest } from "./builder";
import type { MockScenario } from "~/types/dashboard";

export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";

export const mockScenarioFromRequest = (
  request: Request,
  fallback: MockScenario = "base",
): MockScenario => {
  const scenario = scenarioFromRequest(request);
  return scenario ?? fallback;
};
