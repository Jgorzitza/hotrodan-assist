import type { KpiDataset, KpiMetric, MockScenario } from "~/types/dashboard";

import { createDateRange, DEFAULT_RANGE_END } from "./factories/dates";
import {
  createMoney,
  createScenarioFaker,
  formatCurrency,
  roundTo,
  scenarioToDatasetState,
} from "./shared";

type KpiScenarioOptions = {
  scenario?: MockScenario;
  seed?: number;
};

type BuilderContext = {
  scenario: MockScenario;
  seed: number;
};

type KpiScenarioBuilder = (context: BuilderContext) => KpiDataset;

type MetricTemplate = {
  id: string;
  label: string;
  unit: KpiMetric["unit"];
  baseline: () => number;
  format: (value: number) => string;
  thresholds: {
    warning: number;
    critical: number;
    comparator: "lt" | "gt";
  };
};

const templates: MetricTemplate[] = [
  {
    id: "aov",
    label: "Average order value",
    unit: "currency",
    baseline: () => 168,
    format: (value) => formatCurrency(value),
    thresholds: { warning: 140, critical: 120, comparator: "lt" },
  },
  {
    id: "conversion",
    label: "Conversion rate",
    unit: "percentage",
    baseline: () => 2.6,
    format: (value) => `${roundTo(value, 2)}%`,
    thresholds: { warning: 2.1, critical: 1.5, comparator: "lt" },
  },
  {
    id: "returning",
    label: "Returning customers",
    unit: "percentage",
    baseline: () => 34,
    format: (value) => `${roundTo(value, 1)}%`,
    thresholds: { warning: 28, critical: 20, comparator: "lt" },
  },
  {
    id: "refundRate",
    label: "Refund rate",
    unit: "percentage",
    baseline: () => 1.9,
    format: (value) => `${roundTo(value, 2)}%`,
    thresholds: { warning: 3.5, critical: 5, comparator: "gt" },
  },
];

const computeState = (template: MetricTemplate, value: number): KpiMetric["state"] => {
  const { warning, critical, comparator } = template.thresholds;
  if (comparator === "lt") {
    if (value <= critical) return "critical";
    if (value <= warning) return "warning";
    return "ok";
  }

  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "ok";
};

const buildBaseKpis: KpiScenarioBuilder = ({ scenario, seed }) => {
  const faker = createScenarioFaker(scenario, seed);
  const range = createDateRange(30, DEFAULT_RANGE_END, "Last 30 days");

  const metrics = templates.map((template, index) => {
    const variance = faker.number.float({ min: 0.9, max: 1.12, multipleOf: 0.0001 });
    const value = roundTo(template.baseline() * variance, 2);
    const delta = roundTo(
      faker.number.float({ min: -7, max: 9, multipleOf: 0.01 }),
      1,
    );

    return {
      id: template.id,
      label: template.label,
      unit: template.unit,
      value,
      formattedValue:
        template.unit === "currency"
          ? createMoney(value).formatted
          : template.format(value),
      delta,
      deltaLabel:
        delta >= 0 ? `▲ ${roundTo(Math.abs(delta), 1)}%` : `▼ ${roundTo(Math.abs(delta), 1)}%`,
      state: computeState(template, value),
    } satisfies KpiMetric;
  });

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    range,
    metrics,
  };
};

const buildEmptyKpis: KpiScenarioBuilder = ({ scenario }) => ({
  scenario,
  state: "empty",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  metrics: [],
});

const buildWarningKpis: KpiScenarioBuilder = (context) => {
  const dataset = buildBaseKpis(context);
  dataset.state = "warning";
  dataset.metrics = dataset.metrics.map((metric, index) => {
    if (index % 2 === 0) {
      return { ...metric, state: "warning", delta: -Math.abs(metric.delta) };
    }
    return metric;
  });
  return dataset;
};

const buildErrorKpis: KpiScenarioBuilder = ({ scenario }) => ({
  scenario,
  state: "error",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  metrics: [],
  error: "KPI data feed failed integrity checks.",
});

const BUILDERS: Record<MockScenario, KpiScenarioBuilder> = {
  base: buildBaseKpis,
  empty: buildEmptyKpis,
  warning: buildWarningKpis,
  error: buildErrorKpis,
};

export const getKpiScenario = (options: KpiScenarioOptions = {}): KpiDataset => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;

  return BUILDERS[scenario]({ scenario, seed });
};
