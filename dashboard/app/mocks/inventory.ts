import type {
  InventoryBucketId,
  InventoryBucketSummary,
  InventoryDashboardPayload,
  InventoryOverview,
  InventorySkuDemand,
  InventoryStatus,
  MockScenario,
  PurchaseOrderDraft,
  PurchaseOrderDraftItem,
} from "~/types/dashboard";

import {
  calculateReorderPoint,
  calculateSafetyStock,
  calculateStockoutDate,
} from "~/lib/inventory/math";
import {
  createMoney,
  createScenarioFaker,
  scenarioToDatasetState,
} from "./shared";

type InventoryScenarioOptions = {
  scenario?: MockScenario;
  seed?: number;
  count?: number;
};

type BuilderContext = {
  scenario: MockScenario;
  seed: number;
  count: number;
};

type ScenarioFaker = ReturnType<typeof createScenarioFaker>;

type VendorSeed = {
  id: string;
  name: string;
  leadTimeDays: number;
  notes: string;
};

type InventoryScenarioBuilder = (
  context: BuilderContext,
) => InventoryDashboardPayload;

const BUCKET_ORDER: InventoryBucketId[] = [
  "urgent",
  "air",
  "sea",
  "overstock",
];

const BUCKET_DEFINITIONS: Record<InventoryBucketId, {
  label: string;
  description: string;
  leadTimeDays: number;
}> = {
  urgent: {
    label: "Need urgently (<48h)",
    description: "SKUs stocked out or about to stock out. Trigger expediting.",
    leadTimeDays: 2,
  },
  air: {
    label: "Manufacturer air (≈30d lead)",
    description: "Air freight viable to avoid extended stockouts.",
    leadTimeDays: 30,
  },
  sea: {
    label: "Manufacturer sea (≈60d lead)",
    description: "Standard replenishment cycle via ocean freight.",
    leadTimeDays: 60,
  },
  overstock: {
    label: "Overstock / promo",
    description: "Long cover — consider promotions to clear stock.",
    leadTimeDays: 21,
  },
};

const STATUS_BY_BUCKET: Record<InventoryBucketId, InventoryStatus> = {
  urgent: "backorder",
  air: "low",
  sea: "healthy",
  overstock: "preorder",
};

const clampNumber = (value: number, minimum = 0): number =>
  Math.max(Math.round(value), minimum);

const buildTrend = (
  faker: ScenarioFaker,
  dailySales: number,
): InventorySkuDemand["trend"] => {
  return Array.from({ length: 6 }).map((_, index) => {
    const jitter = faker.number.float({ min: -2.5, max: 3.5, multipleOf: 0.1 });
    const baseUnits = dailySales * 7;
    const units = Math.max(Math.round(baseUnits + jitter * 5 - index * 1.2), 0);
    return {
      label: `W-${6 - index}`,
      units,
    };
  });
};

const createVendorSeeds = (
  faker: ScenarioFaker,
  count: number,
): VendorSeed[] => {
  const vendorCount = Math.max(3, Math.min(Math.floor(count / 4), 5));
  return Array.from({ length: vendorCount }).map((_, index) => ({
    id: `vendor-${index + 1}`,
    name: faker.company.name(),
    leadTimeDays: faker.number.int({ min: 18, max: 65 }),
    notes: faker.company.catchPhrase(),
  }));
};

