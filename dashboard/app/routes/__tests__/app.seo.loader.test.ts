/* eslint-disable @typescript-eslint/consistent-type-imports */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConnectionHealth, SettingsPayload } from "~/types/settings";
import type { SeoAction, SeoKeywordRow, SeoTrafficPoint } from "~/types/dashboard";

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  default: {},
  authenticate: {
    admin: vi.fn(async () => ({
      session: { shop: "seo-test-shop.myshopify.com" },
    })),
  },
}));

// Stub UI-only packages to avoid heavy client imports during server-only loader test
vi.mock("@shopify/app-bridge-react", () => ({ __esModule: true, TitleBar: () => null }));
vi.mock("@shopify/polaris", () => ({
  __esModule: true,
  Badge: () => null,
  Banner: () => null,
  BlockStack: () => null,
  Box: () => null,
  Button: () => null,
  ButtonGroup: () => null,
  Card: () => null,
  Divider: () => null,
  InlineGrid: () => null,
  InlineStack: () => null,
  DataTable: () => null,
  Layout: () => null,
  Page: () => null,
  Select: () => null,
  Text: () => null,
  TextField: () => null,
}));
vi.mock("@shopify/polaris-viz", () => ({ __esModule: true, LineChart: () => null, PolarisVizProvider: ({ children }: any) => children }));

const createDeferred = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve: resolve!,
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.USE_MOCK_DATA;
  delete process.env.SHOPIFY_APP_URL;
  delete process.env.SHOPIFY_API_KEY;
  delete process.env.SHOPIFY_API_SECRET;
  delete process.env.DATABASE_URL;
});

