import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InventoryDashboardPayload } from "~/types/dashboard";

const authenticateAdminMock = vi.fn();
const getSettingsMock = vi.fn();
const getInventoryScenarioMock = vi.fn();
const scenarioFromRequestMock = vi.fn();
const getMcpInventorySignalsMock = vi.fn();
const isMcpFeatureEnabledMock = vi.fn();
const shouldUseMcpMocksMock = vi.fn();
const getMcpClientOverridesForShopMock = vi.fn();

vi.mock("../../shopify.server", () => ({
  authenticate: {
    admin: authenticateAdminMock,
  },
}));

vi.mock("../../lib/settings/repository.server", () => ({
  storeSettingsRepository: {
    getSettings: getSettingsMock,
  },
}));

vi.mock("~/lib/mcp", () => ({
  getMcpInventorySignals: getMcpInventorySignalsMock,
  isMcpFeatureEnabled: isMcpFeatureEnabledMock,
  shouldUseMcpMocks: shouldUseMcpMocksMock,
}));

vi.mock("~/lib/mcp/config.server", () => ({
  getMcpClientOverridesForShop: getMcpClientOverridesForShopMock,
}));

vi.mock("~/mocks", () => ({
  getInventoryScenario: getInventoryScenarioMock,
  scenarioFromRequest: scenarioFromRequestMock,
}));

const importInventoryRoute = () => import("../app.inventory");

type InventoryRouteModule = Awaited<ReturnType<typeof importInventoryRoute>>;

type Money = InventoryDashboardPayload["summary"]["openPoBudget"];

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const money = (amount: number): Money => ({
  amount,
  currency: "USD",
  formatted: formatCurrency(amount),
});

const baseInventoryPayload: InventoryDashboardPayload = {
  scenario: "base",
  state: "ok",
  summary: {
    skusAtRisk: 3,
    averageCoverDays: 18,
    openPoBudget: money(42000),
  },
  buckets: [
    {
      id: "urgent",
      label: "Need urgently (<48h)",
      description: "SKUs stocked out or about to stock out.",
      leadTimeDays: 2,
      skuCount: 1,
      valueAtRisk: money(5400),
    },
    {
      id: "air",
      label: "Manufacturer air (≈30d)",
      description: "Air freight option",
      leadTimeDays: 30,
      skuCount: 1,
      valueAtRisk: money(3200),
    },
    {
      id: "sea",
      label: "Manufacturer sea (≈60d)",
      description: "Standard replenishment",
      leadTimeDays: 60,
      skuCount: 1,
      valueAtRisk: money(2200),
    },
    {
      id: "overstock",
      label: "Overstock / promo",
      description: "Long cover — consider promotions.",
      leadTimeDays: 21,
      skuCount: 1,
      valueAtRisk: money(1800),
    },
  ],
  skus: [
    {
      id: "inventory-1",
      title: "Widget Alpha",
      sku: "WIDGET-ALPHA",
      vendorId: "vendor-1",
      vendorName: "Alpha Supply",
      status: "backorder",
      bucketId: "urgent",
      onHand: 4,
      inbound: 6,
      committed: 12,
      coverDays: 3,
      safetyStock: 10,
      reorderPoint: 24,
      recommendedOrder: 28,
      stockoutDate: "2024-09-30T00:00:00.000Z",
      unitCost: money(12),
      velocity: {
        turnoverDays: 14,
        sellThroughRate: 0.52,
        lastWeekUnits: 42,
      },
      trend: [
        { label: "W-1", units: 30 },
        { label: "W-2", units: 33 },
        { label: "W-3", units: 37 },
      ],
    },
    {
      id: "inventory-2",
      title: "Cozy Hoodie",
      sku: "COZY-HOODIE",
      vendorId: "vendor-2",
      vendorName: "Beacon Imports",
      status: "low",
      bucketId: "air",
      onHand: 28,
      inbound: 12,
      committed: 18,
      coverDays: 12,
      safetyStock: 16,
      reorderPoint: 40,
      recommendedOrder: 24,
      stockoutDate: "2024-10-12T00:00:00.000Z",
      unitCost: money(24),
      velocity: {
        turnoverDays: 28,
        sellThroughRate: 0.36,
        lastWeekUnits: 30,
      },
      trend: [
        { label: "W-1", units: 18 },
        { label: "W-2", units: 20 },
        { label: "W-3", units: 22 },
      ],
    },
    {
      id: "inventory-3",
      title: "Trail Water Bottle",
      sku: "TRAIL-BOTTLE",
      vendorId: "vendor-3",
      vendorName: "Summit Outfitters",
      status: "healthy",
      bucketId: "sea",
      onHand: 120,
      inbound: 60,
      committed: 40,
      coverDays: 42,
      safetyStock: 32,
      reorderPoint: 80,
      recommendedOrder: 0,
      stockoutDate: "2024-12-01T00:00:00.000Z",
      unitCost: money(18),
      velocity: {
        turnoverDays: 48,
        sellThroughRate: 0.28,
        lastWeekUnits: 18,
      },
      trend: [
        { label: "W-1", units: 14 },
        { label: "W-2", units: 16 },
        { label: "W-3", units: 15 },
      ],
    },
  ],
  vendors: [
    {
      vendorId: "vendor-1",
      vendorName: "Alpha Supply",
      leadTimeDays: 12,
      budgetRemaining: money(12500),
      lastOrderAt: "2024-08-15T00:00:00.000Z",
      notes: "Expedite hero SKU replenishment",
      items: [
        {
          skuId: "inventory-1",
          sku: "WIDGET-ALPHA",
          title: "Widget Alpha",
          recommendedOrder: 28,
          draftQuantity: 14,
          unitCost: money(12),
        },
      ],
    },
    {
      vendorId: "vendor-2",
      vendorName: "Beacon Imports",
      leadTimeDays: 28,
      budgetRemaining: money(8800),
      lastOrderAt: "2024-07-22T00:00:00.000Z",
      notes: "Confirm color split before release",
      items: [
        {
          skuId: "inventory-2",
          sku: "COZY-HOODIE",
          title: "Cozy Hoodie",
          recommendedOrder: 24,
          draftQuantity: 10,
          unitCost: money(24),
        },
      ],
    },
    {
      vendorId: "vendor-3",
      vendorName: "Summit Outfitters",
      leadTimeDays: 45,
      budgetRemaining: money(6400),
      lastOrderAt: "2024-06-30T00:00:00.000Z",
      notes: "Hold steady — coverage is strong",
      items: [
        {
          skuId: "inventory-3",
          sku: "TRAIL-BOTTLE",
          title: "Trail Water Bottle",
          recommendedOrder: 0,
          draftQuantity: 0,
          unitCost: money(18),
        },
      ],
    },
  ],
};

