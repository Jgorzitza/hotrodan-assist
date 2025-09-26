import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
  useRevalidator,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  DataTable,
  Divider,
  Grid,
  IndexTable,
  InlineStack,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  Toast,
  Tabs,
  useBreakpoints,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  assignOrders,
  getOrdersScenario,
  markOrdersFulfilled,
  requestSupport,
  scenarioFromRequest,
  updateReturnAction,
} from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type {
  Order,
  OrderOwner,
  OrdersActionResponse,
  OrdersDataset,
  OrdersMetrics,
  MockScenario,
} from "~/types/dashboard";

const TAB_OPTIONS: Array<{ id: OrdersDataset["tab"]; content: string }> = [
  { id: "all", content: "All" },
  { id: "unfulfilled", content: "Unfulfilled" },
  { id: "overdue", content: "Overdue" },
  { id: "refunded", content: "Refunded" },
];

type LoaderData = {
  dataset: OrdersDataset;
  scenario: MockScenario;
  useMockData: boolean;
};

const clampPageSize = (value: number) => {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(Math.round(value), 5), 50);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const tab = (url.searchParams.get("tab") as OrdersDataset["tab"]) ?? "all";
  const pageSize = clampPageSize(Number(url.searchParams.get("pageSize") ?? "12"));
  const scenario = scenarioFromRequest(request);

  if (!USE_MOCK_DATA) {
    const { authenticate } = await import("../shopify.server");
    await authenticate.admin(request);
  }

  const dataset = getOrdersScenario({ scenario, tab, pageSize });

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
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
  const scenario = scenarioFromRequest(request);
  const seed = 0;

  if (!intent || typeof intent !== "string") {
    return json<OrdersActionResponse>(
      { success: false, message: "Missing action intent.", updatedOrders: [] },
      { status: 400 },
    );
  }

  if (!USE_MOCK_DATA) {
    return json<OrdersActionResponse>(
      {
        success: false,
        message: "Live mode not implemented for this action yet.",
        updatedOrders: [],
      },
      { status: 501 },
    );
  }

  const parseIds = () => {
    const idsRaw = formData.get("orderIds");
    if (typeof idsRaw !== "string") return [];
    try {
      const parsed = JSON.parse(idsRaw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (error) {
      return idsRaw.split(",").map((value) => value.trim()).filter(Boolean);
    }
  };

  switch (intent) {
    case "assign": {
      const assignee = (formData.get("assignee") as string) ?? "unassigned";
      const ids = parseIds();
      const updated = assignOrders(scenario, seed, ids, assignee);
      return json<OrdersActionResponse>({
        success: true,
        message: `Assigned ${ids.length} order(s) to ${assignee}.`,
        updatedOrders: updated,
      });
    }
    case "markFulfilled": {
      const ids = parseIds();
      const trackingRaw = formData.get("tracking");
      let tracking:
        | { number: string; carrier: string }
        | undefined;
      if (typeof trackingRaw === "string") {
        try {
          const parsed = JSON.parse(trackingRaw);
          if (parsed && parsed.number && parsed.carrier) {
            tracking = {
              number: String(parsed.number),
              carrier: String(parsed.carrier),
            };
          }
        } catch (error) {
          // swallow parsing error, optional field
        }
      }
      const updated = markOrdersFulfilled(scenario, seed, ids, tracking);
      return json<OrdersActionResponse>({
        success: true,
        message: `Marked ${updated.length} order(s) fulfilled${tracking ? ` with tracking ${tracking.number}` : ""}.`,
        updatedOrders: updated,
      });
    }
    case "requestSupport": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        return json<OrdersActionResponse>(
          { success: false, message: "Missing payload for support request.", updatedOrders: [] },
          { status: 400 },
        );
      }
      const payload = JSON.parse(payloadRaw) as {
        orderId: string;
        conversationId?: string;
        note: string;
      };
      const result = requestSupport(scenario, seed, payload);
      return json<OrdersActionResponse>({
        success: Boolean(result),
        message: result ? `Support requested for ${result.name}.` : "Order not found.",
        updatedOrders: result ? [result] : [],
      });
    }
    case "updateReturn": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        return json<OrdersActionResponse>(
          { success: false, message: "Missing payload for return update.", updatedOrders: [] },
          { status: 400 },
        );
      }
      const payload = JSON.parse(payloadRaw) as {
        orderId: string;
        action: "approve_refund" | "deny" | "request_inspection";
        note?: string;
      };
      const result = updateReturnAction(scenario, seed, payload);
      return json<OrdersActionResponse>({
        success: Boolean(result),
        message: result ? `Return updated (${payload.action}) for ${payload.orderId}.` : "Return not found.",
        updatedOrders: result ? [] : [],
      });
    }
    default:
      return json<OrdersActionResponse>(
        { success: false, message: `Unknown intent: ${intent}`, updatedOrders: [] },
        { status: 400 },
      );
  }
};

