import { afterEach, describe, expect, it, vi } from "vitest";

import type { StoreSettingsRepository } from "~/lib/settings/repository.server";
import type {
  ConnectionStatusState,
  SettingsPayload,
  ThresholdSettings,
} from "~/types/settings";

const BASE_SHOP = "demo-shop.myshopify.com";

const createSettingsPayload = (): SettingsPayload => ({
  shopDomain: BASE_SHOP,
  thresholds: {
    lowStockMinimum: 8,
    overdueOrderHours: 12,
    overstockPercentage: 35,
  },
  toggles: {
    enableMcpIntegration: true,
    enableExperimentalWidgets: false,
    enableBetaWorkflows: false,
  },
  secrets: {
    ga4: {
      provider: "ga4",
      maskedValue: "••••1234",
      lastUpdatedAt: "2024-01-10T00:00:00.000Z",
      lastVerifiedAt: "2024-01-15T00:00:00.000Z",
    },
    gsc: null,
    bing: null,
    mcp: null,
  },
  connections: {
    ga4: { provider: "ga4", status: "success", history: [] },
    gsc: { provider: "gsc", status: "warning", history: [] },
    bing: { provider: "bing", status: "error", history: [] },
    mcp: { provider: "mcp", status: "warning", history: [] },
  },
});

type RepoMocks = {
  getSettings: ReturnType<typeof vi.fn>;
  updateThresholds: ReturnType<typeof vi.fn>;
  updateToggles: ReturnType<typeof vi.fn>;
  updateSecret: ReturnType<typeof vi.fn>;
  getDecryptedSecret: ReturnType<typeof vi.fn>;
  getMcpIntegrationOverrides: ReturnType<typeof vi.fn>;
  updateMcpIntegrationOverrides: ReturnType<typeof vi.fn>;
  recordConnectionTest: ReturnType<typeof vi.fn>;
};

type LoadModuleOptions = {
  useMockData?: boolean;
};

const importAppSettingsModule = () => import("../app.settings");
type AppSettingsModule = Awaited<ReturnType<typeof importAppSettingsModule>>;

type LoadedModule = {
  module: AppSettingsModule;
  repoMocks: RepoMocks;
  settings: SettingsPayload;
  authenticateAdminMock: ReturnType<typeof vi.fn>;
  runConnectionTestMock: ReturnType<typeof vi.fn>;
};

const repoMocks: RepoMocks = {
  getSettings: vi.fn(),
  updateThresholds: vi.fn(),
  updateToggles: vi.fn(),
  updateSecret: vi.fn(),
  getDecryptedSecret: vi.fn(),
  getMcpIntegrationOverrides: vi.fn(),
  updateMcpIntegrationOverrides: vi.fn(),
  recordConnectionTest: vi.fn(),
};

let useMockDataFlag = true;
const authenticateAdminMock = vi.fn();
const runConnectionTestMock = vi.fn();
let cachedModule: AppSettingsModule | null = null;

vi.mock("../../lib/settings/repository.server", () => ({
  __esModule: true,
  storeSettingsRepository: repoMocks as unknown as StoreSettingsRepository,
}));

