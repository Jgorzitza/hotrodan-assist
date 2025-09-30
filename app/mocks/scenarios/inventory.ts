import type { InventoryScenario, MockState } from "../../types/dashboard";
import { buildInventoryScenario } from "../inventory";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getInventoryScenario(state: MockState = "base"): InventoryScenario {
  return buildInventoryScenario(state);
}

export const INVENTORY_SCENARIOS = SCENARIOS;
