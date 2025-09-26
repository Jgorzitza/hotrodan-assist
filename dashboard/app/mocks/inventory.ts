import type { InventoryDataset, InventoryItem, MockScenario } from "~/types/dashboard";

import { createScenarioFaker, scenarioToDatasetState } from "./shared";

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

const STATUS_ROTATION: InventoryItem["status"][] = [
  "healthy",
  "low",
  "backorder",
  "preorder",
];

const buildItems = (
  faker: ReturnType<typeof createScenarioFaker>,
  count: number,
): InventoryItem[] =>
  Array.from({ length: count }, (_, index) => {
    const status = STATUS_ROTATION[index % STATUS_ROTATION.length]!;
    const available = faker.number.int({ min: 0, max: 420 });
    const incoming = faker.number.int({ min: 0, max: 250 });
    const committed = faker.number.int({ min: 0, max: 150 });

    return {
      id: `inventory-${index}`,
      title: `${faker.commerce.productAdjective()} ${faker.commerce.productMaterial()} ${faker.commerce.product()}`,
      sku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
      status,
      available,
      incoming,
      committed,
      backordered: Math.max(committed - available, 0),
      velocity: {
        turnoverDays: faker.number.int({ min: 10, max: 90 }),
        sellThroughRate: Number(
          faker.number.float({ min: 0.2, max: 0.9, multipleOf: 0.01 }).toFixed(2),
        ),
        lastWeekUnits: faker.number.int({ min: 5, max: 120 }),
      },
      restockEta:
        status === "backorder" || status === "preorder"
          ? faker.date.soon({ days: 21 }).toISOString()
          : undefined,
    };
  });

const summarise = (items: InventoryItem[]) =>
  items.reduce(
    (summary, item) => {
      summary.totalSkus += 1;
      summary[item.status] += 1;
      return summary;
    },
    {
      totalSkus: 0,
      healthy: 0,
      low: 0,
      backorder: 0,
      preorder: 0,
    } satisfies InventoryDataset["summary"],
  );

const buildBaseInventory = ({ scenario, seed, count }: BuilderContext): InventoryDataset => {
  const faker = createScenarioFaker(scenario, seed);
  const items = buildItems(faker, count);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    summary: summarise(items),
    items,
  };
};

const buildEmptyInventory = ({ scenario }: BuilderContext): InventoryDataset => ({
  scenario,
  state: "empty",
  summary: {
    totalSkus: 0,
    healthy: 0,
    low: 0,
    backorder: 0,
    preorder: 0,
  },
  items: [],
  alert: "Inventory catalog is empty. Import products to begin tracking.",
});

const buildWarningInventory = (context: BuilderContext): InventoryDataset => {
  const dataset = buildBaseInventory(context);
  dataset.state = "warning";
  dataset.alert = "Low-stock SKUs exceed configured thresholds.";
  dataset.items = dataset.items.map((item, index) => ({
    ...item,
    status: index % 3 === 0 ? "low" : item.status,
    velocity: {
      ...item.velocity,
      turnoverDays: item.velocity.turnoverDays || 45,
    },
  }));
  dataset.summary = summarise(dataset.items);
  return dataset;
};

const buildErrorInventory = ({ scenario }: BuilderContext): InventoryDataset => ({
  scenario,
  state: "error",
  summary: {
    totalSkus: 0,
    healthy: 0,
    low: 0,
    backorder: 0,
    preorder: 0,
  },
  items: [],
  error: "Inventory snapshot failed to load. Refresh to retry.",
});

const BUILDERS: Record<MockScenario, (ctx: BuilderContext) => InventoryDataset> = {
  base: buildBaseInventory,
  empty: buildEmptyInventory,
  warning: buildWarningInventory,
  error: buildErrorInventory,
};

export const getInventoryScenario = (
  options: InventoryScenarioOptions = {},
): InventoryDataset => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;
  const count = options.count ?? 16;

  return BUILDERS[scenario]({ scenario, seed, count });
};
