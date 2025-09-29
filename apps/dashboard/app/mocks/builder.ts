import type { DashboardMocks, MockScenario, ScenarioOptions } from "~/types/dashboard";

import { getInboxScenario } from "./inbox.ts";
import { getInventoryScenario } from "./inventory.ts";
import { getKpiScenario } from "./kpis.ts";
import { getOrdersScenario } from "./orders.ts";
import { getSalesScenario } from "./sales.ts";
import { getSeoCollections, getSeoScenario } from "./seo.ts";
import { getMockSettings } from "./settings";
import { scenarioFromSearchParams } from "./shared";

export const buildDashboardMocks = (
  options: ScenarioOptions = {},
): DashboardMocks => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;

  return {
    sales: getSalesScenario({ scenario, seed }),
    orders: getOrdersScenario({ scenario, seed }),
    inbox: getInboxScenario({ scenario, seed }),
    inventory: getInventoryScenario({ scenario, seed }),
    kpis: getKpiScenario({ scenario, seed }),
    seo: getSeoScenario({ scenario, seed }),
    settings: getMockSettings(),
  };
};

export const scenarioFromRequest = (request: Request): MockScenario => {
  const url = new URL(request.url);
  return scenarioFromSearchParams(url.searchParams);
};

export {
  getInboxScenario,
  getInboxDraft,
  updateInboxDraft,
  approveInboxDraft,
  submitInboxDraftFeedback,
  listInboxDraftFeedback,
} from "./inbox.ts";
export { getInboxData } from "./inbox.ts";
export { getInventoryScenario };
export { getKpiScenario };
export { getOrdersScenario };
export { getSalesScenario };
export { getSeoScenario, getSeoCollections };
export { getMockSettings } from "./settings";
export { resolveScenario, isMockScenario, scenarioFromSearchParams } from "./shared";
