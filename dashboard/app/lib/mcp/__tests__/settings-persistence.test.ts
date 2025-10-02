import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { storeSettingsRepository } from "~/lib/settings/repository.server";
import { getMcpClientOverridesForShop } from "../config.server";
import { resetMockSettings } from "~/mocks/settings";
import { createSettingsPrismaStub, seedSettingsStore, type SettingsPrismaStub } from "~/tests/settings-prisma-stub";

const SHOP_MOCK = "settings-mock.myshopify.com";
const SHOP_PRISMA = "settings-prisma.myshopify.com";

describe("MCP settings persistence (mock mode)", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    resetMockSettings(SHOP_MOCK);
  });
  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
  });

  it("persists and reads per-shop MCP overrides", async () => {
    const updated = await storeSettingsRepository.updateMcpIntegrationOverrides(SHOP_MOCK, {
      endpoint: "https://mock-api.test",
      timeoutMs: 2500,
      maxRetries: 6,
    });
    expect(updated.endpoint).toBe("https://mock-api.test");
    const read = await getMcpClientOverridesForShop(SHOP_MOCK);
    expect(read.endpoint).toBe("https://mock-api.test");
    expect(read.timeoutMs).toBe(2500);
    expect(read.maxRetries).toBe(6);
  });
});

describe("MCP settings persistence (Prisma mode)", () => {
  let prismaStub: SettingsPrismaStub;
  beforeEach(async () => {
    process.env.USE_MOCK_DATA = "false";
    prismaStub = createSettingsPrismaStub();
    vi.doMock("~/db.server", () => ({ __esModule: true, default: prismaStub }));
    await seedSettingsStore(prismaStub, SHOP_PRISMA);
  });
  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
    vi.resetModules();
    vi.doUnmock("~/db.server");
  });

  it("persists and reads per-shop MCP overrides via Prisma", async () => {
    const { storeSettingsRepository: repo } = await import("~/lib/settings/repository.server");
    const { getMcpClientOverridesForShop: getOverrides } = await import("../config.server");

    await repo.updateMcpIntegrationOverrides(SHOP_PRISMA, {
      endpoint: "https://prisma-api.example",
      timeoutMs: 1800,
      maxRetries: 3,
    });

    const read = await getOverrides(SHOP_PRISMA);
    expect(read.endpoint).toBe("https://prisma-api.example");
    expect(read.timeoutMs).toBe(1800);
    expect(read.maxRetries).toBe(3);
  });
});