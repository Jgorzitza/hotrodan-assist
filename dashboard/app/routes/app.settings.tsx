import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FormLayout,
  InlineError,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { z } from "zod";

import { authenticate } from "../shopify.server";
import { runConnectionTest } from "../lib/settings/connection-tests.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import { BASE_SHOP_DOMAIN } from "~/mocks/settings";
import type {
  ConnectionStatusState,
  FeatureToggles,
  SettingsPayload,
  SettingsProvider,
  ThresholdSettings,
} from "../types/settings";

const providerMeta: Record<
  SettingsProvider,
  { label: string; description: string }
> = {
  ga4: {
    label: "Google Analytics 4",
    description: "Used for traffic, conversions, and anomaly detection widgets.",
  },
  gsc: {
    label: "Google Search Console",
    description: "Required for keyword rankings and crawl issue surfacing.",
  },
  bing: {
    label: "Bing Webmaster Tools",
    description: "Optional, powers supplemental keyword audits.",
  },
};

const thresholdsSchema = z.object({
  lowStockMinimum: z.coerce.number().int().min(0).max(500),
  overdueOrderHours: z.coerce.number().int().min(1).max(240),
  overstockPercentage: z.coerce.number().int().min(0).max(500),
});

const togglesSchema = z.object({
  enableMcpIntegration: z.boolean(),
  enableExperimentalWidgets: z.boolean(),
  enableBetaWorkflows: z.boolean(),
});

type SecretActionPayload = {
  provider: SettingsProvider;
  secret: string | null;
  rotationReminderAt?: string | null;
};

