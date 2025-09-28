import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createSettingsPrismaStub,
  seedSettingsStore,
  type SettingsPrismaStub,
} from "~/tests/settings-prisma-stub";
import type { StoreSettingsRepository } from "~/lib/settings/repository.server";

// Allow extra time for the initial Remix module load under Vitest.
vi.setConfig({ testTimeout: 15_000 });

const state = vi.hoisted(() => {
  const authenticateAdminMock = vi.fn();
  const runConnectionTestMock = vi.fn();
  let prismaStub: SettingsPrismaStub | null = null;

  return {
    authenticateAdminMock,
    runConnectionTestMock,
    setPrismaStub(stub: SettingsPrismaStub) {
      prismaStub = stub;
    },
    getPrismaStub(): SettingsPrismaStub {
      if (!prismaStub) {
        throw new Error("Prisma stub not initialised");
      }
      return prismaStub;
    },
    reset() {
      prismaStub = null;
      authenticateAdminMock.mockReset();
      runConnectionTestMock.mockReset();
    },
  };
});

vi.mock("~/db.server", () => ({
  __esModule: true,
  get default() {
    return state.getPrismaStub();
  },
}));

vi.mock("@shopify/shopify-app-remix/server", () => ({
  __esModule: true,
  ApiVersion: { January25: "2025-01" },
  AppDistribution: { AppStore: "app_store" },
  DeliveryMethod: { Http: "http" },
  shopifyApp: () => ({
    authenticate: { admin: state.authenticateAdminMock },
    registerWebhooks: vi.fn(),
    addDocumentResponseHeaders: vi.fn(),
    unauthenticated: vi.fn(),
    login: vi.fn(),
    sessionStorage: {},
  }),
}));

vi.mock("@shopify/shopify-app-session-storage-prisma", () => ({
  __esModule: true,
  PrismaSessionStorage: class PrismaSessionStorageMock {
    constructor() {}
  },
}));

vi.mock("../lib/settings/connection-tests.server", () => ({
  __esModule: true,
  runConnectionTest: state.runConnectionTestMock,
}));

const importAppSettingsModule = () => import("../app.settings");
type AppSettingsModule = Awaited<ReturnType<typeof importAppSettingsModule>>;

type SetupResult = {
  module: AppSettingsModule;
  prismaStub: SettingsPrismaStub;
  repository: StoreSettingsRepository;
  shopDomain: string;
};

const loadModuleWithPrisma = async (
  shopDomain = "prisma-live-shop.myshopify.com",
): Promise<SetupResult> => {
  state.reset();
  process.env.USE_MOCK_DATA = "false";

  const prismaStub = createSettingsPrismaStub();
  state.setPrismaStub(prismaStub);

  state.authenticateAdminMock.mockResolvedValue({
    session: { shop: shopDomain },
  });

  state.runConnectionTestMock.mockResolvedValue({
    status: "success",
    durationMs: 250,
    message: "ok",
  });

  const nonce = Math.random().toString(36).slice(2);

  const module = (await import(
    /* @vite-ignore */ `../app.settings?prisma=${nonce}`
  )) as AppSettingsModule;
  const { storeSettingsRepository } = (await import(
    /* @vite-ignore */ `~/lib/settings/repository.server?prisma=${nonce}`
  )) as { storeSettingsRepository: StoreSettingsRepository };

  return {
    module,
    prismaStub,
    repository: storeSettingsRepository,
    shopDomain,
  };
};

afterEach(() => {
  delete process.env.USE_MOCK_DATA;
  state.reset();
});

