import type { SeoAction } from "../../mocks/seo";

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
}

export class MockGscClient implements GscClient {
  async fetchCoverageIssues(): Promise<GscCoverageIssue[]> {
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
    const module = await import("../../mocks/seo");
    return module.actions;
  }
}

export const createGscClient = () => new MockGscClient();