const clonePayload = (): InventoryDashboardPayload =>
  structuredClone ? structuredClone(baseInventoryPayload) : JSON.parse(JSON.stringify(baseInventoryPayload));

const resetMocks = () => {
  authenticateAdminMock.mockReset();
  getSettingsMock.mockReset();
  getInventoryScenarioMock.mockReset();
  scenarioFromRequestMock.mockReset();
  getMcpInventorySignalsMock.mockReset();
  isMcpFeatureEnabledMock.mockReset();
  shouldUseMcpMocksMock.mockReset();
  getMcpClientOverridesForShopMock.mockReset();
};

afterEach(() => {
  delete process.env.USE_MOCK_DATA;
});

describe("inventory loader", () => {
  let module: InventoryRouteModule;

  beforeEach(async () => {
    vi.resetModules();
    process.env.USE_MOCK_DATA = "true";
    resetMocks();

    getSettingsMock.mockResolvedValue({ toggles: { enableMcpIntegration: true } });
    scenarioFromRequestMock.mockReturnValue("base");
    getInventoryScenarioMock.mockImplementation(() => clonePayload());
    isMcpFeatureEnabledMock.mockReturnValue(true);
    shouldUseMcpMocksMock.mockReturnValue(true);
    getMcpInventorySignalsMock.mockResolvedValue({
      data: [
        {
          sku: "WIDGET-ALPHA",
          riskLevel: "high",
          suggestedAction: "Expedite inbound PO",
          demandSignals: [{ label: "Weekly units", value: 48 }],
        },
      ],
      source: "mock",
      generatedAt: "2024-09-25T10:00:00.000Z",
      confidence: 0.9,
    });

    module = await importInventoryRoute();
  });

  it("selects bucket from query params and requests MCP signals for that bucket", async () => {
    const request = new Request("https://app.example.com/app/inventory?bucket=sea&count=24");
    const response = await module.loader({
      request,
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(getInventoryScenarioMock).toHaveBeenCalledWith({ scenario: "base", count: 24 });
    expect(payload.useMockData).toBe(true);
    expect(payload.count).toBe(24);
    expect(payload.selectedBucket).toBe("sea");
    expect(payload.payload.summary.openPoBudget.formatted).toBe("$42,000.00");
    expect(getMcpInventorySignalsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shopDomain: expect.any(String),
        params: expect.objectContaining({ bucket: "sea", limit: 5 }),
      }),
      { enableMcpIntegration: true },
      undefined,
    );
    expect(payload.mcp.signals).toHaveLength(1);
    expect(payload.mcp.usingMocks).toBe(true);
  });
});

