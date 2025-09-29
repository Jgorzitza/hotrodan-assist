import { setupServer, type SetupServerApi } from "msw/node";

import {
  BING_PAGE_METRICS_URL,
  GA4_TRAFFIC_SUMMARY_URL,
  GA4_TRAFFIC_TREND_URL,
  GSC_ACTIONS_URL,
  GSC_COVERAGE_URL,
  GSC_KEYWORDS_URL,
  SEO_ADAPTER_BASE_URL,
  SEO_ADAPTER_ENDPOINTS,
  createSeoHandlers,
  createSeoHandlersState,
  mergeSeoHandlersState,
  type AdapterState,
  type SeoAdapterMode,
  type SeoHandlersInput,
  type SeoHandlersSnapshot,
  type SeoHandlersState,
} from "./seo-handlers";

export type SeoTestServer = {
  server: SetupServerApi;
  useScenario: (updates: SeoHandlersInput) => void;
  getState: () => SeoHandlersSnapshot;
};

export const createSeoTestServer = (
  input: SeoHandlersInput = {},
): SeoTestServer => {
  const state: SeoHandlersState = createSeoHandlersState(input);
  const server = setupServer(...createSeoHandlers(state));

  return {
    server,
    useScenario(updates: SeoHandlersInput) {
      mergeSeoHandlersState(state, updates);
    },
    getState() {
      return state.current;
    },
  };
};

export {
  SEO_ADAPTER_BASE_URL,
  SEO_ADAPTER_ENDPOINTS,
  GA4_TRAFFIC_SUMMARY_URL,
  GA4_TRAFFIC_TREND_URL,
  GSC_KEYWORDS_URL,
  GSC_ACTIONS_URL,
  GSC_COVERAGE_URL,
  BING_PAGE_METRICS_URL,
};

export type { AdapterState, SeoAdapterMode, SeoHandlersInput, SeoHandlersSnapshot };