describe("app.seo loader", () => {
  it("runs adapter fetches in parallel and falls back when a provider errors", async () => {
    vi.useFakeTimers();
    process.env.USE_MOCK_DATA = "true";
    process.env.SHOPIFY_APP_URL = "https://example.test";
    process.env.SHOPIFY_API_KEY = "test-key";
    process.env.SHOPIFY_API_SECRET = "test-secret";
    process.env.DATABASE_URL = "file:./tmp-seo-test.sqlite";

    const callOrder: string[] = [];

    const ga4SummaryDeferred = createDeferred<{
      totalUsers: number;
      sessions: number;
      conversions: number;
      source: "ga4";
    } | null>();
    const ga4TrendDeferred = createDeferred<SeoTrafficPoint[]>();

    const ga4Client = {
      fetchTrafficSummary: vi.fn(() => {
        callOrder.push("ga4-summary");
        return ga4SummaryDeferred.promise;
      }),
      fetchTrafficTrend: vi.fn(() => {
        callOrder.push("ga4-trend");
        return ga4TrendDeferred.promise;
      }),
    };

    const keywords: SeoKeywordRow[] = [
      {
        query: "hot rod wraps",
        clicks: 42,
        impressions: 420,
        ctr: 0.1,
        avgPosition: 3.2,
        delta: -0.2,
        intent: "transactional",
        topPage: "/collections/wraps",
      },
    ];

    const actions: SeoAction[] = [
      {
        id: "action-123",
        title: "Tighten schema",
        description: "Add FAQ schema to hot rod wraps collection.",
        priority: "now",
        status: "not_started",
        assignedTo: "Content ops",
        source: "gsc",
        metricLabel: "Avg position",
        metricValue: "3.2",
        lastUpdatedAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
      },
    ];

    const coverage = [
      {
        page: "/collections/wraps",
        issue: "Indexed, though blocked",
        severity: "warning" as const,
      },
    ];

    const gscClient = {
      fetchKeywordTable: vi.fn(async () => {
        callOrder.push("gsc-keywords");
        return keywords;
      }),
      fetchSeoActions: vi.fn(async () => {
        callOrder.push("gsc-actions");
        return actions;
      }),
      fetchCoverageIssues: vi.fn(async () => {
        callOrder.push("gsc-coverage");
        return coverage;
      }),
    };

    const bingClient = {
      fetchPageMetrics: vi.fn(async () => {
        callOrder.push("bing-pages");
        throw new Error("bing offline");
      }),
    };

    vi.resetModules();

    const getSettingsMock = vi
      .fn(async () => ({
        ...buildSettingsPayload(),
        connections: buildConnections({
          bing: { message: "Healthy" },
        }),
      }))
      .mockName("getSettings");

    vi.doMock("~/lib/settings/repository.server", () => ({
      storeSettingsRepository: {
        getSettings: getSettingsMock,
      },
    }));

    vi.doMock("~/lib/seo/persistence.server", () => ({
      getPersistedActionOverrides: vi.fn(async () => ({})),
      persistSeoActionUpdate: vi.fn(async () => ({
        ok: true,
        storeId: "store-id",
        insightId: "insight-id",
      })),
    }));

    const createGa4ClientMock = vi.fn(() => ga4Client);
    vi.doMock("~/lib/seo/ga4", async () => {
      const actual = await vi.importActual<typeof import("~/lib/seo/ga4")>(
        "~/lib/seo/ga4",
      );
      return {
        ...actual,
        createGa4Client: createGa4ClientMock,
      };
    });

    const createGscClientMock = vi.fn(() => gscClient);
    vi.doMock("~/lib/seo/gsc", async () => {
      const actual = await vi.importActual<typeof import("~/lib/seo/gsc")>(
        "~/lib/seo/gsc",
      );
      return {
        ...actual,
        createGscClient: createGscClientMock,
      };
    });

    const createBingClientMock = vi.fn(() => bingClient);
    vi.doMock("~/lib/seo/bing", async () => {
      const actual = await vi.importActual<typeof import("~/lib/seo/bing")>(
        "~/lib/seo/bing",
      );
      return {
        ...actual,
        createBingClient: createBingClientMock,
      };
    });

    const getMcpSeoOpportunitiesMock = vi.fn(async () => ({
      data: [],
      source: "mock",
      generatedAt: "2025-01-01T00:00:00.000Z",
    }));

    vi.doMock("~/lib/mcp", async () => {
      const actual = await vi.importActual<typeof import("~/lib/mcp")>("~/lib/mcp");
      return {
        ...actual,
        getMcpSeoOpportunities: getMcpSeoOpportunitiesMock,
        isMcpFeatureEnabled: vi.fn(() => false),
        shouldUseMcpMocks: vi.fn(() => true),
      };
    });

    const module = await import("../app.seo");

    const loaderPromise = module.loader({
      request: new Request("https://app.example.com/app/seo"),
      params: {},
      context: {} as never,
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(createGa4ClientMock).toHaveBeenCalledTimes(1);
    expect(createGscClientMock).toHaveBeenCalledTimes(1);
    expect(createBingClientMock).toHaveBeenCalledTimes(1);

    ga4SummaryDeferred.resolve({
      totalUsers: 1200,
      sessions: 1800,
      conversions: 90,
      source: "ga4",
    });
    callOrder.push("resolve-summary");
    ga4TrendDeferred.resolve([
      { date: "2025-01-01", clicks: 15, impressions: 150, ctr: 0.1 },
    ]);
    callOrder.push("resolve-trend");

    const response = await loaderPromise;
    const payload = await response.json();

    expect(payload.trafficSummary).toEqual({
      totalUsers: 1200,
      sessions: 1800,
      conversions: 90,
      source: "ga4",
    });
    expect(payload.traffic).toEqual([
      { date: "2025-01-01", clicks: 15, impressions: 150, ctr: 0.1 },
    ]);

    expect(payload.keywords).toEqual(keywords);
    expect(payload.actions[0]).toMatchObject({
      id: "action-123",
      priority: "now",
      status: "not_started",
    });

    expect(payload.coverageIssues).toEqual(coverage);

    expect(payload.pages).toEqual([]);
    expect(payload.adapters.bing.status).toBe("error");
    expect(payload.adapters.bing.active).toBe(false);
    expect(payload.adapters.bing.message).toMatch(/offline|credential/i);

    expect(payload.adapters.ga4.status).toBe("success");
    expect(payload.adapters.gsc.status).not.toBe("error");

    expect(getSettingsMock).toHaveBeenCalledTimes(1);
    expect(getMcpSeoOpportunitiesMock).toHaveBeenCalledTimes(1);

    expect(gscClient.fetchKeywordTable).toHaveBeenCalledTimes(1);
    expect(bingClient.fetchPageMetrics).toHaveBeenCalledTimes(1);

    const bingIndex = callOrder.indexOf("bing-pages");
    const resolveIndex = callOrder.indexOf("resolve-summary");
    expect(bingIndex).toBeGreaterThan(-1);
    expect(resolveIndex).toBeGreaterThan(-1);
    expect(bingIndex).toBeLessThan(resolveIndex);
  });
});
const buildConnections = (overrides?: Partial<Record<"ga4" | "gsc" | "bing" | "mcp", Partial<ConnectionHealth>>>) => {
  const base: Record<"ga4" | "gsc" | "bing" | "mcp", ConnectionHealth> = {
    ga4: { provider: "ga4", status: "success", history: [] },
    gsc: { provider: "gsc", status: "success", history: [] },
    bing: { provider: "bing", status: "success", history: [] },
    mcp: { provider: "mcp", status: "success", history: [] },
  };

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (!value) continue;
      const provider = key as keyof typeof base;
      base[provider] = {
        ...base[provider],
        ...value,
      };
    }
  }

  return base;
};

const buildSettingsPayload = (): SettingsPayload => ({
  shopDomain: "seo-test-shop.myshopify.com",
  thresholds: {
    lowStockMinimum: 5,
    overdueOrderHours: 48,
    overstockPercentage: 35,
  },
  toggles: {
    enableMcpIntegration: false,
    enableAssistantsProvider: false,
    enableBetaWorkflows: false,
    enableExperimentalWidgets: false,
    useMockData: false,
    enableMcp: false,
    enableSeo: false,
    enableInventory: false,
  },
  secrets: {
    ga4: null,
    gsc: null,
    bing: null,
    mcp: null,
  },
  connections: buildConnections(),
});
