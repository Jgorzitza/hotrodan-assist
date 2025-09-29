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
  DataTable,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { z } from "zod";

import { authenticate } from "../shopify.server";
import { runConnectionTest } from "../lib/settings/connection-tests.server";
import { storeSettingsRepository } from "../lib/settings/repository.server";
import type { McpIntegrationOverrides } from "../lib/settings/repository.server";
import { checkAllServicesHealth, getEnvironmentStatus, type HealthCheckResult } from "../lib/settings/health-checks.server";
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
  mcp: {
    label: "Shopify MCP",
    description:
      "Powers storefront intelligence. Provide the MCP API key issued for this shop.",
  },
};

const thresholdsSchema = z.object({
  lowStockMinimum: z.coerce.number().int().min(0).max(500),
  overdueOrderHours: z.coerce.number().int().min(1).max(240),
  overstockPercentage: z.coerce.number().int().min(0).max(500),
});

const togglesSchema = z.object({
  enableMcpIntegration: z.boolean(),
  enableAssistantsProvider: z.boolean(),
  enableExperimentalWidgets: z.boolean(),
  enableBetaWorkflows: z.boolean(),
  useMockData: z.boolean(),
  enableMcp: z.boolean(),
  enableSeo: z.boolean(),
  enableInventory: z.boolean(),
});

type SecretActionPayload = {
  provider: SettingsProvider;
  secret: string | null;
  rotationReminderAt?: string | null;
};