type ActionData = {
  ok: boolean;
  settings?: SettingsPayload;
  fieldErrors?: Record<string, string>;
  formErrors?: string[];
  toast?: {
    status: "success" | "error" | "warning";
    message: string;
  };
  meta?: {
    intent: string;
    provider?: SettingsProvider;
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (USE_MOCK_DATA) {
    const settings = await storeSettingsRepository.getSettings(BASE_SHOP_DOMAIN);
    return json({ settings, useMockData: true as const });
  }

  const { session } = await authenticate.admin(request);
  const settings = await storeSettingsRepository.getSettings(session.shop);

  return json({ settings, useMockData: false as const });
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

const parseSecretForm = (formData: FormData): SecretActionPayload => {
  const provider = z
    .enum(["ga4", "gsc", "bing"] as const)
    .parse(formData.get("provider"));
  const rawSecret = formData.get("secret");
  const secretValue =
    typeof rawSecret === "string" && rawSecret.trim().length > 0
      ? rawSecret.trim()
      : null;
  const rawRotation = formData.get("rotationReminderAt");
  const rotationReminderAt =
    typeof rawRotation === "string" && rawRotation
      ? new Date(`${rawRotation}T00:00:00.000Z`).toISOString()
      : null;

  return { provider, secret: secretValue, rotationReminderAt };
};

const providerStatusToBadge = (status: ConnectionStatusState) => {
  switch (status) {
    case "success":
      return { tone: "success" as const, label: "Success" };
    case "warning":
      return { tone: "warning" as const, label: "Warning" };
    default:
      return { tone: "critical" as const, label: "Error" };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  let shopDomain = BASE_SHOP_DOMAIN;
  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (typeof intent !== "string") {
    return badRequest({
      ok: false,
      formErrors: ["Missing intent"],
    });
  }

  switch (intent) {
    case "update-thresholds": {
      const parseResult = thresholdsSchema.safeParse({
        lowStockMinimum: formData.get("lowStockMinimum"),
        overdueOrderHours: formData.get("overdueOrderHours"),
        overstockPercentage: formData.get("overstockPercentage"),
      });

      if (!parseResult.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            fieldErrors[key] = issue.message;
          }
        }

        return badRequest({
          ok: false,
          fieldErrors,
          meta: { intent },
        });
      }

      const updated = await storeSettingsRepository.updateThresholds(
        shopDomain,
        parseResult.data as ThresholdSettings,
      );

      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: "Operational thresholds updated",
        },
        meta: { intent },
      });
    }
    case "update-toggles": {
      const togglesInput: FeatureToggles = {
        enableMcpIntegration: formData.has("enableMcpIntegration"),
        enableExperimentalWidgets: formData.has("enableExperimentalWidgets"),
        enableBetaWorkflows: formData.has("enableBetaWorkflows"),
      };

      const parseResult = togglesSchema.safeParse(togglesInput);
      if (!parseResult.success) {
        return badRequest({
          ok: false,
          formErrors: ["Unable to parse toggles"],
          meta: { intent },
        });
      }

      const updated = await storeSettingsRepository.updateToggles(
        shopDomain,
        parseResult.data,
      );

      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: "Feature toggles saved",
        },
        meta: { intent },
      });
    }
    case "update-secret": {
      let secretPayload: SecretActionPayload;
      try {
        secretPayload = parseSecretForm(formData);
      } catch (error) {
        return badRequest({
          ok: false,
          formErrors: ["Invalid secret payload"],
          meta: { intent },
        });
      }

      const actionTypeRaw = formData.get("actionType");
      const actionType =
        typeof actionTypeRaw === "string" && actionTypeRaw === "remove"
          ? "remove"
          : "save";

      if (secretPayload.secret && secretPayload.secret.length < 4) {
        return badRequest({
          ok: false,
          fieldErrors: {
            [`secret-${secretPayload.provider}`]:
              "Secret must be at least 4 characters.",
          },
          meta: { intent, provider: secretPayload.provider },
        });
      }

      if (actionType === "remove") {
        const updated = await storeSettingsRepository.updateSecret(
          shopDomain,
          {
            provider: secretPayload.provider,
            secret: null,
            rotationReminderAt: null,
          },
        );

        return json({
          ok: true,
          settings: updated,
          toast: {
            status: "warning",
            message: `${providerMeta[secretPayload.provider].label} credential removed`,
          },
          meta: { intent, provider: secretPayload.provider },
        });
      }

      let secretToPersist = secretPayload.secret;
      if (!secretToPersist) {
        const existingSecret = await storeSettingsRepository.getDecryptedSecret(
          shopDomain,
          secretPayload.provider,
        );

        if (!existingSecret) {
          return badRequest({
            ok: false,
            fieldErrors: {
              [`secret-${secretPayload.provider}`]:
                "Enter a credential before saving.",
            },
            meta: { intent, provider: secretPayload.provider },
          });
        }

        secretToPersist = existingSecret;
      }

      const updated = await storeSettingsRepository.updateSecret(shopDomain, {
        provider: secretPayload.provider,
        secret: secretToPersist,
        rotationReminderAt: secretPayload.rotationReminderAt ?? null,
      });

      const isNewSecret = Boolean(secretPayload.secret);

      return json({
        ok: true,
        settings: updated,
        toast: {
          status: "success",
          message: isNewSecret
            ? `${providerMeta[secretPayload.provider].label} credential saved`
            : `${providerMeta[secretPayload.provider].label} reminder updated`,
        },
        meta: { intent, provider: secretPayload.provider },
      });
    }
    case "test-connection": {
      let provider: SettingsProvider;
      try {
        provider = z.enum(["ga4", "gsc", "bing"] as const).parse(
          formData.get("provider"),
        );
      } catch {
        return badRequest({
          ok: false,
          formErrors: ["Unknown provider"],
          meta: { intent },
        });
      }

      const secret = await storeSettingsRepository.getDecryptedSecret(
        shopDomain,
        provider,
      );

      if (!secret) {
        const updated = await storeSettingsRepository.recordConnectionTest(
          shopDomain,
          {
            provider,
            status: "error",
            durationMs: 0,
            message: "Credential missing",
          },
        );

        return badRequest({
          ok: false,
          settings: updated,
          toast: {
            status: "error",
            message: `${providerMeta[provider].label} credential missing. Add an API key before testing.`,
          },
          meta: { intent, provider },
        });
      }

      const { status, durationMs, message } = await runConnectionTest({
        provider,
        credential: secret,
      });
      const updated = await storeSettingsRepository.recordConnectionTest(
        shopDomain,
        {
          provider,
          status,
          durationMs,
          message,
        },
      );

      return json({
        ok: true,
        settings: updated,
        toast: {
          status: status === "success" ? "success" : "warning",
          message:
            status === "success"
              ? `${providerMeta[provider].label} connection healthy`
              : `${providerMeta[provider].label} responded, but review warnings`,
        },
        meta: { intent, provider },
      });
    }
    default:
      return badRequest({
        ok: false,
        formErrors: ["Unsupported intent"],
        meta: { intent },
      });
  }
};

const isoToDateInput = (iso?: string | null) =>
  iso ? iso.slice(0, 10) : "";