const buildSku = (
  faker: ScenarioFaker,
  index: number,
  vendorSeeds: VendorSeed[],
): InventorySkuDemand => {
  const bucketId = BUCKET_ORDER[index % BUCKET_ORDER.length]!;
  const bucketConfig = BUCKET_DEFINITIONS[bucketId];
  const vendor = vendorSeeds[index % vendorSeeds.length]!;

  const dailySales = Math.max(
    faker.number.float({ min: 1.2, max: 18, multipleOf: 0.1 }),
    0.5,
  );
  const safetyStockDays = bucketId === "urgent"
    ? 5
    : bucketId === "air"
      ? 12
      : bucketId === "sea"
        ? 25
        : 15;

  const onHand = clampNumber(
    faker.number.int({
      min: bucketId === "overstock" ? 120 : 18,
      max: bucketId === "urgent" ? 95 : 360,
    }),
  );
  const inbound = clampNumber(
    faker.number.int({ min: bucketId === "urgent" ? 20 : 0, max: 260 }),
  );
  const committed = clampNumber(faker.number.int({ min: 8, max: 180 }));
  const coverDays = clampNumber(onHand / dailySales);
  const peakFactor = faker.number.float({ min: 1.1, max: 1.9, multipleOf: 0.05 });
  const safetyStock = clampNumber(
    calculateSafetyStock(dailySales, dailySales * peakFactor, bucketConfig.leadTimeDays),
  );
  const reorderPoint = clampNumber(
    calculateReorderPoint({
      dailySales,
      leadTimeDays: bucketConfig.leadTimeDays,
      safetyStockDays,
    }),
  );
  const netInventory = onHand + inbound - committed;
  const recommendedOrder = Math.max(reorderPoint - netInventory + safetyStock, 0);
  const unitCost = createMoney(
    faker.number.float({ min: 6, max: 120, multipleOf: 0.5 }),
  );
  const stockoutDate = calculateStockoutDate(
    Math.max(onHand - committed + inbound, 0),
    Math.max(dailySales, 0.1),
  ).toISOString();

  const turnoverDays = clampNumber(
    faker.number.int({ min: 15, max: 65 }) + (bucketId === "overstock" ? 20 : 0),
  );
  const sellThroughRate = Number.parseFloat(
    faker.number.float({ min: 0.25, max: 0.9, multipleOf: 0.01 }).toFixed(2),
  );
  const lastWeekUnits = clampNumber(dailySales * 7 + faker.number.int({ min: -5, max: 10 }));

  return {
    id: `inventory-${index}`,
    title: `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.commerce.product()}`,
    sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: STATUS_BY_BUCKET[bucketId],
    bucketId,
    onHand,
    inbound,
    committed,
    coverDays,
    safetyStock,
    reorderPoint,
    recommendedOrder: clampNumber(recommendedOrder),
    stockoutDate,
    unitCost,
    velocity: {
      turnoverDays,
      sellThroughRate,
      lastWeekUnits,
    },
    trend: buildTrend(faker, dailySales),
  } satisfies InventorySkuDemand;
};

const buildSkus = (
  faker: ScenarioFaker,
  count: number,
  vendorSeeds: VendorSeed[],
): InventorySkuDemand[] => {
  return Array.from({ length: count }).map((_, index) => buildSku(faker, index, vendorSeeds));
};

const buildBucketSummaries = (
  skus: InventorySkuDemand[],
): InventoryBucketSummary[] => {
  return BUCKET_ORDER.map((bucketId) => {
    const config = BUCKET_DEFINITIONS[bucketId];
    const bucketSkus = skus.filter((sku) => sku.bucketId === bucketId);
    const valueAtRiskAmount = bucketSkus.reduce(
      (total, sku) => total + sku.recommendedOrder * sku.unitCost.amount,
      0,
    );

    return {
      id: bucketId,
      label: config.label,
      description: config.description,
      leadTimeDays: config.leadTimeDays,
      skuCount: bucketSkus.length,
      valueAtRisk: createMoney(valueAtRiskAmount),
    } satisfies InventoryBucketSummary;
  });
};

const buildVendorDraftItems = (
  skus: InventorySkuDemand[],
  vendorId: string,
): PurchaseOrderDraftItem[] => {
  return skus
    .filter((sku) => sku.vendorId === vendorId)
    .map((sku) => ({
      skuId: sku.id,
      sku: sku.sku,
      title: sku.title,
      recommendedOrder: sku.recommendedOrder,
      draftQuantity: sku.recommendedOrder,
      unitCost: sku.unitCost,
    }));
};

const buildVendorDrafts = (
  skus: InventorySkuDemand[],
  vendors: VendorSeed[],
  faker: ScenarioFaker,
): PurchaseOrderDraft[] => {
  return vendors.map((vendor) => {
    const items = buildVendorDraftItems(skus, vendor.id);
    const totalDraftAmount = items.reduce(
      (total, item) => total + item.draftQuantity * item.unitCost.amount,
      0,
    );

    const paddedBudget =
      totalDraftAmount * faker.number.float({ min: 1.1, max: 1.6, multipleOf: 0.05 });

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      leadTimeDays: vendor.leadTimeDays,
      budgetRemaining: createMoney(paddedBudget),
      lastOrderAt: faker.date.recent({ days: 60 }).toISOString(),
      notes: vendor.notes,
      items,
    } satisfies PurchaseOrderDraft;
  });
};

