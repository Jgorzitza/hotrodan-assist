import type { MockScenario, SeoDataset, SeoInsight } from "~/types/dashboard";

import { createDateRange, DEFAULT_RANGE_END } from "./factories/dates";
import {
  createScenarioFaker,
  roundTo,
  scenarioToDatasetState,
} from "./shared";

type SeoScenarioOptions = {
  scenario?: MockScenario;
  seed?: number;
};

type BuilderContext = {
  scenario: MockScenario;
  seed: number;
};

type SeoScenarioBuilder = (context: BuilderContext) => SeoDataset;

const insightTemplates: Array<Pick<SeoInsight, "title" | "description" | "metricLabel" | "source">> = [
  {
    title: "Core Web Vitals regression",
    description: "Largest Contentful Paint exceeded 4s on mobile.",
    metricLabel: "LCP",
    source: "ga4",
  },
  {
    title: "Keyword ranking opportunity",
    description: "'custom hot rods' moved up 4 places in search results.",
    metricLabel: "Rank",
    source: "gsc",
  },
  {
    title: "Broken sitemap links",
    description: "6 URLs returned 404 in the latest crawl.",
    metricLabel: "Errors",
    source: "bing",
  },
  {
    title: "Meta description length",
    description: "12 product pages exceed the recommended 160 characters.",
    metricLabel: "Pages",
    source: "gsc",
  },
];

const buildBaseSeo: SeoScenarioBuilder = ({ scenario, seed }) => {
  const faker = createScenarioFaker(scenario, seed);
  const range = createDateRange(30, DEFAULT_RANGE_END, "Last 30 days");

  const insights: SeoInsight[] = insightTemplates.map((template, index) => {
    const severity = "info" as const;
    const detectedAt = faker.date.recent({ days: 10 }).toISOString();
    const metricValue =
      index % 2 === 0
        ? `${roundTo(
            faker.number.float({ min: 3.2, max: 4.8, multipleOf: 0.01 }),
            2,
          )}s`
        : `${faker.number.int({ min: 1, max: 12 })}`;

    return {
      id: `seo-${index}`,
      severity,
      metricValue,
      delta:
        index % 2 === 0
          ? `${roundTo(
              faker.number.float({
                min: -0.8,
                max: 0.4,
                multipleOf: 0.01,
              }),
              2,
            )}s`
          : `${faker.number.int({ min: -6, max: 6 })}`,
      url: faker.internet.url(),
      detectedAt,
      ...template,
    };
  });

  return {
    scenario,
    state: scenarioToDatasetState(scenario),
    range,
    scorecard: {
      coreWebVitals: roundTo(
        faker.number.float({ min: 68, max: 92, multipleOf: 0.1 }),
        1,
      ),
      clickThroughRate: roundTo(
        faker.number.float({ min: 2.5, max: 4.2, multipleOf: 0.1 }),
        1,
      ),
      crawlSuccessRate: roundTo(
        faker.number.float({ min: 80, max: 97, multipleOf: 0.1 }),
        1,
      ),
      keywordRankings: roundTo(
        faker.number.float({ min: 70, max: 95, multipleOf: 0.1 }),
        1,
      ),
    },
    insights,
  };
};

const buildEmptySeo: SeoScenarioBuilder = ({ scenario }) => ({
  scenario,
  state: "empty",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  scorecard: {
    coreWebVitals: 0,
    clickThroughRate: 0,
    crawlSuccessRate: 0,
    keywordRankings: 0,
  },
  insights: [],
  alert: "No SEO integrations connected yet.",
});

const buildWarningSeo: SeoScenarioBuilder = (context) => {
  const dataset = buildBaseSeo(context);
  dataset.state = "warning";
  dataset.insights = dataset.insights.map((insight, index) => ({
    ...insight,
    severity: index % 2 === 0 ? "critical" : "warning",
  }));
  dataset.alert = "Core Web Vitals are degrading across mobile sessions.";
  dataset.scorecard.coreWebVitals = roundTo(Math.max(dataset.scorecard.coreWebVitals - 10, 40), 1);
  dataset.scorecard.crawlSuccessRate = roundTo(Math.max(dataset.scorecard.crawlSuccessRate - 12, 50), 1);
  return dataset;
};

const buildErrorSeo: SeoScenarioBuilder = ({ scenario }) => ({
  scenario,
  state: "error",
  range: createDateRange(30, DEFAULT_RANGE_END, "Last 30 days"),
  scorecard: {
    coreWebVitals: 0,
    clickThroughRate: 0,
    crawlSuccessRate: 0,
    keywordRankings: 0,
  },
  insights: [],
  error: "SEO analytics provider authentication failed.",
});

const BUILDERS: Record<MockScenario, SeoScenarioBuilder> = {
  base: buildBaseSeo,
  empty: buildEmptySeo,
  warning: buildWarningSeo,
  error: buildErrorSeo,
};

export const getSeoScenario = (options: SeoScenarioOptions = {}): SeoDataset => {
  const scenario = options.scenario ?? "base";
  const seed = options.seed ?? 0;

  return BUILDERS[scenario]({ scenario, seed });
};
