import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import {
  getMcpSeoOpportunities,
  isMcpFeatureEnabled,
  shouldUseMcpMocks,
  type SeoOpportunity,
} from "~/lib/mcp";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type { MockScenario, SeoDataset } from "~/types/dashboard";

type LoaderData = {
  dataset: SeoDataset;
  scenario: MockScenario;
  useMockData: boolean;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    opportunities: SeoOpportunity[];
    source?: string;
    generatedAt?: string;
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
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

  const dataset = getSeoScenario({ scenario });

  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let opportunities: SeoOpportunity[] = [];
  let mcpSource: string | undefined;
  let mcpGeneratedAt: string | undefined;

  if (shouldHydrateMcp) {
    const response = await getMcpSeoOpportunities(
      {
        shopDomain,
        params: { limit: 5 },
      },
      toggles,
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
  const { dataset, scenario, useMockData, mcp } =
    useLoaderData<typeof loader>();

  return (
    <Page
      title="SEO insights"
      subtitle="Review health scores, keyword opportunities, and technical issues."
    >
      <TitleBar title="SEO" primaryAction={{ content: "Export report", url: "#" }} />
      <BlockStack gap="500">
        {(dataset.alert || dataset.error || useMockData) && (
          <BlockStack gap="200">
            {useMockData && (
              <Banner tone={scenario === "warning" ? "warning" : "info"} title={`Mock state: ${scenario}`}>
                <p>Adjust `mockState` in the query string to explore alternative UI states.</p>
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

        <Layout>
          <Layout.Section oneThird>
            <Card title="Scorecard" sectioned>
              <BlockStack gap="200">
                <ScoreRow label="Core Web Vitals" value={`${dataset.scorecard.coreWebVitals}%`} />
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
                      <Text variant="bodySm" tone="subdued" as="span">
                        Δ {insight.delta}
                      </Text>
                      <a href={insight.url} target="_blank" rel="noreferrer">
                        View page
                      </a>
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
          </Layout.Section>
        </Layout>

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
                        {opportunity.notes ?? "Prioritize optimization to unlock incremental traffic."}
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
      </BlockStack>
    </Page>
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
