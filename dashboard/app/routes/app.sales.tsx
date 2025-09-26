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
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  DataTable,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getSalesScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type {
  MockScenario,
  SalesDataset,
  SalesGranularity,
} from "~/types/dashboard";

const GRANULARITY_OPTIONS: Array<{ label: string; value: SalesGranularity }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const RANGE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

const DEFAULT_DAYS = 30;

type LoaderData = {
  dataset: SalesDataset;
  scenario: MockScenario;
  useMockData: boolean;
  granularity: SalesGranularity;
  days: number;
};

const clampDays = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_DAYS;
  return Math.min(Math.max(Math.round(value), 7), 365);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const granularity = (url.searchParams.get("granularity") as SalesGranularity) ?? "daily";
  const days = clampDays(Number(url.searchParams.get("days") ?? DEFAULT_DAYS));
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const dataset = getSalesScenario({ scenario, granularity, days });

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA, granularity, days },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

const formatPercent = (value: number, fractionDigits = 1) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(value),
  );

export default function SalesRoute() {
  const { dataset, scenario, useMockData, granularity, days } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleGranularityChange = (value: SalesGranularity) => {
    const params = new URLSearchParams(searchParams);
    params.set("granularity", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("days", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
    <Page
      title="Sales analytics"
      subtitle="Inspect revenue trends, channel performance, and forecast variance."
    >
      <TitleBar title="Sales" primaryAction={{ content: "Export CSV", url: "#" }} />
      <BlockStack gap="500">
        {(dataset.alert || dataset.error || useMockData) && (
          <BlockStack gap="200">
            {useMockData && (
              <Banner
                title={`Mock data scenario: ${scenario}`}
                tone={scenario === "warning" ? "warning" : "info"}
              >
                <p>
                  Adjust the `mockState` query parameter to preview alternate data states.
                </p>
              </Banner>
            )}
            {dataset.alert && !dataset.error && (
              <Banner tone="warning" title="Attention required">
                <p>{dataset.alert}</p>
              </Banner>
            )}
            {dataset.error && (
              <Banner tone="critical" title="Sales data unavailable">
                <p>{dataset.error}</p>
              </Banner>
            )}
          </BlockStack>
        )}

        <Card>
          <Card.Header
            title="Revenue summary"
            actions={[
              {
                content: "Refresh",
                onAction: () => navigate(0),
              },
            ]}
          />
          <Card.Section>
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200">
                <Select
                  labelHidden
                  label="Granularity"
                  options={GRANULARITY_OPTIONS}
                  value={granularity}
                  onChange={(value) => handleGranularityChange(value as SalesGranularity)}
                />
                <Select
                  labelHidden
                  label="Date range"
                  options={RANGE_OPTIONS}
                  value={String(days)}
                  onChange={handleRangeChange}
                />
              </InlineStack>
              <Badge tone={dataset.forecast ? "attention" : "info"}>
                {dataset.range.label}
              </Badge>
            </InlineStack>
          </Card.Section>
          <Card.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="300">
              <MetricTile
                label="Current revenue"
                value={dataset.totals.currentTotal.formatted}
                delta={formatPercent(dataset.totals.deltaPercentage)}
              />
              <MetricTile
                label="Previous period"
                value={dataset.totals.previousTotal.formatted}
                delta="Benchmark"
              />
              <MetricTile
                label="Average order value"
                value={dataset.totals.averageOrderValue.formatted}
                delta={`Conversion ${dataset.totals.conversionRate.toFixed(2)}%`}
              />
              <MetricTile
                label="Forecast variance"
                value={dataset.forecast?.projectedTotal.formatted ?? dataset.totals.currentTotal.formatted}
                delta={
                  dataset.forecast
                    ? `${formatPercent(dataset.forecast.variancePercentage)} ${dataset.forecast.varianceLabel.replace("_", " ")}`
                    : "On track"
                }
              />
            </InlineGrid>
          </Card.Section>
        </Card>

        <Layout>
          <Layout.Section>
            <Card title="Revenue trend" sectioned>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric"]}
                headings={["Date", "GMV", "Orders"]}
                rows={dataset.trend.map((bucket) => [
                  formatDate(bucket.date),
                  bucket.total.formatted,
                  bucket.orders.toLocaleString("en-US"),
                ])}
              />
            </Card>
          </Layout.Section>
          <Layout.Section secondary>
            <Card title="Channel breakdown" sectioned>
              <BlockStack gap="300">
                {dataset.channelBreakdown.map((channel) => (
                  <InlineStack
                    key={channel.channel}
                    align="space-between"
                    blockAlign="center"
                  >
                    <BlockStack gap="050">
                      <Text as="span" variant="bodyMd">
                        {channel.channel}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {formatPercent(channel.percentage, 1)} of revenue
                      </Text>
                    </BlockStack>
                    <Text variant="headingMd" as="span">
                      {channel.total.formatted}
                    </Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function MetricTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <Card background="bg-surface-secondary">
      <Card.Section>
        <BlockStack gap="050">
          <Text as="span" variant="bodySm" tone="subdued">
            {label}
          </Text>
          <Text as="p" variant="headingLg">
            {value}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {delta}
          </Text>
        </BlockStack>
      </Card.Section>
    </Card>
  );
}
