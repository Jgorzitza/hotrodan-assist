import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  DataTable,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  LineChart,
  PolarisVizProvider,
  type DataSeries,
} from "@shopify/polaris-viz";
import { z } from "zod";

import { authenticate } from "../shopify.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import {
  getMcpSeoOpportunities,
  isMcpFeatureEnabled,
  shouldUseMcpMocks,
  type SeoOpportunity,
} from "~/lib/mcp";
import type { McpClientOverrides } from "~/lib/mcp/config.server";
import { getMcpClientOverridesForShop } from "~/lib/mcp/config.server";
import {
  createGa4Client,
  type Ga4TrafficSummary,
} from "~/lib/seo/ga4";
import {
  createGscClient,
  type GscCoverageIssue,
} from "~/lib/seo/gsc";
import { createBingClient } from "~/lib/seo/bing";
import {
  getPersistedActionOverrides,
  persistSeoActionUpdate,
} from "~/lib/seo/persistence.server";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type {
  MockScenario,
  SeoAction,
  SeoActionPriority,
  SeoDataset,
  SeoKeywordIntent,
  SeoKeywordRow,
  SeoPageRow,
  SeoSource,
  SeoTrafficPoint,
} from "~/types/dashboard";
import type {
  ConnectionStatusState,
  SettingsPayload,
} from "~/types/settings";

const filtersSchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  keywordIntent: z
    .enum(["transactional", "informational", "navigational", "all"])
    .optional(),
  page: z.enum(["all", "issue", "ok"]).optional(),
  pageSearch: z.string().trim().max(120).optional(),
  actionPriority: z.enum(["all", "now", "soon", "later"]).optional(),
  ga4: z.string().optional(),
  gsc: z.string().optional(),
  bing: z.string().optional(),
});

const adapterLabels: Record<SeoSource, string> = {
  ga4: "GA4",
  gsc: "Search Console",
  bing: "Bing",
};

const ADAPTER_TONE: Record<ConnectionStatusState, "success" | "warning" | "critical"> = {
  success: "success",
  warning: "warning",
  error: "critical",
};

const PRIORITY_ORDER: Record<SeoActionPriority, number> = {
  now: 0,
  soon: 1,
  later: 2,
};

