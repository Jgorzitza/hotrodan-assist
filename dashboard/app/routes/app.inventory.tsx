import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  ResourceList,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getInventoryOverview } from "../mocks";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const data = await getInventoryOverview();

  return json(data);
};

export default function InventoryRoute() {
  const { buckets, trends } = useLoaderData<typeof loader>();

  return (
    <Page title="Inventory">
      <TitleBar title="Inventory" primaryAction={{ content: "Draft PO", url: "#" }} />
      <Layout>
        <Layout.Section>
          <Card title="Risk buckets" sectioned>
            <BlockStack gap="300">
              {buckets.map((bucket) => (
                <InlineStack key={bucket.id} align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text variant="headingSm" as="h3">
                      {bucket.label}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="span">
                      {bucket.description}
                    </Text>
                  </BlockStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="span">
                      {bucket.skuCount} SKUs
                    </Text>
                    <Button url={bucket.href}>Open</Button>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Velocity trends" sectioned>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={trends}
              renderItem={({ label, projectedDays, currentStock }) => (
                <ResourceList.Item id={label}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack>
                      <Text variant="bodyMd" as="span">
                        {label}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        {currentStock} on hand
                      </Text>
                    </BlockStack>
                    <Text variant="bodyMd" as="span">
                      {projectedDays} days to stockout
                    </Text>
                  </InlineStack>
                </ResourceList.Item>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
