import type {
  MockScenario,
  SalesDataset,
  SalesGranularity,
  SalesAttachRateInsight,
  SalesCollectionPerformance,
  SalesInventoryRisk,
  SalesProductPerformance,
  SalesVariantPerformance,
  SalesTopCustomer,
  SalesCohortHighlight,
} from "~/types/dashboard";

import { buildDateBuckets, createDateRange } from "./factories/dates";
import {
  createMoney,
  createScenarioFaker,
  deltaPercentage,
  percentage,
  scenarioToDatasetState,
} from "./shared";

const DEFAULT_RANGE_BY_GRANULARITY: Record<SalesGranularity, number> = {
  daily: 14,
  weekly: 12,
  monthly: 12,
};

const CHANNEL_WEIGHTS = [
  { label: "Online Store", weight: 0.56 },
  { label: "Retail", weight: 0.22 },
  { label: "Wholesale", weight: 0.14 },
  { label: "Marketplaces", weight: 0.08 },
];

const INVENTORY_STATUSES = [
  "healthy",
  "overstock",
  "stockout_risk",
] as const satisfies ReadonlyArray<SalesProductPerformance["inventoryStatus"]>;

const BACKORDER_RISK = [
  "none",
  "low",
  "medium",
  "high",
] as const satisfies ReadonlyArray<SalesVariantPerformance["backorderRisk"]>;

type SalesScenarioOptions = {
  scenario?: MockScenario;
  granularity?: SalesGranularity;
  days?: number;
  seed?: number;
};

type BuilderContext = {
  scenario: MockScenario;
  granularity: SalesGranularity;
  days: number;
  seed: number;
};

type SalesScenarioBuilder = (context: BuilderContext) => SalesDataset;

