import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getSeoOverview } from "../mocks";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const data = await getSeoOverview();

  return json(data);
};

export default function SeoRoute() {
  const { actions, keywords } = useLoaderData<typeof loader>();

  return (
    <Page title="SEO">
      <TitleBar title="SEO" primaryAction={{ content: "Export CSV", url: "#" }} />
      <Layout>
        <Layout.Section oneThird>
          <Card title="Action list" sectioned>
            <BlockStack gap="200">
              {actions.map((action) => (
                <BlockStack key={action.id} gap="050">
                  <Badge
                    tone={
                      action.severity === "Now"
                        ? "critical"
                        : action.severity === "Soon"
                        ? "warning"
                        : "info"
                    }
                  >
                    {action.severity}
                  </Badge>
                  <Text variant="headingSm" as="h3">
                    {action.title}
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    {action.summary}
                  </Text>
                </BlockStack>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card title="Keyword movements" sectioned>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
              headings={["Keyword", "Clicks", "CTR", "Position", "Δ"]}
              rows={keywords.map((row) => [
                row.keyword,
                row.clicks,
                `${row.ctr.toFixed(1)}%`,
                row.position.toFixed(1),
                formatDelta(row.delta),
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

const formatDelta = (delta: number) => `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
