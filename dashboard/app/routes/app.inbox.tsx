import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  ResourceList,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getInboxData } from "../mocks";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const data = await getInboxData();

  return json(data);
};

export default function InboxRoute() {
  const { metrics, conversations } = useLoaderData<typeof loader>();

  return (
    <Page title="Inbox">
      <TitleBar title="Inbox" primaryAction={{ content: "New message", url: "#" }} />
      <Layout>
        <Layout.Section oneThird>
          <Card title="Metrics" sectioned>
            <BlockStack gap="200">
              <MetricRow label="Outstanding" value={metrics.outstanding} tone="critical" />
              <MetricRow label="Overdue >12h" value={metrics.overdue} tone={metrics.overdue > 0 ? "warning" : "success"} />
              <MetricRow label="Closed today" value={metrics.closedToday} />
              <MetricRow label="Approvals pending" value={metrics.approvalsPending} />
              <MetricRow label="Idea candidates" value={metrics.ideaCandidates} />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: "conversation", plural: "conversations" }}
              items={conversations}
              renderItem={({ id, channel, customer, subject, status, receivedAt, sentiment }) => {
                const shortcut = channel === "email" ? "Email" : channel === "instagram" ? "Instagram" : "Shopify";
                return (
                  <ResourceList.Item id={id} accessibilityLabel={`View ${subject}`}>
                    <BlockStack gap="050">
                      <InlineStack align="space-between">
                        <Text variant="headingSm" as="h3">
                          {subject}
                        </Text>
                        <Badge tone={status === "open" ? "attention" : status === "pending" ? "warning" : "success"}>
                          {status}
                        </Badge>
                      </InlineStack>
                      <InlineStack gap="200" align="space-between">
                        <Text as="span" variant="bodySm" tone="subdued">
                          {customer} • {shortcut}
                        </Text>
                        <InlineStack gap="100">
                          <Badge tone={sentimentTone(sentiment)}>{sentiment}</Badge>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {receivedAt}
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    </BlockStack>
                  </ResourceList.Item>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical" | "warning" | "success" | "info";
}) {
  return (
    <InlineStack align="space-between" blockAlign="center">
      <Text variant="bodyMd" as="span">
        {label}
      </Text>
      <Badge tone={tone}>{value}</Badge>
    </InlineStack>
  );
}

const sentimentTone = (sentiment: "positive" | "neutral" | "negative") => {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "critical";
  return "attention";
};