const ACTION_STATUS_LABEL: Record<SeoAction["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

const ACTION_STATUS_TONE: Record<SeoAction["status"], "subdued" | "info" | "success"> = {
  not_started: "subdued",
  in_progress: "info",
  done: "success",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number): string => numberFormatter.format(Math.round(value));

const formatPercentage = (value: number, fractionDigits = 1): string => {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(fractionDigits)}%`;
};

const formatDelta = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toFixed(1);
  return safe > 0 ? `+${formatted}` : formatted;
};

const formatDateLabel = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[,"\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

type KeywordIntentFilter = "all" | SeoKeywordIntent;
type PageStatusFilter = "all" | "issue" | "ok";
type ActionPriorityFilter = "all" | SeoActionPriority;

type FilterState = {
  keywordSearch: string;
  keywordIntent: KeywordIntentFilter;
  pageStatus: PageStatusFilter;
  pageSearch: string;
  actionPriority: ActionPriorityFilter;
  toggles: Record<SeoSource, boolean>;
};

type AdapterMeta = {
  id: SeoSource;
  label: string;
  status: ConnectionStatusState;
  message?: string;
  lastCheckedAt?: string;
  toggled: boolean;
  disabledByConnection: boolean;
  active: boolean;
  error?: string;
};

type AdapterMap = Record<SeoSource, AdapterMeta>;

type CollectedSeoData = {
  trafficSummary: Ga4TrafficSummary | null;
  traffic: SeoTrafficPoint[];
  keywords: SeoKeywordRow[];
  actions: SeoAction[];
  coverageIssues: GscCoverageIssue[];
  pages: SeoPageRow[];
};

type LoaderData = {
  dataset: SeoDataset;
  scenario: MockScenario;
  useMockData: boolean;
  filters: FilterState;
  adapters: AdapterMap;
  keywords: SeoKeywordRow[];
  keywordTotal: number;
  pages: SeoPageRow[];
  pageTotal: number;
  actions: SeoAction[];
  actionTotals: Record<SeoActionPriority, number>;
  coverageIssues: GscCoverageIssue[];
  traffic: SeoTrafficPoint[];
  trafficSummary: Ga4TrafficSummary | null;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    opportunities: SeoOpportunity[];
    source?: string;
    generatedAt?: string;
  };
};

const parseBooleanParam = (value?: string | null): boolean => {
  if (value === undefined || value === null) return true;
  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "disabled", "no"].includes(normalized)) {
    return false;
  }
  if (["1", "true", "on", "enabled", "yes"].includes(normalized)) {
    return true;
  }
  return true;
};

const parseFiltersFromInput = (input: Record<string, string | undefined>): FilterState => {
  const result = filtersSchema.safeParse(input);
  const data = result.success ? result.data : {};

  const keywordSearch = data.keyword ?? "";
  const keywordIntent = (data.keywordIntent as KeywordIntentFilter) ?? "all";
  const pageStatus = (data.page as PageStatusFilter) ?? "all";
  const pageSearch = data.pageSearch ?? "";
  const actionPriority = (data.actionPriority as ActionPriorityFilter) ?? "all";

  const toggles: Record<SeoSource, boolean> = {
    ga4: parseBooleanParam(data.ga4),
    gsc: parseBooleanParam(data.gsc),
    bing: parseBooleanParam(data.bing),
  };

  return {
    keywordSearch,
    keywordIntent,
    pageStatus,
    pageSearch,
    actionPriority,
    toggles,
  };
};

const buildAdapterMeta = (
  settings: SettingsPayload,
  toggles: Record<SeoSource, boolean>,
): AdapterMap => {
  const makeMeta = (id: SeoSource): AdapterMeta => {
    const connection = settings.connections[id];
    const toggled = toggles[id] ?? true;
    const disabledByConnection = connection.status === "error";
    const active = toggled && !disabledByConnection;
    return {
      id,
      label: adapterLabels[id],
      status: connection.status,
      message: connection.message,
      lastCheckedAt: connection.lastCheckedAt,
      toggled,
      disabledByConnection,
      active,
    };
  };

  return {
    ga4: makeMeta("ga4"),
    gsc: makeMeta("gsc"),
    bing: makeMeta("bing"),
  };
};

async function fetchAdapterData<T>(
  adapter: AdapterMeta,
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!adapter.active) {
    return fallback;
  }

  try {
    return await fetcher();
  } catch (error) {
    adapter.active = false;
    adapter.error = error instanceof Error ? error.message : "Adapter error";
    adapter.status = "error";
    adapter.message = adapter.error;
    return fallback;
  }
}

const collectSeoData = async (
  scenario: MockScenario,
  useMockData: boolean,
  adapters: AdapterMap,
  shopDomain: string,
  range: SeoDataset["range"],
): Promise<CollectedSeoData> => {
  const scenarioOptions = useMockData ? { scenario } : undefined;

  const ga4Client = createGa4Client(scenarioOptions);
  const gscClient = createGscClient(scenarioOptions);
  const bingClient = createBingClient(scenarioOptions);

  const [
    trafficSummary,
    traffic,
    keywords,
    actions,
    coverageIssues,
    pages,
  ] = await Promise.all([
    fetchAdapterData(
      adapters.ga4,
      () =>
        ga4Client.fetchTrafficSummary({
          propertyId: shopDomain,
          startDate: range.start,
          endDate: range.end,
        }),
      null,
    ),
    fetchAdapterData(
      adapters.ga4,
      () =>
        ga4Client.fetchTrafficTrend({
          propertyId: shopDomain,
          startDate: range.start,
          endDate: range.end,
        }),
      [] as SeoTrafficPoint[],
    ),
    fetchAdapterData(
      adapters.gsc,
      () =>
        gscClient.fetchKeywordTable({
          siteUrl: shopDomain,
          startDate: range.start,
          endDate: range.end,
        }),
      [] as SeoKeywordRow[],
    ),
    fetchAdapterData(
      adapters.gsc,
      () => gscClient.fetchSeoActions({ siteUrl: shopDomain }),
      [] as SeoAction[],
    ),
    fetchAdapterData(
      adapters.gsc,
      () =>
        gscClient.fetchCoverageIssues({
          siteUrl: shopDomain,
          startDate: range.start,
          endDate: range.end,
        }),
      [] as GscCoverageIssue[],
    ),
    fetchAdapterData(
      adapters.bing,
      () =>
        bingClient.fetchPageMetrics({
          siteUrl: shopDomain,
          startDate: range.start,
          endDate: range.end,
        }),
      [] as SeoPageRow[],
    ),
  ]);

  return {
    trafficSummary,
    traffic,
    keywords,
    actions,
    coverageIssues,
    pages,
  };
};

const applyKeywordFilters = (
  rows: SeoKeywordRow[],
  filters: FilterState,
): { rows: SeoKeywordRow[]; total: number } => {
  const total = rows.length;
  const search = filters.keywordSearch.trim().toLowerCase();

  const filtered = rows
    .filter((row) =>
      filters.keywordIntent === "all" ? true : row.intent === filters.keywordIntent,
    )
    .filter((row) => {
      if (!search) return true;
      return (
        row.query.toLowerCase().includes(search) ||
        (row.topPage?.toLowerCase().includes(search) ?? false)
      );
    })
    .sort((a, b) => b.clicks - a.clicks);

  return { rows: filtered, total };
};

const applyPageFilters = (
  rows: SeoPageRow[],
  filters: FilterState,
): { rows: SeoPageRow[]; total: number } => {
  const total = rows.length;
  const search = filters.pageSearch.trim().toLowerCase();

  const filtered = rows
    .filter((row) =>
      filters.pageStatus === "all" ? true : row.canonicalStatus === filters.pageStatus,
    )
    .filter((row) => {
      if (!search) return true;
      return (
        row.title.toLowerCase().includes(search) ||
        row.url.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.entrances - a.entrances);

  return { rows: filtered, total };
};

const sortActions = (rows: SeoAction[]): SeoAction[] => {
  return rows
    .slice()
    .sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    });
};

const countActionsByPriority = (
  rows: SeoAction[],
): Record<SeoActionPriority, number> => {
  return rows.reduce(
    (acc, action) => {
      acc[action.priority] += 1;
      return acc;
    },
    { now: 0, soon: 0, later: 0 } as Record<SeoActionPriority, number>,
  );
};

const buildKeywordCsv = (rows: SeoKeywordRow[]): string => {
  const header = [
    "Keyword",
    "Clicks",
    "Impressions",
    "CTR (%)",
    "Average position",
    "Delta",
    "Intent",
    "Top page",
  ].join(",");

  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.query),
      row.clicks,
      row.impressions,
      row.ctr.toFixed(2),
      row.avgPosition.toFixed(1),
      row.delta.toFixed(1),
      row.intent,
      escapeCsvValue(row.topPage ?? ""),
    ].join(","),
  );

  return [header, ...lines].join("\n");
};

const buildPageCsv = (rows: SeoPageRow[]): string => {
  const header = [
    "URL",
    "Title",
    "Entrances",
    "Exits",
    "Conversion rate (%)",
    "Canonical status",
    "Canonical issue",
  ].join(",");

  const lines = rows.map((row) =>
    [
      escapeCsvValue(row.url),
      escapeCsvValue(row.title),
      row.entrances,
      row.exits,
      row.conversionRate.toFixed(2),
      row.canonicalStatus,
      escapeCsvValue(row.canonicalIssue ?? ""),
    ].join(","),
  );

  return [header, ...lines].join("\n");
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const scenario = scenarioFromRequest(request);
  const url = new URL(request.url);

  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);

  const dataset = getSeoScenario({ scenario });

  const filters = parseFiltersFromInput(Object.fromEntries(url.searchParams));
  const adapters = buildAdapterMeta(settings, filters.toggles);

  const seoData = await collectSeoData(
    scenario,
    USE_MOCK_DATA,
    adapters,
    shopDomain,
    dataset.range,
  );

  const actionOverrides = await getPersistedActionOverrides(
    shopDomain,
    seoData.actions.map((action) => action.id),
  );

  const mergedActions = sortActions(
    seoData.actions.map((action) => {
      const override = actionOverrides[action.id];
      if (!override) {
        return action;
      }

      const assignedTo =
        Object.prototype.hasOwnProperty.call(override, "assignedTo")
          ? override.assignedTo ?? "Unassigned"
          : action.assignedTo;

      return {
        ...action,
        status: override.status ?? action.status,
        assignedTo,
        lastUpdatedAt: override.lastUpdatedAt ?? action.lastUpdatedAt,
        dueAt:
          override.dueAt !== undefined && override.dueAt !== null
            ? override.dueAt
            : action.dueAt,
      };
    }),
  );

  const keywordResult = applyKeywordFilters(seoData.keywords, filters);
  const pageResult = applyPageFilters(seoData.pages, filters);
  const actions = mergedActions;
  const actionTotals = countActionsByPriority(actions);

  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let opportunities: SeoOpportunity[] = [];
  let mcpSource: string | undefined;
  let mcpGeneratedAt: string | undefined;
  let mcpOverrides: McpClientOverrides | undefined;

  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }

    const response = await getMcpSeoOpportunities(
      {
        shopDomain,
        params: { limit: 5 },
      },
      toggles,
      mcpOverrides,
    );
    opportunities = response.data;
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  }

  return json<LoaderData>(
    {
      dataset,
      scenario,
      useMockData: USE_MOCK_DATA,
      filters,
      adapters,
      keywords: keywordResult.rows,
      keywordTotal: keywordResult.total,
      pages: pageResult.rows,
      pageTotal: pageResult.total,
      actions,
      actionTotals,
      coverageIssues: seoData.coverageIssues,
      traffic: seoData.traffic,
      trafficSummary: seoData.trafficSummary,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        opportunities,
        source: mcpSource,
        generatedAt: mcpGeneratedAt,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

const actionUpdateSchema = z.object({
  actionId: z.string().min(1),
  status: z.enum(["not_started", "in_progress", "done"]),
  assignedTo: z.string().max(80).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["now", "soon", "later"]),
  source: z.enum(["ga4", "gsc", "bing"]).optional(),
  metricLabel: z.string().max(120).optional(),
  metricValue: z.string().max(120).optional(),
  dueAt: z.string().optional(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-action") {
    const getString = (key: string): string | undefined => {
      const value = formData.get(key);
      return typeof value === "string" ? value : undefined;
    };

    const getNonEmptyString = (key: string): string | undefined => {
      const value = getString(key);
      if (!value) {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    };

    const parsed = actionUpdateSchema.safeParse({
      actionId: getString("actionId"),
      status: getString("status"),
      assignedTo: getNonEmptyString("assignedTo"),
      title: getString("title"),
      description: getString("description"),
      priority: getString("priority"),
      source: getNonEmptyString("source"),
      metricLabel: getNonEmptyString("metricLabel"),
      metricValue: getNonEmptyString("metricValue"),
      dueAt: getNonEmptyString("dueAt"),
    });

    if (!parsed.success) {
      return json({ ok: false, error: "Invalid action payload" }, { status: 400 });
    }

    let shopDomain = BASE_SHOP_DOMAIN;
    if (!USE_MOCK_DATA) {
      const { session } = await authenticate.admin(request);
      shopDomain = session.shop;
    }

    const result = await persistSeoActionUpdate({
      shopDomain,
      action: {
        id: parsed.data.actionId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedTo: parsed.data.assignedTo ?? null,
        source: parsed.data.source,
        metricLabel: parsed.data.metricLabel ?? null,
        metricValue: parsed.data.metricValue ?? null,
        dueAt: parsed.data.dueAt,
      },
    });

    const updatedAt = new Date().toISOString();

    if (!result.ok) {
      return json({
        ok: true,
        intent: "update-action",
        persisted: false,
        updatedAt,
      });
    }

    return json({
      ok: true,
      intent: "update-action",
      persisted: true,
      insightId: result.insightId,
      updatedAt,
    });
  }

  if (intent === "export-keywords" || intent === "export-pages") {
    const scenario = scenarioFromRequest(request);

    let shopDomain = BASE_SHOP_DOMAIN;
    if (!USE_MOCK_DATA) {
      const { session } = await authenticate.admin(request);
      shopDomain = session.shop;
    }

    const settings = await storeSettingsRepository.getSettings(shopDomain);
    const filterInput: Record<string, string | undefined> = {
      keyword: formData.get("keyword")?.toString(),
      keywordIntent: formData.get("keywordIntent")?.toString(),
      page: formData.get("page")?.toString(),
      pageSearch: formData.get("pageSearch")?.toString(),
      actionPriority: formData.get("actionPriority")?.toString(),
      ga4: formData.get("ga4")?.toString(),
      gsc: formData.get("gsc")?.toString(),
      bing: formData.get("bing")?.toString(),
    };

    const filters = parseFiltersFromInput(filterInput);
    const adapters = buildAdapterMeta(settings, filters.toggles);

    const dataset = getSeoScenario({ scenario });
    const seoData = await collectSeoData(
      scenario,
      USE_MOCK_DATA,
      adapters,
      shopDomain,
      dataset.range,
    );

    if (intent === "export-keywords") {
      const keywordResult = applyKeywordFilters(seoData.keywords, filters);
      const csv = buildKeywordCsv(keywordResult.rows);

      return json({
        filename: `seo-keywords-${scenario}.csv`,
        csv,
        count: keywordResult.rows.length,
        note: "TODO: stream via background worker when datasets exceed 5k rows.",
      });
    }

    const pageResult = applyPageFilters(seoData.pages, filters);
    const csv = buildPageCsv(pageResult.rows);

    return json({
      filename: `seo-pages-${scenario}.csv`,
      csv,
      count: pageResult.rows.length,
      note: "TODO: stream via background worker when datasets exceed 5k rows.",
    });
  }

  return json({ ok: false, error: "Unsupported intent" }, { status: 400 });
};

const severityTone = (severity: "critical" | "warning" | "info") => {
  switch (severity) {
    case "critical":
      return "critical" as const;
    case "warning":
      return "warning" as const;
    default:
      return "info" as const;
  }
};

export default function SeoRoute() {
  const {
    dataset,
    scenario,
    useMockData,
    filters,
    adapters,
    keywords,
    keywordTotal,
    pages,
    pageTotal,
    actions,
    actionTotals,
    coverageIssues,
    traffic,
    trafficSummary,
    mcp,
  } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exportFetcher = useFetcher<{ filename: string; csv: string }>();
  const actionFetcher = useFetcher<{ ok: boolean }>();

  const [keywordQuery, setKeywordQuery] = useState(filters.keywordSearch);
  const [pageQuery, setPageQuery] = useState(filters.pageSearch);
  const [actionsState, setActionsState] = useState(actions);

  const appendActionContext = useCallback((formData: FormData, action?: SeoAction) => {
    if (!action) {
      return;
    }
    formData.append("title", action.title);
    formData.append("description", action.description);
    formData.append("priority", action.priority);
    formData.append("source", action.source);
    if (action.metricLabel) {
      formData.append("metricLabel", action.metricLabel);
    }
    if (action.metricValue) {
      formData.append("metricValue", action.metricValue);
    }
    if (action.dueAt) {
      formData.append("dueAt", action.dueAt);
    }
  }, []);

  useEffect(() => {
    setKeywordQuery(filters.keywordSearch);
  }, [filters.keywordSearch]);

  useEffect(() => {
    setPageQuery(filters.pageSearch);
  }, [filters.pageSearch]);

  useEffect(() => {
    setActionsState(actions);
  }, [actions]);

  useEffect(() => {
    if (exportFetcher.data?.csv && exportFetcher.data?.filename) {
      const blob = new Blob([exportFetcher.data.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFetcher.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [exportFetcher.data]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      const search = next.toString();
      navigate({ search: search ? `?${search}` : "" }, { replace: true });
    },
    [navigate, searchParams],
  );

  const handleAdapterToggle = useCallback(
    (source: SeoSource, nextValue: boolean) => {
      updateParams({ [source]: nextValue ? "1" : "0" });
    },
    [updateParams],
  );

  const handleKeywordSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      updateParams({ keyword: keywordQuery.trim() || null });
    },
    [keywordQuery, updateParams],
  );

  const handleKeywordClear = useCallback(() => {
    setKeywordQuery("");
    updateParams({ keyword: null });
  }, [updateParams]);

  const handlePageSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      updateParams({ pageSearch: pageQuery.trim() || null });
    },
    [pageQuery, updateParams],
  );

  const handlePageClear = useCallback(() => {
    setPageQuery("");
    updateParams({ pageSearch: null });
  }, [updateParams]);

  const handleExport = useCallback(
    (type: "keywords" | "pages") => {
      const formData = new FormData();
      formData.append("intent", type === "keywords" ? "export-keywords" : "export-pages");
      if (filters.keywordSearch) formData.append("keyword", filters.keywordSearch);
      if (filters.keywordIntent !== "all") {
        formData.append("keywordIntent", filters.keywordIntent);
      }
      if (filters.pageStatus !== "all") {
        formData.append("page", filters.pageStatus);
      }
      if (filters.pageSearch) formData.append("pageSearch", filters.pageSearch);
      if (filters.actionPriority !== "all") {
        formData.append("actionPriority", filters.actionPriority);
      }
      formData.append("ga4", filters.toggles.ga4 ? "1" : "0");
      formData.append("gsc", filters.toggles.gsc ? "1" : "0");
      formData.append("bing", filters.toggles.bing ? "1" : "0");
      exportFetcher.submit(formData, { method: "post" });
    },
    [exportFetcher, filters],
  );

  const handleStatusChange = useCallback(
    (actionId: string, nextStatus: SeoAction["status"]) => {
      const current = actionsState.find((action) => action.id === actionId);
      if (!current) {
        return;
      }

      const timestamp = new Date().toISOString();
      const contextAction: SeoAction = {
        ...current,
        status: nextStatus,
        lastUpdatedAt: timestamp,
      };

      setActionsState((state) =>
        state.map((action) =>
          action.id === actionId
            ? { ...action, status: nextStatus, lastUpdatedAt: timestamp }
            : action,
        ),
      );
      const formData = new FormData();
      formData.append("intent", "update-action");
      formData.append("actionId", actionId);
      formData.append("status", nextStatus);
      formData.append("assignedTo", current.assignedTo ?? "Unassigned");
      appendActionContext(formData, contextAction);
      actionFetcher.submit(formData, { method: "post" });
    },
    [actionFetcher, actionsState, appendActionContext],
  );

  const handleAssignmentChange = useCallback(
    (actionId: string, nextAssignee: string) => {
      const current = actionsState.find((action) => action.id === actionId);
      if (!current) {
        return;
      }

      const timestamp = new Date().toISOString();
      const assignedTo = nextAssignee || "Unassigned";
      const contextAction: SeoAction = {
        ...current,
        assignedTo,
        lastUpdatedAt: timestamp,
      };

      setActionsState((state) =>
        state.map((action) =>
          action.id === actionId
            ? { ...action, assignedTo, lastUpdatedAt: timestamp }
            : action,
        ),
      );
      const formData = new FormData();
      formData.append("intent", "update-action");
      formData.append("actionId", actionId);
      formData.append("assignedTo", assignedTo);
      formData.append("status", current.status);
      appendActionContext(formData, contextAction);
      actionFetcher.submit(formData, { method: "post" });
    },
    [actionFetcher, actionsState, appendActionContext],
  );

  const priorityFilterList = useMemo(() => {
    if (filters.actionPriority !== "all") {
      return [filters.actionPriority];
    }
    return ["now", "soon", "later"] as const;
  }, [filters.actionPriority]);

  const filteredActions = useMemo(() => {
    if (filters.actionPriority === "all") {
      return actionsState;
    }
    return actionsState.filter((action) => action.priority === filters.actionPriority);
  }, [actionsState, filters.actionPriority]);

  const groupedActions = useMemo(() => {
    return filteredActions.reduce(
      (acc, action) => {
        acc[action.priority].push(action);
        return acc;
      },
      { now: [], soon: [], later: [] } as Record<SeoActionPriority, SeoAction[]>,
    );
  }, [filteredActions]);

  const assignmentOptions = useMemo(() => {
    const values = new Set<string>();
    actionsState.forEach((action) => values.add(action.assignedTo));
    values.add("Unassigned");
    return Array.from(values)
      .filter(Boolean)
      .map((value) => ({ label: value, value }));
  }, [actionsState]);

  const chartSeries = useMemo<DataSeries[]>(() => {
    if (!traffic.length) return [];
    return [
      {
        name: "Clicks",
        data: traffic.map((point) => ({ key: point.date, value: point.clicks })),
      },
      {
        name: "Impressions",
        data: traffic.map((point) => ({ key: point.date, value: point.impressions })),
      },
    ];
  }, [traffic]);

  const adapterList = useMemo(() => [adapters.ga4, adapters.gsc, adapters.bing], [adapters]);

  return (
    <PolarisVizProvider>
      <Page
        title="SEO insights"
        subtitle="Review health scores, keyword opportunities, and technical issues."
      >
        <TitleBar
          title="SEO"
          primaryAction={{
            content: "Export keywords CSV",
            onAction: () => handleExport("keywords"),
          }}
          secondaryActions={[
            {
              content: "Export page CSV",
              onAction: () => handleExport("pages"),
            },
          ]}
        />

        <BlockStack gap="500">
          {(dataset.alert || dataset.error || useMockData) && (
            <BlockStack gap="200">
              {useMockData && (
                <Banner
                  tone={scenario === "warning" ? "warning" : "info"}
                  title={`Mock state: ${scenario}`}
                >
                  <p>Adjust `mockState` in the query string to explore alternate UI states.</p>
                </Banner>
              )}
              {dataset.alert && !dataset.error && (
                <Banner tone="warning" title="SEO attention required">
                  <p>{dataset.alert}</p>
                </Banner>
              )}
              {dataset.error && (
                <Banner tone="critical" title="SEO signals unavailable">
                  <p>{dataset.error}</p>
                </Banner>
              )}
            </BlockStack>
          )}

          <Card>
            <Card.Section>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text variant="headingMd" as="h2">
                    Data sources
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    Toggle adapters for this view. Connection health reflects the latest Settings sync.
                  </Text>
                </BlockStack>
                <ButtonGroup segmented>
                  {adapterList.map((adapter) => (
                    <Button
                      key={adapter.id}
                      pressed={adapter.toggled && !adapter.disabledByConnection}
                      disabled={adapter.disabledByConnection}
                      onClick={() =>
                        handleAdapterToggle(
                          adapter.id,
                          !(adapter.toggled && !adapter.disabledByConnection),
                        )
                      }
                    >
                      {adapter.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </InlineStack>
            </Card.Section>
            <Divider borderColor="border" />
            <Card.Section>
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
                {adapterList.map((adapter) => (
                  <BlockStack key={adapter.id} gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodySm" as="span">
                        {adapter.label}
                      </Text>
                      <Badge tone={ADAPTER_TONE[adapter.status]}>
                        {adapter.status === "success"
                          ? "Healthy"
                          : adapter.status === "warning"
                            ? "Warning"
                            : "Error"}
                      </Badge>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      {adapter.disabledByConnection
                        ? "Enable in Settings to hydrate this section."
                        : adapter.error ?? adapter.message ?? "Connected"}
                    </Text>
                  </BlockStack>
                ))}
              </InlineGrid>
            </Card.Section>
          </Card>

          <Layout>
            <Layout.Section oneThird>
              <Card title="Scorecard" sectioned>
                <BlockStack gap="200">
                  <ScoreRow
                    label="Core Web Vitals"
                    value={`${dataset.scorecard.coreWebVitals}%`}
                  />
                  <ScoreRow
                    label="Click-through rate"
                    value={`${dataset.scorecard.clickThroughRate}%`}
                  />
                  <ScoreRow
                    label="Crawl success"
                    value={`${dataset.scorecard.crawlSuccessRate}%`}
                  />
                  <ScoreRow
                    label="Keyword rankings"
                    value={`${dataset.scorecard.keywordRankings}%`}
                  />
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <Card>
                <Card.Section>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text variant="headingMd" as="h2">
                        Organic traffic
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        {dataset.range.label}
                      </Text>
                    </BlockStack>
                    {trafficSummary && (
                      <InlineStack gap="200">
                        <BlockStack gap="030">
                          <Text variant="bodySm" tone="subdued" as="span">
                            Sessions
                          </Text>
                          <Text variant="headingSm" as="span">
                            {formatNumber(trafficSummary.sessions)}
                          </Text>
                        </BlockStack>
                        <BlockStack gap="030">
                          <Text variant="bodySm" tone="subdued" as="span">
                            Conversions
                          </Text>
                          <Text variant="headingSm" as="span">
                            {formatNumber(trafficSummary.conversions)}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    )}
                  </InlineStack>
                </Card.Section>
                <Card.Section>
                  {adapters.ga4.active && traffic.length ? (
                    <div style={{ width: "100%", height: 260 }}>
                      <LineChart
                        isAnimated={false}
                        data={chartSeries}
                        xAxisOptions={{
                          labelFormatter: (value) => formatDateLabel(String(value)),
                        }}
                        tooltipOptions={{
                          keyFormatter: (value) => formatDateLabel(String(value)),
                          valueFormatter: (value, { series }) =>
                            series === 0
                              ? `${formatNumber(Number(value ?? 0))} clicks`
                              : `${formatNumber(Number(value ?? 0))} impressions`,
                        }}
                      />
                    </div>
                  ) : (
                    <Text variant="bodySm" tone="subdued">
                      {adapters.ga4.toggled
                        ? "GA4 data unavailable. Check adapter status in settings."
                        : "GA4 adapter disabled for this view."}
                    </Text>
                  )}
                </Card.Section>
              </Card>
            </Layout.Section>
          </Layout>

          <Card>
            <Card.Section>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text variant="headingMd" as="h2">
                    Keyword performance
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    {keywords.length} of {keywordTotal} queries shown
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Select
                    label="Keyword intent"
                    labelHidden
                    options={[
                      { label: "All intents", value: "all" },
                      { label: "Transactional", value: "transactional" },
                      { label: "Informational", value: "informational" },
                      { label: "Navigational", value: "navigational" },
                    ]}
                    value={filters.keywordIntent}
                    onChange={(value) =>
                      updateParams({
                        keywordIntent: value === "all" ? null : value,
                      })
                    }
                  />
                  <Button
                    onClick={() => handleExport("keywords")}
                    loading={
                      exportFetcher.state !== "idle" &&
                      exportFetcher.formData?.get("intent") === "export-keywords"
                    }
                  >
                    Export CSV
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card.Section>
            <Divider borderColor="border" />
            <Card.Section>
              <form onSubmit={handleKeywordSubmit}>
                <InlineStack gap="200" blockAlign="end" wrap>
                  <Box minWidth="240px">
                    <TextField
                      label="Search keywords"
                      labelHidden
                      placeholder="Filter keywords or top pages"
                      value={keywordQuery}
                      onChange={(value) => setKeywordQuery(value)}
                    />
                  </Box>
                  <InlineStack gap="100">
                    <Button submit>Apply</Button>
                    <Button onClick={handleKeywordClear} variant="secondary">
                      Clear
                    </Button>
                  </InlineStack>
                </InlineStack>
              </form>
            </Card.Section>
            <Card.Section>
              {adapters.gsc.active && keywords.length ? (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "numeric",
                    "numeric",
                    "numeric",
                    "numeric",
                    "numeric",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "Keyword",
                    "Clicks",
                    "Impressions",
                    "CTR",
                    "Avg position",
                    "Δ position",
                    "Intent",
                    "Top page",
                  ]}
                  rows={keywords.map((row) => [
                    row.query,
                    row.clicks.toLocaleString("en-US"),
                    row.impressions.toLocaleString("en-US"),
                    formatPercentage(row.ctr, 2),
                    row.avgPosition.toFixed(1),
                    formatDelta(row.delta),
                    row.intent.replace(/^(.)/, (match) => match.toUpperCase()),
                    row.topPage ?? "—",
                  ])}
                />
              ) : (
                <Text variant="bodySm" tone="subdued">
                  {adapters.gsc.toggled
                    ? "Search Console data unavailable. Check adapter status in settings."
                    : "Search Console adapter disabled for this view."}
                </Text>
              )}
            </Card.Section>
          </Card>

          <Card>
            <Card.Section>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text variant="headingMd" as="h2">
                    Landing pages
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    {pages.length} of {pageTotal} tracked pages
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Select
                    label="Canonical status"
                    labelHidden
                    options={[
                      { label: "All", value: "all" },
                      { label: "Issue", value: "issue" },
                      { label: "Healthy", value: "ok" },
                    ]}
                    value={filters.pageStatus}
                    onChange={(value) =>
                      updateParams({ page: value === "all" ? null : value })
                    }
                  />
                  <Button
                    onClick={() => handleExport("pages")}
                    loading={
                      exportFetcher.state !== "idle" &&
                      exportFetcher.formData?.get("intent") === "export-pages"
                    }
                  >
                    Export CSV
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card.Section>
            <Divider borderColor="border" />
            <Card.Section>
              <form onSubmit={handlePageSubmit}>
                <InlineStack gap="200" blockAlign="end" wrap>
                  <Box minWidth="240px">
                    <TextField
                      label="Search pages"
                      labelHidden
                      placeholder="Filter by URL or title"
                      value={pageQuery}
                      onChange={(value) => setPageQuery(value)}
                    />
                  </Box>
                  <InlineStack gap="100">
                    <Button submit>Apply</Button>
                    <Button onClick={handlePageClear} variant="secondary">
                      Clear
                    </Button>
                  </InlineStack>
                </InlineStack>
              </form>
            </Card.Section>
            {coverageIssues.length > 0 && (
              <>
                <Divider borderColor="border-subdued" />
                <Card.Section subdued>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">
                      Coverage warnings
                    </Text>
                    <Badge tone={coverageIssues.length > 2 ? "critical" : "warning"}>
                      {coverageIssues.length} open
                    </Badge>
                  </InlineStack>
                  <BlockStack gap="050">
                    {coverageIssues.slice(0, 3).map((issue) => (
                      <Text key={`${issue.page}-${issue.issue}`} variant="bodySm">
                        {issue.issue} — {issue.page}
                      </Text>
                    ))}
                    {coverageIssues.length > 3 && (
                      <Text variant="bodySm" tone="subdued">
                        +{coverageIssues.length - 3} additional issues in Search Console
                      </Text>
                    )}
                  </BlockStack>
                </Card.Section>
              </>
            )}
            <Divider borderColor="border" />
            <Card.Section>
              {adapters.bing.active && pages.length ? (
                <DataTable
                  columnContentTypes={["text", "numeric", "numeric", "numeric", "text"]}
                  headings={[
                    "Page",
                    "Entrances",
                    "Exits",
                    "Conversion",
                    "Canonical",
                  ]}
                  rows={pages.map((row) => [
                    `${row.title} — ${row.url}`,
                    row.entrances.toLocaleString("en-US"),
                    row.exits.toLocaleString("en-US"),
                    formatPercentage(row.conversionRate, 2),
                    row.canonicalStatus === "issue"
                      ? `Issue — ${row.canonicalIssue ?? "Review canonical"}`
                      : "Healthy",
                  ])}
                />
              ) : (
                <Text variant="bodySm" tone="subdued">
                  {adapters.bing.toggled
                    ? "Bing metrics unavailable. Add credentials in settings."
                    : "Bing adapter disabled for this view."}
                </Text>
              )}
            </Card.Section>
          </Card>

          <Card>
            <Card.Section>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text variant="headingMd" as="h2">
                    Action queue
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    Prioritized follow-ups grouped by severity
                  </Text>
                </BlockStack>
                <InlineStack gap="200" blockAlign="center">
                  <Select
                    label="Action priority"
                    labelHidden
                    options={[
                      { label: "All priorities", value: "all" },
                      { label: "Now", value: "now" },
                      { label: "Soon", value: "soon" },
                      { label: "Later", value: "later" },
                    ]}
                    value={filters.actionPriority}
                    onChange={(value) =>
                      updateParams({
                        actionPriority: value === "all" ? null : value,
                      })
                    }
                  />
                  <InlineStack gap="100" blockAlign="center">
                    <Badge tone="critical">Now {actionTotals.now}</Badge>
                    <Badge tone="warning">Soon {actionTotals.soon}</Badge>
                    <Badge tone="info">Later {actionTotals.later}</Badge>
                  </InlineStack>
                </InlineStack>
              </InlineStack>
            </Card.Section>
            <Divider borderColor="border" />
            <Card.Section>
              {priorityFilterList.map((priority) => {
                const items = groupedActions[priority];
                if (!items.length) {
                  if (filters.actionPriority !== "all") {
                    return (
                      <Text key={priority} variant="bodySm" tone="subdued">
                        No actions in this bucket.
                      </Text>
                    );
                  }
                  return null;
                }

                return (
                  <BlockStack key={priority} gap="200">
                    <Text variant="headingSm" as="h3">
                      {priority === "now"
                        ? "Now"
                        : priority === "soon"
                          ? "Soon"
                          : "Later"}
                    </Text>
                    <BlockStack gap="200">
                      {items.map((action) => (
                        <Box
                          key={action.id}
                          padding="200"
                          background="bg-surface-secondary"
                          borderRadius="200"
                        >
                          <BlockStack gap="150">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="050">
                                <Text variant="headingSm" as="h4">
                                  {action.title}
                                </Text>
                                <Text variant="bodySm" tone="subdued" as="span">
                                  {action.description}
                                </Text>
                              </BlockStack>
                              <Badge tone={ACTION_STATUS_TONE[action.status]}>
                                {ACTION_STATUS_LABEL[action.status]}
                              </Badge>
                            </InlineStack>
                          </BlockStack>
                          <Divider borderColor="border-subdued" />
                          <InlineStack gap="200" wrap blockAlign="center">
                            <Select
                              label="Status"
                              labelHidden
                              options={[
                                { label: "Not started", value: "not_started" },
                                { label: "In progress", value: "in_progress" },
                                { label: "Done", value: "done" },
                              ]}
                              value={action.status}
                              onChange={(value) =>
                                handleStatusChange(action.id, value as SeoAction["status"])
                              }
                            />
                            <Select
                              label="Owner"
                              labelHidden
                              options={assignmentOptions}
                              value={action.assignedTo}
                              onChange={(value) => handleAssignmentChange(action.id, value)}
                            />
                            <Badge tone="info">
                              {action.metricLabel}: {action.metricValue}
                            </Badge>
                            {action.dueAt && (
                              <Text variant="bodySm" tone="subdued" as="span">
                                Due {new Date(action.dueAt).toLocaleDateString()}
                              </Text>
                            )}
                          </InlineStack>
                          <Text variant="bodySm" tone="subdued" as="span">
                            Updated {new Date(action.lastUpdatedAt).toLocaleDateString()}
                          </Text>
                        </Box>
                      ))}
                    </BlockStack>
                  </BlockStack>
                );
              })}

              {!filteredActions.length && (
                <Text variant="bodySm" tone="subdued">
                  No SEO actions match the selected filters.
                </Text>
              )}
            </Card.Section>
          </Card>

          <Card title="MCP keyword opportunities" sectioned>
            <BlockStack gap="200">
              {mcp.opportunities.map((opportunity) => (
                <Box
                  key={opportunity.handle}
                  background="bg-subdued"
                  padding="200"
                  borderRadius="200"
                >
                  <BlockStack gap="150">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text variant="bodyMd" as="span">
                          {opportunity.handle}
                        </Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                          {opportunity.notes ??
                            "Prioritize optimization to unlock incremental traffic."}
                        </Text>
                      </BlockStack>
                      <Badge tone="info">
                        Impact +{opportunity.projectedImpact.toFixed(1)}%
                      </Badge>
                    </InlineStack>
                    {opportunity.keywordCluster.length > 0 && (
                      <InlineStack gap="150" wrap>
                        {opportunity.keywordCluster.map((keyword) => (
                          <Badge key={keyword} tone="subdued">
                            {keyword}
                          </Badge>
                        ))}
                      </InlineStack>
                    )}
                  </BlockStack>
                </Box>
              ))}
              {mcp.opportunities.length === 0 && (
                <Text variant="bodySm" tone="subdued" as="p">
                  {mcp.enabled
                    ? "No MCP SEO opportunities available yet. Check again after the next crawl."
                    : "Enable the MCP integration in Settings to populate keyword opportunities."}
                </Text>
              )}
              {mcp.generatedAt && (
                <Text variant="bodySm" tone="subdued" as="p">
                  Last updated {new Date(mcp.generatedAt).toLocaleString()} • {mcp.source ?? "mock"}
                </Text>
              )}
              {mcp.usingMocks && (
                <Text variant="bodySm" tone="subdued" as="p">
                  Showing mock MCP data while `USE_MOCK_DATA` is enabled.
                </Text>
              )}
            </BlockStack>
          </Card>

          <Card title="Insights" sectioned>
            <BlockStack gap="300">
              {dataset.insights.map((insight) => (
                <BlockStack key={insight.id} gap="150">
                  <InlineStack align="space-between" blockAlign="start">
                    <InlineStack gap="100" blockAlign="center">
                      <Badge tone={severityTone(insight.severity)}>{insight.severity}</Badge>
                      <Text variant="headingSm" as="h3">
                        {insight.title}
                      </Text>
                    </InlineStack>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {insight.source.toUpperCase()} • {new Date(insight.detectedAt).toLocaleDateString()}
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    {insight.description}
                  </Text>
                  <InlineStack gap="200">
                    <Badge tone="info">
                      {insight.metricLabel}: {insight.metricValue}
                    </Badge>
                    {insight.delta && (
                      <Text variant="bodySm" tone="subdued" as="span">
                        Δ {insight.delta}
                      </Text>
                    )}
                    {insight.url && (
                      <a href={insight.url} target="_blank" rel="noreferrer">
                        View page
                      </a>
                    )}
                  </InlineStack>
                </BlockStack>
              ))}
              {!dataset.insights.length && (
                <Text variant="bodySm" tone="subdued" as="p">
                  No active insights. Connect GA4/GSC/Bing in Settings to populate this view.
                </Text>
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    </PolarisVizProvider>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <InlineStack align="space-between" blockAlign="center">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </InlineStack>
  );
}
