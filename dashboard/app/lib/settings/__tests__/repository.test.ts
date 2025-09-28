import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { resetMockSettings } from "~/mocks/settings";
import {
  createSettingsPrismaStub,
  seedSettingsStore,
  type SettingsPrismaStub,
} from "~/tests/settings-prisma-stub";

const loadRepository = async () => {
  const module = await import("~/lib/settings/repository.server");
  return module.storeSettingsRepository;
};
const loadRepositoryWithStub = async (prismaStub: SettingsPrismaStub) => {
  vi.resetModules();
  vi.doMock("~/db.server", () => ({
    __esModule: true,
    default: prismaStub,
  }));

  const { storeSettingsRepository } = await import("~/lib/settings/repository.server");
  return storeSettingsRepository;
};

describe("StoreSettingsRepository (mock mode)", () => {
  const SHOP = "unit-test-shop.myshopify.com";

  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetMockSettings(SHOP);
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
  });

  it("updates threshold values", async () => {
    const repo = await loadRepository();

    const updated = await repo.updateThresholds(SHOP, {
      lowStockMinimum: 12,
      overdueOrderHours: 24,
      overstockPercentage: 45,
    });

    expect(updated.thresholds.lowStockMinimum).toBe(12);
    expect(updated.thresholds.overdueOrderHours).toBe(24);
    expect(updated.thresholds.overstockPercentage).toBe(45);

    const fetched = await repo.getSettings(SHOP);
    expect(fetched.thresholds.lowStockMinimum).toBe(12);
  });

  it("encrypts and masks newly persisted secrets", async () => {
    const repo = await loadRepository();

    const result = await repo.updateSecret(SHOP, {
      provider: "bing",
      secret: "bing-key-7890",
      rotationReminderAt: "2024-05-01T00:00:00.000Z",
    });

    const metadata = result.secrets.bing;
    expect(metadata).toBeTruthy();
    expect(metadata?.maskedValue).toMatch(/^••••7890$/);
    expect(metadata?.rotationReminderAt).toBe("2024-05-01T00:00:00.000Z");
    expect(metadata?.lastUpdatedAt).toBeTruthy();

    const decrypted = await repo.getDecryptedSecret(SHOP, "bing");
    expect(decrypted).toBe("bing-key-7890");
  });

  it("removes secrets and clears metadata", async () => {
    const repo = await loadRepository();

    await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-new-secret",
    });

    const cleared = await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: null,
    });

    expect(cleared.secrets.ga4).toBeNull();
    const decrypted = await repo.getDecryptedSecret(SHOP, "ga4");
    expect(decrypted).toBeNull();
  });

  it("records connection attempts with capped history", async () => {
    const repo = await loadRepository();

    const updated = await repo.recordConnectionTest(SHOP, {
      provider: "gsc",
      status: "warning",
      durationMs: 1500,
      message: "Slow response",
    });

    const history = updated.connections.gsc.history;
    expect(history[0]?.status).toBe("warning");
    expect(history[0]?.durationMs).toBe(1500);
    expect(history[0]?.message).toBe("Slow response");
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it("updates MCP integration overrides", async () => {
    const repo = await loadRepository();

    const overrides = await repo.updateMcpIntegrationOverrides(SHOP, {
      endpoint: "https://mock-api.test",
      timeoutMs: 1500,
      maxRetries: 7,
    });

    expect(overrides).toMatchObject({
      endpoint: "https://mock-api.test",
      timeoutMs: 1500,
      maxRetries: 7,
    });

    const refreshed = await repo.getMcpIntegrationOverrides(SHOP);
    expect(refreshed).toEqual(overrides);
  });

  it("updates rotation reminder while preserving existing secret", async () => {
    const repo = await loadRepository();

    await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: "ga4-initial-secret",
    });

    const existingSecret = await repo.getDecryptedSecret(SHOP, "ga4");
    expect(existingSecret).toBeTruthy();

    const updated = await repo.updateSecret(SHOP, {
      provider: "ga4",
      secret: existingSecret!,
      rotationReminderAt: "2024-06-15T00:00:00.000Z",
    });

    const meta = updated.secrets.ga4;
    expect(meta).toBeTruthy();
    expect(meta?.rotationReminderAt).toBe("2024-06-15T00:00:00.000Z");
    expect(meta?.maskedValue.startsWith("••••")).toBe(true);
  });
});