export default function SettingsRoute() {
  const { settings, useMockData } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const appBridge = useAppBridge();

  const [thresholds, setThresholds] = useState(settings.thresholds);
  const [toggles, setToggles] = useState(settings.toggles);
  const [secretDrafts, setSecretDrafts] = useState<Record<SettingsProvider, string>>({
    ga4: "",
    gsc: "",
    bing: "",
  });
  const [rotationDrafts, setRotationDrafts] = useState<
    Record<SettingsProvider, string>
  >({
    ga4: isoToDateInput(settings.secrets.ga4?.rotationReminderAt),
    gsc: isoToDateInput(settings.secrets.gsc?.rotationReminderAt),
    bing: isoToDateInput(settings.secrets.bing?.rotationReminderAt),
  });

  useEffect(() => {
    setThresholds(settings.thresholds);
    setToggles(settings.toggles);
    setRotationDrafts({
      ga4: isoToDateInput(settings.secrets.ga4?.rotationReminderAt),
      gsc: isoToDateInput(settings.secrets.gsc?.rotationReminderAt),
      bing: isoToDateInput(settings.secrets.bing?.rotationReminderAt),
    });
  }, [settings]);

  useEffect(() => {
    if (actionData?.toast) {
      appBridge.toast.show({
        message: actionData.toast.message,
        isError: actionData.toast.status === "error",
        duration: 4000,
      });
    }

    if (actionData?.ok && actionData.meta?.intent === "update-secret") {
      setSecretDrafts((prev) => ({
        ...prev,
        [actionData.meta?.provider as SettingsProvider]: "",
      }));
    }
  }, [actionData, appBridge]);

  const fieldErrors = actionData?.fieldErrors ?? {};

  const isSubmitting = (targetIntent: string) =>
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === targetIntent;

  return (
    <Page
      title="Settings"
      subtitle="Manage operational thresholds, API access, and feature flags."
    >
      <TitleBar title="Settings" />
      {useMockData && (
        <Box paddingBlockStart="400">
          <Banner title="Mock data enabled" tone="info">
            <p>
              Changes apply to in-memory fixtures. Clear the server to reset or set
              `USE_MOCK_DATA=false` to connect to live Shopify data.
            </p>
          </Banner>
        </Box>
      )}
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Header title="Operational thresholds" />
            <Card.Section>
              <Form method="post">
                <input type="hidden" name="intent" value="update-thresholds" />
                <FormLayout>
                  <TextField
                    label="Low-stock minimum"
                    type="number"
                    name="lowStockMinimum"
                    value={String(thresholds.lowStockMinimum)}
                    onChange={(value) =>
                      setThresholds((prev) => ({
                        ...prev,
                        lowStockMinimum: Number(value || 0),
                      }))
                    }
                    min={0}
                    autoComplete="off"
                    error={
                      actionData?.meta?.intent === "update-thresholds"
                        ? fieldErrors.lowStockMinimum
                        : undefined
                    }
                    helpText="Trigger low-stock alerts when inventory drops below this value."
                  />
                  <TextField
                    label="Overdue order hours"
                    type="number"
                    name="overdueOrderHours"
                    value={String(thresholds.overdueOrderHours)}
                    onChange={(value) =>
                      setThresholds((prev) => ({
                        ...prev,
                        overdueOrderHours: Number(value || 0),
                      }))
                    }
                    min={1}
                    autoComplete="off"
                    error={
                      actionData?.meta?.intent === "update-thresholds"
                        ? fieldErrors.overdueOrderHours
                        : undefined
                    }
                    helpText="Orders exceeding this window surface in the orders dashboard."
                  />
                  <TextField
                    label="Overstock percentage"
                    type="number"
                    name="overstockPercentage"
                    value={String(thresholds.overstockPercentage)}
                    onChange={(value) =>
                      setThresholds((prev) => ({
                        ...prev,
                        overstockPercentage: Number(value || 0),
                      }))
                    }
                    min={0}
                    autoComplete="off"
                    error={
                      actionData?.meta?.intent === "update-thresholds"
                        ? fieldErrors.overstockPercentage
                        : undefined
                    }
                    helpText="Inventory flagged as overstock when buffer exceeds this percentage."
                  />
                  <Button
                    submit
                    primary
                    loading={isSubmitting("update-thresholds")}
                  >
                    Save thresholds
                  </Button>
                </FormLayout>
              </Form>
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card.Header title="Integrations" />
            <Card.Section>
              <BlockStack gap="400">
                {(
                  Object.keys(providerMeta) as SettingsProvider[]
                ).map((provider) => {
                  const meta = providerMeta[provider];
                  const secret = settings.secrets[provider];
                  const connection = settings.connections[provider];
                  const badge = providerStatusToBadge(connection.status);
                  const secretError =
                    actionData?.meta?.provider === provider
                      ? fieldErrors[`secret-${provider}`]
                      : undefined;
                  const submittingSecret =
                    isSubmitting("update-secret") &&
                    navigation.formData?.get("provider") === provider;

                  return (
                    <Box
                      key={provider}
                      padding="400"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border-subdued"
                    >
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd">
                              {meta.label}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {meta.description}
                            </Text>
                          </BlockStack>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </InlineStack>

                        {connection.message && (
                          <Banner
                            tone={connection.status === "error" ? "critical" : "warning"}
                            title={connection.message}
                          >
                            <Text as="p" variant="bodySm">
                              Last checked {connection.lastCheckedAt ?? "never"}
                            </Text>
                          </Banner>
                        )}

                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm">
                            Stored credential: {" "}
                            {secret?.maskedValue ?? "Not configured"}
                          </Text>
                          <Form method="post">
                            <input type="hidden" name="intent" value="update-secret" />
                            <input type="hidden" name="provider" value={provider} />
                            <FormLayout>
                              <TextField
                                label="New credential"
                                type="text"
                                name="secret"
                                autoComplete="off"
                                value={secretDrafts[provider]}
                                onChange={(value) =>
                                  setSecretDrafts((prev) => ({
                                    ...prev,
                                    [provider]: value,
                                  }))
                                }
                                placeholder="Paste API key or service account JSON"
                                error={secretError}
                              />
                              <TextField
                                label="Rotation reminder"
                                type="date"
                                name="rotationReminderAt"
                                value={rotationDrafts[provider]}
                                onChange={(value) =>
                                  setRotationDrafts((prev) => ({
                                    ...prev,
                                    [provider]: value,
                                  }))
                                }
                              />
                              <InlineStack gap="200">
                                <Button
                                  submit
                                  primary
                                  name="actionType"
                                  value="save"
                                  loading={
                                    submittingSecret &&
                                    navigation.formData?.get("actionType") !== "remove"
                                  }
                                >
                                  Save credential
                                </Button>
                                <Button
                                  variant="secondary"
                                  tone="critical"
                                  submit
                                  name="actionType"
                                  value="remove"
                                  disabled={!secret}
                                  loading={
                                    submittingSecret &&
                                    navigation.formData?.get("actionType") === "remove"
                                  }
                                  onClick={() =>
                                    setSecretDrafts((prev) => ({
                                      ...prev,
                                      [provider]: "",
                                    }))
                                  }
                                >
                                  Remove credential
                                </Button>
                              </InlineStack>
                            </FormLayout>
                          </Form>
                        </BlockStack>

                        <Divider />
                        <Form method="post">
                          <input type="hidden" name="intent" value="test-connection" />
                          <input type="hidden" name="provider" value={provider} />
                          <InlineStack gap="300">
                            <Button
                              submit
                              loading={
                                isSubmitting("test-connection") &&
                                navigation.formData?.get("provider") === provider
                              }
                            >
                              Test connection
                            </Button>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Last {connection.history[0]?.status ?? "n/a"} test at {" "}
                              {connection.history[0]?.timestamp ?? "n/a"}
                              {connection.history[0]?.message
                                ? ` — ${connection.history[0]?.message}`
                                : ""}
                            </Text>
                          </InlineStack>
                        </Form>
                      </BlockStack>
                    </Box>
                  );
                })}
              </BlockStack>
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card.Header title="Feature toggles" />
            <Card.Section>
              <Form method="post">
                <input type="hidden" name="intent" value="update-toggles" />
                <BlockStack gap="300">
                  <Checkbox
                    label="Enable MCP integration"
                    name="enableMcpIntegration"
                    checked={toggles.enableMcpIntegration}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableMcpIntegration: value,
                      }))
                    }
                    helpText="Controls access to storefront MCP widgets."
                  />
                  <Checkbox
                    label="Enable experimental widgets"
                    name="enableExperimentalWidgets"
                    checked={toggles.enableExperimentalWidgets}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableExperimentalWidgets: value,
                      }))
                    }
                    helpText="Shows beta dashboard cards for internal QA."
                  />
                  <Checkbox
                    label="Enable beta workflows"
                    name="enableBetaWorkflows"
                    checked={toggles.enableBetaWorkflows}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableBetaWorkflows: value,
                      }))
                    }
                    helpText="Allows merchants to opt into upcoming flows."
                  />
                  {actionData?.formErrors &&
                    actionData.meta?.intent === "update-toggles" && (
                      <InlineError
                        message={actionData.formErrors.join(", ")}
                        fieldID="feature-toggles"
                      />
                    )}
                  <Button
                    submit
                    primary
                    loading={isSubmitting("update-toggles")}
                  >
                    Save toggles
                  </Button>
                </BlockStack>
              </Form>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
