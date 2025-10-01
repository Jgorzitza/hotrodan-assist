import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  InlineGrid,
  InlineStack,
  IndexTable,
  Layout,
  Modal,
  Page,
  Tabs,
  Text,
  TextField,
  useIndexResourceState,
} from "@shopify/polaris";
import {
  LineChart,
  PolarisVizProvider,
  SparkLineChart,
  type DataSeries,
} from "@shopify/polaris-viz";

import { authenticate } from "../shopify.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import {
  getMcpInventorySignals,
  isMcpFeatureEnabled,
  shouldUseMcpMocks,
  type InventorySignal,
} from "~/lib/mcp";
import type { McpClientOverrides } from "~/lib/mcp/config.server";
import { getMcpClientOverridesForShop } from "~/lib/mcp/config.server";
import { getInventoryScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import { fetchSkuVendorMapFromAdmin } from "../lib/inventory/live.server";
import {
  aggregateTrendSeries,
  calculateTrendStats,
  type InventoryTrendStats,
} from "~/lib/inventory/math";
import type {
  InventoryBucketId,
  InventoryDashboardPayload,
  InventoryDemandTrendPoint,
  InventorySkuDemand,
  InventoryStatus,
  MockScenario,
} from "~/types/dashboard";

const BUCKET_IDS: InventoryBucketId[] = [
  "urgent",
  "air",
  "sea",
  "overstock",
];

const STATUS_TONE: Record<InventoryStatus, "success" | "warning" | "critical" | "info"> = {
  healthy: "success",
  low: "warning",
  backorder: "critical",
  preorder: "info",
};

const MCP_RISK_TONE: Record<InventorySignal["riskLevel"], "success" | "warning" | "critical"> = {
  low: "success",
  medium: "warning",
  high: "critical",
};

type LoaderData = {
  payload: InventoryDashboardPayload;
  scenario: MockScenario;
  useMockData: boolean;
  selectedBucket: InventoryBucketId;
  count: number;
  mcp: {
    enabled: boolean;
    usingMocks: boolean;
    signals: InventorySignal[];
    source?: string;
    generatedAt?: string;
  };
};

type PlannerSubmission = {
  vendorId: string;
  notes?: string;
  items: Array<{ skuId: string; draftQuantity: number }>;
};

type PlannerExport = {
  csv: string;
  filename?: string;
};

type ActionResult = {
  ok: boolean;
  message: string;
} & Partial<PlannerExport>;

const clampCount = (value: unknown, fallback = 18): number => {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, 8), 48);
};

