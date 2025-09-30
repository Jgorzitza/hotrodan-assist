import type {
  DashboardHomeScenario,
  MockState,
  SalesRouteScenario
} from "../types/dashboard";
import { DASHBOARD_HOME_SCENARIOS, getDashboardHomeScenario } from "./scenarios/dashboardHome";
import { INVENTORY_SCENARIOS, getInventoryScenario } from "./scenarios/inventory";
import { KPI_SCENARIOS, getKpiScenario } from "./scenarios/kpis";
import { ORDERS_SCENARIOS, getOrdersScenario } from "./scenarios/orders";
import { SALES_SCENARIOS, getSalesScenario } from "./scenarios/sales";
import { SEO_SCENARIOS, getSeoScenario } from "./scenarios/seo";
import { SETTINGS_SCENARIOS, getSettingsScenario } from "./scenarios/settings";

export const DEFAULT_MOCK_STATE: MockState = "base";

export function shouldUseMockData(env: Record<string, string | undefined> = process.env): boolean {
  return env.USE_MOCK_DATA === "true";
}

export function parseMockState(value: string | null | undefined): MockState | null {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase() as MockState;
  const collections: ReadonlyArray<ReadonlyArray<string>> = [
    DASHBOARD_HOME_SCENARIOS,
    SALES_SCENARIOS,
    ORDERS_SCENARIOS,
    INVENTORY_SCENARIOS,
    KPI_SCENARIOS,
    SEO_SCENARIOS,
    SETTINGS_SCENARIOS
  ];
  if (collections.some((list) => list.includes(normalized))) {
    return normalized;
  }
  return null;
}

export function resolveMockState(url: string | URL, fallback: MockState = DEFAULT_MOCK_STATE): MockState {
  const instance = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const state = instance.searchParams.get("mockState");
  return parseMockState(state) ?? fallback;
}

export function getDashboardHomeData(state: MockState = DEFAULT_MOCK_STATE): DashboardHomeScenario {
  return getDashboardHomeScenario(state);
}

export function getSalesData(state: MockState = DEFAULT_MOCK_STATE): SalesRouteScenario {
  return getSalesScenario(state);
}

export function getOrdersData(state: MockState = DEFAULT_MOCK_STATE) {
  return getOrdersScenario(state);
}

export function getInventoryData(state: MockState = DEFAULT_MOCK_STATE) {
  return getInventoryScenario(state);
}

export function getKpiData(state: MockState = DEFAULT_MOCK_STATE) {
  return getKpiScenario(state);
}

export function getSeoData(state: MockState = DEFAULT_MOCK_STATE) {
  return getSeoScenario(state);
}

export function getSettingsData(state: MockState = DEFAULT_MOCK_STATE) {
  return getSettingsScenario(state);
}

export const MOCK_SCENARIOS = {
  dashboardHome: DASHBOARD_HOME_SCENARIOS,
  sales: SALES_SCENARIOS,
  orders: ORDERS_SCENARIOS,
  inventory: INVENTORY_SCENARIOS,
  kpis: KPI_SCENARIOS,
  seo: SEO_SCENARIOS,
  settings: SETTINGS_SCENARIOS
} as const;
