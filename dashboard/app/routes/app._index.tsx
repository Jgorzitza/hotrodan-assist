import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
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

import { authenticate } from "../shopify.server";
import { scenarioFromRequest } from "~/mocks";
import { getDashboardOverview, type DashboardOverview } from "~/mocks/dashboard";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type { MockScenario } from "~/types/dashboard";

const RANGE_OPTIONS = ["today", "7d", "28d", "90d"] as const;

type LoaderData = {
  data: DashboardOverview;
  useMockData: boolean;
  scenario: MockScenario;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "28d";
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const data = await getDashboardOverview(range, scenario);

  return json<LoaderData>(
    { data, useMockData: USE_MOCK_DATA, scenario },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export default function DashboardRoute() {
  const { data, useMockData, scenario } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeRange = searchParams.get("range") ?? data.range ?? "28d";

  const handleRangeSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
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
              <ButtonGroup>
                {RANGE_OPTIONS.map((option) => (
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
            <Text as="p" variant="bodySm" tone="subdued">
              Sparkline placeholder (hook up Polaris Viz once data layer lands)
            </Text>
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
                      <Button url={bucket.href} accessibilityLabel={`View ${bucket.label}`}>
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
                <Button url="/app/inbox" tone="primary" variant="plain">
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
              <Button url="/app/inventory" accessibilityLabel="View inventory planner">
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
                <Button url="/app/seo" variant="plain">
                  Dive into SEO
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section secondary>
            <Card title="MCP insight" sectioned>
              <Text as="p" variant="bodyMd">
                {data.mcpRecommendation}
              </Text>
              <Button url="/app/settings" variant="plain">
                Manage MCP toggles
              </Button>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
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
