import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useRef } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
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
  Text,
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
  withDashboardRangeParam,
} from "~/lib/date-range";
import { scenarioFromRequest } from "~/mocks";
import { getDashboardOverview, type DashboardOverview } from "~/mocks/dashboard";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type { DashboardRangeKey, MockScenario } from "~/types/dashboard";

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
  useMockData: boolean;
  scenario: MockScenario;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    source?: string;
    generatedAt?: string;
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
  const { data, useMockData, scenario, mcp } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const salesPrefetcher = useFetcher();
  const prefetchedSalesHref = useRef<string | null>(null);

  const activeRange = resolveDashboardRangeKey(
    searchParams.get("range"),
    data.range ?? DEFAULT_DASHBOARD_RANGE,
  );

  const salesHref = (() => {
    const base = withDashboardRangeParam("/app/sales", activeRange);
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
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  const sparklineData: DataPoint[] = data.sparkline.map((value, index) => ({
    key: index,
    value,
  }));

  const rangeLabel = data.rangeLabel ?? DASHBOARD_RANGE_PRESETS[activeRange].label;

  return (
    <PolarisVizProvider>
      <Page>
        <TitleBar
          title="Operations dashboard"
          primaryAction={{ content: "Settings", url: "/app/settings" }}
        />
        <BlockStack gap="500">
          {useMockData && (
            <Banner
              title={`Mock data scenario: ${scenario}`}
              tone={scenario === "warning" ? "warning" : "info"}
            >
              <p>
                Change the `mockState` query parameter (base, empty, warning, error)
                to preview different UI permutations.
              </p>
            </Banner>
          )}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  Sales overview
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Button
                    variant="plain"
                    url={salesHref}
                    onMouseEnter={handleSalesPrefetch}
                    onFocus={handleSalesPrefetch}
                    onTouchStart={handleSalesPrefetch}
                  >
                    View sales
                  </Button>
                  <ButtonGroup segmented>
                    {HOME_RANGE_KEYS.map((option) => (
                      <Button
                        key={option}
                        pressed={activeRange === option}
                        onClick={() => handleRangeSelect(option)}
                      >
                        {option.toUpperCase()}
                      </Button>
                    ))}
                  </ButtonGroup>
                </InlineStack>
              </InlineStack>
              <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="300">
                {data.metrics.map((metric) => (
                  <Card key={metric.id} sectioned>
                    <BlockStack gap="100">
                      <Text as="span" variant="bodySm" tone="subdued">
                        {metric.label}
                      </Text>
                      <Text as="p" variant="headingLg">
                        {metric.value}
                      </Text>
                      <Badge tone={metric.delta >= 0 ? "success" : "critical"}>
                        {formatDelta(metric.delta)} {metric.deltaPeriod}
                      </Badge>
                    </BlockStack>
                  </Card>
                ))}
              </InlineGrid>
              <SalesSparkline
                points={sparklineData}
                rangeLabel={rangeLabel}
              />
            </BlockStack>
          </Card>

          <Layout>
            <Layout.Section oneHalf>
              <Card title="Orders attention" sectioned>
                <BlockStack gap="300">
                  {data.orders.map((bucket) => (
                    <InlineStack
                      key={bucket.id}
                      align="space-between"
                      blockAlign="center"
                    >
                      <BlockStack gap="050">
                        <Text as="p" variant="headingMd">
                          {bucket.label}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {bucket.description}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" variant="headingMd">
                          {bucket.count}
                        </Text>
                        <Button
                          url={withDashboardRangeParam(bucket.href, activeRange)}
                          accessibilityLabel={`View ${bucket.label}`}
                        >
                          Open
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section secondary>
              <Card title="Inbox" sectioned>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">
                      Outstanding
                    </Text>
                    <Text variant="headingMd" as="span">
                      {data.inbox.outstanding}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">
                      Overdue &gt;12h
                    </Text>
                    <Text variant="headingMd" as="span">
                      {data.inbox.overdueHours}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="span">
                      Approvals pending
                    </Text>
                    <Text variant="headingMd" as="span">
                      {data.inbox.approvalsPending}
                    </Text>
                  </InlineStack>
                  <Button
                    url={withDashboardRangeParam("/app/inbox", activeRange)}
                    tone="primary"
                    variant="plain"
                  >
                    Go to inbox
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          <Layout>
            <Layout.Section>
              <Card title="Inventory snapshot" sectioned>
                <InlineStack gap="400">
                  <MetricTile label="Low stock" value={data.inventory.lowStock} />
                  <MetricTile
                    label="POs in flight"
                    value={data.inventory.purchaseOrdersInFlight}
                  />
                  <MetricTile label="Overstock" value={data.inventory.overstock} />
                </InlineStack>
                <Button
                  url={withDashboardRangeParam("/app/inventory", activeRange)}
                  accessibilityLabel="View inventory planner"
                >
                  Open inventory planner
                </Button>
              </Card>
            </Layout.Section>
          </Layout>

          <Layout>
            <Layout.Section oneHalf>
              <Card title="SEO highlights" sectioned>
                <BlockStack gap="200">
                  <Text as="span" variant="bodyMd">
                    Traffic Δ
                  </Text>
                  <Badge tone="success">+{data.seo.trafficDelta}%</Badge>
                  <Text as="p" variant="bodySm">
                    {data.seo.summary}
                  </Text>
                  <InlineStack gap="300">
                    <Text variant="bodyMd" as="span">
                      Rising queries
                    </Text>
                    <Text variant="headingMd" as="span">
                      {data.seo.risingQueries}
                    </Text>
                  </InlineStack>
                  <InlineStack gap="300">
                    <Text variant="bodyMd" as="span">
                      Critical issues
                    </Text>
                    <Text variant="headingMd" tone="critical" as="span">
                      {data.seo.criticalIssues}
                    </Text>
                  </InlineStack>
                  <Button url={withDashboardRangeParam("/app/seo", activeRange)} variant="plain">
                    Dive into SEO
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section secondary>
              <Card title="MCP insight" sectioned>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    {data.mcpRecommendation}
                  </Text>
                  {!mcp.enabled && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Configure credentials and enable the MCP toggle in Settings to load live data.
                    </Text>
                  )}
                  {mcp.usingMocks && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Showing mock data while `USE_MOCK_DATA` is enabled.
                    </Text>
                  )}
                  {mcp.generatedAt && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Last updated {new Date(mcp.generatedAt).toLocaleString()} • {mcp.source ?? "mock"}
                    </Text>
                  )}
                  <Button url={withDashboardRangeParam("/app/settings", activeRange)} variant="plain">
                    Manage MCP toggles
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>
    </PolarisVizProvider>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
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
    <div style={{ width: "100%", height: 160 }}>
      <SparkLineChart
        accessibilityLabel={`Sales trend for the selected range ${rangeLabel}`}
        data={dataset}
        isAnimated={false}
      />
    </div>
  );
}