const buildSummary = (
  skus: InventorySkuDemand[],
  vendorDrafts: PurchaseOrderDraft[],
) => {
  const totalCover = skus.reduce((total, sku) => total + sku.coverDays, 0);
  const totalDraftAmount = vendorDrafts.reduce((total, vendor) => {
    return total + vendor.items.reduce(
      (itemTotal, item) => itemTotal + item.draftQuantity * item.unitCost.amount,
      0,
    );
  }, 0);

  const skusAtRisk = skus.filter(
    (sku) => sku.bucketId === "urgent" || sku.bucketId === "air",
  ).length;

  return {
    skusAtRisk,
    averageCoverDays: skus.length ? Math.round(totalCover / skus.length) : 0,
    openPoBudget: createMoney(totalDraftAmount),
  };
};

const assembleDataset = (
  scenario: MockScenario,
  skus: InventorySkuDemand[],
  vendorSeeds: VendorSeed[],
  faker: ScenarioFaker,
  alert?: string,
  error?: string,
): InventoryDashboardPayload => {
  const buckets = buildBucketSummaries(skus);
  const vendorDrafts = buildVendorDrafts(skus, vendorSeeds, faker);
  const summary = buildSummary(skus, vendorDrafts);

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    summary,
    buckets,
    skus,
    vendors: vendorDrafts,
    alert,
    error,
  };
};

const buildBaseInventory: InventoryScenarioBuilder = ({
  scenario,
  seed,
  count,
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const vendorSeeds = createVendorSeeds(faker, count);
  const skus = buildSkus(faker, count, vendorSeeds);
  return assembleDataset(scenario, skus, vendorSeeds, faker);
};

const buildWarningInventory: InventoryScenarioBuilder = ({
  scenario,
  seed,
  count,
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const vendorSeeds = createVendorSeeds(faker, count);
  const skus = buildSkus(faker, count, vendorSeeds).map((sku, index) => {
    if (index % 2 === 0) {
      const adjusted = Math.max(
        sku.recommendedOrder + faker.number.int({ min: 10, max: 40 }),
        0,
      );
      return {
        ...sku,
        bucketId: "urgent",
        status: "backorder",
        coverDays: Math.max(sku.coverDays - 6, 0),
        recommendedOrder: adjusted,
      } satisfies InventorySkuDemand;
    }
    return sku;
  });

  return assembleDataset(
    scenario,
    skus,
    vendorSeeds,
    faker,
    "Low-stock SKUs exceed configured thresholds. Expedite replenishment.",
  );
};

const buildEmptyInventory: InventoryScenarioBuilder = ({ scenario }) => {
  const emptyBuckets = BUCKET_ORDER.map((bucketId) => ({
    id: bucketId,
    label: BUCKET_DEFINITIONS[bucketId].label,
    description: BUCKET_DEFINITIONS[bucketId].description,
    leadTimeDays: BUCKET_DEFINITIONS[bucketId].leadTimeDays,
    skuCount: 0,
    valueAtRisk: createMoney(0),
  }));

  return {
    scenario,
    state: "empty",
    summary: {
      skusAtRisk: 0,
      averageCoverDays: 0,
      openPoBudget: createMoney(0),
    },
    buckets: emptyBuckets,
    skus: [],
    vendors: [],
    alert: "Inventory catalog is empty. Import products to begin tracking.",
  } satisfies InventoryDashboardPayload;
};

const buildErrorInventory: InventoryScenarioBuilder = ({ scenario }) => {
  const emptyBuckets = BUCKET_ORDER.map((bucketId) => ({
    id: bucketId,
    label: BUCKET_DEFINITIONS[bucketId].label,
    description: BUCKET_DEFINITIONS[bucketId].description,
    leadTimeDays: BUCKET_DEFINITIONS[bucketId].leadTimeDays,
    skuCount: 0,
    valueAtRisk: createMoney(0),
  }));

  return {
    scenario,
    state: "error",
    summary: {
      skusAtRisk: 0,
      averageCoverDays: 0,
      openPoBudget: createMoney(0),
    },
    buckets: emptyBuckets,
    skus: [],
    vendors: [],
    error: "Inventory snapshot failed to load. Refresh to retry.",
  } satisfies InventoryDashboardPayload;
};

const BUILDERS: Record<MockScenario, InventoryScenarioBuilder> = {
  base: buildBaseInventory,
  empty: buildEmptyInventory,
  warning: buildWarningInventory,
  error: buildErrorInventory,
};

export const getInventoryScenario = (
  options: InventoryScenarioOptions = {},
): InventoryDashboardPayload => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const count = options.count ?? 18;

  return BUILDERS[scenario]({ scenario, seed, count });
};

export type InventoryOverviewOptions = {
  scenario?: MockScenario;
  seed?: number;
};

type OverviewBuilderContext = {
  scenario: MockScenario;
  seed: number;
};

type InventoryOverviewBuilder = (
  context: OverviewBuilderContext,
) => InventoryOverview;

const buildOverviewBuckets = (faker: ScenarioFaker) => {
  const healthy = faker.number.int({ min: 12, max: 42 });
  const low = faker.number.int({ min: 2, max: 18 });
  const backorder = faker.number.int({ min: 1, max: 10 });
  const preorder = faker.number.int({ min: 0, max: 6 });

  return { healthy, low, backorder, preorder } as const;
};

const createBucket = (
  id: InventoryBucketId,
  label: string,
  description: string,
  skuCount: number,
): InventoryOverview["buckets"][number] => ({
  id,
  label,
  description,
  skuCount,
  href: `/app/inventory?bucket=${id}`,
});

const buildBaseOverview: InventoryOverviewBuilder = ({ scenario, seed }) => {
  const faker = createScenarioFaker(scenario, seed);
  const bucketCounts = buildOverviewBuckets(faker);

  const buckets = [
    createBucket(
      "urgent",
      BUCKET_DEFINITIONS.urgent.label,
      BUCKET_DEFINITIONS.urgent.description,
      bucketCounts.low,
    ),
    createBucket(
      "air",
      BUCKET_DEFINITIONS.air.label,
      BUCKET_DEFINITIONS.air.description,
      bucketCounts.backorder,
    ),
    createBucket(
      "sea",
      BUCKET_DEFINITIONS.sea.label,
      BUCKET_DEFINITIONS.sea.description,
      bucketCounts.healthy,
    ),
    createBucket(
      "overstock",
      BUCKET_DEFINITIONS.overstock.label,
      BUCKET_DEFINITIONS.overstock.description,
      bucketCounts.preorder,
    ),
  ];

  const trends = Array.from({ length: 5 }, (_, index) => ({
    label: `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`.slice(0, 60),
    currentStock: faker.number.int({ min: 20, max: 420 }),
    projectedDays: faker.number.int({ min: 7, max: 45 }) - index,
  })).map((trend) => ({
    ...trend,
    projectedDays: Math.max(trend.projectedDays, 0),
  }));

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    buckets,
    trends,
  } satisfies InventoryOverview;
};

