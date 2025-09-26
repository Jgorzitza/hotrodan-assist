import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  DataTable,
  Page,
  Tabs,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getOrdersCollection } from "../mocks";
import type { OrdersCollection } from "../mocks/orders";

const TABS: { id: OrdersCollection["tab"]; content: string }[] = [
  { id: "unshipped", content: "Unshipped" },
  { id: "delivery", content: "Delivery issues" },
  { id: "completed", content: "Completed" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const tab = (url.searchParams.get("tab") as OrdersCollection["tab"]) ?? "unshipped";
  const data = await getOrdersCollection(tab);

  return json<{ data: OrdersCollection }>(
    { data },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export default function OrdersRoute() {
  const { data } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedIndex = Math.max(
    TABS.findIndex((tab) => tab.id === data.tab),
    0,
  );

  const handleTabChange = (selected: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", TABS[selected].id);
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
    <Page title="Orders">
      <TitleBar title="Orders" primaryAction={{ content: "Bulk actions", url: "#" }} />
      <BlockStack gap="400">
        <Tabs tabs={TABS} selected={selectedIndex} onSelect={handleTabChange} fitted />
        <Card>
          <DataTable
            columnContentTypes={["text", "text", "text", "text", "text", "text"]}
            headings={["Order", "Customer", "Placed", "Total", "Status", "Attention"]}
            rows={data.rows.map((row) => [
              row.name,
              row.customer,
              row.placedAt,
              row.total,
              row.status,
              row.attention ?? "—",
            ])}
          />
        </Card>
        <Card sectioned>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              Bulk action stubs will trigger Remix actions that enqueue work for reship or refund flows.
            </Text>
            <Button onClick={() => navigate("/app/orders/bulk" )}>
              Mark investigated (stub)
            </Button>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
