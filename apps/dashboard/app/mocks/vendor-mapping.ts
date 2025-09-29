import type {
  VendorMapping,
  VendorSkuMapping,
  VendorMappingPayload,
  FastMoversDecile,
  FastMoversPayload,
  MockScenario,
} from "~/types/dashboard";

type VendorMappingOptions = {
  scenario?: MockScenario;
  seed?: number;
  vendorCount?: number;
  skuCount?: number;
};

type BuilderContext = {
  scenario: MockScenario;
  seed: number;
  vendorCount: number;
  skuCount: number;
};

type ScenarioFaker = ReturnType<typeof createScenarioFaker>;

const createVendorMapping = (
  faker: ScenarioFaker,
  index: number,
): VendorMapping => {
  const id = `vendor-${index + 1}`;
  const name = faker.company.name();
  const email = faker.internet.email();
  const phone = faker.phone.number();
  const leadTimeDays = faker.number.int({ min: 7, max: 60 });
  const minimumOrderValue = createMoney(
    faker.number.float({ min: 100, max: 5000, multipleOf: 50 }),
  );
  const paymentTerms = faker.helpers.arrayElement([
    "Net 30",
    "Net 15",
    "Net 45",
    "2/10 Net 30",
    "COD",
  ]);
  const notes = faker.lorem.sentence();
  const isActive = faker.datatype.boolean(0.8); // 80% active
  const createdAt = faker.date.past({ years: 2 }).toISOString();
  const updatedAt = faker.date.recent({ days: 30 }).toISOString();

  return {
    id,
    name,
    email,
    phone,
    leadTimeDays,
    minimumOrderValue,
    paymentTerms,
    notes,
    isActive,
    createdAt,
    updatedAt,
  };
};

const createVendorSkuMapping = (
  faker: ScenarioFaker,
  vendorId: string,
  skuIndex: number,
): VendorSkuMapping => {
  const id = `mapping-${vendorId}-${skuIndex}`;
  const productId = `product-${skuIndex}`;
  const sku = faker.string.alphanumeric({ length: 8 }).toUpperCase();
  const vendorSku = faker.string.alphanumeric({ length: 10 }).toUpperCase();
  const vendorPrice = createMoney(
    faker.number.float({ min: 5, max: 200, multipleOf: 0.01 }),
  );
  const isPrimary = faker.datatype.boolean(0.3); // 30% primary
  const createdAt = faker.date.past({ years: 1 }).toISOString();
  const updatedAt = faker.date.recent({ days: 7 }).toISOString();

  return {
    id,
    vendorId,
    productId,
    sku,
    vendorSku,
    vendorPrice,
    isPrimary,
    createdAt,
    updatedAt,
  };
};

const buildVendorMappings = (
  faker: ScenarioFaker,
  vendorCount: number,
  skuCount: number,
): { vendors: VendorMapping[]; skuMappings: VendorSkuMapping[] } => {
  const vendors = Array.from({ length: vendorCount }, (_, index) =>
    createVendorMapping(faker, index),
  );

  const skuMappings: VendorSkuMapping[] = [];
  vendors.forEach((vendor) => {
    const mappingsPerVendor = faker.number.int({ min: 2, max: Math.min(skuCount, 8) });
    for (let i = 0; i < mappingsPerVendor; i++) {
      skuMappings.push(createVendorSkuMapping(faker, vendor.id, i));
    }
  });

  return { vendors, skuMappings };
};

const buildBaseVendorMapping: (context: BuilderContext) => VendorMappingPayload = ({
  scenario,
  seed,
  vendorCount,
  skuCount,
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const { vendors, skuMappings } = buildVendorMappings(faker, vendorCount, skuCount);

  return {
    scenario,
    state: "ok",
    vendors,
    skuMappings,
  };
};

const buildEmptyVendorMapping: (context: BuilderContext) => VendorMappingPayload = ({
  scenario,
}) => ({
  scenario,
  state: "empty",
  vendors: [],
  skuMappings: [],
  alert: "No vendor mappings found. Add vendors and SKU mappings to begin.",
});

const buildErrorVendorMapping: (context: BuilderContext) => VendorMappingPayload = ({
  scenario,
}) => ({
  scenario,
  state: "error",
  vendors: [],
  skuMappings: [],
  error: "Failed to load vendor mappings. Please try again.",
});

const VENDOR_MAPPING_BUILDERS: Record<MockScenario, (context: BuilderContext) => VendorMappingPayload> = {
  base: buildBaseVendorMapping,
  empty: buildEmptyVendorMapping,
  warning: buildBaseVendorMapping,
  error: buildErrorVendorMapping,
};

export const getVendorMappingScenario = (
  options: VendorMappingOptions = {},
): VendorMappingPayload => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const vendorCount = options.vendorCount ?? 5;
  const skuCount = options.skuCount ?? 20;

  return VENDOR_MAPPING_BUILDERS[scenario]({ scenario, seed, vendorCount, skuCount });
};

