import type { MockErrorPayload, MockState, SeoReport, SeoScenario } from "../types/dashboard";

const ERROR_PAYLOAD: MockErrorPayload = {
  error: {
    status: 500,
    message: "Mock error: SEO insights endpoint failed",
    meta: {
      mock: true,
      scenario: "error"
    }
  }
};

function buildBase(): SeoReport {
  return {
    keywords: [
      { keyword: "an fitting kit", position: 3, delta: 1, volume: 5400 },
      { keyword: "ls swap fuel system", position: 5, delta: 0, volume: 3600 }
    ],
    crawlIssues: [{ id: "CI-101", area: "sitemaps", status: "open", severity: "medium" }],
    lighthouse: {
      performance: 88,
      accessibility: 92,
      bestPractices: 95,
      seo: 91
    },
    contentOpportunities: [
      { topic: "Returnless fuel system guide", confidence: 0.82 },
      { topic: "Boost referenced regulators", confidence: 0.74 }
    ]
  };
}

function buildWarning(): SeoReport {
  return {
    keywords: [
      { keyword: "an fitting kit", position: 7, delta: -3, volume: 5400 },
      { keyword: "ls swap fuel system", position: 11, delta: -5, volume: 3600 }
    ],
    crawlIssues: [
      { id: "CI-201", area: "structured-data", status: "open", severity: "high" },
      { id: "CI-202", area: "performance", status: "open", severity: "medium" }
    ],
    lighthouse: {
      performance: 61,
      accessibility: 78,
      bestPractices: 80,
      seo: 72
    },
    contentOpportunities: [{ topic: "Fuel line sizing chart", confidence: 0.66 }]
  };
}

function buildEmpty(): SeoReport {
  return {
    keywords: [],
    crawlIssues: [],
    lighthouse: {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0
    },
    contentOpportunities: []
  };
}

export function buildSeoScenario(state: MockState): SeoScenario {
  switch (state) {
    case "warning":
      return buildWarning();
    case "empty":
      return buildEmpty();
    case "error":
      return ERROR_PAYLOAD;
    case "base":
    default:
      return buildBase();
  }
}
