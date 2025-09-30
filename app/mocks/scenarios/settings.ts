import type { MockState, SettingsScenario } from "../../types/dashboard";
import { buildSettingsScenario } from "../settings";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getSettingsScenario(state: MockState = "base"): SettingsScenario {
  return buildSettingsScenario(state);
}

export const SETTINGS_SCENARIOS = SCENARIOS;
