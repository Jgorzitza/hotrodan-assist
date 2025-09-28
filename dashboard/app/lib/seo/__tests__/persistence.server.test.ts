import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSettingsPrismaStub,
  seedSettingsStore,
  type SettingsPrismaStub,
} from "~/tests/settings-prisma-stub";

const state = vi.hoisted(() => {
  let prismaStub: SettingsPrismaStub | null = null;

  return {
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
    },
  };
});

vi.mock("~/db.server", () => ({
  __esModule: true,
  get default() {
    return state.getPrismaStub();
  },
}));

const importPersistenceModule = async () => {
  const nonce = Math.random().toString(36).slice(2);
  return import(
    /* @vite-ignore */ `../persistence.server?stub=${nonce}`
  );
};

afterEach(() => {
  state.reset();
  vi.resetModules();
});

describe("SEO persistence (Prisma)", () => {
  it("returns missing-store when the domain is not in Prisma", async () => {
    const prismaStub = createSettingsPrismaStub();
    state.setPrismaStub(prismaStub);
    const { persistSeoActionUpdate } = await importPersistenceModule();

    const result = await persistSeoActionUpdate({
      shopDomain: "unknown-shop.myshopify.com",
      action: {
        id: "seo-action-1",
        title: "Resolve canonical",
        description: "Fix canonical tag",
        priority: "now",
        status: "in_progress",
        assignedTo: "Platform",
        source: "gsc",
        metricLabel: "Pages",
        metricValue: "6",
        dueAt: "2025-01-08T00:00:00.000Z",
      },
    });

    expect(result).toEqual({ ok: false, reason: "missing-store" });
  });

  it("persists action updates and exposes overrides", async () => {
    const prismaStub = createSettingsPrismaStub();
    state.setPrismaStub(prismaStub);
    const module = await importPersistenceModule();
    const { persistSeoActionUpdate, getPersistedActionOverrides } = module;

    const shopDomain = "seo-persistence.myshopify.com";
    const storeId = await seedSettingsStore(prismaStub, shopDomain);

    const persistResult = await persistSeoActionUpdate({
      shopDomain,
      action: {
        id: "seo-action-1",
        title: "Resolve duplicate canonical",
        description: "Canonical tag references retired landing page",
        priority: "now",
        status: "in_progress",
        assignedTo: "Platform team",
        source: "gsc",
        metricLabel: "Pages affected",
        metricValue: "6",
        dueAt: "2025-02-01T12:00:00.000Z",
      },
    });

    expect(persistResult.ok).toBe(true);
    expect(persistResult.ok && persistResult.insightId).toBe(
      `seo-action:${storeId}:seo-action-1`,
    );

    const overrides = await getPersistedActionOverrides(shopDomain, [
      "seo-action-1",
      "seo-action-missing",
    ]);

    expect(overrides).toHaveProperty("seo-action-1");
    expect(overrides["seo-action-1"].status).toBe("in_progress");
    expect(overrides["seo-action-1"].assignedTo).toBe("Platform team");
    expect(overrides["seo-action-1"].dueAt).toBe("2025-02-01T12:00:00.000Z");
    expect(overrides).not.toHaveProperty("seo-action-missing");
  });

  it("normalises Unassigned owner to null in overrides", async () => {
    const prismaStub = createSettingsPrismaStub();
    state.setPrismaStub(prismaStub);
    const module = await importPersistenceModule();
    const { persistSeoActionUpdate, getPersistedActionOverrides } = module;

    const shopDomain = "seo-unassigned.myshopify.com";
    await seedSettingsStore(prismaStub, shopDomain);

    await persistSeoActionUpdate({
      shopDomain,
      action: {
        id: "seo-action-2",
        title: "Compress hero imagery",
        description: "Ship next-gen image formats",
        priority: "later",
        status: "done",
        assignedTo: "Unassigned",
        source: "ga4",
        metricLabel: "LCP",
        metricValue: "4.8s",
        dueAt: undefined,
      },
    });

    const overrides = await getPersistedActionOverrides(shopDomain, ["seo-action-2"]);
    expect(overrides).toHaveProperty("seo-action-2");
    expect(overrides["seo-action-2"].status).toBe("done");
    expect(overrides["seo-action-2"].assignedTo).toBeNull();
  });
});
