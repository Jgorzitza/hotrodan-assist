import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import {
  BlockStack,
  Breadcrumbs,
  Button,
  Card,
  DataTable,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getSalesDrilldown } from "../mocks";
import type { SalesDrilldown } from "../mocks/sales";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const period = url.searchParams.get("range") ?? "28d";
  const collection = url.searchParams.get("collection");
  const product = url.searchParams.get("product");

  const data = await getSalesDrilldown({ period, collection, product });

  return json<{ data: SalesDrilldown; period: string }>(
    { data, period },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export default function SalesRoute() {
  const { data, period } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", value);
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
    <Page title="Sales analytics">
      <TitleBar title="Sales" primaryAction={{ content: "Export CSV", url: "#" }} />
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Breadcrumbs
                breadcrumbs={data.breadcrumbs.map((label, index, arr) => ({
                  content: label,
                  url:
                    index === arr.length - 1
                      ? undefined
                      : `/app/sales?level=${index}`,
                }))}
              />
              <Select
                labelHidden
                label="Date range"
                value={period}
                onChange={handlePeriodChange}
                options={[
                  { label: "Today", value: "today" },
                  { label: "Last 7 days", value: "7d" },
                  { label: "Last 28 days", value: "28d" },
                  { label: "Last 90 days", value: "90d" },
                ]}
              />
            </InlineStack>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="300">
              {data.kpis.map((kpi) => (
                <Card key={kpi.id} sectioned>
                  <BlockStack gap="050">
                    <Text variant="bodySm" tone="subdued" as="span">
                      {kpi.label}
                    </Text>
                    <Text variant="headingLg" as="p">
                      {kpi.value}
                    </Text>
                    <Text
                      variant="bodySm"
                      tone={kpi.delta >= 0 ? "success" : "critical"}
                      as="span"
                    >
                      {formatDelta(kpi.delta)} {kpi.period}
                    </Text>
                  </BlockStack>
                </Card>
              ))}
            </InlineGrid>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section oneHalf>
            <Card title="Best sellers" sectioned>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric"]}
                headings={["Product", "SKU", "GMV", "Δ"]}
                rows={data.bestSellers.map((item) => [
                  item.name,
                  item.sku,
                  item.gmv,
                  formatDelta(item.delta),
                ])}
              />
            </Card>
          </Layout.Section>
          <Layout.Section oneHalf>
            <Card title="Laggards" sectioned>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric"]}
                headings={["Product", "SKU", "GMV", "Δ"]}
                rows={data.laggards.map((item) => [
                  item.name,
                  item.sku,
                  item.gmv,
                  formatDelta(item.delta),
                ])}
              />
            </Card>
          </Layout.Section>
        </Layout>

        <Card title="Top repeat customers" sectioned>
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Customer", "Lifetime value", "Last order"]}
            rows={data.cohorts.map((cohort) => [
              cohort.customer,
              cohort.lifetimeValue,
              cohort.lastOrder,
            ])}
          />
        </Card>

        <Button accessibilityLabel="Export filtered sales" onClick={() => navigate("/app/sales/export")}>Generate export (stub)</Button>
      </BlockStack>
    </Page>
  );
}

const formatDelta = (delta: number) => `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