const buildEmptyOverview: InventoryOverviewBuilder = ({ scenario }) => ({
  scenario,
  state: "empty",
  buckets: BUCKET_ORDER.map((bucketId) =>
    createBucket(
      bucketId,
      BUCKET_DEFINITIONS[bucketId].label,
      BUCKET_DEFINITIONS[bucketId].description,
      0,
    ),
  ),
  trends: [],
  alert: "No inventory data available. Sync products to populate this view.",
});

const buildWarningOverview: InventoryOverviewBuilder = ({ scenario, seed }) => {
  const base = buildBaseOverview({ scenario, seed });
  const boost = (value: number) => Math.round(value * 1.5) + 3;

  base.buckets = base.buckets.map((bucket) => {
    if (bucket.id === "urgent" || bucket.id === "air") {
      return { ...bucket, skuCount: boost(bucket.skuCount) };
    }
    if (bucket.id === "sea") {
      return { ...bucket, skuCount: Math.max(bucket.skuCount - 5, 0) };
    }
    return bucket;
  });

  base.trends = base.trends.map((trend, index) => ({
    ...trend,
    projectedDays: Math.max(trend.projectedDays - (index + 2), 0),
  }));
  base.alert = "Low-stock and backorder volume elevated. Review purchase orders.";
  base.state = "warning";
  return base;
};

const buildErrorOverview: InventoryOverviewBuilder = ({ scenario }) => ({
  scenario,
  state: "error",
  buckets: [],
  trends: [],
  error: "Inventory overview failed to load. Retry shortly or check log drains.",
});

const OVERVIEW_BUILDERS: Record<MockScenario, InventoryOverviewBuilder> = {
  base: buildBaseOverview,
  empty: buildEmptyOverview,
  warning: buildWarningOverview,
  error: buildErrorOverview,
};

export const getInventoryOverview = (
  options: InventoryOverviewOptions = {},
): InventoryOverview => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  return OVERVIEW_BUILDERS[scenario]({ scenario, seed });
};