const PRIORITY_TONE: Record<Order["priority"], "critical" | "warning" | "success"> = {
  vip: "critical",
  rush: "warning",
  standard: "success",
};

export default function OrdersRoute() {
  const { dataset, scenario, useMockData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<OrdersActionResponse>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assignTarget, setAssignTarget] = useState<OrderOwner>("assistant");
  const [toast, setToast] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const { mdUp } = useBreakpoints();

  const selectedIndex = Math.max(
    TAB_OPTIONS.findIndex((tab) => tab.id === dataset.tab),
    0,
  );

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(dataset.orders, {
    resourceIDResolver: (resource: Order) => resource.id,
  });

  const selectedOrderCount = useMemo(() => selectedResources.length, [selectedResources]);

  const handleTabChange = useCallback(
    (index: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("tab", TAB_OPTIONS[index]!.id);
      navigate(`?${params.toString()}`, { replace: true });
    },
    [navigate, searchParams],
  );

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.message) {
      setToast(fetcher.data.message);
    }
    clearSelection();
    revalidator.revalidate();
  }, [fetcher.data, clearSelection, revalidator]);

  const metrics = dataset.metrics;

  const handleAssign = () => {
    if (!selectedOrderCount) return;
    fetcher.submit(
      {
        intent: "assign",
        orderIds: JSON.stringify(selectedResources),
        assignee: assignTarget,
      },
      { method: "post" },
    );
  };

  const handleMarkFulfilled = () => {
    if (!selectedOrderCount) return;
    const first = selectedResources[0] ?? "";
    const trackingNumber = `TRK-${first.slice(-4).toUpperCase() || "0000"}`;
    fetcher.submit(
      {
        intent: "markFulfilled",
        orderIds: JSON.stringify(selectedResources),
        tracking: JSON.stringify({ number: trackingNumber, carrier: "UPS" }),
      },
      { method: "post" },
    );
  };

  return (
    <Page
      title="Orders"
      subtitle="Monitor fulfillment backlog, shipment health, and returns."
    >
      <TitleBar title="Orders" primaryAction={{ content: "Export CSV", url: "#" }} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {(dataset.alerts.length || dataset.dataGaps.length || useMockData) && (
              <BlockStack gap="200">
                {useMockData && (
                  <Banner tone={scenario === "warning" ? "warning" : "info"} title={`Mock state: ${scenario}`}>
                    <p>Append `mockState=warning` (etc) to preview additional states.</p>
                  </Banner>
                )}
                {dataset.alerts.map((alert, index) => (
                  <Banner tone="warning" title="Fulfillment alert" key={`alert-${index}`}>
                    <p>{alert}</p>
                  </Banner>
                ))}
                {dataset.dataGaps.map((gap, index) => (
                  <Banner tone="attention" title="Data gap" key={`gap-${index}`}>
                    <p>{gap}</p>
                  </Banner>
                ))}
              </BlockStack>
            )}

            <FulfillmentPulseCard metrics={metrics} total={dataset.count} />

            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Tabs tabs={TAB_OPTIONS} selected={selectedIndex} onSelect={handleTabChange} fitted />
                  <InlineStack gap="200">
                    <Select
                      labelHidden
                      label="Assign to"
                      options={AssignOptions}
                      value={assignTarget}
                      onChange={(value) => setAssignTarget(value as OrderOwner)}
                    />
                    <ButtonGroup>
                      <Button
                        disabled={!selectedOrderCount}
                        onClick={handleAssign}
                        loading={fetcher.state !== "idle" && fetcher.submission?.formData.get("intent") === "assign"}
                      >
                        Assign
                      </Button>
                      <Button
                        disabled={!selectedOrderCount}
                        onClick={handleMarkFulfilled}
                        loading={
                          fetcher.state !== "idle" &&
                          fetcher.submission?.formData.get("intent") === "markFulfilled"
                        }
                      >
                        Mark fulfilled
                      </Button>
                    </ButtonGroup>
                  </InlineStack>
                </InlineStack>

                <IndexTable
                  resourceName={{ singular: "order", plural: "orders" }}
                  itemCount={dataset.orders.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={mdUp ? IndexHeadingsDesktop : IndexHeadingsMobile}
                >
                  {dataset.orders.map((order, index) => (
                    <IndexTable.Row
                      id={order.id}
                      key={order.id}
                      position={index}
                      onClick={() => setActiveOrder(order)}
                    >
                      <IndexTable.Cell>
                        <BlockStack gap="050">
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            {order.name}
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone={PRIORITY_TONE[order.priority]}>{order.priority}</Badge>
                            <Text as="span" tone="subdued" variant="bodySm">
                              {order.customer.name}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Badge tone={order.issue === "none" ? "success" : "warning"}>
                            {order.issue}
                          </Badge>
                        </IndexTable.Cell>
                      )}
                      <IndexTable.Cell>
                        <Text variant="bodySm" as="span">
                          {order.total.formatted}
                        </Text>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {formatDate(order.shipBy ?? order.fulfillmentDueAt)}
                          </Text>
                        </IndexTable.Cell>
                      )}
                      <IndexTable.Cell>
                        <Text variant="bodySm" as="span">
                          {order.ageHours.toFixed(1)}h ago
                        </Text>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {order.assignedTo}
                          </Text>
                        </IndexTable.Cell>
                      )}
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </BlockStack>
            </Card>

            <Grid columns={{ xs: 1, md: 2 }} gap="400">
              <Grid.Cell>
                <ShipmentsCard shipments={dataset.shipments} />
              </Grid.Cell>
              <Grid.Cell>
                <ReturnsCard returns={dataset.returns} />
              </Grid.Cell>
            </Grid>

            <OperationalNotes inventory={dataset.inventory} alerts={dataset.alerts} />
          </BlockStack>
        </Layout.Section>
      </Layout>

      {toast && (
        <Toast content={toast} duration={3000} onDismiss={() => setToast(null)} />
      )}

      <OrderDetailModal order={activeOrder} onClose={() => setActiveOrder(null)} />
    </Page>
  );
}