describe("inventory loader (live mode)", () => {
  let module: InventoryRouteModule;

  beforeEach(async () => {
    vi.resetModules();
    process.env.USE_MOCK_DATA = "false";
    resetMocks();

    const toggles = { enableMcpIntegration: true } as const;
    getSettingsMock.mockResolvedValue({ toggles });
    scenarioFromRequestMock.mockReturnValue("base");
    getInventoryScenarioMock.mockImplementation(() => clonePayload());
    isMcpFeatureEnabledMock.mockReturnValue(true);
    shouldUseMcpMocksMock.mockReturnValue(false);
    authenticateAdminMock.mockResolvedValue({ session: { shop: "retail-shop.myshopify.com" } });
    getMcpClientOverridesForShopMock.mockResolvedValue({
      apiKey: "mcp-key",
      endpoint: "https://mcp.example.com",
      timeoutMs: 9000,
      maxRetries: 2,
    });
    getMcpInventorySignalsMock.mockResolvedValue({
      data: [],
      source: "live",
      generatedAt: "2024-09-25T10:30:00.000Z",
      confidence: 0.75,
    });

    module = await importInventoryRoute();
  });

  it("authenticates, fetches overrides, and forwards them to MCP when mocks are disabled", async () => {
    const request = new Request("https://app.example.com/app/inventory");
    const response = await module.loader({
      request,
      params: {},
      context: {} as never,
    });

    await response.json();

    expect(authenticateAdminMock).toHaveBeenCalledTimes(1);
    expect(getMcpClientOverridesForShopMock).toHaveBeenCalledWith("retail-shop.myshopify.com");
    expect(getMcpInventorySignalsMock).toHaveBeenCalledWith(
      {
        shopDomain: "retail-shop.myshopify.com",
        params: { limit: 5, bucket: "urgent" },
      },
      { enableMcpIntegration: true },
      {
        apiKey: "mcp-key",
        endpoint: "https://mcp.example.com",
        timeoutMs: 9000,
        maxRetries: 2,
      },
    );
  });
});

describe("inventory action", () => {
  let module: InventoryRouteModule;

  const postRequest = (body: URLSearchParams) =>
    new Request("https://app.example.com/app/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

  beforeEach(async () => {
    vi.resetModules();
    process.env.USE_MOCK_DATA = "true";
    resetMocks();
    getInventoryScenarioMock.mockImplementation(() => clonePayload());
    scenarioFromRequestMock.mockReturnValue("base");

    module = await importInventoryRoute();
  });

  it("saves planner drafts and returns a success message", async () => {
    const submission = {
      vendorId: "vendor-1",
      notes: "Ship partial by air",
      items: [
        { skuId: "inventory-1", draftQuantity: 20 },
      ],
    };

    const form = new URLSearchParams();
    form.set("intent", "save-draft");
    form.set("payload", JSON.stringify(submission));

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.message).toBe("Draft saved for vendor-1");
  });

  it("returns a validation error when the draft payload is invalid JSON", async () => {
    const form = new URLSearchParams();
    form.set("intent", "save-draft");
    form.set("payload", "not-json");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.message).toBe("Invalid draft payload");
  });

  it("exports vendor CSV rows and includes the expected filename", async () => {
    const form = new URLSearchParams();
    form.set("intent", "export-csv");
    form.set("vendorId", "vendor-1");
    form.set("count", "20");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getInventoryScenarioMock).toHaveBeenCalledWith({ scenario: "base", count: 20 });
    expect(payload.ok).toBe(true);
    expect(payload.filename).toBe("inventory-vendor-1.csv");
    expect(payload.csv.split("\n")).toContain(
      "WIDGET-ALPHA,Widget Alpha,Alpha Supply,28,14,$12.00",
    );
  });

  it("authenticates before exporting when running against live data", async () => {
    vi.resetModules();
    process.env.USE_MOCK_DATA = "false";
    resetMocks();

    authenticateAdminMock.mockResolvedValue({ session: { shop: "live-shop.myshopify.com" } });
    scenarioFromRequestMock.mockReturnValue("base");
    getInventoryScenarioMock.mockImplementation(() => clonePayload());

    module = await importInventoryRoute();

    const form = new URLSearchParams();
    form.set("intent", "export-csv");
    form.set("bucketId", "air");
    form.set("count", "16");

    const response = await module.action({
      request: postRequest(form),
      params: {},
      context: {} as never,
    });

    await response.json();

    expect(authenticateAdminMock).toHaveBeenCalledTimes(1);
    expect(getInventoryScenarioMock).toHaveBeenCalledWith({ scenario: "base", count: 16 });
  });
});
