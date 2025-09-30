import type { MockState, OrdersScenario } from "../../types/dashboard";
import { buildOrdersScenario } from "../orders";

const SCENARIOS: ReadonlyArray<MockState> = ["base", "empty", "warning", "error"];

export function getOrdersScenario(state: MockState = "base"): OrdersScenario {
  return buildOrdersScenario(state);
}

export const ORDERS_SCENARIOS = SCENARIOS;
