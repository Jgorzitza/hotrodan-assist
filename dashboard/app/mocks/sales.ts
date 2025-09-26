import type {
  MockScenario,
  SalesDataset,
  SalesGranularity,
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
