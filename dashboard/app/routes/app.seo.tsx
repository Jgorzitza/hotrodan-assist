import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type { MockScenario, SeoDataset } from "~/types/dashboard";

type LoaderData = {
  dataset: SeoDataset;
  scenario: MockScenario;
  useMockData: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const dataset = getSeoScenario({ scenario });

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
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
  const { dataset, scenario, useMockData } = useLoaderData<typeof loader>();

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
