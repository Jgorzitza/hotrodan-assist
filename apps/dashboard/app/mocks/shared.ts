import { Faker, en } from "@faker-js/faker";

import type { DatasetState, MockScenario } from "~/types/dashboard";

import { deltaPercentage, percentage, roundTo } from "./factories/numbers";

export { DEFAULT_CURRENCY, createMoney, formatCurrency } from "~/lib/currency";

const DEFAULT_SEED = 1337;

const SCENARIO_SEEDS: Record<MockScenario, number> = {
  base: DEFAULT_SEED,
  empty: DEFAULT_SEED + 101,
  warning: DEFAULT_SEED + 202,
  error: DEFAULT_SEED + 303,
};

export const createSeededFaker = (seed = DEFAULT_SEED) => {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
};

export const createScenarioFaker = (
  scenario: MockScenario,
  offset = 0,
): Faker => {
  const baseSeed = SCENARIO_SEEDS[scenario] ?? DEFAULT_SEED;
  return createSeededFaker(baseSeed + offset);
};


export const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

export const isMockScenario = (value: unknown): value is MockScenario => {
  return value === "base" || value === "empty" || value === "warning" || value === "error";
};

export const resolveScenario = (
  candidate?: string | null,
  fallback: MockScenario = "base",
): MockScenario => {
  if (candidate && isMockScenario(candidate)) {
    return candidate;
  }

  return fallback;
};

export const scenarioFromSearchParams = (
  searchParams?: URLSearchParams,
  paramName = "mockState",
): MockScenario => {
  const value = searchParams?.get(paramName) ?? undefined;
  return resolveScenario(value);
};

export const scenarioToDatasetState = (scenario: MockScenario): DatasetState => {
  switch (scenario) {
    case "empty":
      return "empty";
    case "warning":
      return "warning";
    case "error":
      return "error";
    default:
      return "ok";
  }
};

export { deltaPercentage, percentage, roundTo };