describe("StoreSettingsRepository (Prisma)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "false";
  });

  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
    vi.resetModules();
    vi.doUnmock("~/db.server");
  });

  it("creates settings row on first access and updates thresholds", async () => {
    const prismaStub = createSettingsPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-thresholds.myshopify.com";

    await seedSettingsStore(prismaStub, shopDomain);

    const initial = await repo.getSettings(shopDomain);
    expect(initial.shopDomain).toBe(shopDomain);

    await repo.updateThresholds(shopDomain, {
      lowStockMinimum: 15,
      overdueOrderHours: 48,
      overstockPercentage: 55,
    });

    const refreshed = await repo.getSettings(shopDomain);
    expect(refreshed.thresholds.lowStockMinimum).toBe(15);
    expect(refreshed.thresholds.overdueOrderHours).toBe(48);
    expect(refreshed.thresholds.overstockPercentage).toBe(55);
  });

  it("persists encrypted secrets and exposes metadata", async () => {
    const prismaStub = createSettingsPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-secret.myshopify.com";

    await seedSettingsStore(prismaStub, shopDomain);

    await repo.updateSecret(shopDomain, {
      provider: "bing",
      secret: "bing-secret-9999",
      rotationReminderAt: "2025-01-15T00:00:00.000Z",
    });

    const payload = await repo.getSettings(shopDomain);
    const metadata = payload.secrets.bing;
    expect(metadata?.maskedValue).toBe("••••9999");
    expect(metadata?.rotationReminderAt).toBe("2025-01-15T00:00:00.000Z");

    const decrypted = await repo.getDecryptedSecret(shopDomain, "bing");
    expect(decrypted).toBe("bing-secret-9999");
  });

  it("records connection tests and trims history", async () => {
    const prismaStub = createSettingsPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-connection.myshopify.com";

    await seedSettingsStore(prismaStub, shopDomain);

    for (let i = 0; i < 6; i += 1) {
      await repo.recordConnectionTest(shopDomain, {
        provider: "ga4",
        status: i % 2 === 0 ? "success" : "warning",
        durationMs: 400 + i,
        message: `attempt-${i}`,
        timestamp: `2025-02-0${i + 1}T12:00:00.000Z`,
      });
    }

    const finalState = await repo.getSettings(shopDomain);
    expect(finalState.connections.ga4.history.length).toBeLessThanOrEqual(5);
    expect(finalState.connections.ga4.message).toBe("attempt-5");
    expect(finalState.connections.ga4.status).toBe("warning");
  });

  it("persists MCP overrides in connection metadata", async () => {
    const prismaStub = createSettingsPrismaStub();
    const repo = await loadRepositoryWithStub(prismaStub);
    const shopDomain = "prisma-overrides.myshopify.com";

    const storeId = await seedSettingsStore(prismaStub, shopDomain);

    const overrides = await repo.updateMcpIntegrationOverrides(shopDomain, {
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
    });

    expect(overrides).toEqual({
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
      maxRetries: null,
    });

    const stored = await prismaStub.storeSettings.findUnique({
      where: { storeId },
    });

    const metadata = stored?.connectionMetadata as
      | Record<string, any>
      | undefined;
    expect(metadata?.mcpOverrides).toMatchObject({
      endpoint: "https://mcp.example/api",
      timeoutMs: 900,
      maxRetries: null,
    });

    const roundTrip = await repo.getMcpIntegrationOverrides(shopDomain);
    expect(roundTrip).toEqual(overrides);
  });
});