// Fast Movers functionality
const createFastMoversDecile = (
  faker: ScenarioFaker,
  decile: number,
  skuIds: string[],
  minVelocity: number,
  maxVelocity: number,
): FastMoversDecile => {
  const skuCount = skuIds.length;
  const averageVelocity = (minVelocity + maxVelocity) / 2;
  const totalValue = createMoney(
    faker.number.float({ min: 1000, max: 50000, multipleOf: 100 }),
  );

  return {
    decile,
    minVelocity,
    maxVelocity,
    skuCount,
    skuIds,
    totalValue,
    averageVelocity,
  };
};

const buildFastMoversDeciles = (
  faker: ScenarioFaker,
  skuCount: number,
): FastMoversDecile[] => {
  const deciles: FastMoversDecile[] = [];
  const skusPerDecile = Math.ceil(skuCount / 10);
  
  for (let i = 0; i < 10; i++) {
    const startIndex = i * skusPerDecile;
    const endIndex = Math.min(startIndex + skusPerDecile, skuCount);
    
    if (startIndex >= skuCount) break;

    const skuIds = Array.from({ length: endIndex - startIndex }, (_, j) => `sku-${startIndex + j + 1}`);
    const minVelocity = Math.max(100 - (i * 10), 10);
    const maxVelocity = Math.max(110 - (i * 10), 20);

    deciles.push(createFastMoversDecile(faker, i + 1, skuIds, minVelocity, maxVelocity));
  }

  return deciles;
};

const buildFastMoversPayload: (context: BuilderContext) => FastMoversPayload = ({
  scenario,
  seed,
  skuCount,
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const deciles = buildFastMoversDeciles(faker, skuCount);
  
  // Generate mock SKU data for the deciles
  const skus = deciles.flatMap(decile => 
    decile.skuIds.map((skuId, index) => ({
      id: skuId,
      title: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      sku: skuId,
      vendorId: `vendor-${(index % 3) + 1}`,
      vendorName: faker.company.name(),
      status: "healthy" as const,
      bucketId: "sea" as const,
      onHand: faker.number.int({ min: 50, max: 500 }),
      inbound: faker.number.int({ min: 0, max: 100 }),
      committed: faker.number.int({ min: 0, max: 50 }),
      coverDays: faker.number.int({ min: 7, max: 30 }),
      safetyStock: faker.number.int({ min: 10, max: 50 }),
      reorderPoint: faker.number.int({ min: 50, max: 200 }),
      recommendedOrder: faker.number.int({ min: 0, max: 100 }),
      stockoutDate: faker.date.future({ days: 30 }).toISOString(),
      unitCost: createMoney(faker.number.float({ min: 10, max: 100 })),
      velocity: {
        turnoverDays: faker.number.int({ min: 7, max: 30 }),
        sellThroughRate: faker.number.float({ min: 0.1, max: 0.9 }),
        lastWeekUnits: faker.number.int({ min: 10, max: 200 }),
      },
      trend: Array.from({ length: 6 }, (_, i) => ({
        label: `W-${6 - i}`,
        units: faker.number.int({ min: 5, max: 50 }),
      })),
    }))
  );

  return {
    scenario,
    state: "ok",
    deciles,
    skus,
  };
};

const buildEmptyFastMovers: (context: BuilderContext) => FastMoversPayload = ({
  scenario,
}) => ({
  scenario,
  state: "empty",
  deciles: [],
  skus: [],
  alert: "No SKU velocity data available. Sync inventory to populate Fast Movers analysis.",
});

const buildErrorFastMovers: (context: BuilderContext) => FastMoversPayload = ({
  scenario,
}) => ({
  scenario,
  state: "error",
  deciles: [],
  skus: [],
  error: "Failed to load Fast Movers data. Please try again.",
});

const FAST_MOVERS_BUILDERS: Record<MockScenario, (context: BuilderContext) => FastMoversPayload> = {
  base: buildFastMoversPayload,
  empty: buildEmptyFastMovers,
  warning: buildFastMoversPayload,
  error: buildErrorFastMovers,
};

export const getFastMoversScenario = (
  options: VendorMappingOptions = {},
): FastMoversPayload => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const skuCount = options.skuCount ?? 50;

  return FAST_MOVERS_BUILDERS[scenario]({ scenario, seed, vendorCount: 0, skuCount });
};
export function scenarioFromRequest(request: Request): MockScenario {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("mockState") as MockScenario;
  return scenario || "normal";
}