describe("app.settings (Prisma integration)", () => {
  it("loads persisted thresholds from Prisma-backed repository", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-thresholds-integration.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);
    await repository.updateThresholds(shopDomain, {
      lowStockMinimum: 21,
      overdueOrderHours: 30,
      overstockPercentage: 40,
    });

    const response = await module.loader({
      request: new Request("http://localhost/app/settings"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(state.authenticateAdminMock).toHaveBeenCalled();
    expect(payload.useMockData).toBe(false);
    expect(payload.settings.shopDomain).toBe(shopDomain);
    expect(payload.settings.thresholds).toEqual({
      lowStockMinimum: 21,
      overdueOrderHours: 30,
      overstockPercentage: 40,
    });
  });

  it("persists threshold updates through the action using Prisma stub", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-action-integration.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);

    const form = new URLSearchParams();
    form.set("intent", "update-thresholds");
    form.set("lowStockMinimum", "17");
    form.set("overdueOrderHours", "36");
    form.set("overstockPercentage", "28");

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.settings?.thresholds).toEqual({
      lowStockMinimum: 17,
      overdueOrderHours: 36,
      overstockPercentage: 28,
    });

    const persisted = await repository.getSettings(shopDomain);
    expect(persisted.thresholds.lowStockMinimum).toBe(17);
    expect(persisted.thresholds.overdueOrderHours).toBe(36);
    expect(persisted.thresholds.overstockPercentage).toBe(28);
  });

  it("updates feature toggles through the action using Prisma stub", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-toggles-integration.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);

    const form = new URLSearchParams();
    form.set("intent", "update-toggles");
    form.set("enableMcpIntegration", "on");
    form.set("enableAssistantsProvider", "on");
    form.set("enableExperimentalWidgets", "on");
    // Intentionally omit enableBetaWorkflows to ensure it persists as false.

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.settings?.toggles).toEqual({
      enableMcpIntegration: true,
      enableAssistantsProvider: true,
      enableExperimentalWidgets: true,
      enableBetaWorkflows: false,
    });

    const persisted = await repository.getSettings(shopDomain);
    expect(persisted.toggles).toEqual({
      enableMcpIntegration: true,
      enableAssistantsProvider: true,
      enableExperimentalWidgets: true,
      enableBetaWorkflows: false,
    });
  });

  it("saves secrets with rotation reminders through the action", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-secrets-integration.myshopify.com");

    const storeId = await seedSettingsStore(prismaStub, shopDomain);
    expect(storeId).toBeTruthy();

    const form = new URLSearchParams();
    form.set("intent", "update-secret");
    form.set("provider", "ga4");
    form.set("secret", "ga4-secret-7890");
    form.set("rotationReminderAt", "2025-01-10");

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    const metadata = payload.settings?.secrets.ga4;
    expect(metadata).toBeTruthy();
    expect(metadata?.maskedValue).toBe("••••7890");
    expect(metadata?.rotationReminderAt).toBe("2025-01-10T00:00:00.000Z");

    const decrypted = await repository.getDecryptedSecret(shopDomain, "ga4");
    expect(decrypted).toBe("ga4-secret-7890");
  });

  it("removes stored secrets through the action when requested", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-remove-secret.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);
    await repository.updateSecret(shopDomain, {
      provider: "bing",
      secret: "bing-secret-4567",
    });

    const form = new URLSearchParams();
    form.set("intent", "update-secret");
    form.set("provider", "bing");
    form.set("actionType", "remove");

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.settings?.secrets.bing).toBeNull();
    expect(payload.toast?.status).toBe("warning");

    const decrypted = await repository.getDecryptedSecret(shopDomain, "bing");
    expect(decrypted).toBeNull();
  });

  it("records connection tests via the action and updates health summaries", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-connection-integration.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);

    await repository.updateSecret(shopDomain, {
      provider: "ga4",
      secret: "ga4-live-secret",
    });

    const form = new URLSearchParams();
    form.set("intent", "test-connection");
    form.set("provider", "ga4");

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.toast?.status).toBe("success");
    expect(payload.settings?.connections.ga4.status).toBe("success");

    const refreshed = await repository.getSettings(shopDomain);
    expect(refreshed.connections.ga4.status).toBe("success");
    expect(refreshed.connections.ga4.history.length).toBeGreaterThan(0);
    expect(refreshed.connections.ga4.history[0]?.status).toBe("success");
  });

  it("persists MCP override updates through the action", async () => {
    const { module, repository, prismaStub, shopDomain } =
      await loadModuleWithPrisma("prisma-mcp-override-integration.myshopify.com");

    await seedSettingsStore(prismaStub, shopDomain);

    const form = new URLSearchParams();
    form.set("intent", "update-mcp-overrides");
    form.set("endpoint", "https://mcp.live.test/api");
    form.set("timeoutMs", "2500");
    form.set("maxRetries", "4");

    const response = await module.action({
      request: new Request("http://localhost/app/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.mcpOverrides).toEqual({
      endpoint: "https://mcp.live.test/api",
      timeoutMs: 2500,
      maxRetries: 4,
    });

    const overrides = await repository.getMcpIntegrationOverrides(shopDomain);
    expect(overrides).toEqual({
      endpoint: "https://mcp.live.test/api",
      timeoutMs: 2500,
      maxRetries: 4,
    });
  });
});
