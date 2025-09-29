import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSettingsPrismaStub,
  seedSettingsStore,
  type SettingsPrismaStub,
} from "~/tests/settings-prisma-stub";
import { getSeoScenario } from "~/mocks";

const state = vi.hoisted(() => {
  let prismaStub: SettingsPrismaStub | null = null;
  const authenticateAdminMock = vi.fn();

  return {
    authenticateAdminMock,
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
    },
  };
});

vi.mock("../../shopify.server", () => ({
  authenticate: {
    admin: state.authenticateAdminMock,
  },
}));

vi.mock("~/db.server", () => ({
  __esModule: true,
  get default() {
    return state.getPrismaStub();
  },
}));

const importSeoRouteModule = (nonce: string) => import(
  /* @vite-ignore */ `../app.seo?prisma=${nonce}`
);

const importSeoPersistenceModule = (nonce: string) => import(
  /* @vite-ignore */ `~/lib/seo/persistence.server?stub=${nonce}`
);

type SeoRouteModule = Awaited<ReturnType<typeof importSeoRouteModule>>;
type SeoPersistenceModule = Awaited<ReturnType<typeof importSeoPersistenceModule>>;

type SetupResult = {
  module: SeoRouteModule;
  prismaStub: SettingsPrismaStub;
  persistence: SeoPersistenceModule;
  shopDomain: string;
};

const setup = async (
  shopDomain = "seo-prisma-live.myshopify.com",
): Promise<SetupResult> => {
  state.reset();
  process.env.USE_MOCK_DATA = "false";

  const prismaStub = createSettingsPrismaStub();
  state.setPrismaStub(prismaStub);
  state.authenticateAdminMock.mockResolvedValue({
    session: { shop: shopDomain },
  });

  const nonce = Math.random().toString(36).slice(2);
  const module = (await importSeoRouteModule(nonce)) as SeoRouteModule;
  const persistence = (await importSeoPersistenceModule(nonce)) as SeoPersistenceModule;

  return {
    module,
    prismaStub,
    persistence,
    shopDomain,
  };
};

afterEach(() => {
  delete process.env.USE_MOCK_DATA;
  state.reset();
  vi.useRealTimers();
});

describe("app.seo (Prisma integration)", () => {
  it("merges persisted Prisma overrides into loader actions", async () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-15T12:00:00.000Z");
    vi.setSystemTime(now);

    const shopDomain = "seo-prisma-integration.myshopify.com";
    const { module, prismaStub, persistence } = await setup(shopDomain);
    const { persistSeoActionUpdate } = persistence;

    await seedSettingsStore(prismaStub, shopDomain);

    const dataset = getSeoScenario({ scenario: "base" });
    const baseAction = dataset.actions.find((action) => action.id === "seo-action-1");
    expect(baseAction).toBeDefined();

    const persistResult = await persistSeoActionUpdate({
      shopDomain,
      action: {
        id: baseAction!.id,
        title: baseAction!.title,
        description: baseAction!.description,
        priority: baseAction!.priority,
        status: "done",
        assignedTo: "SEO Guild",
        source: baseAction!.source,
        metricLabel: baseAction!.metricLabel,
        metricValue: baseAction!.metricValue,
        dueAt: baseAction!.dueAt ?? null,
      },
    });

    expect(persistResult).toEqual(
      expect.objectContaining({
        ok: true,
        insightId: expect.stringContaining(baseAction!.id),
      }),
    );

    const response = await module.loader({
      request: new Request("https://app.example.com/app/seo"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(state.authenticateAdminMock).toHaveBeenCalledTimes(1);
    expect(payload.useMockData).toBe(false);

    const merged = payload.actions.find((action: { id: string }) => action.id === baseAction!.id);
    expect(merged).toBeDefined();
    expect(merged.status).toBe("done");
    expect(merged.assignedTo).toBe("SEO Guild");
    expect(merged.lastUpdatedAt).toBe(now.toISOString());
  });
});