const isBucketId = (value: unknown): value is InventoryBucketId => {
  return typeof value === "string" && BUCKET_IDS.includes(value as InventoryBucketId);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const scenario = scenarioFromRequest(request);
  const count = clampCount(url.searchParams.get("count"));
  let shopDomain = BASE_SHOP_DOMAIN;

  let adminClient: any | undefined;
  if (!USE_MOCK_DATA) {
    const { session, admin } = await authenticate.admin(request);
    shopDomain = session.shop;
    adminClient = admin;
  }

  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);

  let payload = getInventoryScenario({ scenario, count });

  // If in live mode, overlay vendor mapping from Shopify Admin by SKU
  if (!USE_MOCK_DATA && adminClient) {
    try {
      const liveMap = await fetchSkuVendorMapFromAdmin(adminClient);
      const bySku = new Map<string, { vendor: string; title: string }>();
      for (const item of liveMap) {
        bySku.set(item.sku, { vendor: item.vendor, title: item.title });
      }
      const updatedSkus = payload.skus.map((sku) => {
        const entry = bySku.get(sku.sku);
        if (!entry) return sku;
        return {
          ...sku,
          vendorName: entry.vendor || sku.vendorName,
          title: entry.title || sku.title,
        };
      });
      payload = { ...payload, skus: updatedSkus };
    } catch (e) {
      // Non-fatal: keep mock payload if live overlay fails
      console.warn("[inventory] live vendor mapping overlay failed", e);
    }
  }

  const bucketParam = url.searchParams.get("bucket");
  const selectedBucket = isBucketId(bucketParam)
    ? bucketParam
    : payload.buckets[0]?.id ?? "urgent";

  const shouldHydrateMcp = featureEnabled || USE_MOCK_DATA;
  let mcpSignals: InventorySignal[] = [];
  let mcpSource: string | undefined;
  let mcpGeneratedAt: string | undefined;
  let mcpOverrides: McpClientOverrides | undefined;

  if (shouldHydrateMcp) {
    if (!usingMocks) {
      mcpOverrides = await getMcpClientOverridesForShop(shopDomain);
    }

    const response = await getMcpInventorySignals(
      {
        shopDomain,
        params: { limit: 5, bucket: selectedBucket },
      },
      toggles,
      mcpOverrides,
    );

    mcpSignals = response.data;
    mcpSource = response.source;
    mcpGeneratedAt = response.generatedAt;
  }

  return json<LoaderData>(
    {
      payload,
      scenario,
      useMockData: USE_MOCK_DATA,
      selectedBucket,
      count,
      mcp: {
        enabled: featureEnabled,
        usingMocks,
        signals: mcpSignals,
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save-draft") {
    const rawPayload = formData.get("payload");

    if (typeof rawPayload !== "string") {
      return json<ActionResult>(
        { ok: false, message: "Missing draft payload" },
        { status: 400 },
      );
    }

    try {
      const parsed = JSON.parse(rawPayload) as
        | PlannerSubmission
        | { vendors: PlannerSubmission[] };

      const submissions = Array.isArray((parsed as { vendors?: unknown }).vendors)
        ? (parsed as { vendors: PlannerSubmission[] }).vendors
        : [parsed as PlannerSubmission];

      const vendors = submissions.map((entry) => entry.vendorId).join(", ");

      return json<ActionResult>(
        {
          ok: true,
          message: vendors
            ? `Draft saved for ${vendors}`
            : "Draft saved",
        },
        {
          headers: {
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        },
      );
    } catch (error) {
      console.error("Failed to parse draft payload", error);
      return json<ActionResult>(
        { ok: false, message: "Invalid draft payload" },
        { status: 400 },
      );
    }
  }

  if (intent === "export-csv") {
    const scenario = scenarioFromRequest(request);
    const vendorId = formData.get("vendorId");
    const bucketId = formData.get("bucketId");
    const count = clampCount(formData.get("count"));

    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }

    const dataset = getInventoryScenario({ scenario, count });
    let filename = "inventory-export.csv";
    const rows: string[][] = [];

    if (typeof vendorId === "string" && vendorId) {
      const vendor = dataset.vendors.find(
        (entry) => entry.vendorId === vendorId,
      );
      filename = `inventory-${vendorId}.csv`;
      if (vendor) {
        vendor.items.forEach((item) => {
          rows.push([
            item.sku,
            item.title,
            vendor.vendorName,
            String(item.recommendedOrder),
            String(item.draftQuantity),
            formatCurrency(item.unitCost.amount, item.unitCost.currency),
          ]);
        });
      }
    } else if (isBucketId(bucketId)) {
      filename = `inventory-${bucketId}.csv`;
      dataset.skus
        .filter((sku) => sku.bucketId === bucketId)
        .forEach((sku) => {
          rows.push([
            sku.sku,
            sku.title,
            sku.vendorName,
            String(sku.recommendedOrder),
            String(sku.recommendedOrder),
            formatCurrency(sku.unitCost.amount, sku.unitCost.currency),
          ]);
        });
    } else {
      dataset.skus.forEach((sku) => {
        rows.push([
          sku.sku,
          sku.title,
          sku.vendorName,
          String(sku.recommendedOrder),
          String(sku.recommendedOrder),
          formatCurrency(sku.unitCost.amount, sku.unitCost.currency),
        ]);
      });
    }

    const header = [
      "SKU",
      "Title",
      "Vendor",
      "Recommended",
      "Draft",
      "UnitCost",
    ];

    const csv = [header, ...rows].map((line) => line.join(",")).join("\n");

    return json<ActionResult>(
      {
        ok: true,
        message: `CSV ready: ${filename}`,
        csv,
        filename,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      },
    );
  }

  return json<ActionResult>(
    { ok: false, message: "Unknown action intent" },
    { status: 400 },
  );
};

export default function InventoryRoute() {
  const { payload, useMockData, scenario, selectedBucket, count, mcp } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saveFetcher = useFetcher<typeof action>();
  const exportFetcher = useFetcher<typeof action>();
  const [detailSku, setDetailSku] = useState<InventorySkuDemand | null>(null);

  const activeBucket = useMemo<InventoryBucketId>(() => {
    const bucketParam = searchParams.get("bucket");
    if (isBucketId(bucketParam)) {
      return bucketParam;
    }
    return selectedBucket;
  }, [searchParams, selectedBucket]);

  useEffect(() => {
    if (exportFetcher.data?.csv) {
      const blob = new Blob([exportFetcher.data.csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = exportFetcher.data.filename ?? "inventory-export.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    }
  }, [exportFetcher.data]);

  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>(() => {
    const quantities: Record<string, number> = {};
    payload.vendors.forEach((vendor) => {
      vendor.items.forEach((item) => {
        quantities[item.skuId] = item.draftQuantity;
      });
    });
    return quantities;
  });

  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>(() => {
    const notes: Record<string, string> = {};
    payload.vendors.forEach((vendor) => {
      notes[vendor.vendorId] = vendor.notes ?? "";
    });
    return notes;
  });

  useEffect(() => {
    const nextQuantities: Record<string, number> = {};
    payload.vendors.forEach((vendor) => {
      vendor.items.forEach((item) => {
        nextQuantities[item.skuId] = item.draftQuantity;
      });
    });
    setDraftQuantities(nextQuantities);

    const nextNotes: Record<string, string> = {};
    payload.vendors.forEach((vendor) => {
      nextNotes[vendor.vendorId] = vendor.notes ?? "";
    });
    setVendorNotes(nextNotes);
  }, [payload.vendors]);

  const detailTrendDataset = useMemo<DataSeries[]>(() => {
    if (!detailSku?.trend?.length) return [];

    return [
      {
        name: "Weekly units",
        data: detailSku.trend.map((point) => ({
          key: point.label,
          value: Number.isFinite(point.units) ? point.units : 0,
        })),
      },
    ];
  }, [detailSku]);

  const detailTrendStats = useMemo<InventoryTrendStats | null>(() => {
    if (!detailSku) return null;
    return calculateTrendStats(detailSku.trend);
  }, [detailSku]);

  const filteredSkus = useMemo(
    () => payload.skus.filter((sku) => sku.bucketId === activeBucket),
    [payload.skus, activeBucket],
  );

  const activeBucketMeta = useMemo(
    () => payload.buckets.find((bucket) => bucket.id === activeBucket) ?? null,
    [payload.buckets, activeBucket],
  );

  const bucketTrendPoints = useMemo(
    () => aggregateTrendSeries(filteredSkus.map((sku) => sku.trend)),
    [filteredSkus],
  );

  const bucketTrendDataset = useMemo<DataSeries[]>(() => {
    if (bucketTrendPoints.length === 0) return [];
    return [
      {
        name: "Bucket weekly units",
        data: bucketTrendPoints.map((point, index) => ({
          key: point.label || String(index),
          value: Number.isFinite(point.units) ? point.units : 0,
        })),
      },
    ];
  }, [bucketTrendPoints]);

  const bucketTrendStats = useMemo<InventoryTrendStats | null>(
    () => calculateTrendStats(bucketTrendPoints),
    [bucketTrendPoints],
  );

  const bucketTabs = useMemo(
    () =>
      payload.buckets.map((bucket) => ({
        id: bucket.id,
        content: bucket.label,
      })),
    [payload.buckets],
  );

  const selectedTabIndex = Math.max(
    bucketTabs.findIndex((tab) => tab.id === activeBucket),
    0,
  );

  const summaryCards = [
    {
      id: "skus-at-risk",
      label: "SKUs at risk",
      value: formatNumber(payload.summary.skusAtRisk),
      tone: "critical" as const,
    },
    {
      id: "average-cover",
      label: "Average cover",
      value: `${formatNumber(payload.summary.averageCoverDays)} days`,
      tone: "info" as const,
    },
    {
      id: "open-po",
      label: "Open PO budget",
      value: payload.summary.openPoBudget.formatted,
      tone: "success" as const,
    },
  ];

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filteredSkus);

  const handleTabChange = (index: number) => {
    const bucket = payload.buckets[index];
    if (!bucket) return;

    const params = new URLSearchParams(searchParams);
    params.set("bucket", bucket.id);
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleDraftChange = (skuId: string, value: string) => {
    const numeric = Number(value);
    setDraftQuantities((current) => ({
      ...current,
      [skuId]: Number.isFinite(numeric) ? Math.max(Math.round(numeric), 0) : 0,
    }));
  };

  const handleSaveDraft = (vendorId: string) => {
    const vendor = payload.vendors.find((entry) => entry.vendorId === vendorId);
    if (!vendor) return;

    const submission: PlannerSubmission = {
      vendorId,
      notes: vendorNotes[vendorId],
      items: vendor.items.map((item) => ({
        skuId: item.skuId,
        draftQuantity:
          draftQuantities[item.skuId] ?? item.draftQuantity ?? 0,
      })),
    };

    saveFetcher.submit(
      {
        intent: "save-draft",
        payload: JSON.stringify(submission),
      },
      { method: "post" },
    );
  };

  const handleExportVendor = (vendorId: string) => {
    exportFetcher.submit(
      {
        intent: "export-csv",
        vendorId,
        count: String(count),
      },
      { method: "post" },
    );
  };

  const handleBucketExport = () => {
    exportFetcher.submit(
      {
        intent: "export-csv",
        bucketId: activeBucket,
        count: String(count),
      },
      { method: "post" },
    );
  };

  return (
    <PolarisVizProvider>
      <Page
        title="Inventory"
        subtitle="Demand planning cockpit for replenishment, expediting, and overstock mitigation."
      >

      <BlockStack gap="400">
        {(useMockData || payload.alert || payload.error) && (
          <BlockStack gap="200">
            {useMockData && (
              <Banner tone={scenario === "warning" ? "warning" : "info"} title={`Mock state: ${scenario}`}>
                <p>Append `?mockState=warning` (etc) to explore alternate datasets.</p>
              </Banner>
            )}
            {payload.alert && !payload.error && (
              <Banner tone="warning" title="Inventory alert">
                <p>{payload.alert}</p>
              </Banner>
            )}
            {payload.error && (
              <Banner tone="critical" title="Inventory data unavailable">
                <p>{payload.error}</p>
              </Banner>
            )}
          </BlockStack>
        )}

        <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
          {summaryCards.map((card) => (
            <Card key={card.id}>
              <BlockStack gap="100">
                <Text variant="bodyMd" as="span">
                  {card.label}
                </Text>
                <Text variant="headingLg" as="span">
                  {card.value}
                </Text>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">MCP inventory signals</Text>
            {mcp.signals.map((signal) => (
              <Box
                key={signal.sku}
                padding="200"
                borderRadius="200"
              >
                <BlockStack gap="150">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text variant="bodyMd" as="span">
                        {signal.sku}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        {signal.suggestedAction}
                      </Text>
                    </BlockStack>
                    <Badge tone={MCP_RISK_TONE[signal.riskLevel]}>
                      {signal.riskLevel.toUpperCase()}
                    </Badge>
                  </InlineStack>
                  {signal.demandSignals.length > 0 && (
                    <InlineStack gap="200" wrap>
                      {signal.demandSignals.map((metric) => (
                        <Badge key={metric.label} tone="info">{`${metric.label}: ${metric.value}${metric.unit ? metric.unit : ""}`}</Badge>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              </Box>
            ))}
            {mcp.signals.length === 0 && (
              <Text variant="bodySm" tone="subdued" as="p">
                {mcp.enabled
                  ? "No MCP inventory signals returned yet. Check back after the next sync."
                  : "Enable the MCP integration in Settings to surface prioritized restock actions."}
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

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Tabs tabs={bucketTabs} selected={selectedTabIndex} onSelect={handleTabChange} fitted />
                  <Button onClick={handleBucketExport} loading={exportFetcher.state !== "idle" && exportFetcher.formData?.get("bucketId") === activeBucket}>
                    Export bucket CSV
                  </Button>
                </InlineStack>
              </BlockStack>

              <Divider />

              <BlockStack gap="300">
                  {activeBucketMeta?.description && (
                    <Text variant="bodySm" tone="subdued" as="p">
                      {activeBucketMeta.description}
                    </Text>
                  )}

                  {filteredSkus.length === 0 ? (
                    <BlockStack gap="200" align="center">
                      <Text variant="bodyMd" as="span">No SKUs in this bucket yet.</Text>
                    </BlockStack>
                  ) : (
                    <>
                      {bucketTrendDataset.length > 0 ? (
                        <BucketTrendSummary
                          bucketLabel={activeBucketMeta?.label ?? activeBucket}
                          dataset={bucketTrendDataset}
                          stats={bucketTrendStats}
                        />
                      ) : (
                        <Text variant="bodySm" tone="subdued" as="span">
                          Demand trend data unavailable for this bucket.
                        </Text>
                      )}

                      <IndexTable
                        resourceName={{ singular: "SKU", plural: "SKUs" }}
                        itemCount={filteredSkus.length}
                        selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                        onSelectionChange={handleSelectionChange}
                        headings={[
                          { title: "SKU" },
                          { title: "Vendor" },
                          { title: "On hand" },
                          { title: "Inbound" },
                          { title: "Committed" },
                          { title: "Cover (days)" },
                          { title: "Trend (6w)" },
                          { title: "Stockout" },
                          { title: "Recommended" },
                          { title: "" },
                        ]}
                      >
                        {filteredSkus.map((sku, index) => (
                          <IndexTable.Row
                            id={sku.id}
                            key={sku.id}
                            position={index}
                            selected={selectedResources.includes(sku.id)}
                          >
                            <IndexTable.Cell>
                              <BlockStack gap="050">
                                <Text variant="bodyMd" as="span">
                                  {sku.title}
                                </Text>
                                <Text tone="subdued" variant="bodySm" as="span">
                                  {sku.sku}
                                </Text>
                              </BlockStack>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text variant="bodySm" as="span">
                                {sku.vendorName}
                              </Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.onHand)}</IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.inbound)}</IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.committed)}</IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.coverDays)}</IndexTable.Cell>
                            <IndexTable.Cell>
                              <SkuTrendSparkline skuTitle={sku.title} trend={sku.trend} />
                            </IndexTable.Cell>
                            <IndexTable.Cell>{formatDate(sku.stockoutDate)}</IndexTable.Cell>
                            <IndexTable.Cell>{formatNumber(sku.recommendedOrder)}</IndexTable.Cell>
                            <IndexTable.Cell>
                              <InlineStack align="end" gap="200">
                                <Badge tone={STATUS_TONE[sku.status]}>{sku.status}</Badge>
                                <Button onClick={() => setDetailSku(sku)}>
                                  View details
                                </Button>
                              </InlineStack>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    </>
                  )}
                </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingLg" as="h2">
              Purchase order planner
            </Text>
            {saveFetcher.data?.ok && (
              <Badge tone="success">{saveFetcher.data.message}</Badge>
            )}
          </InlineStack>

          {payload.vendors.length === 0 ? (
            <Card>
              <BlockStack gap="200">
                <Text variant="bodyMd" as="span">No vendor drafts available yet.</Text>
              </BlockStack>
            </Card>
          ) : (
            payload.vendors.map((vendor) => {
              const totalDraftValue = vendor.items.reduce((total, item) => {
                const draftQty = draftQuantities[item.skuId] ?? item.draftQuantity;
                return total + draftQty * item.unitCost.amount;
              }, 0);

              return (
                <Card key={vendor.vendorId}>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">{vendor.vendorName}</Text>
                    <InlineStack gap="400">
                      <Text variant="bodyMd" as="span">
                        Lead time: {vendor.leadTimeDays} days
                      </Text>
                      <Text variant="bodyMd" as="span">
                        Budget: {vendor.budgetRemaining.formatted}
                      </Text>
                      <Text variant="bodyMd" as="span">
                        Draft total: {formatCurrency(totalDraftValue, vendor.budgetRemaining.currency)}
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  <BlockStack gap="200">
                      {vendor.items.map((item) => (
                        <Box
                          key={item.skuId}
                          padding="200"
                          borderRadius="200"
                        >
                          <BlockStack gap="150">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="050">
                                <Text variant="bodyMd" as="span">
                                  {item.title}
                                </Text>
                                <Text variant="bodySm" tone="subdued" as="span">
                                  {item.sku}
                                </Text>
                              </BlockStack>
                              <Badge tone="info">{`Reco: ${formatNumber(item.recommendedOrder)}`}</Badge>
                            </InlineStack>

                            <InlineStack gap="200" align="space-between" blockAlign="center">
                              <TextField
                                label="Draft quantity"
                                labelHidden
                                type="number"
                                min={0}
                                autoComplete="off"
                                value={String(draftQuantities[item.skuId] ?? item.draftQuantity)}
                                onChange={(value) => handleDraftChange(item.skuId, value)}
                              />
                              <Text variant="bodyMd" as="span">
                                Unit cost: {item.unitCost.formatted}
                              </Text>
                              <Text variant="bodyMd" as="span">
                                Line total: {formatCurrency(
                                  (draftQuantities[item.skuId] ?? item.draftQuantity) * item.unitCost.amount,
                                  item.unitCost.currency,
                                )}
                              </Text>
                            </InlineStack>
                          </BlockStack>
                        </Box>
                      ))}
                    </BlockStack>

                  <BlockStack gap="200">
                    <TextField
                      label="Planner notes"
                      multiline
                      autoComplete="off"
                      value={vendorNotes[vendor.vendorId]}
                      onChange={(value) =>
                        setVendorNotes((current) => ({
                          ...current,
                          [vendor.vendorId]: value,
                        }))
                      }
                    />
                  </BlockStack>

                  <BlockStack gap="200">
                    <InlineStack align="end" gap="200">
                      <ButtonGroup>
                        <Button
                          onClick={() => handleSaveDraft(vendor.vendorId)}
                          loading={saveFetcher.state !== "idle" && saveFetcher.formData?.get("payload") !== undefined}
                          variant="primary"
                        >
                          Save draft
                        </Button>
                        <Button
                          onClick={() => handleExportVendor(vendor.vendorId)}
                          loading={exportFetcher.state !== "idle" && exportFetcher.formData?.get("vendorId") === vendor.vendorId}
                        >
                          Export vendor CSV
                        </Button>
                      </ButtonGroup>
                    </InlineStack>
                  </BlockStack>
                </Card>
              );
            })
          )}
        </BlockStack>
      </BlockStack>

        <Modal
          open={detailSku !== null}
          onClose={() => setDetailSku(null)}
          title={detailSku?.title ?? "SKU details"}
        >
          {detailSku && (
            <Modal.Section>
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text variant="bodyMd" tone="subdued" as="span">
                    {detailSku.sku} • {detailSku.vendorName}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Badge tone={STATUS_TONE[detailSku.status]}>{detailSku.status}</Badge>
                    <Text variant="bodyMd" as="span">
                      Bucket: {detailSku.bucketId}
                    </Text>
                  </InlineStack>
                </BlockStack>

                <Divider />

                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="200">
                  <Metric label="On hand" value={formatNumber(detailSku.onHand)} />
                  <Metric label="Inbound" value={formatNumber(detailSku.inbound)} />
                  <Metric label="Committed" value={formatNumber(detailSku.committed)} />
                  <Metric label="Coverage" value={`${formatNumber(detailSku.coverDays)} days`} />
                  <Metric
                    label="Reorder point"
                    value={formatNumber(detailSku.reorderPoint)}
                  />
                  <Metric
                    label="Safety stock"
                    value={formatNumber(detailSku.safetyStock)}
                  />
                  <Metric
                    label="Stockout date"
                    value={formatDate(detailSku.stockoutDate)}
                  />
                  <Metric
                    label="Recommended order"
                    value={formatNumber(detailSku.recommendedOrder)}
                  />
                </InlineGrid>

                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingSm" as="h3">
                      Demand trend
                    </Text>
                    {typeof detailTrendStats?.deltaPercentage === "number" && (
                      <Badge tone={detailTrendStats!.deltaPercentage >= 0 ? "success" : "critical"}>
                        {`${detailTrendStats!.deltaPercentage >= 0 ? "+" : ""}${detailTrendStats!.deltaPercentage}% WoW`}
                      </Badge>
                    )}
                  </InlineStack>
                  {detailTrendDataset.length ? (
                    <div style={{ width: "100%", height: 240 }}>
                      <LineChart
                        data={detailTrendDataset}
                        isAnimated={false}
                        xAxisOptions={{ hide: true }}
                        tooltipOptions={{
                          keyFormatter: (value) => String(value ?? ""),
                          valueFormatter: (value) => {
                            const numeric =
                              typeof value === "number"
                                ? value
                                : Number(value ?? 0);
                            const safe = Number.isFinite(numeric) ? numeric : 0;
                            return `${formatNumber(safe)} units`;
                          },
                        }}
                        yAxisOptions={{
                          labelFormatter: (value) => {
                            const numeric =
                              typeof value === "number"
                                ? value
                                : Number(value ?? 0);
                            const safe = Number.isFinite(numeric) ? numeric : 0;
                            return formatNumber(safe);
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <Text variant="bodySm" tone="subdued" as="span">
                      Demand trend data unavailable.
                    </Text>
                  )}

                  {detailTrendStats && (
                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
                      <Metric
                        label={`Latest (${detailTrendStats.latest.label})`}
                        value={`${formatNumber(detailTrendStats.latest.units)} units`}
                      />
                      <Metric
                        label="6-week average"
                        value={`${formatNumber(detailTrendStats.average)} units`}
                      />
                      <Metric
                        label={`Range (${detailTrendStats.lowest.label}-${detailTrendStats.highest.label})`}
                        value={`${formatNumber(detailTrendStats.lowest.units)}-${formatNumber(detailTrendStats.highest.units)} units`}
                      />
                    </InlineGrid>
                  )}

                  {useMockData && (
                    <Text variant="bodySm" tone="subdued" as="span">
                      Showing mock demand history. Live Shopify analytics will populate this chart once connected.
                    </Text>
                  )}
                </BlockStack>
              </BlockStack>
            </Modal.Section>
          )}
        </Modal>
      </Page>
    </PolarisVizProvider>
  );
}

type SkuTrendSparklineProps = {
  trend: InventoryDemandTrendPoint[];
  skuTitle: string;
};

function SkuTrendSparkline({ trend, skuTitle }: SkuTrendSparklineProps) {
  if (!trend.length) {
    return (
      <Text variant="bodySm" tone="subdued" as="span">
        --
      </Text>
    );
  }

  const data = trend.map((point, index) => ({
    key: index,
    value: Number.isFinite(point.units) ? point.units : 0,
  }));
  const latest = trend[trend.length - 1]!;
  const latestUnits = Number.isFinite(latest.units) ? latest.units : 0;

  return (
    <BlockStack gap="050">
      <div style={{ width: "100%", minWidth: 120, height: 60 }}>
        <SparkLineChart
          data={[
            {
              name: "Weekly units",
              data,
            },
          ]}
          isAnimated={false}
          accessibilityLabel={`Weekly units sold for ${skuTitle}`}
        />
      </div>
      <Text variant="bodySm" tone="subdued" as="span">
        {latest.label}: {formatNumber(latestUnits)}
      </Text>
    </BlockStack>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <BlockStack gap="050">
      <Text variant="bodySm" tone="subdued" as="span">
        {label}
      </Text>
      <Text variant="bodyMd" as="span">
        {value}
      </Text>
    </BlockStack>
  );
}

type BucketTrendSummaryProps = {
  bucketLabel: string;
  dataset: DataSeries[];
  stats: InventoryTrendStats | null;
};

function BucketTrendSummary({ bucketLabel, dataset, stats }: BucketTrendSummaryProps) {
  if (!dataset.length) {
    return null;
  }

  return (
    <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
      <div style={{ flex: "1 1 240px", minWidth: 220, maxWidth: 360, height: 100 }}>
        <SparkLineChart
          data={dataset}
          isAnimated={false}
          accessibilityLabel={`Weekly units sold across ${bucketLabel} bucket`}
        />
      </div>
      {stats && (
        <BlockStack gap="050" align="end">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="bodyMd" as="span">
              Last week: {formatNumber(stats.latest.units)} units
            </Text>
            {stats.deltaPercentage !== null && (
              <Badge tone={stats.deltaPercentage >= 0 ? "success" : "critical"}>
                {`${stats.deltaPercentage >= 0 ? "+" : ""}${stats.deltaPercentage}% WoW`}
              </Badge>
            )}
          </InlineStack>
          <Text variant="bodySm" tone="subdued" as="span">
            Avg {formatNumber(stats.average)} units • Range {formatNumber(stats.lowest.units)}-
            {formatNumber(stats.highest.units)} units
          </Text>
        </BlockStack>
      )}
    </InlineStack>
  );
}