const buildBaseScenario: SalesScenarioBuilder = ({
  scenario,
  granularity,
  days,
  seed,
}) => {
  const faker = createScenarioFaker(scenario, seed);
  const range = createDateRange(days);
  const buckets = buildDateBuckets(range, granularity);

  const totalAmount = faker.number.float({
    min: 80000,
    max: 140000,
    multipleOf: 0.01,
  });
  const previousTotalAmount = faker.number.float({
    min: totalAmount * 0.88,
    max: totalAmount * 1.08,
    multipleOf: 0.01,
  });

  const orders = faker.number.int({ min: 450, max: 950 });
  const avgOrderValue = totalAmount / Math.max(orders, 1);
  const conversionRate = faker.number.float({
    min: 1.4,
    max: 3.5,
    multipleOf: 0.01,
  });

  const baseBucketValue = totalAmount / buckets.length;
  const trend = buckets.map((date, index) => {
    const modifier = faker.number.float({
      min: 0.82,
      max: 1.18,
      multipleOf: 0.0001,
    });
    const bucketTotal = baseBucketValue * modifier;
    const bucketOrders = Math.max(
      12,
      Math.round((orders / buckets.length) * modifier),
    );

    return {
      date,
      total: createMoney(bucketTotal),
      orders: bucketOrders,
    };
  });

  const channelBreakdown = CHANNEL_WEIGHTS.map(({ label, weight }, index) => {
    const modifier = faker.number.float({
      min: 0.92,
      max: 1.08,
      multipleOf: 0.0001,
    });
    const channelTotal = totalAmount * weight * modifier;

    return {
      channel: label,
      total: createMoney(channelTotal),
      percentage: percentage(channelTotal, totalAmount, 1),
    };
  });

  const collectionCount = faker.number.int({ min: 4, max: 6 });
  const collectionWeights = Array.from({ length: collectionCount }, () =>
    faker.number.float({ min: 0.85, max: 1.2, multipleOf: 0.0001 }),
  );
  const collectionWeightTotal = collectionWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  ) || collectionCount;

  const collections: SalesCollectionPerformance[] = [];
  const productsByCollection: Record<string, SalesProductPerformance[]> = {};
  const variantsByProduct: Record<string, SalesVariantPerformance[]> = {};

  collectionWeights.forEach((weight) => {
    const collectionId = faker.string.uuid();
    const title = faker.commerce.department();
    const handle = faker.helpers.slugify(title).toLowerCase();
    const collectionGmv = (totalAmount * weight) / collectionWeightTotal;
    const orderModifier = faker.number.float({
      min: 0.85,
      max: 1.12,
      multipleOf: 0.0001,
    });
    const collectionOrders = Math.max(
      18,
      Math.round((orders / collectionCount) * orderModifier),
    );
    const conversion = faker.number.float({
      min: 1.2,
      max: 3.8,
      multipleOf: 0.01,
    });
    const returningRate = faker.number.float({
      min: 18,
      max: 42,
      multipleOf: 0.1,
    });
    const attachRate = faker.number.float({
      min: 8,
      max: 26,
      multipleOf: 0.1,
    });
    const deltaPct = faker.number.float({
      min: -9,
      max: 14,
      multipleOf: 0.1,
    });

    const collection: SalesCollectionPerformance = {
      id: collectionId,
      title,
      handle,
      gmv: createMoney(collectionGmv),
      orders: collectionOrders,
      conversionRate: conversion,
      returningRate,
      attachRate,
      deltaPercentage: deltaPct,
    };
    collections.push(collection);

    const productCount = faker.number.int({ min: 3, max: 6 });
    const productWeights = Array.from({ length: productCount }, () =>
      faker.number.float({ min: 0.9, max: 1.25, multipleOf: 0.0001 }),
    );
    const productWeightTotal = productWeights.reduce(
      (sum, value) => sum + value,
      0,
    ) || productCount;

    const products: SalesProductPerformance[] = [];

    productWeights.forEach((productWeight) => {
      const productId = faker.string.uuid();
      const productTitle = faker.commerce.productName();
      const productGmv = (collectionGmv * productWeight) / productWeightTotal;
      const productOrders = Math.max(
        8,
        Math.round(
          (collectionOrders / productCount) *
            faker.number.float({ min: 0.9, max: 1.2, multipleOf: 0.0001 }),
        ),
      );
      const product: SalesProductPerformance = {
        id: productId,
        title: productTitle,
        gmv: createMoney(productGmv),
        orders: productOrders,
        attachRate: faker.number.float({
          min: 4,
          max: 28,
          multipleOf: 0.1,
        }),
        returningRate: faker.number.float({
          min: 10,
          max: 36,
          multipleOf: 0.1,
        }),
        refundRate: faker.number.float({
          min: 0.4,
          max: 5.5,
          multipleOf: 0.1,
        }),
        skuCount: faker.number.int({ min: 2, max: 6 }),
        inventoryStatus: faker.helpers.arrayElement(INVENTORY_STATUSES),
      };
      products.push(product);

      const variantCount = Math.max(
        2,
        Math.min(6, product.skuCount + faker.number.int({ min: -1, max: 1 })),
      );
      const variantWeights = Array.from({ length: variantCount }, () =>
        faker.number.float({ min: 0.9, max: 1.2, multipleOf: 0.0001 }),
      );
      const variantWeightTotal = variantWeights.reduce(
        (sum, value) => sum + value,
        0,
      ) || variantCount;

      const variants: SalesVariantPerformance[] = variantWeights.map(
        (variantWeight, index) => {
          const unitsBaseline = Math.max(
            1,
            Math.round(
              (product.orders / variantCount) *
                faker.number.float({
                  min: 0.9,
                  max: 1.25,
                  multipleOf: 0.0001,
                }),
            ),
          );
          const unitsSold = unitsBaseline;
          const inventoryOnHand = Math.max(
            unitsSold,
            Math.round(
              unitsSold *
                faker.number.float({ min: 1.1, max: 2.3, multipleOf: 0.01 }),
            ),
          );

          return {
            id: faker.string.uuid(),
            sku: faker.string.alphanumeric({ length: 8, casing: "upper" }),
            title: `${productTitle} ${String.fromCharCode(65 + index)}`,
            gmv: createMoney((product.gmv.amount * variantWeight) / variantWeightTotal),
            unitsSold,
            inventoryOnHand,
            attachRate: faker.number.float({
              min: 1,
              max: 14,
              multipleOf: 0.1,
            }),
            backorderRisk: faker.helpers.arrayElement(BACKORDER_RISK),
          } satisfies SalesVariantPerformance;
        },
      );

      variantsByProduct[productId] = variants;
    });

    productsByCollection[collectionId] = products;
  });

  const allProducts = Object.values(productsByCollection).flat();
  const bestSellers = [...allProducts]
    .sort((a, b) => b.gmv.amount - a.gmv.amount)
    .slice(0, Math.min(6, allProducts.length));
  const laggards = [...allProducts]
    .sort((a, b) => a.orders - b.orders)
    .slice(0, Math.min(6, allProducts.length));

  const attachRateInsights: SalesAttachRateInsight[] = [];
  if (allProducts.length > 1) {
    const insightCount = Math.min(4, allProducts.length);
    for (let index = 0; index < insightCount; index += 1) {
      const primary = allProducts[index]!;
      const secondary = allProducts[(index + 1) % allProducts.length]!;
      attachRateInsights.push({
        id: `attach-${primary.id}`,
        primaryProduct: primary.title,
        attachmentProduct: secondary.title,
        attachRate: faker.number.float({
          min: 8,
          max: 32,
          multipleOf: 0.1,
        }),
        opportunity: `${secondary.title} added on ${faker
          .number.int({ min: 18, max: 42 })}
          .toString()}% of orders containing ${primary.title}`,
      });
    }
  }

  const riskCandidates = allProducts.filter(
    (product) => product.inventoryStatus !== "healthy",
  );
  const risksSource =
    allProducts.length === 0
      ? []
      : (riskCandidates.length ? riskCandidates : allProducts).slice(
          0,
          Math.min(4, allProducts.length),
        );
  const overstockRisks: SalesInventoryRisk[] = risksSource.map(
    (product, index) => {
      const status =
        product.inventoryStatus === "healthy"
          ? "overstock"
          : product.inventoryStatus;
      return {
        id: `risk-${product.id}-${index}`,
        productId: product.id,
        title: product.title,
        status,
        daysOnHand: faker.number.int({
          min: status === "overstock" ? 45 : 7,
          max: status === "overstock" ? 120 : 28,
        }),
        recommendedAction:
          status === "overstock"
            ? "Plan clearance campaign to reduce aging stock."
            : status === "stockout_risk"
              ? "Expedite replenishment to avoid lost revenue."
              : "Bundle with best sellers to improve velocity.",
      };
    },
  );

  const repeatPurchaseRate = faker.number.float({
    min: 24,
    max: 44,
    multipleOf: 0.1,
  });
  const highestOrderValue = createMoney(
    faker.number.float({ min: 540, max: 1840, multipleOf: 0.01 }),
  );
  const timeToSecondPurchase = faker.number.int({ min: 14, max: 48 });
  const cohortHighlights: SalesCohortHighlight[] = [
    {
      id: "repeat-rate",
      title: "Repeat purchase rate",
      value: `${repeatPurchaseRate.toFixed(1)}%`,
      description: "Customers returning within 90 days.",
    },
    {
      id: "top-order-value",
      title: "Highest order value",
      value: highestOrderValue.formatted,
      description: "Largest single order for the selected window.",
    },
    {
      id: "time-to-repeat",
      title: "Time to 2nd purchase",
      value: `${timeToSecondPurchase} days`,
      description: "Median time for customers to purchase again.",
    },
  ];

  const referenceDate = new Date(range.end);
  const topCustomers: SalesTopCustomer[] = Array.from(
    { length: 5 },
    () => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const lastOrder = faker.date.recent({
        days: Math.max(14, Math.min(days, 120)),
        refDate: referenceDate,
      });
      const firstOrder = faker.date.past({ years: 3, refDate: lastOrder });

      return {
        id: faker.string.uuid(),
        name: `${firstName} ${lastName}`,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        orders: faker.number.int({ min: 3, max: 12 }),
        lifetimeValue: createMoney(
          faker.number.float({ min: 450, max: 6200, multipleOf: 0.01 }),
        ),
        lastOrderAt: lastOrder.toISOString(),
        firstOrderAt: firstOrder.toISOString(),
      };
    },
  );

  const forecastVariance = faker.number.float({
    min: -4.2,
    max: 6.5,
    multipleOf: 0.1,
  });

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    granularity,
    range,
    totals: {
      currentTotal: createMoney(totalAmount),
      previousTotal: createMoney(previousTotalAmount),
      deltaPercentage: deltaPercentage(totalAmount, previousTotalAmount),
      averageOrderValue: createMoney(avgOrderValue),
      conversionRate,
    },
    trend,
    channelBreakdown,
    forecast: {
      projectedTotal: createMoney(
        totalAmount * (1 + forecastVariance / 100),
      ),
      variancePercentage: forecastVariance,
      varianceLabel:
        forecastVariance > 1
          ? "ahead"
          : forecastVariance < -1
            ? "behind"
            : "on_track",
    },
    collections,
    productsByCollection,
    variantsByProduct,
    bestSellers,
    laggards,
    attachRateInsights,
    overstockRisks,
    cohortHighlights,
    topCustomers,
  };
};

