import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useMemo, useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  DataTable,
  Divider,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import {
  BarChart,
  PolarisVizProvider,
  type DataSeries,
} from "@shopify/polaris-viz";

import { authenticate } from "../shopify.server";
import { getFastMoversScenario, scenarioFromRequest } from "~/mocks/vendor-mapping";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type {
  FastMoversPayload,
  FastMoversDecile,
  MockScenario,
} from "~/types/dashboard";

type LoaderData = {
  payload: FastMoversPayload;
  scenario: MockScenario;
  useMockData: boolean;
};

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

const getDecileColor = (decile: number): string => {
  const colors = [
    "#FF6B6B", // Red for top decile
    "#FF8E53", // Orange-red
    "#FF9F43", // Orange
    "#FFA726", // Light orange
    "#FFB74D", // Lighter orange
    "#FFCC80", // Very light orange
    "#DCE775", // Light yellow-green
    "#AED581", // Light green
    "#81C784", // Green
    "#66BB6A", // Darker green for bottom decile
  ];
  return colors[decile - 1] || "#E0E0E0";
};

const getDecileTone = (decile: number): "critical" | "warning" | "success" | "info" => {
  if (decile <= 2) return "critical";
  if (decile <= 4) return "warning";
  if (decile <= 7) return "info";
  return "success";
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const scenario = scenarioFromRequest(request);
  let shopDomain = BASE_SHOP_DOMAIN;

  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const payload = getFastMoversScenario({ scenario });

  return json<LoaderData>(
    {
      payload,
      scenario,
      useMockData: USE_MOCK_DATA,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "export-csv") {
    const decile = formData.get("decile");
    
    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }

    // Generate CSV for the specified decile
    const csv = `SKU,Title,Vendor,Velocity,Value
SKU-001,Product A,Vendor 1,150,1000
SKU-002,Product B,Vendor 2,120,800`;

    return json({
      success: true,
      message: `Fast Movers decile ${decile} exported successfully`,
      csv,
      filename: `fast-movers-decile-${decile}.csv`,
    });
  }

  return json({ success: false, message: "Unknown action" }, { status: 400 });
};

