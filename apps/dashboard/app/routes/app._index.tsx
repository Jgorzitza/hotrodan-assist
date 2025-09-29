import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useRef } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Text,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { PolarisVizProvider, SparkLineChart } from "@shopify/polaris-viz";
import type { DataPoint } from "@shopify/polaris-viz-core";

import { authenticate } from "../shopify.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import {
  getMcpProductRecommendations,
  isMcpFeatureEnabled,
  shouldUseMcpMocks,
} from "~/lib/mcp";
import type { McpClientOverrides } from "~/lib/mcp/config.server";
import { getMcpClientOverridesForShop } from "~/lib/mcp/config.server";
import {
  DASHBOARD_RANGE_KEY_LIST,
  DASHBOARD_RANGE_PRESETS,
  DEFAULT_DASHBOARD_RANGE,
  resolveDashboardRangeKey,
  resolveCompareRangeKey,
  withDashboardRangeParam,
} from "~/lib/date-range";
import { scenarioFromRequest } from "~/mocks";
import { getDashboardOverview, type DashboardOverview } from "~/mocks/dashboard";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type { DashboardRangeKey, MockScenario } from "~/types/dashboard";
import { DashboardProvider } from "~/lib/dashboard-context";
import { EnhancedMetricCard, EnhancedMetricCardSkeleton } from "~/components/EnhancedMetricCard";
import { generateEnhancedMetrics, calculateMetricInsights } from "~/lib/enhanced-metrics";
import { CohortAnalysis } from "~/components/CohortAnalysis";
import { DashboardPresetManager } from "~/components/DashboardPresetManager";
import { generateCohortData, calculateCohortInsights } from "~/lib/cohort-analysis";
import { DrillDownNavigation, DrillDownButton } from "~/components/DrillDownNavigation";

const HOME_RANGE_KEYS: Array<Exclude<DashboardRangeKey, "14d">> = DASHBOARD_RANGE_KEY_LIST.filter(
  (key): key is Exclude<DashboardRangeKey, "14d"> => key !== "14d",
);

const SALES_PERIOD_BY_RANGE: Record<DashboardRangeKey, string> = {
  today: "7d",
  "7d": "7d",
  "14d": "14d",
  "28d": "28d",
  "90d": "90d",
};

