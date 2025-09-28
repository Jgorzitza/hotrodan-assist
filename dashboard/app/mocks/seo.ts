import type { Faker } from "@faker-js/faker";

import type {
  MockScenario,
  SeoAction,
  SeoDataset,
  SeoInsight,
  SeoKeywordIntent,
  SeoKeywordRow,
  SeoPageRow,
  SeoTrafficPoint,
} from "~/types/dashboard";

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

const insightTemplates: Array<
  Pick<SeoInsight, "title" | "description" | "metricLabel" | "source">
> = [
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

const keywordBlueprints: Array<{
  query: string;
  intent: SeoKeywordIntent;
  topPage: string;
}> = [
  {
    query: "custom hot rods",
    intent: "transactional",
    topPage: "/collections/custom-builds",
  },
  {
    query: "ls turbo kit",
    intent: "transactional",
    topPage: "/collections/turbo-kit",
  },
  {
    query: "fabricated headers",
    intent: "informational",
    topPage: "/blogs/tech/hand-built-headers",
  },
  {
    query: "drag racing safety checklist",
    intent: "informational",
    topPage: "/blogs/tech/track-day-prep",
  },
  {
    query: "ls swap parts list",
    intent: "informational",
    topPage: "/blogs/builds/ls-swap-guide",
  },
  {
    query: "hot rod interior kits",
    intent: "transactional",
    topPage: "/collections/interior",
  },
  {
    query: "ceramic coating vs powder coat",
    intent: "informational",
    topPage: "/blogs/tech/ceramic-vs-powder",
  },
  {
    query: "custom chassis services",
    intent: "navigational",
    topPage: "/pages/build-program",
  },
];

const pageBlueprints: Array<
  Pick<SeoPageRow, "url" | "title" | "canonicalStatus" | "canonicalIssue">
> = [
  {
    url: "https://hotrodan.com/collections/turbo-kit",
    title: "Turbo kits",
    canonicalStatus: "issue",
    canonicalIssue: "Duplicate canonical tag detected",
  },
  {
    url: "https://hotrodan.com/products/ls-stage-3-kit",
    title: "LS Stage 3 kit",
    canonicalStatus: "ok",
  },
  {
    url: "https://hotrodan.com/blogs/tech/heat-management",
    title: "Heat management guide",
    canonicalStatus: "ok",
  },
  {
    url: "https://hotrodan.com/pages/build-program",
    title: "Custom build program",
    canonicalStatus: "issue",
    canonicalIssue: "Canonical points to archived landing page",
  },
  {
    url: "https://hotrodan.com/collections/interior",
    title: "Interior upgrades",
    canonicalStatus: "ok",
  },
];

const actionBlueprints: Array<
  Pick<
    SeoAction,
    | "id"
    | "title"
    | "description"
    | "priority"
    | "source"
    | "metricLabel"
    | "metricValue"
  > & { defaultAssignee: string }
> = [
  {
    id: "seo-action-0",
    title: "Compress hero imagery on turbo kits",
    description:
      "Largest Contentful Paint is elevated on mobile—ship next-gen image formats and lazy-load below the fold assets.",
    priority: "now",
    source: "ga4",
    metricLabel: "LCP",
    metricValue: "4.8s",
    defaultAssignee: "Performance squad",
  },
  {
    id: "seo-action-1",
    title: "Resolve duplicate canonical on build program",
    description:
      "Canonical tag references retired landing page causing indexation gaps.",
    priority: "now",
    source: "gsc",
    metricLabel: "Pages affected",
    metricValue: "6",
    defaultAssignee: "Platform team",
  },
  {
    id: "seo-action-2",
    title: "Refresh LS swap content pillar",
    description:
      "Monthly searches are up 18%. Expand FAQ and add internal links to conversion paths.",
    priority: "soon",
    source: "gsc",
    metricLabel: "Avg position",
    metricValue: "12.4",
    defaultAssignee: "Content ops",
  },
  {
    id: "seo-action-3",
    title: "Add Bing sitemap ping",
    description:
      "Bing is lagging on new product updates—schedule sitemap ping after product drops.",
    priority: "soon",
    source: "bing",
    metricLabel: "Indexation",
    metricValue: "+3d",
    defaultAssignee: "Growth automation",
  },
  {
    id: "seo-action-4",
    title: "Expand interior kit schema",
    description:
      "Missing structured data prevents rich results; add `Product` + `AggregateOffer` schema.",
    priority: "later",
    source: "gsc",
    metricLabel: "CTR uplift",
    metricValue: "+0.8%",
    defaultAssignee: "Tech SEO",
  },
];

const buildKeywordRows = (
  faker: Faker,
  scenario: MockScenario,
): SeoKeywordRow[] => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }

  return keywordBlueprints.map((blueprint, index) => {
    const impressions = faker.number.int({ min: 3200, max: 24000 });
    const ctr = roundTo(
      faker.number.float({ min: 1.6, max: 6.8, multipleOf: 0.01 }),
      2,
    );
    const clicks = Math.round((ctr / 100) * impressions);
    const basePosition = faker.number.float({
      min: 2.2,
      max: 18.4,
      multipleOf: 0.1,
    });
    const deltaSeed = roundTo(
      faker.number.float({ min: -3.6, max: 5.4, multipleOf: 0.1 }),
      1,
    );
    const delta = scenario === "warning" && index < 3 ? -Math.abs(deltaSeed) : deltaSeed;

    let avgPosition = basePosition;
    if (delta > 0) {
      avgPosition = Math.max(1, basePosition - delta);
    } else if (delta < 0) {
      avgPosition = basePosition + Math.abs(delta);
    }

    return {
      id: `keyword-${index}`,
      query: blueprint.query,
      clicks,
      impressions,
      ctr,
      avgPosition: roundTo(avgPosition, 1),
      delta,
      topPage: blueprint.topPage,
      intent: blueprint.intent,
      source: "gsc",
    };
  });
};