vi.mock("../../shopify.server", () => ({
  __esModule: true,
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

vi.mock("~/mocks/config.server", () => ({
  __esModule: true,
  get USE_MOCK_DATA() {
    return useMockDataFlag;
  },
}));

vi.mock("~/mocks/settings", () => ({
  __esModule: true,
  BASE_SHOP_DOMAIN: BASE_SHOP,
}));

vi.mock("../../lib/settings/connection-tests.server", () => ({
  __esModule: true,
  runConnectionTest: (
    ...args: Parameters<typeof runConnectionTestMock>
  ): ReturnType<typeof runConnectionTestMock> => runConnectionTestMock(...args),
}));

const primeRepoMocks = (settings: SettingsPayload) => {
  repoMocks.getSettings.mockReset();
  repoMocks.getSettings.mockResolvedValue(settings);

  repoMocks.updateThresholds.mockReset();
  repoMocks.updateThresholds.mockResolvedValue(settings);

  repoMocks.updateToggles.mockReset();
  repoMocks.updateToggles.mockResolvedValue(settings);

  repoMocks.updateSecret.mockReset();
  repoMocks.updateSecret.mockResolvedValue(settings);

  repoMocks.getDecryptedSecret.mockReset();
  repoMocks.getDecryptedSecret.mockResolvedValue(null);

  repoMocks.getMcpIntegrationOverrides.mockReset();
  repoMocks.getMcpIntegrationOverrides.mockResolvedValue({
    endpoint: null,
    timeoutMs: null,
    maxRetries: null,
  });

  repoMocks.updateMcpIntegrationOverrides.mockReset();
  repoMocks.updateMcpIntegrationOverrides.mockResolvedValue({
    endpoint: null,
    timeoutMs: null,
    maxRetries: null,
  });

  repoMocks.recordConnectionTest.mockReset();
  repoMocks.recordConnectionTest.mockResolvedValue(settings);
};

const resetSharedMocks = (settings: SettingsPayload) => {
  primeRepoMocks(settings);

  authenticateAdminMock.mockReset();
  authenticateAdminMock.mockResolvedValue({
    session: { shop: "live-shop.myshopify.com" },
  });

  runConnectionTestMock.mockReset();
  runConnectionTestMock.mockResolvedValue({
    status: "success",
    durationMs: 420,
    message: "ok",
  });
};

const loadModule = async (
  options: LoadModuleOptions = {},
): Promise<LoadedModule> => {
  const { useMockData = true } = options;
  useMockDataFlag = useMockData;
  const settings = createSettingsPayload();
  resetSharedMocks(settings);

  if (!cachedModule) {
    cachedModule = await importAppSettingsModule();
  }

  return {
    module: cachedModule,
    repoMocks,
    settings,
    authenticateAdminMock,
    runConnectionTestMock,
  };
};

afterEach(() => {
  useMockDataFlag = true;
  if (typeof vi.unstubAllGlobals === "function") {
    vi.unstubAllGlobals();
  }
});

describe("app.settings loader", () => {
  it("returns mock settings without authentication when USE_MOCK_DATA is true", async () => {
    const { module, repoMocks: repo, authenticateAdminMock: authMock, settings } =
      await loadModule({ useMockData: true });

    const response = await module.loader({
      request: new Request("http://localhost/app/settings"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(repo.getSettings).toHaveBeenCalledWith(BASE_SHOP);
    expect(repo.getMcpIntegrationOverrides).toHaveBeenCalledWith(BASE_SHOP);
    expect(authMock).not.toHaveBeenCalled();
    expect(payload.settings).toEqual(settings);
    expect(payload.useMockData).toBe(true);
    expect(payload.mcpOverrides).toEqual({
      endpoint: null,
      timeoutMs: null,
      maxRetries: null,
    });
  });

  it("authenticates and loads store settings when USE_MOCK_DATA is false", async () => {
    const { module, repoMocks: repo, authenticateAdminMock: authMock } =
      await loadModule({ useMockData: false });

    const response = await module.loader({
      request: new Request("http://localhost/app/settings"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(authMock).toHaveBeenCalled();
    expect(repo.getSettings).toHaveBeenCalledWith("live-shop.myshopify.com");
    expect(repo.getMcpIntegrationOverrides).toHaveBeenCalledWith(
      "live-shop.myshopify.com",
    );
    expect(payload.useMockData).toBe(false);
  });
});

describe("app.settings action", () => {
  const postRequest = (form: URLSearchParams) =>
    new Request("http://localhost/app/settings", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });

  it("persists threshold updates when payload is valid", async () => {
    const { module, repoMocks: repo } = await loadModule({ useMockData: true });
    const updatedThresholds: ThresholdSettings = {
      lowStockMinimum: 5,
      overdueOrderHours: 48,
      overstockPercentage: 15,
    };

    repo.updateThresholds.mockImplementationOnce(async (_shop, payload) => ({
      ...createSettingsPayload(),
      thresholds: payload,
    }));

    const form = new URLSearchParams();
    form.set("intent", "update-thresholds");
    form.set("lowStockMinimum", `${updatedThresholds.lowStockMinimum}`);
    form.set("overdueOrderHours", `${updatedThresholds.overdueOrderHours}`);
    form.set("overstockPercentage", `${updatedThresholds.overstockPercentage}`);

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(repo.updateThresholds).toHaveBeenCalledWith(BASE_SHOP, {
      lowStockMinimum: 5,
      overdueOrderHours: 48,
      overstockPercentage: 15,
    });
    expect(response.status).toBe(200);
    expect(payload.toast?.message).toContain("Operational thresholds updated");
    expect(payload.ok).toBe(true);
  });

  it("returns field errors when thresholds fail validation", async () => {
    const { module, repoMocks: repo } = await loadModule({ useMockData: true });

    const form = new URLSearchParams();
    form.set("intent", "update-thresholds");
    form.set("lowStockMinimum", "-1");
    form.set("overdueOrderHours", "0");
    form.set("overstockPercentage", "600");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(repo.updateThresholds).not.toHaveBeenCalled();
    expect(payload.fieldErrors.lowStockMinimum).toBeDefined();
    expect(payload.fieldErrors.overdueOrderHours).toBeDefined();
    expect(payload.fieldErrors.overstockPercentage).toBeDefined();
  });

  it("persists MCP overrides when payload is valid", async () => {
    const { module, repoMocks: repo } = await loadModule({ useMockData: true });

    repo.updateMcpIntegrationOverrides.mockResolvedValueOnce({
      endpoint: "https://mcp.example.com/api",
      timeoutMs: 8000,
      maxRetries: 2,
    });

    const form = new URLSearchParams();
    form.set("intent", "update-mcp-overrides");
    form.set("endpoint", "https://mcp.example.com/api");
    form.set("timeoutMs", "8000");
    form.set("maxRetries", "2");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(repo.updateMcpIntegrationOverrides).toHaveBeenCalledWith(BASE_SHOP, {
      endpoint: "https://mcp.example.com/api",
      timeoutMs: 8000,
      maxRetries: 2,
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.mcpOverrides).toEqual({
      endpoint: "https://mcp.example.com/api",
      timeoutMs: 8000,
      maxRetries: 2,
    });
  });

  it("returns field errors when MCP overrides are invalid", async () => {
    const { module, repoMocks: repo } = await loadModule({ useMockData: true });

    const form = new URLSearchParams();
    form.set("intent", "update-mcp-overrides");
    form.set("endpoint", "ftp://invalid-endpoint");
    form.set("timeoutMs", "50");
    form.set("maxRetries", "2.5");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(repo.updateMcpIntegrationOverrides).not.toHaveBeenCalled();
    expect(payload.fieldErrors["mcp-endpoint"]).toBeDefined();
    expect(payload.fieldErrors["mcp-timeoutMs"]).toBeDefined();
    expect(payload.fieldErrors["mcp-maxRetries"]).toBeDefined();
  });

  it("reuses stored secret when no new credential is provided", async () => {
    const { module, repoMocks: repo } = await loadModule({ useMockData: true });

    repo.getDecryptedSecret.mockResolvedValueOnce("ga4-existing-secret");

    const form = new URLSearchParams();
    form.set("intent", "update-secret");
    form.set("provider", "ga4");
    form.set("secret", "");
    form.set("rotationReminderAt", "");
    form.set("actionType", "save");

    await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    expect(repo.getDecryptedSecret).toHaveBeenCalledWith(BASE_SHOP, "ga4");
    expect(repo.updateSecret).toHaveBeenCalledWith(BASE_SHOP, {
      provider: "ga4",
      secret: "ga4-existing-secret",
      rotationReminderAt: null,
    });
  });

  it("rejects connection test when credential is missing", async () => {
    const { module, repoMocks: repo, runConnectionTestMock: connectionMock } =
      await loadModule({ useMockData: true });

    repo.getDecryptedSecret.mockResolvedValueOnce(null);

    const form = new URLSearchParams();
    form.set("intent", "test-connection");
    form.set("provider", "gsc");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(connectionMock).not.toHaveBeenCalled();
    expect(repo.recordConnectionTest).toHaveBeenCalledWith(BASE_SHOP, {
      provider: "gsc",
      status: "error",
      durationMs: 0,
      message: "Credential missing",
    });
    expect(payload.toast?.status).toBe("error");
  });

  it("records connection test results from adapters", async () => {
    const { module, repoMocks: repo, runConnectionTestMock: connectionMock } =
      await loadModule({ useMockData: true });

    repo.getDecryptedSecret.mockResolvedValueOnce("gsc-secret");
    connectionMock.mockResolvedValueOnce({
      status: "warning" as ConnectionStatusState,
      durationMs: 1280,
      message: "Slow response",
    });

    const form = new URLSearchParams();
    form.set("intent", "test-connection");
    form.set("provider", "gsc");

    await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    expect(connectionMock).toHaveBeenCalledWith({
      provider: "gsc",
      credential: "gsc-secret",
    });
    expect(repo.recordConnectionTest).toHaveBeenCalledWith(BASE_SHOP, {
      provider: "gsc",
      status: "warning",
      durationMs: 1280,
      message: "Slow response",
    });
  });
});