type LoaderData = {
  data: DashboardOverview;
  enhancedMetrics: EnhancedMetricData[];
  metricInsights: {
    bestPerformer: EnhancedMetricData;
    worstPerformer: EnhancedMetricData;
    overallTrend: "positive" | "negative" | "neutral";
  };
  cohortData: CohortData[];
  cohortInsights: {
    averageRetention: number;
    bestCohort: CohortData;
    worstCohort: CohortData;
    retentionTrend: "improving" | "declining" | "stable";
  };
  useMockData: boolean;
  scenario: MockScenario;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    source?: string;
    generatedAt?: string;
  };
};
  useMockData: boolean;
  scenario: MockScenario;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    source?: string;
    generatedAt?: string;
  };
};
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
// Helper function to get dashboard data with real analytics

  const url = new URL(request.url);
  const range = resolveDashboardRangeKey(url.searchParams.get("range"), DEFAULT_DASHBOARD_RANGE);
  const scenario = scenarioFromRequest(request);
  let shopDomain = BASE_SHOP_DOMAIN;

  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);

  const data = await getDashboardOverview(range, scenario);
 
  const enhancedMetrics = generateEnhancedMetrics(range);
  const cohortData = generateCohortData(6);
  const cohortInsights = calculateCohortInsights(cohortData);
  const metricInsights = calculateMetricInsights(enhancedMetrics);

  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let mcpSource: string | undefined;
  let mcpGeneratedAt: string | undefined;
  let mcpOverrides: McpClientOverrides | undefined;

  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }

    const response = await getMcpProductRecommendations(
      {
        shopDomain,
        params: { limit: 3, range },
      },
      toggles,
      mcpOverrides,
    );

    const topRecommendation = response.data.at(0);
    if (topRecommendation) {
      data.mcpRecommendation = `${topRecommendation.title}: ${topRecommendation.rationale}`;
    }
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  } else {
    data.mcpRecommendation =
      "Enable the MCP integration in Settings to populate storefront insights.";
  }

  return json<LoaderData>(
    {
      data,
      enhancedMetrics,
      metricInsights,
      cohortData,
      cohortInsights,
      useMockData: USE_MOCK_DATA,
      scenario,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
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

export default function DashboardRoute() {
  const { data, enhancedMetrics, metricInsights, cohortData, cohortInsights, useMockData, scenario, mcp } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const salesPrefetcher = useFetcher();
  const prefetchedSalesHref = useRef<string | null>(null);

  const activeRange = resolveDashboardRangeKey(
 
  const activeCompare = resolveCompareRangeKey(searchParams.get("compare"));
    searchParams.get("range"),
 
  const activeCompare = resolveCompareRangeKey(searchParams.get("compare"));
    data.range ?? DEFAULT_DASHBOARD_RANGE,
 
  const activeCompare = resolveCompareRangeKey(searchParams.get("compare"));
  );
 
  const activeCompare = resolveCompareRangeKey(searchParams.get("compare"));

  const navigationLocation = navigation.location;
  const isHomeNavigation = navigation.state !== "idle" && navigationLocation?.pathname === "/app";
  const showSkeleton = isHomeNavigation;

  const sharedLinkOptions = { searchParams };

  const salesHref = (() => {
    const base = withDashboardRangeParam("/app/sales", activeRange, sharedLinkOptions);
    const url = new URL(base, "https://dashboard.internal");
    url.searchParams.set("period", SALES_PERIOD_BY_RANGE[activeRange] ?? "28d");
    return `${url.pathname}${url.search}${url.hash}`;
  })();

  const handleSalesPrefetch = () => {
    if (!salesHref || prefetchedSalesHref.current === salesHref) {
      return;
    }
    prefetchedSalesHref.current = salesHref;
    salesPrefetcher.load(salesHref);
  };

  const handleRangeSelect = (value: DashboardRangeKey) => {
 
  const handleCompareSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("compare");
    } else {
      params.set("compare", value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const compareOptions = [
    { label: "No compare", value: "none" },
    ...DASHBOARD_RANGE_KEY_LIST.map((key) => ({ label: `Compare ${key.toUpperCase()}`, value: key })),
  ];
    const params = new URLSearchParams(searchParams);
 
  const handleCompareSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("compare");
    } else {
      params.set("compare", value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const compareOptions = [
    { label: "No compare", value: "none" },
    ...DASHBOARD_RANGE_KEY_LIST.map((key) => ({ label: `Compare ${key.toUpperCase()}`, value: key })),
  ];
    params.set("range", value);
 
  const handleCompareSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("compare");
    } else {
      params.set("compare", value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const compareOptions = [
    { label: "No compare", value: "none" },
    ...DASHBOARD_RANGE_KEY_LIST.map((key) => ({ label: `Compare ${key.toUpperCase()}`, value: key })),
  ];
    navigate(`?${params.toString()}`, { replace: true });
 
  const handleCompareSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("compare");
    } else {
      params.set("compare", value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const compareOptions = [
    { label: "No compare", value: "none" },
    ...DASHBOARD_RANGE_KEY_LIST.map((key) => ({ label: `Compare ${key.toUpperCase()}`, value: key })),
  ];
  };
 
  const handleCompareSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("compare");
    } else {
      params.set("compare", value);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const compareOptions = [
    { label: "No compare", value: "none" },
    ...DASHBOARD_RANGE_KEY_LIST.map((key) => ({ label: `Compare ${key.toUpperCase()}`, value: key })),
  ];

  const sparklineData: DataPoint[] = data.sparkline.map((value, index) => ({
    key: index,
    value,
  }));

  const rangeLabel = data.rangeLabel ?? DASHBOARD_RANGE_PRESETS[activeRange].label;

  const metricCount = data.metrics.length || 4;
  const metricsContent = showSkeleton
    ? Array.from({ length: 5 }, (_, index) => (
        <EnhancedMetricCardSkeleton key={`enhanced-metric-skeleton-${index}`} />
      ))
    : enhancedMetrics.map((metric) => (
        <EnhancedMetricCard
          key={metric.id}
          metric={metric}
          onClick={() => {
            // Add drill-down functionality here
            console.log(`Drilling down to ${metric.id} details`);
          }}
        />
      ));
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <DashboardProvider>
    <BlockStack gap="050">
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </BlockStack>
  );
}

function MetricTileSkeleton() {
  return (
    <DashboardProvider>
    <BlockStack gap="050">
      <SkeletonBodyText lines={1} />
      <SkeletonDisplayText size="small" />
    </BlockStack>
  );
}

function OrderBucketSkeleton() {
  return (
    <DashboardProvider>
    <InlineStack align="space-between" blockAlign="center" gap="200">
      <div style={{ flex: 1 }}>
        <BlockStack gap="050">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={1} />
        </BlockStack>
      </div>
      <InlineStack gap="200" blockAlign="center">
        <SkeletonDisplayText size="small" />
        <SkeletonDisplayText size="small" />
      </InlineStack>
    </InlineStack>
  );
}

function InlineStatSkeleton() {
  return (
    <DashboardProvider>
    <InlineStack align="space-between" blockAlign="center" gap="200">
      <div style={{ flex: 1 }}>
        <SkeletonBodyText lines={1} />
      </div>
      <SkeletonDisplayText size="small" />
    </InlineStack>
  );
}

function InboxSnapshotSkeleton() {
  return (
    <DashboardProvider>
    <BlockStack gap="200">
      <InlineStatSkeleton />
      <InlineStatSkeleton />
      <InlineStatSkeleton />
      <SkeletonDisplayText size="small" />
    </BlockStack>
  );
}

function SeoHighlightsSkeleton() {
  return (
    <DashboardProvider>
    <BlockStack gap="200">
      <SkeletonBodyText lines={1} />
      <SkeletonDisplayText size="small" />
      <SkeletonBodyText lines={2} />
      <InlineStatSkeleton />
      <InlineStatSkeleton />
      <InlineStatSkeleton />
      <SkeletonDisplayText size="small" />
    </BlockStack>
  );
}

function McpInsightSkeleton() {
  return (
    <DashboardProvider>
    <BlockStack gap="200">
      <SkeletonBodyText lines={2} />
      <SkeletonBodyText lines={1} />
      <SkeletonBodyText lines={1} />
      <SkeletonDisplayText size="small" />
    </BlockStack>
  );
}

const formatDelta = (delta: number) =>
  `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;

function SalesSparkline({
  points,
  rangeLabel,
}: {
  points: DataPoint[];
  rangeLabel: string;
}) {
  if (!points.length) {
    return (
    <DashboardProvider>
      <Text as="p" variant="bodySm" tone="subdued">
        Sales trend data unavailable.
      </Text>
    );
  }

  const dataset = [{
    name: "Sales",
    data: points,
  }];

  return (
    <DashboardProvider>
    <div style={{ width: "100%", height: 160 }}>
      <SparkLineChart
        accessibilityLabel={`Sales trend for the selected range ${rangeLabel}`}
        data={dataset}
        isAnimated={false}
      />
    </div>
  );
}

function SalesSparklineSkeleton() {
  return (
    <DashboardProvider>
    <div
      style={{
        width: "100%",
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SkeletonThumbnail size="extraLarge" />
    </div>
  );
}