const buildEmptyScenario: SalesScenarioBuilder = ({
  scenario,
  granularity,
  days,
  seed,
}) => {
  const range = createDateRange(days);
  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    granularity,
    range,
    totals: {
      currentTotal: createMoney(0),
      previousTotal: createMoney(0),
      deltaPercentage: 0,
      averageOrderValue: createMoney(0),
      conversionRate: 0,
    },
    trend: [],
    channelBreakdown: [],
    forecast: null,
    collections: [],
    productsByCollection: {},
    variantsByProduct: {},
    bestSellers: [],
    laggards: [],
    attachRateInsights: [],
    overstockRisks: [],
    cohortHighlights: [],
    topCustomers: [],
    alert: "No sales recorded for the selected date range.",
  };
};

const buildWarningScenario: SalesScenarioBuilder = (context) => {
  const base = buildBaseScenario(context);
  const { scenario } = context;
  const faker = createScenarioFaker(scenario, context.seed + 99);

  const drop = faker.number.float({ min: -18, max: -8, multipleOf: 0.1 });
  const currentAmount = base.totals.currentTotal.amount;
  const adjustedAmount = currentAmount * (1 + drop / 100);

  return {
    ...base,
    state: "warning",
    totals: {
      ...base.totals,
      currentTotal: createMoney(adjustedAmount),
      deltaPercentage: drop,
    },
    forecast: base.forecast && {
      ...base.forecast,
      projectedTotal: createMoney(adjustedAmount * 1.02),
      variancePercentage: drop,
      varianceLabel: "behind",
    },
    alert: "Revenue is trending below forecast. Review conversion funnels.",
  };
};