type ActionData = {
  ok: boolean;
  settings?: SettingsPayload;
  mcpOverrides?: McpIntegrationOverrides;
  healthChecks?: HealthCheckResult[];
  envStatus?: Record<string, { present: boolean; value?: string }>;
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
  let shopDomain = BASE_SHOP_DOMAIN;

  if (!USE_MOCK_DATA) {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const [settings, mcpOverrides, healthChecks, envStatus] = await Promise.all([
    storeSettingsRepository.getSettings(shopDomain),
    storeSettingsRepository.getMcpIntegrationOverrides(shopDomain),
    checkAllServicesHealth(),
    Promise.resolve(getEnvironmentStatus()),
  ]);

  return json({
    settings,
    useMockData: USE_MOCK_DATA ? (true as const) : (false as const),
    mcpOverrides,
    healthChecks,
    envStatus,
  });
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

const parseSecretForm = (formData: FormData): SecretActionPayload => {
  const provider = z
    .enum(["ga4", "gsc", "bing", "mcp"] as const)
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

const healthStatusToBadge = (status: HealthCheckResult["status"]) => {
  switch (status) {
    case "healthy":
      return { tone: "success" as const, label: "Healthy" };
    case "unhealthy":
      return { tone: "critical" as const, label: "Unhealthy" };
    default:
      return { tone: "warning" as const, label: "Unknown" };
  }
};

const MCP_TIMEOUT_MIN_MS = 100;
const MCP_TIMEOUT_MAX_MS = 120_000;
const MCP_MAX_RETRIES_MIN = 0;
const MCP_MAX_RETRIES_MAX = 10;

const parseMcpOverridesForm = (formData: FormData) => {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  const rawEndpoint = formData.get("endpoint");
  let endpoint: string | null | undefined = undefined;
  if (typeof rawEndpoint === "string") {
    const trimmed = rawEndpoint.trim();
    if (trimmed.length === 0) {
      endpoint = null;
    } else if (!/^https?:\/\//i.test(trimmed)) {
      fieldErrors["mcp-endpoint"] =
        "Endpoint must start with http:// or https://.";
    } else {
      endpoint = trimmed;
    }
  }

  const rawTimeout = formData.get("timeoutMs");
  let timeoutMs: number | null | undefined = undefined;
  if (typeof rawTimeout === "string") {
    const trimmed = rawTimeout.trim();
    if (trimmed.length === 0) {
      timeoutMs = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        fieldErrors["mcp-timeoutMs"] =
          "Timeout must be a positive number of milliseconds.";
      } else if (
        parsed < MCP_TIMEOUT_MIN_MS ||
        parsed > MCP_TIMEOUT_MAX_MS
      ) {
        fieldErrors["mcp-timeoutMs"] = `Timeout must be between ${MCP_TIMEOUT_MIN_MS} and ${MCP_TIMEOUT_MAX_MS} ms.`;
      } else {
        timeoutMs = Math.round(parsed);
      }
    }
  }

  const rawMaxRetries = formData.get("maxRetries");
  let maxRetries: number | null | undefined = undefined;
  if (typeof rawMaxRetries === "string") {
    const trimmed = rawMaxRetries.trim();
    if (trimmed.length === 0) {
      maxRetries = null;
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        fieldErrors["mcp-maxRetries"] =
          "Max retries must be an integer.";
      } else if (
        parsed < MCP_MAX_RETRIES_MIN ||
        parsed > MCP_MAX_RETRIES_MAX
      ) {
        fieldErrors["mcp-maxRetries"] = `Max retries must be between ${MCP_MAX_RETRIES_MIN} and ${MCP_MAX_RETRIES_MAX}.`;
      } else {
        maxRetries = parsed;
      }
    }
  }

  const overrides: Partial<McpIntegrationOverrides> = {};
  if (endpoint !== undefined) {
    overrides.endpoint = endpoint;
  }
  if (timeoutMs !== undefined) {
    overrides.timeoutMs = timeoutMs;
  }
  if (maxRetries !== undefined) {
    overrides.maxRetries = maxRetries;
  }

  return { overrides, fieldErrors, formErrors };
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
        enableAssistantsProvider: formData.has("enableAssistantsProvider"),
        enableExperimentalWidgets: formData.has("enableExperimentalWidgets"),
        enableBetaWorkflows: formData.has("enableBetaWorkflows"),
        useMockData: formData.has("useMockData"),
        enableMcp: formData.has("enableMcp"),
        enableSeo: formData.has("enableSeo"),
        enableInventory: formData.has("enableInventory"),
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
    case "update-mcp-overrides": {
      const { overrides, fieldErrors: overrideFieldErrors, formErrors } =
        parseMcpOverridesForm(formData);

      if (
        Object.keys(overrideFieldErrors).length > 0 ||
        formErrors.length > 0
      ) {
        return badRequest({
          ok: false,
          fieldErrors: overrideFieldErrors,
          formErrors: formErrors.length > 0 ? formErrors : undefined,
          meta: { intent },
        });
      }

      const updatedOverrides =
        await storeSettingsRepository.updateMcpIntegrationOverrides(
          shopDomain,
          overrides,
        );

      return json({
        ok: true,
        mcpOverrides: updatedOverrides,
        toast: {
          status: "success",
          message: "MCP override settings saved",
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
        provider = z.enum(["ga4", "gsc", "bing", "mcp"] as const).parse(
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

      let connectionOverrides: Parameters<typeof runConnectionTest>[0]["overrides"];
      if (provider === "mcp") {
        const overrides =
          await storeSettingsRepository.getMcpIntegrationOverrides(shopDomain);
        connectionOverrides = {
          endpoint: overrides.endpoint ?? undefined,
          timeoutMs: overrides.timeoutMs ?? undefined,
          maxRetries: overrides.maxRetries ?? undefined,
        };
      }

      const { status, durationMs, message } = await runConnectionTest({
        provider,
        credential: secret,
        overrides: connectionOverrides,
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
    case "refresh-health": {
      const healthChecks = await checkAllServicesHealth();
      const envStatus = getEnvironmentStatus();
      
      return json({
        ok: true,
        healthChecks,
        envStatus,
        toast: {
          status: "success",
          message: "Health status refreshed",
        },
        meta: { intent },
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
  const { settings, useMockData, mcpOverrides: initialMcpOverrides, healthChecks: initialHealthChecks, envStatus: initialEnvStatus } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const appBridge = useAppBridge();

  const [thresholds, setThresholds] = useState(settings.thresholds);
  const [toggles, setToggles] = useState(settings.toggles);
  const [secretDrafts, setSecretDrafts] = useState<Record<SettingsProvider, string>>({
    ga4: "",
    gsc: "",
    bing: "",
    mcp: "",
  });
  const [rotationDrafts, setRotationDrafts] = useState<
    Record<SettingsProvider, string>
  >({
    ga4: isoToDateInput(settings.secrets.ga4?.rotationReminderAt),
    gsc: isoToDateInput(settings.secrets.gsc?.rotationReminderAt),
    bing: isoToDateInput(settings.secrets.bing?.rotationReminderAt),
    mcp: isoToDateInput(settings.secrets.mcp?.rotationReminderAt),
  });
  const [mcpOverridesState, setMcpOverridesState] = useState(initialMcpOverrides);
  const [mcpOverrideDraft, setMcpOverrideDraft] = useState({
    endpoint: initialMcpOverrides.endpoint ?? "",
    timeoutMs: initialMcpOverrides.timeoutMs
      ? String(initialMcpOverrides.timeoutMs)
      : "",
    maxRetries: initialMcpOverrides.maxRetries
      ? String(initialMcpOverrides.maxRetries)
      : "",
  });
  const [healthChecks, setHealthChecks] = useState(initialHealthChecks);
  const [envStatus, setEnvStatus] = useState(initialEnvStatus);

  useEffect(() => {
    setThresholds(settings.thresholds);
    setToggles(settings.toggles);
    setRotationDrafts({
      ga4: isoToDateInput(settings.secrets.ga4?.rotationReminderAt),
      gsc: isoToDateInput(settings.secrets.gsc?.rotationReminderAt),
      bing: isoToDateInput(settings.secrets.bing?.rotationReminderAt),
      mcp: isoToDateInput(settings.secrets.mcp?.rotationReminderAt),
    });
  }, [settings]);

  useEffect(() => {
    setMcpOverridesState(initialMcpOverrides);
    setMcpOverrideDraft({
      endpoint: initialMcpOverrides.endpoint ?? "",
      timeoutMs: initialMcpOverrides.timeoutMs
        ? String(initialMcpOverrides.timeoutMs)
        : "",
      maxRetries: initialMcpOverrides.maxRetries
        ? String(initialMcpOverrides.maxRetries)
        : "",
    });
  }, [initialMcpOverrides]);

  useEffect(() => {
    if (actionData?.healthChecks) {
      setHealthChecks(actionData.healthChecks);
    }
    if (actionData?.envStatus) {
      setEnvStatus(actionData.envStatus);
    }
  }, [actionData]);

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

  useEffect(() => {
    if (
      actionData?.ok &&
      actionData.meta?.intent === "update-mcp-overrides" &&
      actionData.mcpOverrides
    ) {
      const next = actionData.mcpOverrides;
      setMcpOverridesState(next);
      setMcpOverrideDraft({
        endpoint: next.endpoint ?? "",
        timeoutMs: next.timeoutMs ? String(next.timeoutMs) : "",
        maxRetries: next.maxRetries ? String(next.maxRetries) : "",
      });
    }
  }, [actionData]);

  const fieldErrors = actionData?.fieldErrors ?? {};

  const isSubmitting = (targetIntent: string) =>
    navigation.state === "ting" &&
    navigation.formData?.get("intent") === targetIntent;

  const healthTableRows = healthChecks.map((check) => [
    check.service,
    <Badge key={`${check.service}-status`} tone={healthStatusToBadge(check.status).tone}>
      {healthStatusToBadge(check.status).label}
    </Badge>,
    `${check.responseTime}ms`,
    check.message,
    new Date(check.lastChecked).toLocaleString(),
  ]);

  const envTableRows = Object.entries(envStatus).map(([key, status]) => [
    key,
    <Badge key={`${key}-status`} tone={status.present ? "success" : "critical"}>
      {status.present ? "Set" : "Missing"}
    </Badge>,
    status.value || "Not configured",
  ]);

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
            <Card title="System Health" />
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Backend Services
                  </Text>
                  <Form method="post">
                    <input type="hidden" name="intent" value="refresh-health" />
                    <Button
                      
                      loading={isSubmitting("refresh-health")}
                      size="slim"
                    >
                      Refresh
                    </Button>
                  </Form>
                </InlineStack>
                
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Service", "Status", "Response Time", "Message", "Last Checked"]}
                  rows={healthTableRows}
                />
              </BlockStack>
            </Card>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card title="Environment Variables" />
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Configuration Status
                </Text>
                
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Variable", "Status", "Value"]}
                  rows={envTableRows}
                />
              </BlockStack>
            </Card>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card title="Operational thresholds" />
            <Card>
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
                    
                    primary
                    loading={isSubmitting("update-thresholds")}
                  >
                    Save thresholds
                  </Button>
                </FormLayout>
              </Form>
            </Card>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card title="Integrations" />
            <Card>
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
                  const tingSecret =
                    isSubmitting("update-secret") &&
                    navigation.formData?.get("provider") === provider;
                  const credentialPlaceholder =
                    provider === "mcp"
                      ? "Paste MCP API key"
                      : "Paste API key or service account JSON";
                  const connectionHelpText =
                    provider === "mcp"
                      ? mcpOverridesState.endpoint
                        ? `Routing via ${mcpOverridesState.endpoint}.`
                        : "Falling back to MCP_API_URL or mock transport."
                      : undefined;
                  const tingOverrides =
                    provider === "mcp" &&
                    isSubmitting("update-mcp-overrides");

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
                                placeholder={credentialPlaceholder}
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
                                  
                                  primary
                                  name="actionType"
                                  value="save"
                                  loading={
                                    tingSecret &&
                                    navigation.formData?.get("actionType") !== "remove"
                                  }
                                >
                                  Save credential
                                </Button>
                                <Button
                                  variant="secondary"
                                  tone="critical"
                                  
                                  name="actionType"
                                  value="remove"
                                  disabled={!secret}
                                  loading={
                                    tingSecret &&
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

                        {provider === "mcp" && (
                          <>
                            <Divider />
                            <Form method="post">
                              <input
                                type="hidden"
                                name="intent"
                                value="update-mcp-overrides"
                              />
                              <BlockStack gap="200">
                                <Text as="p" variant="bodySm">
                                  Override MCP connection settings for this shop. Leave
                                  fields blank to inherit environment defaults.
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Current endpoint: {" "}
                                  {mcpOverridesState.endpoint ??
                                    "Environment-supplied or mock transport"}
                                  {mcpOverridesState.timeoutMs
                                    ? ` • Timeout ${mcpOverridesState.timeoutMs} ms`
                                    : ""}
                                  {typeof mcpOverridesState.maxRetries === "number"
                                    ? ` • Max retries ${mcpOverridesState.maxRetries}`
                                    : ""}
                                </Text>
                                <FormLayout>
                                  <TextField
                                    label="Endpoint override"
                                    type="text"
                                    name="endpoint"
                                    autoComplete="off"
                                    value={mcpOverrideDraft.endpoint}
                                    onChange={(value) =>
                                      setMcpOverrideDraft((prev) => ({
                                        ...prev,
                                        endpoint: value,
                                      }))
                                    }
                                    placeholder="https://example.com/mcp"
                                    error={
                                      actionData?.meta?.intent ===
                                      "update-mcp-overrides"
                                        ? fieldErrors["mcp-endpoint"]
                                        : undefined
                                    }
                                    helpText="Provide a fully qualified HTTP(S) endpoint."
                                  />
                                  <TextField
                                    label="Request timeout (ms)"
                                    type="number"
                                    name="timeoutMs"
                                    value={mcpOverrideDraft.timeoutMs}
                                    onChange={(value) =>
                                      setMcpOverrideDraft((prev) => ({
                                        ...prev,
                                        timeoutMs: value,
                                      }))
                                    }
                                    min={MCP_TIMEOUT_MIN_MS}
                                    max={MCP_TIMEOUT_MAX_MS}
                                    inputMode="numeric"
                                    error={
                                      actionData?.meta?.intent ===
                                      "update-mcp-overrides"
                                        ? fieldErrors["mcp-timeoutMs"]
                                        : undefined
                                    }
                                    helpText={`Allowed range ${MCP_TIMEOUT_MIN_MS}-${MCP_TIMEOUT_MAX_MS} ms.`}
                                  />
                                  <TextField
                                    label="Max retries"
                                    type="number"
                                    name="maxRetries"
                                    value={mcpOverrideDraft.maxRetries}
                                    onChange={(value) =>
                                      setMcpOverrideDraft((prev) => ({
                                        ...prev,
                                        maxRetries: value,
                                      }))
                                    }
                                    min={MCP_MAX_RETRIES_MIN}
                                    max={MCP_MAX_RETRIES_MAX}
                                    inputMode="numeric"
                                    error={
                                      actionData?.meta?.intent ===
                                      "update-mcp-overrides"
                                        ? fieldErrors["mcp-maxRetries"]
                                        : undefined
                                    }
                                    helpText={`Allowed range ${MCP_MAX_RETRIES_MIN}-${MCP_MAX_RETRIES_MAX}.`}
                                  />
                                  {actionData?.meta?.intent ===
                                    "update-mcp-overrides" &&
                                    actionData.formErrors && (
                                      <InlineError
                                        message={actionData.formErrors.join(", ")}
                                        fieldID="mcp-overrides"
                                      />
                                    )}
                                </FormLayout>
                                <InlineStack gap="200">
                                  <Button
                                    
                                    primary
                                    loading={tingOverrides}
                                  >
                                    Save MCP overrides
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={tingOverrides}
                                    onClick={() =>
                                      setMcpOverrideDraft({
                                        endpoint: "",
                                        timeoutMs: "",
                                        maxRetries: "",
                                      })
                                    }
                                  >
                                    Reset fields
                                  </Button>
                                </InlineStack>
                              </BlockStack>
                            </Form>
                          </>
                        )}

                        <Divider />
                        <Form method="post">
                          <input type="hidden" name="intent" value="test-connection" />
                          <input type="hidden" name="provider" value={provider} />
                          <InlineStack gap="300">
                            <Button
                              
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
                              {connectionHelpText
                                ? ` — ${connectionHelpText}`
                                : ""}
                            </Text>
                          </InlineStack>
                        </Form>
                      </BlockStack>
                    </Box>
                  );
                })}
              </BlockStack>
            </Card>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Card title="Feature toggles" />
            <Card>
              <Form method="post">
                <input type="hidden" name="intent" value="update-toggles" />
                <BlockStack gap="300">
                  <Checkbox
                    label="Use mock data"
                    name="useMockData"
                    checked={toggles.useMockData}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        useMockData: value,
                      }))
                    }
                    helpText="Enable mock data mode for development and testing."
                  />
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
                    label="Enable MCP connectors"
                    name="enableMcp"
                    checked={toggles.enableMcp}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableMcp: value,
                      }))
                    }
                    helpText="Enable MCP connector functionality for external integrations."
                  />
                  <Checkbox
                    label="Enable SEO features"
                    name="enableSeo"
                    checked={toggles.enableSeo}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableSeo: value,
                      }))
                    }
                    helpText="Enable SEO analysis and optimization features."
                  />
                  <Checkbox
                    label="Enable inventory features"
                    name="enableInventory"
                    checked={toggles.enableInventory}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableInventory: value,
                      }))
                    }
                    helpText="Enable inventory management and reorder point features."
                  />
                  <Checkbox
                    label="Enable Assistants provider"
                    name="enableAssistantsProvider"
                    checked={toggles.enableAssistantsProvider}
                    onChange={(value) =>
                      setToggles((prev) => ({
                        ...prev,
                        enableAssistantsProvider: value,
                      }))
                    }
                    helpText="Connects the inbox to the live Assistants service for draft approvals."
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
                    
                    primary
                    loading={isSubmitting("update-toggles")}
                  >
                    Save toggles
                  </Button>
                </BlockStack>
              </Form>
            </Card>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