const AssignOptions = [
  { label: "Assistant", value: "assistant" },
  { label: "Ops team", value: "ops" },
  { label: "Unassigned", value: "unassigned" },
];

const IndexHeadingsDesktop = [
  { title: "Order" },
  { title: "Issue" },
  { title: "Value" },
  { title: "Ship by" },
  { title: "Age" },
  { title: "Owner" },
];

const IndexHeadingsMobile = [
  { title: "Order" },
  { title: "Value" },
  { title: "Age" },
];

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "—";

function FulfillmentPulseCard({ metrics, total }: { metrics: OrdersMetrics; total: number }) {
  const rows: Array<[string, string, "critical" | "warning" | "success" | "attention" | undefined]> = [
    ["Total orders", String(metrics.totalOrders), undefined],
    ["Awaiting fulfillment", String(metrics.awaitingFulfillment), metrics.awaitingFulfillment > 0 ? "attention" : "success"],
    ["Awaiting tracking", String(metrics.awaitingTracking), metrics.awaitingTracking > 0 ? "warning" : "success"],
    ["Overdue", `${metrics.overdue} (${metrics.overduePercentage.toFixed(0)}%)`, metrics.overdue > 0 ? "critical" : "success"],
    ["Avg fulfillment time", `${metrics.averageFulfillmentHours.toFixed(1)}h`, undefined],
    ["SLA breaches", String(metrics.slaBreaches), metrics.slaBreaches ? "critical" : "success"],
  ];

  return (
    <Card title="Fulfillment pulse">
      <Card.Section>
        <Grid columns={{ xs: 1, sm: 2, md: 3 }} gap="200">
          {rows.map(([label, value, tone]) => (
            <Grid.Cell key={label}>
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  {label}
                </Text>
                <Text as="span" variant="headingSm">
                  {value}
                </Text>
                {tone && <Badge tone={tone}>Action needed</Badge>}
              </BlockStack>
            </Grid.Cell>
          ))}
        </Grid>
      </Card.Section>
    </Card>
  );
}