const buildErrorScenario: SalesScenarioBuilder = ({
  scenario,
  granularity,
  days,
}) => {
  const range = createDateRange(days);
  return {
    scenario,
    state: "error",
    granularity,
    range,
    totals: {
      currentTotal: createMoney(0),
      previousTotal: createMoney(0),
      deltaPercentage: 0,
      averageOrderValue: createMoney(0),
      conversionRate: 0,
    },
    trend: [],
    channelBreakdown: [],
    forecast: null,
    collections: [],
    productsByCollection: {},
    variantsByProduct: {},
    bestSellers: [],
    laggards: [],
    attachRateInsights: [],
    overstockRisks: [],
    cohortHighlights: [],
    topCustomers: [],
    error: "Sales insights are temporarily unavailable. Try again shortly.",
  };
};

const BUILDERS: Record<MockScenario, SalesScenarioBuilder> = {
  base: buildBaseScenario,
  empty: buildEmptyScenario,
  warning: buildWarningScenario,
  error: buildErrorScenario,
};

export const getSalesScenario = (
  options: SalesScenarioOptions = {},
): SalesDataset => {
  const scenario = options.scenario ?? "base";
  const granularity = options.granularity ?? "daily";
  const days = options.days ?? DEFAULT_RANGE_BY_GRANULARITY[granularity];
  const seed = options.seed ?? 0;

  const builder = BUILDERS[scenario];
  return builder({ scenario, granularity, days, seed });
};