const buildPageRows = (faker: Faker, scenario: MockScenario): SeoPageRow[] => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }

  return pageBlueprints.map((blueprint, index) => {
    const entrances = faker.number.int({ min: 180, max: 5200 });
    const exitRate = faker.number.float({ min: 0.18, max: 0.52, multipleOf: 0.01 });
    const exits = Math.round(entrances * exitRate);
    const conversionRate = roundTo(
      faker.number.float({ min: 0.6, max: 3.8, multipleOf: 0.01 }),
      2,
    );

    const canonicalStatus =
      scenario === "warning" && index < 2 ? "issue" : blueprint.canonicalStatus;
    const canonicalIssue =
      canonicalStatus === "issue"
        ? blueprint.canonicalIssue ?? "Canonical points to out-of-stock variant"
        : undefined;

    return {
      id: `page-${index}`,
      url: blueprint.url,
      title: blueprint.title,
      entrances,
      exits,
      conversionRate,
      canonicalStatus,
      canonicalIssue,
      source: "ga4",
    };
  });
};

const buildActions = (faker: Faker, scenario: MockScenario): SeoAction[] => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }

  return actionBlueprints.map((blueprint, index) => {
    const priority = blueprint.priority;
    let status: SeoAction["status"] = "not_started";
    if (priority === "now") {
      status = index === 0 ? "in_progress" : "not_started";
    }
    if (scenario === "warning" && priority === "later") {
      status = "done";
    }

    const assignedTo =
      scenario === "warning" && priority === "now"
        ? `${blueprint.defaultAssignee} (escalated)`
        : blueprint.defaultAssignee;

    const lastUpdatedAt = faker.date.recent({ days: 7 }).toISOString();
    const dueWindow = priority === "later" ? 21 : priority === "soon" ? 10 : 4;
    const dueAt = faker.date.soon({ days: dueWindow }).toISOString();

    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      priority,
      status,
      assignedTo,
      source: blueprint.source,
      metricLabel: blueprint.metricLabel,
      metricValue: blueprint.metricValue,
      dueAt,
      lastUpdatedAt,
    };
  });
};

const buildTrafficPoints = (
  faker: Faker,
  scenario: MockScenario,
  rangeStart: string,
  rangeEnd: string,
): SeoTrafficPoint[] => {
  if (scenario === "empty" || scenario === "error") {
    return [];
  }

  const end = new Date(rangeEnd);
  const start = new Date(rangeStart);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const sampleSize = Math.min(30, totalDays);

  const points: SeoTrafficPoint[] = [];
  for (let index = sampleSize - 1; index >= 0; index -= 1) {
    const pointDate = new Date(end);
    pointDate.setDate(end.getDate() - (sampleSize - 1 - index));
    const impressions = faker.number.int({ min: 3200, max: 14200 });
    const ctr = roundTo(
      faker.number.float({ min: 2.1, max: 5.7, multipleOf: 0.01 }),
      2,
    );
    const clicks = Math.round((ctr / 100) * impressions);
    points.push({
      date: pointDate.toISOString(),
      impressions,
      clicks,
      ctr,
    });
  }

  if (scenario === "warning") {
    return points.map((point, index) => {
      if (index < points.length - 3) {
        return point;
      }
      const factor = 0.82;
      const impressions = Math.round(point.impressions * factor);
      const clicks = Math.round(point.clicks * factor);
      const ctr = impressions === 0 ? 0 : roundTo((clicks / impressions) * 100, 2);
      return {
        ...point,
        impressions,
        clicks,
        ctr,
      };
    });
  }

  return points;
};

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

  const keywords = buildKeywordRows(faker, scenario);
  const pages = buildPageRows(faker, scenario);
  const actions = buildActions(faker, scenario);
  const traffic = buildTrafficPoints(faker, scenario, range.start, range.end);

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
    keywords,
    pages,
    actions,
    traffic,
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
  keywords: [],
  pages: [],
  actions: [],
  traffic: [],
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
  dataset.scorecard.coreWebVitals = roundTo(
    Math.max(dataset.scorecard.coreWebVitals - 10, 40),
    1,
  );
  dataset.scorecard.crawlSuccessRate = roundTo(
    Math.max(dataset.scorecard.crawlSuccessRate - 12, 50),
    1,
  );
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
  keywords: [],
  pages: [],
  actions: [],
  traffic: [],
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

export const getSeoCollections = (options: SeoScenarioOptions = {}) => {
  const dataset = getSeoScenario(options);
  return {
    keywords: dataset.keywords,
    pages: dataset.pages,
    actions: dataset.actions,
    traffic: dataset.traffic,
  };
};
