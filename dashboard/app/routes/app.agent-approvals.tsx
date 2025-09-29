import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Modal,
  Page,
  Text,
  TextField,
  useIndexResourceState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";

type AgentAction = {
  id: string;
  agent: string;
  action: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  autoApprovable: boolean;
  batchId?: string;
};

type LoaderData = {
  actions: AgentAction[];
  autoApprovalEnabled: boolean;
  batchMode: boolean;
};

const getRiskTone = (risk: string): "success" | "warning" | "critical" => {
  switch (risk) {
    case "low": return "success";
    case "medium": return "warning";
    case "high": return "critical";
    default: return "info";
  }
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // let shopDomain = BASE_SHOP_DOMAIN;

  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    // shopDomain = session.shop;
  }

  // Mock data for demonstration
  const actions: AgentAction[] = [
    {
      id: "action-1",
      agent: "rag_ingest",
      action: "read",
      description: "Query inventory data for reorder analysis",
      riskLevel: "low",
      confidence: 0.95,
      timestamp: new Date().toISOString(),
      status: "pending",
      autoApprovable: true,
    },
    {
      id: "action-2",
      agent: "dashboard_orders",
      action: "write",
      description: "Update order status in database",
      riskLevel: "medium",
      confidence: 0.85,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: "pending",
      autoApprovable: false,
      batchId: "batch-1",
    },
    {
      id: "action-3",
      agent: "program_manager",
      action: "query",
      description: "Generate project status report",
      riskLevel: "low",
      confidence: 0.98,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      status: "pending",
      autoApprovable: true,
    },
  ];

  return json<LoaderData>(
    {
      actions,
      autoApprovalEnabled: true,
      batchMode: true,
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

  if (intent === "approve") {
    const actionIds = formData.getAll("actionIds");
    // const batchId = formData.get("batchId");

    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }

    return json({
      success: true,
      message: `Approved ${actionIds.length} action(s)`,
      approvedIds: actionIds,
    });
  }

  if (intent === "reject") {
    const actionId = formData.get("actionId");
    const reason = formData.get("reason");

    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }

    return json({
      success: true,
      message: `Rejected action ${actionId}`,
      reason,
    });
  }

  if (intent === "auto-approve-all") {
    const riskThreshold = formData.get("riskThreshold");

    if (!USE_MOCK_DATA) {
      await authenticate.admin(request);
    }

    return json({
      success: true,
      message: `Auto-approved all actions below ${riskThreshold} risk threshold`,
    });
  }

  return json({ success: false, message: "Unknown action" }, { status: 400 });
};

