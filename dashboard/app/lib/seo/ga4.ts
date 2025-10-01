import type { MockScenario, SeoTrafficPoint } from "~/types/dashboard";

import { getSeoCollections } from "../../mocks/seo";

export type Ga4TrafficSummary = {
  totalUsers: number;
  sessions: number;
  conversions: number;
  source: "ga4";
};

export interface Ga4Client {
  fetchTrafficSummary(params: {
    propertyId: string;
    startDate: string;
    endDate: string;
  }): Promise<Ga4TrafficSummary>;

  fetchTrafficTrend(params: {
    propertyId: string;
    startDate: string;
    endDate: string;
  }): Promise<SeoTrafficPoint[]>;
}

type MockOptions = {
  scenario?: MockScenario;
  seed?: number;
};

export class MockGa4Client implements Ga4Client {
  private readonly options: MockOptions;

  constructor(options: MockOptions = {}) {
    this.options = options;
  }

  async fetchTrafficSummary(_params: {
    propertyId: string;
    startDate: string;
    endDate: string;
  }): Promise<Ga4TrafficSummary> {
    const scenario = this.options.scenario ?? "base";

    if (scenario === "empty" || scenario === "error") {
      return { totalUsers: 0, sessions: 0, conversions: 0, source: "ga4" };
    }

    if (scenario === "warning") {
      return {
        totalUsers: 16120,
        sessions: 19842,
        conversions: 712,
        source: "ga4",
      };
    }

    return { totalUsers: 18452, sessions: 23120, conversions: 842, source: "ga4" };
  }

  async fetchTrafficTrend(_params: {
    propertyId: string;
    startDate: string;
    endDate: string;
  }): Promise<SeoTrafficPoint[]> {
    const { traffic } = getSeoCollections(this.options);
    return traffic;
  }
}

export const createGa4Client = (options?: MockOptions): Ga4Client => new MockGa4Client(options);
