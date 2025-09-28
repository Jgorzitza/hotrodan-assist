import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSettingsMock = vi.fn();
const getMcpProductRecommendationsMock = vi.fn();
const isMcpFeatureEnabledMock = vi.fn(() => false);
const shouldUseMcpMocksMock = vi.fn(() => true);

vi.mock("../../shopify.server", () => ({
  authenticate: {
    admin: vi.fn(),
  },
}));

vi.mock("../../lib/settings/repository.server", () => ({
  storeSettingsRepository: {
    getSettings: getSettingsMock,
  },
}));

vi.mock("~/lib/mcp", () => ({
  getMcpProductRecommendations: getMcpProductRecommendationsMock,
  isMcpFeatureEnabled: isMcpFeatureEnabledMock,
  shouldUseMcpMocks: shouldUseMcpMocksMock,
}));

vi.mock("~/lib/mcp/config.server", () => ({
  getMcpClientOverridesForShop: vi.fn(),
}));

const loadModule = async () => import("../app._index");

describe("dashboard home loader", () => {
  beforeEach(() => {
    vi.resetModules();
    getSettingsMock.mockReset();
    getMcpProductRecommendationsMock.mockReset();
    isMcpFeatureEnabledMock.mockReturnValue(false);
    shouldUseMcpMocksMock.mockReturnValue(true);
    process.env.USE_MOCK_DATA = "true";
    process.env.ENABLE_MCP = "false";
    process.env.SHOPIFY_APP_URL = "https://test.internal";
  });

  afterEach(() => {
    delete process.env.USE_MOCK_DATA;
    delete process.env.ENABLE_MCP;
    delete process.env.SHOPIFY_APP_URL;
  });

  it("parses range from request and returns overview dataset", async () => {
    getSettingsMock.mockResolvedValue({
      toggles: {
        enableMcpIntegration: true,
      },
    });
    getMcpProductRecommendationsMock.mockResolvedValue({
      data: [
        {
          title: "Turbo kits",
          rationale: "High search interest this week",
        },
      ],
      source: "mock",
      generatedAt: "2024-02-05T12:00:00.000Z",
    });

    const module = await loadModule();
    const args = {
      request: new Request("https://test.internal/app?range=7d&mockState=warning"),
      params: {},
      context: {} as never,
    } as Parameters<typeof module.loader>[0];

    const response = await module.loader(args);
    const payload = await response.json();

    expect(payload.data.range).toBe("7d");
    expect(payload.data.rangeLabel).toBe("Last 7 days");
    expect(Array.isArray(payload.data.sparkline)).toBe(true);
    expect(payload.data.sparkline.length).toBeGreaterThan(0);
    expect(payload.data.sparkline.every((value: number) => typeof value === "number")).toBe(true);
    expect(payload.scenario).toBe("warning");
    expect(payload.mcp).toEqual(
      expect.objectContaining({
        enabled: false,
        usingMocks: true,
        source: "mock",
        generatedAt: "2024-02-05T12:00:00.000Z",
      }),
    );
    expect(payload.data.mcpRecommendation).toContain("Turbo kits");
    expect(getMcpProductRecommendationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ range: "7d", limit: 3 }),
      }),
      expect.objectContaining({ enableMcpIntegration: true }),
      undefined,
    );
  });

  it("falls back to default range when search param is invalid", async () => {
    getSettingsMock.mockResolvedValue({ toggles: { enableMcpIntegration: false } });
    getMcpProductRecommendationsMock.mockResolvedValue({
      data: [],
      source: "mock",
      generatedAt: undefined,
    });

    const module = await loadModule();
    const response = await module.loader({
      request: new Request("https://test.internal/app?range=not-a-range"),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();
    expect(payload.data.range).toBe("28d");
    expect(shouldUseMcpMocksMock).toHaveBeenCalledWith({ enableMcpIntegration: false });
  });
});