function ShipmentsCard({ shipments }: { shipments: OrdersDataset["shipments"] }) {
  const rows = shipments.trackingPending.map((entry) => [
    entry.orderNumber,
    formatDate(entry.expectedShipDate),
    entry.owner,
  ]);
  const delayedRows = shipments.delayed.map((entry) => [
    entry.orderNumber,
    entry.carrier,
    `${entry.delayHours}h`,
  ]);

 return (
   <Card title="Shipments">
     <Card.Section>
       <Text variant="headingSm" as="h3">
         Tracking pending ({shipments.trackingPending.length})
       </Text>
        {rows.length ? (
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Order", "Expected", "Owner"]}
            rows={rows}
            footerContent={`Delivered today: ${shipments.deliveredToday}`}
          />
        ) : (
          <Text variant="bodySm">No tracking items pending.</Text>
        )}
      </Card.Section>
      <Divider borderColor="border" />
      <Card.Section>
        <Text variant="headingSm" as="h3">
          Delayed ({shipments.delayed.length})
        </Text>
        {delayedRows.length ? (
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Order", "Carrier", "Delay"]}
            rows={delayedRows}
          />
        ) : (
          <Text variant="bodySm">No carrier delays.</Text>
        )}
      </Card.Section>
    </Card>
  );
}

function ReturnsCard({ returns }: { returns: OrdersDataset["returns"] }) {
  const rows = returns.pending.map((entry) => [
    entry.orderNumber,
    entry.stage.replace(/_/g, " "),
    entry.reason,
    `${entry.ageDays.toFixed(1)}d`,
  ]);

  return (
    <Card title="Returns & refunds">
      <Card.Section>
        <Text variant="bodySm" tone="subdued" as="span">
          Refund exposure {returns.refundValue.formatted} • Pending approvals {returns.refundsDue}
        </Text>
      </Card.Section>
      <Card.Section>
        {rows.length ? (
          <DataTable
            columnContentTypes={["text", "text", "text", "text"]}
            headings={["Order", "Stage", "Reason", "Age"]}
            rows={rows}
          />
        ) : (
          <Text variant="bodySm">No returns pending.</Text>
        )}
      </Card.Section>
    </Card>
  );
}

function OperationalNotes({
  inventory,
  alerts,
}: {
  inventory: OrdersDataset["inventory"];
  alerts: string[];
}) {
  return (
    <Card title="Operational notes">
      <Card.Section>
        <Text variant="headingSm" as="h3">
          Inventory blocks
        </Text>
        {inventory.length ? (
          <DataTable
            columnContentTypes={["text", "numeric", "numeric", "text"]}
            headings={["SKU", "Waiting", "On hand", "ETA"]}
            rows={inventory.map((item) => [
              `${item.sku} — ${item.title}`,
              item.ordersWaiting,
              item.onHand,
              formatDate(item.eta),
            ])}
          />
        ) : (
          <Text variant="bodySm">No inventory holds.</Text>
        )}
      </Card.Section>
      {alerts.length > 0 && (
        <Card.Section>
          <Text variant="headingSm" as="h3">
            Alerts
          </Text>
          <BlockStack gap="100">
            {alerts.map((alert, index) => (
              <Text key={index} variant="bodySm">
                • {alert}
              </Text>
            ))}
          </BlockStack>
        </Card.Section>
      )}
    </Card>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  return (
    <Modal
      instant
      open
      onClose={onClose}
      title={`Order ${order.name}`}
      primaryAction={{ content: "Close", onAction: onClose }}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">
              Customer
            </Text>
            <Badge tone={PRIORITY_TONE[order.priority]}>{order.priority}</Badge>
          </InlineStack>
          <Text>{order.customer.name}</Text>
          <Text tone="subdued">{order.customer.email}</Text>
        </BlockStack>
      </Modal.Section>
      <Divider borderColor="border" />
      <Modal.Section>
        <BlockStack gap="200">
          <Text variant="headingSm" as="h3">
            Timeline
          </Text>
          <BlockStack gap="100">
            {order.timeline.map((event) => (
              <BlockStack key={event.id} gap="050">
                <Text variant="bodyMd" fontWeight="semibold" as="span">
                  {event.message}
                </Text>
                <Text tone="subdued" variant="bodySm" as="span">
                  {new Date(event.occurredAt).toLocaleString()}
                </Text>
              </BlockStack>
            ))}
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
