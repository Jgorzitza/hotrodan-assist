import type { DashboardMocks, MockScenario, ScenarioOptions } from "~/types/dashboard";

import { getInboxScenario } from "./inbox";
import { getInventoryScenario } from "./inventory";
import { getKpiScenario } from "./kpis";
import { getOrdersScenario } from "./orders";
import { getSalesScenario } from "./sales";
import { getSeoCollections, getSeoScenario } from "./seo";
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
} from "./inbox";
export { getInboxData } from "./inbox";
export { getInventoryScenario };
export { getKpiScenario };
export { getOrdersScenario };
export { getSalesScenario };
export { getSeoScenario, getSeoCollections };
export { getMockSettings } from "./settings";
export { resolveScenario, isMockScenario, scenarioFromSearchParams } from "./shared";
