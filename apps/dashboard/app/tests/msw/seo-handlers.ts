import { http, HttpResponse, delay } from "msw";

import { getSeoScenario } from "~/mocks";
import type { Ga4TrafficSummary } from "~/lib/seo/ga4";
import type { GscCoverageIssue } from "~/lib/seo/gsc";
import type {
  MockScenario,
  SeoAction,
  SeoKeywordRow,
  SeoPageRow,
  SeoTrafficPoint,
} from "~/types/dashboard";

export const SEO_ADAPTER_BASE_URL = "https://seo.adapters.test";

export const GA4_TRAFFIC_SUMMARY_URL = `${SEO_ADAPTER_BASE_URL}/ga4/traffic-summary`;
export const GA4_TRAFFIC_TREND_URL = `${SEO_ADAPTER_BASE_URL}/ga4/traffic-trend`;
export const GSC_KEYWORDS_URL = `${SEO_ADAPTER_BASE_URL}/gsc/keywords`;
export const GSC_ACTIONS_URL = `${SEO_ADAPTER_BASE_URL}/gsc/actions`;
export const GSC_COVERAGE_URL = `${SEO_ADAPTER_BASE_URL}/gsc/coverage-issues`;
export const BING_PAGE_METRICS_URL = `${SEO_ADAPTER_BASE_URL}/bing/page-metrics`;

export const SEO_ADAPTER_ENDPOINTS = {
  ga4Summary: GA4_TRAFFIC_SUMMARY_URL,
  ga4Trend: GA4_TRAFFIC_TREND_URL,
  gscKeywords: GSC_KEYWORDS_URL,
  gscActions: GSC_ACTIONS_URL,
  gscCoverage: GSC_COVERAGE_URL,
  bingPages: BING_PAGE_METRICS_URL,
};

export type SeoAdapterMode = "ok" | "offline" | "rate_limited" | "error";

export type AdapterState = {
  mode: SeoAdapterMode;
  statusCode?: number;
  errorMessage?: string;
};

export type SeoHandlersSnapshot = {
  scenario: MockScenario;
  latencyMs: number;
  ga4: AdapterState;
  gsc: AdapterState;
  bing: AdapterState;
};

export type SeoHandlersState = {
  current: SeoHandlersSnapshot;
};

export type AdapterStateInput = Partial<AdapterState> & {
  statusCode?: number;
  errorMessage?: string | null;
};

export type SeoHandlersInput = Partial<Omit<SeoHandlersSnapshot, "ga4" | "gsc" | "bing">> & {
  ga4?: AdapterStateInput;
  gsc?: AdapterStateInput;
  bing?: AdapterStateInput;
};

type AdapterKey = "ga4" | "gsc" | "bing";

type AdapterDefaults = Record<AdapterKey, { error: string }>;

const DEFAULT_LATENCY_MS = 0;
const DEFAULT_ADAPTER_STATE: AdapterState = { mode: "ok" };

const DEFAULT_ERROR_MESSAGES: AdapterDefaults = {
  ga4: { error: "GA4 adapter failed" },
  gsc: { error: "Search Console adapter failed" },
  bing: { error: "Bing adapter failed" },
};

const GA4_SUMMARY_BY_SCENARIO: Record<MockScenario, Ga4TrafficSummary> = {
  base: { totalUsers: 18452, sessions: 23120, conversions: 842, source: "ga4" },
  warning: { totalUsers: 16120, sessions: 19842, conversions: 712, source: "ga4" },
  empty: { totalUsers: 0, sessions: 0, conversions: 0, source: "ga4" },
  error: { totalUsers: 0, sessions: 0, conversions: 0, source: "ga4" },
};

const BASE_COVERAGE: GscCoverageIssue[] = [
  {
    page: "/collections/turbo-kit",
    issue: "Blocked by robots.txt",
    severity: "critical",
  },
  {
    page: "/products/ls-stage-2",
    issue: "Mobile usability: clickable elements too close",
    severity: "warning",
  },
];

const WARNING_COVERAGE: GscCoverageIssue[] = [
  ...BASE_COVERAGE,
  {
    page: "/pages/build-program",
    issue: "Duplicate canonical tag detected",
    severity: "warning",
  },
];

const EMPTY_COVERAGE: GscCoverageIssue[] = [];

const ERROR_COVERAGE: GscCoverageIssue[] = [];

const clone = <T extends Record<string, unknown>>(value: T): T => ({ ...value });

const mergeAdapterState = (
  base: AdapterState,
  incoming?: AdapterStateInput,
): AdapterState => {
  if (!incoming) {
    return { ...base };
  }

  const next: AdapterState = {
    mode: incoming.mode ?? base.mode,
    statusCode: base.statusCode,
    errorMessage: base.errorMessage,
  };

  if ("statusCode" in incoming) {
    next.statusCode = incoming.statusCode ?? undefined;
  }

  if ("errorMessage" in incoming) {
    next.errorMessage = incoming.errorMessage ?? undefined;
  }

  return next;
};

