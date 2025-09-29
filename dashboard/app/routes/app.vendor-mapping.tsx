import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Badge,
  Banner,
  BlockStack,
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
import { getVendorMappingScenario, scenarioFromRequest } from "~/mocks/vendor-mapping";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type {
  VendorMapping,
  VendorMappingPayload,
  MockScenario,
} from "~/types/dashboard";

type LoaderData = {
  payload: VendorMappingPayload;
  scenario: MockScenario;
  useMockData: boolean;
};

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const scenario = scenarioFromRequest(request);
  let shopDomain = BASE_SHOP_DOMAIN;

  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const payload = getVendorMappingScenario({ scenario });

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

  if (intent === "create-vendor") {
    const name = formData.get("name");
    const email = formData.get("email");
    const leadTimeDays = formData.get("leadTimeDays");

    if (!name || !email || !leadTimeDays) {
      return json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // In a real implementation, this would save to the database
    return json({
      success: true,
      message: `Vendor ${name} created successfully`,
    });
  }

  if (intent === "update-vendor") {
    const vendorId = formData.get("vendorId");
    const name = formData.get("name");
    const email = formData.get("email");

    if (!vendorId || !name || !email) {
      return json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    return json({
      success: true,
      message: `Vendor ${name} updated successfully`,
    });
  }

  if (intent === "delete-vendor") {
    const vendorId = formData.get("vendorId");

    if (!vendorId) {
      return json({ success: false, message: "Missing vendor ID" }, { status: 400 });
    }

    return json({
      success: true,
      message: "Vendor deleted successfully",
    });
  }

  return json({ success: false, message: "Unknown action" }, { status: 400 });
};

export default function VendorMappingRoute() {
  const { payload, useMockData, scenario } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [selectedVendor, setSelectedVendor] = useState<VendorMapping | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(payload.vendors);

  const vendorRows = payload.vendors.map((vendor) => [
    vendor.name,
    vendor.email,
    vendor.leadTimeDays.toString(),
    formatCurrency(vendor.minimumOrderValue.amount, vendor.minimumOrderValue.currency),
    vendor.paymentTerms,
    <Badge tone={vendor.isActive ? "success" : "critical"}>
      {vendor.isActive ? "Active" : "Inactive"}
    </Badge>,
    formatDate(vendor.updatedAt),
  ]);

  const handleCreateVendor = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditVendor = (vendor: VendorMapping) => {
    setSelectedVendor(vendor);
    setIsEditModalOpen(true);
  };

  const handleDeleteVendor = (vendor: VendorMapping) => {
    setSelectedVendor(vendor);
    setIsDeleteModalOpen(true);
  };

  const handleViewMappings = (vendor: VendorMapping) => {
    setSelectedVendor(vendor);
    // Navigate to vendor SKU mappings view
  };

  return (
    <Page
      title="Vendor Mapping"
      subtitle="Manage vendor relationships and SKU mappings for inventory planning."
    >
      <TitleBar
        title="Vendor Mapping"
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
              <Banner tone="warning" title="Vendor mapping alert">
                <p>{payload.alert}</p>
              </Banner>
            )}
            {payload.error && (
              <Banner tone="critical" title="Vendor mapping unavailable">
                <p>{payload.error}</p>
              </Banner>
            )}
          </BlockStack>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <Card>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    Vendors ({payload.vendors.length})
                  </Text>
                  <ButtonGroup>
                    <Button onClick={handleCreateVendor}>Add vendor</Button>
                  </ButtonGroup>
                </InlineStack>
              </Card>

              <Divider />

              <Card>
                {payload.vendors.length === 0 ? (
                  <EmptyState
                    heading="No vendors found"
                    action={{
                      content: "Add your first vendor",
                      onAction: handleCreateVendor,
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Add vendors to start mapping SKUs and managing inventory relationships.</p>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "vendor", plural: "vendors" }}
                    itemCount={payload.vendors.length}
                    selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      { title: "Name" },
                      { title: "Email" },
                      { title: "Lead time (days)" },
                      { title: "Min order value" },
                      { title: "Payment terms" },
                      { title: "Status" },
                      { title: "Last updated" },
                      { title: "" },
                    ]}
                  >
                    {payload.vendors.map((vendor, index) => (
                      <IndexTable.Row
                        id={vendor.id}
                        key={vendor.id}
                        position={index}
                        selected={selectedResources.includes(vendor.id)}
                      >
                        <IndexTable.Cell>
                          <BlockStack gap="050">
                            <Text variant="bodyMd" as="span">
                              {vendor.name}
                            </Text>
                            {vendor.phone && (
                              <Text variant="bodySm" tone="subdued" as="span">
                                {vendor.phone}
                              </Text>
                            )}
                          </BlockStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{vendor.email}</IndexTable.Cell>
                        <IndexTable.Cell>{vendor.leadTimeDays}</IndexTable.Cell>
                        <IndexTable.Cell>
                          {formatCurrency(vendor.minimumOrderValue.amount, vendor.minimumOrderValue.currency)}
                        </IndexTable.Cell>
                        <IndexTable.Cell>{vendor.paymentTerms}</IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge tone={vendor.isActive ? "success" : "critical"}>
                            {vendor.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{formatDate(vendor.updatedAt)}</IndexTable.Cell>
                        <IndexTable.Cell>
                          <ButtonGroup>
                            <Button
                              size="slim"
                              onClick={() => handleViewMappings(vendor)}
                            >
                              View mappings
                            </Button>
                            <Button
                              size="slim"
                              onClick={() => handleEditVendor(vendor)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="slim"
                              tone="critical"
                              onClick={() => handleDeleteVendor(vendor)}
                            >
                              Delete
                            </Button>
                          </ButtonGroup>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                )}
              </Card>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Create Vendor Modal */}
        <Modal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add new vendor"
        >
          <Modal.Section>
            <BlockStack gap="300">
              <TextField
                label="Vendor name"
                value=""
                onChange={() => {}}
                placeholder="Enter vendor name"
              />
              <TextField
                label="Email"
                type="email"
                value=""
                onChange={() => {}}
                placeholder="vendor@example.com"
              />
              <TextField
                label="Phone"
                value=""
                onChange={() => {}}
                placeholder="+1 (555) 123-4567"
              />
              <TextField
                label="Lead time (days)"
                type="number"
                value=""
                onChange={() => {}}
                placeholder="30"
              />
              <TextField
                label="Minimum order value"
                type="number"
                value=""
                onChange={() => {}}
                placeholder="1000"
                prefix="$"
              />
              <TextField
                label="Payment terms"
                value=""
                onChange={() => {}}
                placeholder="Net 30"
              />
              <TextField
                label="Notes"
                multiline
                value=""
                onChange={() => {}}
                placeholder="Additional notes about this vendor"
              />
            </BlockStack>
          </Modal.Section>
          <Modal.Section>
            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button primary>Create vendor</Button>
            </InlineStack>
          </Modal.Section>
        </Modal>

        {/* Edit Vendor Modal */}
        <Modal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit ${selectedVendor?.name}`}
        >
          {selectedVendor && (
            <Modal.Section>
              <BlockStack gap="300">
                <TextField
                  label="Vendor name"
                  value={selectedVendor.name}
                  onChange={() => {}}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={selectedVendor.email}
                  onChange={() => {}}
                />
                <TextField
                  label="Phone"
                  value={selectedVendor.phone || ""}
                  onChange={() => {}}
                />
                <TextField
                  label="Lead time (days)"
                  type="number"
                  value={selectedVendor.leadTimeDays.toString()}
                  onChange={() => {}}
                />
                <TextField
                  label="Minimum order value"
                  type="number"
                  value={selectedVendor.minimumOrderValue.amount.toString()}
                  onChange={() => {}}
                  prefix="$"
                />
                <TextField
                  label="Payment terms"
                  value={selectedVendor.paymentTerms}
                  onChange={() => {}}
                />
                <TextField
                  label="Notes"
                  multiline
                  value={selectedVendor.notes || ""}
                  onChange={() => {}}
                />
              </BlockStack>
            </Modal.Section>
          )}
          <Modal.Section>
            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button primary>Save changes</Button>
            </InlineStack>
          </Modal.Section>
        </Modal>

        {/* Delete Vendor Modal */}
        <Modal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Delete ${selectedVendor?.name}`}
        >
          {selectedVendor && (
            <Modal.Section>
              <Text as="p">
                Are you sure you want to delete {selectedVendor.name}? This action cannot be undone.
              </Text>
            </Modal.Section>
          )}
          <Modal.Section>
            <InlineStack align="end" gap="200">
              <Button onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button tone="critical">Delete vendor</Button>
            </InlineStack>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
