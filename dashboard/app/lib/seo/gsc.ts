import type { MockScenario, SeoAction, SeoKeywordRow } from "~/types/dashboard";

import { getSeoCollections } from "../../mocks/seo";

export type GscCoverageIssue = {
  page: string;
  issue: string;
  severity: "critical" | "warning" | "info";
};

export interface GscClient {
  fetchCoverageIssues(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<GscCoverageIssue[]>;

  fetchSeoActions(params: {
    siteUrl: string;
  }): Promise<SeoAction[]>;

  fetchKeywordTable(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<SeoKeywordRow[]>;
}

type MockOptions = {
  scenario?: MockScenario;
  seed?: number;
};

export class MockGscClient implements GscClient {
  private readonly options: MockOptions;

  constructor(options: MockOptions = {}) {
    this.options = options;
  }

  async fetchCoverageIssues(): Promise<GscCoverageIssue[]> {
    const scenario = this.options.scenario ?? "base";

    if (scenario === "empty") {
      return [];
    }

    if (scenario === "warning") {
      return [
        {
          page: "/collections/turbo-kit",
          issue: "Blocked by robots.txt",
          severity: "critical",
        },
        {
          page: "/products/ls-stage-2",
          issue: "Mobile usability: clickable elements too close",
          severity: "warning",
        },
        {
          page: "/pages/build-program",
          issue: "Duplicate canonical tag detected",
          severity: "warning",
        },
      ];
    }

    if (scenario === "error") {
      throw new Error("GSC unavailable");
    }

    return [
      {
        page: "/collections/turbo-kit",
        issue: "Blocked by robots.txt",
        severity: "critical",
      },
      {
        page: "/products/ls-stage-2",
        issue: "Mobile usability: clickable elements too close",
        severity: "warning",
      },
    ];
  }

  async fetchSeoActions(): Promise<SeoAction[]> {
    const { actions } = getSeoCollections(this.options);
    return actions;
  }

  async fetchKeywordTable(): Promise<SeoKeywordRow[]> {
    const { keywords } = getSeoCollections(this.options);
    return keywords;
  }
}

export const createGscClient = (options?: MockOptions) => new MockGscClient(options);