export default function AgentApprovalsRoute() {
  const { actions, autoApprovalEnabled } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedActions] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingActionId, setRejectingActionId] = useState<string | null>(null);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(actions);

  const pendingActions = actions.filter(action => action.status === "pending");
  const autoApprovableActions = pendingActions.filter(action => action.autoApprovable);
  const manualActions = pendingActions.filter(action => !action.autoApprovable);

  const handleApproveSelected = () => {
    const actionIds = selectedResources.length > 0 ? selectedResources : selectedActions;
    fetcher.submit(
      {
        intent: "approve",
        actionIds: actionIds,
      },
      { method: "post" }
    );
  };

  const handleRejectAction = (actionId: string) => {
    setRejectingActionId(actionId);
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (rejectingActionId) {
      fetcher.submit(
        {
          intent: "reject",
          actionId: rejectingActionId,
          reason: rejectReason,
        },
        { method: "post" }
      );
    }
    setShowRejectModal(false);
    setRejectReason("");
    setRejectingActionId(null);
  };

  const handleAutoApproveAll = (riskThreshold: string) => {
    fetcher.submit(
      {
        intent: "auto-approve-all",
        riskThreshold,
      },
      { method: "post" }
    );
  };

  // const groupedActions = pendingActions.reduce((groups, action) => {
    const key = action.batchId || action.id;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(action);
    return groups;
  // }, {} as Record<string, AgentAction[]>);

  return (
    <Page
      title="Agent Approvals"
      subtitle="Streamlined approval interface for agent actions"
    >
      <TitleBar
        title="Agent Approvals"
        primaryAction={{ content: "Auto-approve all low risk", url: "#" }}
      />

      <BlockStack gap="400">
        {autoApprovalEnabled && (
          <Banner tone="info" title="Auto-approval enabled">
            <p>Low-risk actions are automatically approved. High-risk actions require manual review.</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    Pending Actions ({pendingActions.length})
                  </Text>
                  <ButtonGroup>
                    <Button
                      onClick={() => handleAutoApproveAll("low")}
                      disabled={autoApprovableActions.length === 0}
                    >
                      Auto-approve all low risk ({autoApprovableActions.length})
                    </Button>
                    <Button
                      onClick={handleApproveSelected}
                      disabled={selectedResources.length === 0}
                    >
                      Approve selected ({selectedResources.length})
                    </Button>
                  </ButtonGroup>
                </InlineStack>
              </Card.Section>

              <Divider />

              <Card.Section>
                {pendingActions.length === 0 ? (
                  <EmptyState
                    heading="No pending actions"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>All agent actions have been processed.</p>
                  </EmptyState>
                ) : (
                  <BlockStack gap="300">
                    {/* Auto-approvable Actions */}
                    {autoApprovableActions.length > 0 && (
                      <Box background="bg-success-subdued" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Auto-approvable Actions ({autoApprovableActions.length})
                          </Text>
                          <Text variant="bodySm" as="p">
                            These actions can be automatically approved based on risk assessment.
                          </Text>
                          <Button
                            size="slim"
                            onClick={() => handleAutoApproveAll("low")}
                          >
                            Approve all auto-approvable
                          </Button>
                        </BlockStack>
                      </Box>
                    )}

                    {/* Manual Actions */}
                    {manualActions.length > 0 && (
                      <Box background="bg-warning-subdued" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Manual Review Required ({manualActions.length})
                          </Text>
                          <Text variant="bodySm" as="p">
                            These actions require manual review due to higher risk levels.
                          </Text>
                        </BlockStack>
                      </Box>
                    )}

                    {/* Actions Table */}
                    <IndexTable
                      resourceName={{ singular: "action", plural: "actions" }}
                      itemCount={pendingActions.length}
                      selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                      onSelectionChange={handleSelectionChange}
                      headings={[
                        { title: "Agent" },
                        { title: "Action" },
                        { title: "Description" },
                        { title: "Risk" },
                        { title: "Confidence" },
                        { title: "Time" },
                        { title: "Status" },
                        { title: "" },
                      ]}
                    >
                      {pendingActions.map((action, index) => (
                        <IndexTable.Row
                          id={action.id}
                          key={action.id}
                          position={index}
                          selected={selectedResources.includes(action.id)}
                        >
                          <IndexTable.Cell>
                            <Badge tone="info">{action.agent}</Badge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>{action.action}</IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text variant="bodySm" as="span">
                              {action.description}
                            </Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Badge tone={getRiskTone(action.riskLevel)}>
                              {action.riskLevel}
                            </Badge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            {Math.round(action.confidence * 100)}%
                          </IndexTable.Cell>
                          <IndexTable.Cell>{formatDate(action.timestamp)}</IndexTable.Cell>
                          <IndexTable.Cell>
                            <Badge tone={action.autoApprovable ? "success" : "warning"}>
                              {action.autoApprovable ? "Auto" : "Manual"}
                            </Badge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <ButtonGroup>
                              <Button
                                size="slim"
                                onClick={() => handleApproveSelected()}
                              >
                                Approve
                              </Button>
                              <Button
                                size="slim"
                                tone="critical"
                                onClick={() => handleRejectAction(action.id)}
                              >
                                Reject
                              </Button>
                            </ButtonGroup>
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      ))}
                    </IndexTable>
                  </BlockStack>
                )}
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Reject Modal */}
        <Modal
          open={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Action"
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Text as="p">
                Please provide a reason for rejecting this action:
              </Text>
              <TextField
                label="Rejection reason"
                multiline
                value={rejectReason}
                onChange={setRejectReason}
                placeholder="Enter reason for rejection..."
              />
            </BlockStack>
          </Modal.Section>
          <Modal.Section>
            <InlineStack align="end" gap="200">
              <Button onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button tone="critical" onClick={handleConfirmReject}>
                Reject Action
              </Button>
            </InlineStack>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