const resolveState = (
  base: SeoHandlersSnapshot | null,
  updates: SeoHandlersInput = {},
): SeoHandlersSnapshot => {
  const scenario = updates.scenario ?? base?.scenario ?? "base";
  const latencyMs = updates.latencyMs ?? base?.latencyMs ?? DEFAULT_LATENCY_MS;

  const baseGa4 = base?.ga4 ?? DEFAULT_ADAPTER_STATE;
  const baseGsc = base?.gsc ?? DEFAULT_ADAPTER_STATE;
  const baseBing = base?.bing ?? DEFAULT_ADAPTER_STATE;

  const ga4 = mergeAdapterState(baseGa4, updates.ga4);
  const gsc = mergeAdapterState(baseGsc, updates.gsc);
  const bing = mergeAdapterState(baseBing, updates.bing);

  const snapshot: SeoHandlersSnapshot = {
    scenario,
    latencyMs,
    ga4,
    gsc,
    bing,
  };

  if (scenario === "error") {
    if (!updates.ga4?.mode && (!base || base.ga4.mode === "ok")) {
      snapshot.ga4.mode = "error";
      snapshot.ga4.statusCode ??= 502;
      snapshot.ga4.errorMessage ??= DEFAULT_ERROR_MESSAGES.ga4.error;
    }
    if (!updates.gsc?.mode && (!base || base.gsc.mode === "ok")) {
      snapshot.gsc.mode = "error";
      snapshot.gsc.statusCode ??= 502;
      snapshot.gsc.errorMessage ??= DEFAULT_ERROR_MESSAGES.gsc.error;
    }
    if (!updates.bing?.mode && (!base || base.bing.mode === "ok")) {
      snapshot.bing.mode = "error";
      snapshot.bing.statusCode ??= 502;
      snapshot.bing.errorMessage ??= DEFAULT_ERROR_MESSAGES.bing.error;
    }
  }

  return snapshot;
};

export const createSeoHandlersState = (
  input: SeoHandlersInput = {},
): SeoHandlersState => ({
  current: resolveState(null, input),
});

export const mergeSeoHandlersState = (
  state: SeoHandlersState,
  updates: SeoHandlersInput,
) => {
  state.current = resolveState(state.current, updates);
};

const buildGa4Summary = (scenario: MockScenario): Ga4TrafficSummary => {
  const summary = GA4_SUMMARY_BY_SCENARIO[scenario] ?? GA4_SUMMARY_BY_SCENARIO.base;
  return { ...summary };
};

const buildGa4Trend = (scenario: MockScenario): SeoTrafficPoint[] => {
  const dataset = getSeoScenario({ scenario });
  return dataset.traffic.map((point) => ({ ...point }));
};

const buildGscKeywords = (scenario: MockScenario): SeoKeywordRow[] => {
  const dataset = getSeoScenario({ scenario });
  return dataset.keywords.map((row) => ({ ...row }));
};

const buildGscActions = (scenario: MockScenario): SeoAction[] => {
  const dataset = getSeoScenario({ scenario });
  return dataset.actions.map((action) => ({ ...action }));
};

const buildGscCoverage = (scenario: MockScenario): GscCoverageIssue[] => {
  if (scenario === "empty") {
    return EMPTY_COVERAGE.map(clone);
  }

  if (scenario === "warning") {
    return WARNING_COVERAGE.map(clone);
  }

  if (scenario === "error") {
    return ERROR_COVERAGE.map(clone);
  }

  return BASE_COVERAGE.map(clone);
};

const buildBingPages = (scenario: MockScenario): SeoPageRow[] => {
  const dataset = getSeoScenario({ scenario });
  return dataset.pages.map((row) => ({ ...row }));
};

const respondWithAdapterState = async <T>(
  adapter: AdapterState,
  data: T,
  latencyMs: number,
  fallbackMessage: string,
): Promise<Response> => {
  await delay(latencyMs);

  const mode = adapter.mode ?? "ok";

  if (mode === "ok") {
    return HttpResponse.json(data);
  }

  if (mode === "rate_limited") {
    const status = adapter.statusCode ?? 429;
    return HttpResponse.json(
      { error: adapter.errorMessage ?? fallbackMessage },
      { status },
    );
  }

  if (mode === "offline") {
    const status = adapter.statusCode ?? 503;
    return HttpResponse.json(
      { error: adapter.errorMessage ?? fallbackMessage },
      { status },
    );
  }

  const status = adapter.statusCode ?? 502;

  return HttpResponse.json(
    { error: adapter.errorMessage ?? fallbackMessage },
    { status },
  );
};

export const createSeoHandlers = (state: SeoHandlersState) => [
  http.get(GA4_TRAFFIC_SUMMARY_URL, async () => {
    const { scenario, latencyMs, ga4 } = state.current;
    const summary = buildGa4Summary(scenario);
    return respondWithAdapterState(ga4, summary, latencyMs, DEFAULT_ERROR_MESSAGES.ga4.error);
  }),
  http.get(GA4_TRAFFIC_TREND_URL, async () => {
    const { scenario, latencyMs, ga4 } = state.current;
    const trend = buildGa4Trend(scenario);
    return respondWithAdapterState(ga4, trend, latencyMs, DEFAULT_ERROR_MESSAGES.ga4.error);
  }),
  http.get(GSC_KEYWORDS_URL, async () => {
    const { scenario, latencyMs, gsc } = state.current;
    const keywords = buildGscKeywords(scenario);
    return respondWithAdapterState(gsc, keywords, latencyMs, DEFAULT_ERROR_MESSAGES.gsc.error);
  }),
  http.get(GSC_ACTIONS_URL, async () => {
    const { scenario, latencyMs, gsc } = state.current;
    const actions = buildGscActions(scenario);
    return respondWithAdapterState(gsc, actions, latencyMs, DEFAULT_ERROR_MESSAGES.gsc.error);
  }),
  http.get(GSC_COVERAGE_URL, async () => {
    const { scenario, latencyMs, gsc } = state.current;
    const coverage = buildGscCoverage(scenario);
    return respondWithAdapterState(gsc, coverage, latencyMs, DEFAULT_ERROR_MESSAGES.gsc.error);
  }),
  http.get(BING_PAGE_METRICS_URL, async () => {
    const { scenario, latencyMs, bing } = state.current;
    const pages = buildBingPages(scenario);
    return respondWithAdapterState(bing, pages, latencyMs, DEFAULT_ERROR_MESSAGES.bing.error);
  }),
];
