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
  InlineStack,
  Layout,
  Page,
  ResourceList,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getInboxScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type {
  InboxDataset,
  InboxTicket,
  MockScenario,
} from "~/types/dashboard";

const FILTER_OPTIONS: Array<{ label: string; value: InboxDataset["filter"] }> = [
  { label: "All", value: "all" },
  { label: "Unassigned", value: "unassigned" },
  { label: "Priority", value: "priority" },
  { label: "Overdue", value: "overdue" },
];

type LoaderData = {
  dataset: InboxDataset;
  scenario: MockScenario;
  useMockData: boolean;
};

const clampPageSize = (value: number) => {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.round(value), 5), 50);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") as InboxDataset["filter"]) ?? "all";
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    await authenticate.admin(request);
  }

  const dataset = getInboxScenario({ scenario, filter, pageSize });

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

const sentimentTone = (sentiment: InboxTicket["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return "success" as const;
    case "negative":
      return "critical" as const;
    default:
      return "attention" as const;
  }
};

const priorityTone = (priority: InboxTicket["priority"]) => {
  switch (priority) {
    case "urgent":
      return "critical" as const;
    case "high":
      return "warning" as const;
    case "medium":
      return "attention" as const;
    default:
      return "new" as const;
  }
};

const formatTimeAgo = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(Math.round(diffMs / (1000 * 60 * 60)), 0);
  if (diffHours < 1) return "just now";
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function InboxRoute() {
  const { dataset, scenario, useMockData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const metrics = buildMetrics(dataset);

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("filter", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
    <Page
      title="Inbox"
      subtitle="Monitor conversations, approvals, and SLA breaches across channels."
    >
      <TitleBar title="Inbox" primaryAction={{ content: "New message", url: "#" }} />
      <Layout>
        <Layout.Section oneThird>
          <BlockStack gap="300">
            {(dataset.alert || dataset.error || useMockData) && (
              <BlockStack gap="200">
                {useMockData && (
                  <Banner
                    tone={scenario === "warning" ? "warning" : "info"}
                    title={`Mock state: ${scenario}`}
                  >
                    <p>Adjust `mockState` in the query string to test UI permutations.</p>
                  </Banner>
                )}
                {dataset.alert && !dataset.error && (
                  <Banner tone="warning" title="Inbox alert">
                    <p>{dataset.alert}</p>
                  </Banner>
                )}
                {dataset.error && (
                  <Banner tone="critical" title="Inbox unavailable">
                    <p>{dataset.error}</p>
                  </Banner>
                )}
              </BlockStack>
            )}

            <Card title="Tickets overview" sectioned>
              <BlockStack gap="200">
                <MetricRow label="Outstanding" value={metrics.outstanding} tone="critical" />
                <MetricRow label="Overdue" value={metrics.overdue} tone="warning" />
                <MetricRow label="Approvals pending" value={metrics.approvalsPending} tone="attention" />
                <MetricRow label="Escalated" value={metrics.escalated} />
              </BlockStack>
            </Card>

            <Select
              label="Filter"
              options={FILTER_OPTIONS}
              value={dataset.filter}
              onChange={handleFilterChange}
            />
          </BlockStack>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: "ticket", plural: "tickets" }}
              items={dataset.tickets}
              renderItem={(ticket) => (
                <ResourceList.Item id={ticket.id} accessibilityLabel={`View ${ticket.subject}`}>
                  <BlockStack gap="100">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingSm" as="h3">
                        {ticket.subject}
                      </Text>
                      <InlineStack gap="200">
                        <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
                        <Badge tone={sentimentTone(ticket.sentiment)}>{ticket.sentiment}</Badge>
                      </InlineStack>
                    </InlineStack>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="span" variant="bodySm" tone="subdued">
                        {ticket.customer.name} • {ticket.channel}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {formatTimeAgo(ticket.updatedAt)}
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" as="p">
                      {ticket.lastMessagePreview}
                    </Text>
                  </BlockStack>
                </ResourceList.Item>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

type Metrics = {
  outstanding: number;
  overdue: number;
  approvalsPending: number;
  escalated: number;
};

const buildMetrics = (dataset: InboxDataset): Metrics => {
  const outstanding = dataset.tickets.filter((ticket) => ticket.status !== "resolved").length;
  const overdue = dataset.tickets.filter((ticket) => ticket.slaBreached).length;
  const approvalsPending = dataset.tickets.filter(
    (ticket) => ticket.priority !== "low" && ticket.status === "open",
  ).length;
  const escalated = dataset.tickets.filter((ticket) => ticket.status === "escalated").length;

  return { outstanding, overdue, approvalsPending, escalated };
};

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical" | "warning" | "attention" | "success" | "info";
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
