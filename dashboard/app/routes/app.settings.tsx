import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Checkbox,
  Form,
  FormLayout,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getMockSettings } from "../mocks";
import type { SettingsPayload } from "../types/settings";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const data = await getMockSettings();

  return json<{ settings: SettingsPayload }>({ settings: data });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  // TODO: implement persistence via StoreSettingsRepository + secret helper.
  await request.formData();
  return json({ ok: true });
};

export default function SettingsRoute() {
  const { settings } = useLoaderData<typeof loader>();

  return (
    <Page title="Settings">
      <TitleBar title="Settings" primaryAction={{ content: "Save", disabled: true }} />
      <Layout>
        <Layout.Section>
          <Card title="Operational thresholds" sectioned>
            <Form method="post">
              <FormLayout>
                <TextField
                  label="Low stock minimum"
                  type="number"
                  value={String(settings.thresholds.lowStockMinimum)}
                  disabled
                  helpText="Controls low-stock badge across dashboard and inventory."
                  name="threshold.lowStockMinimum"
                />
                <TextField
                  label="Overdue order hours"
                  type="number"
                  value={String(settings.thresholds.overdueOrderHours)}
                  disabled
                  name="threshold.overdueOrderHours"
                />
                <TextField
                  label="Overstock definition (%)"
                  type="number"
                  value={String(settings.thresholds.overstockPercentage)}
                  disabled
                  name="threshold.overstockPercentage"
                />
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Feature toggles" sectioned>
            <BlockStack gap="200">
              <Checkbox
                label="Enable MCP integration"
                checked={settings.toggles.enableMcpIntegration}
                disabled
                name="toggle.enableMcp"
              />
              <Checkbox
                label="Experimental dashboard widgets"
                checked={settings.toggles.enableExperimentalWidgets}
                disabled
                name="toggle.experimentalWidgets"
              />
              <Checkbox
                label="Beta workflows"
                checked={settings.toggles.enableBetaWorkflows}
                disabled
                name="toggle.betaWorkflows"
              />
              <Text variant="bodySm" tone="subdued" as="span">
                TODO: wire form submission to StoreSettingsRepository with encrypted secret storage.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Layout>
        <Layout.Section>
          <Card title="SEO credentials" sectioned>
            <BlockStack gap="200">
              {Object.values(settings.secrets).map((secret, index) => (
                <BlockStack key={secret?.provider ?? index} gap="050">
                  <Text variant="headingSm" as="h3">
                    {(secret?.provider ?? "Unknown").toUpperCase()}
                  </Text>
                  <Text variant="bodySm" as="span">
                    {secret ? secret.maskedValue : "Not connected"}
                  </Text>
                  {secret?.lastVerifiedAt && (
                    <Text variant="bodySm" tone="subdued" as="span">
                      Last verified {new Date(secret.lastVerifiedAt).toLocaleDateString()}
                    </Text>
                  )}
                </BlockStack>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Connection history" sectioned>
            <BlockStack gap="200">
              {Object.values(settings.connections).map((connection) => (
                <BlockStack key={connection.provider} gap="050">
                  <Text variant="headingSm" as="h3">
                    {connection.provider.toUpperCase()}
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    Status: {connection.status}
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    Last checked: {connection.lastCheckedAt}
                  </Text>
                </BlockStack>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
