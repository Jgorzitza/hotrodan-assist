import type { MockScenario, SeoPageRow } from "~/types/dashboard";

import { getSeoCollections } from "../../mocks/seo";

export interface BingClient {
  fetchPageMetrics(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<SeoPageRow[]>;
}

type MockOptions = {
  scenario?: MockScenario;
  seed?: number;
};

export class MockBingClient implements BingClient {
  private readonly options: MockOptions;

  constructor(options: MockOptions = {}) {
    this.options = options;
  }

  async fetchPageMetrics(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<SeoPageRow[]> {
    const { pages } = getSeoCollections(this.options);
    return pages;
  }
}

export const createBingClient = (options?: MockOptions) => new MockBingClient(options);