export default function FastMoversRoute() {
  const { payload, useMockData, scenario } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [selectedDecile, setSelectedDecile] = useState<FastMoversDecile | null>(null);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(payload.skus);

  const decileChartData = useMemo<DataSeries[]>(() => {
    if (payload.deciles.length === 0) return [];

    return [
      {
        name: "Velocity by Decile",
        data: payload.deciles.map((decile) => ({
          key: `Decile ${decile.decile}`,
          value: decile.averageVelocity,
        })),
      },
    ];
  }, [payload.deciles]);

  const decileRows = payload.deciles.map((decile) => [
    `Decile ${decile.decile}`,
    formatNumber(decile.minVelocity),
    formatNumber(decile.maxVelocity),
    formatNumber(decile.averageVelocity),
    formatNumber(decile.skuCount),
    formatCurrency(decile.totalValue.amount, decile.totalValue.currency),
  ]);

  const filteredSkus = useMemo(() => {
    if (!selectedDecile) return payload.skus;
    return payload.skus.filter(sku => selectedDecile.skuIds.includes(sku.id));
  }, [payload.skus, selectedDecile]);

  const handleDecileClick = (decile: FastMoversDecile) => {
    setSelectedDecile(decile);
  };

  const handleExportDecile = (decile: FastMoversDecile) => {
    // In a real implementation, this would trigger the export action
    console.log(`Exporting decile ${decile.decile}`);
  };

  return (
    <PolarisVizProvider>
      <Page
        title="Fast Movers"
        subtitle="Analyze SKU velocity patterns and identify high-performing inventory."
      >
        <TitleBar
          title="Fast Movers"
          primaryAction={{ content: "Export all", url: "#" }}
        />

        <BlockStack gap="400">
          {(useMockData || payload.alert || payload.error) && (
            <BlockStack gap="200">
              {useMockData && (
                <Banner tone={scenario === "warning" ? "warning" : "info"} title={`Mock state: ${scenario}`}>
                  <p>Append `?mockState=warning` (etc) to explore alternate datasets.</p>
                </Banner>
              )}
              {payload.alert && !payload.error && (
                <Banner tone="warning" title="Fast Movers alert">
                  <p>{payload.alert}</p>
                </Banner>
              )}
              {payload.error && (
                <Banner tone="critical" title="Fast Movers data unavailable">
                  <p>{payload.error}</p>
                </Banner>
              )}
            </BlockStack>
          )}

          <Layout>
            <Layout.Section>
              <Card>
                <Card.Section>
                  <Text variant="headingMd" as="h2">
                    Velocity Deciles
                  </Text>
                </Card.Section>

                <Divider />

                <Card.Section>
                  {payload.deciles.length === 0 ? (
                    <EmptyState
                      heading="No velocity data available"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Sync inventory data to populate Fast Movers analysis.</p>
                    </EmptyState>
                  ) : (
                    <BlockStack gap="300">
                      {/* Velocity Chart */}
                      {decileChartData.length > 0 && (
                        <Box padding="300" background="bg-subdued" borderRadius="200">
                          <div style={{ height: 300 }}>
                            <BarChart
                              data={decileChartData}
                              isAnimated={false}
                              accessibilityLabel="SKU velocity by decile"
                              yAxisOptions={{
                                labelFormatter: (value) => formatNumber(Number(value)),
                              }}
                            />
                          </div>
                        </Box>
                      )}

                      {/* Decile Table */}
                      <DataTable
                        columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "text"]}
                        headings={[
                          "Decile",
                          "Min velocity",
                          "Max velocity",
                          "Avg velocity",
                          "SKU count",
                          "Total value",
                        ]}
                        rows={decileRows}
                      />

                      {/* Decile Cards */}
                      <InlineStack gap="200" wrap>
                        {payload.deciles.map((decile) => (
                          <Card
                            key={decile.decile}
                            sectioned
                            background={selectedDecile?.decile === decile.decile ? "bg-selected" : undefined}
                          >
                            <BlockStack gap="200">
                              <InlineStack align="space-between" blockAlign="center">
                                <Badge tone={getDecileTone(decile.decile)}>
                                  Decile {decile.decile}
                                </Badge>
                                <Button
                                  size="slim"
                                  onClick={() => handleExportDecile(decile)}
                                >
                                  Export
                                </Button>
                              </InlineStack>
                              
                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="span">
                                  Velocity range
                                </Text>
                                <Text variant="bodyMd" as="span">
                                  {formatNumber(decile.minVelocity)} - {formatNumber(decile.maxVelocity)}
                                </Text>
                              </BlockStack>

                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="span">
                                  SKUs
                                </Text>
                                <Text variant="bodyMd" as="span">
                                  {formatNumber(decile.skuCount)}
                                </Text>
                              </BlockStack>

                              <BlockStack gap="100">
                                <Text variant="bodySm" tone="subdued" as="span">
                                  Total value
                                </Text>
                                <Text variant="bodyMd" as="span">
                                  {formatCurrency(decile.totalValue.amount, decile.totalValue.currency)}
                                </Text>
                              </BlockStack>

                              <Button
                                size="slim"
                                onClick={() => handleDecileClick(decile)}
                                pressed={selectedDecile?.decile === decile.decile}
                              >
                                {selectedDecile?.decile === decile.decile ? "Selected" : "View SKUs"}
                              </Button>
                            </BlockStack>
                          </Card>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  )}
                </Card.Section>
              </Card>
            </Layout.Section>
          </Layout>

          {/* Selected Decile SKUs */}
          {selectedDecile && (
            <Layout>
              <Layout.Section>
                <Card>
                  <Card.Section>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd" as="h2">
                        SKUs in Decile {selectedDecile.decile}
                      </Text>
                      <Button onClick={() => setSelectedDecile(null)}>
                        Close
                      </Button>
                    </InlineStack>
                  </Card.Section>

                  <Divider />

                  <Card.Section>
                    {filteredSkus.length === 0 ? (
                      <EmptyState
                        heading="No SKUs in this decile"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>This decile contains no SKUs.</p>
                      </EmptyState>
                    ) : (
                      <IndexTable
                        resourceName={{ singular: "SKU", plural: "SKUs" }}
                        itemCount={filteredSkus.length}
                        selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                        onSelectionChange={handleSelectionChange}
                        headings={[
                          { title: "SKU" },
                          { title: "Title" },
                          { title: "Vendor" },
                          { title: "Velocity" },
                          { title: "On hand" },
                          { title: "Unit cost" },
                          { title: "Status" },
                        ]}
                      >
                        {filteredSkus.map((sku, index) => (
                          <IndexTable.Row
                            id={sku.id}
                            key={sku.id}
                            position={index}
                            selected={selectedResources.includes(sku.id)}
                          >
                            <IndexTable.Cell>{sku.sku}</IndexTable.Cell>
                            <IndexTable.Cell>{sku.title}</IndexTable.Cell>
                            <IndexTable.Cell>{sku.vendorName}</IndexTable.Cell>
                            <IndexTable.Cell>
                              <BlockStack gap="050">
                                <Text variant="bodyMd" as="span">
                                  {formatNumber(sku.velocity.lastWeekUnits)} units
                                </Text>
                                <Text variant="bodySm" tone="subdued" as="span">
                                  {sku.velocity.turnoverDays} days turnover
                                </Text>
                              </BlockStack>
                            </IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.onHand)}</IndexTable.Cell>
                            <IndexTable.Cell>
                              {formatCurrency(sku.unitCost.amount, sku.unitCost.currency)}
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Badge tone={sku.status === "healthy" ? "success" : "warning"}>
                                {sku.status}
                              </Badge>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    )}
                  </Card.Section>
                </Card>
              </Layout.Section>
            </Layout>
          )}
        </BlockStack>
      </Page>
    </PolarisVizProvider>
  );
}
