import type { KeywordRow } from "../../mocks/seo";

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

  fetchKeywordTable(params: {
    propertyId: string;
    startDate: string;
    endDate: string;
  }): Promise<KeywordRow[]>;
}

export class MockGa4Client implements Ga4Client {
  async fetchTrafficSummary(): Promise<Ga4TrafficSummary> {
    return { totalUsers: 18452, sessions: 23120, conversions: 842, source: "ga4" };
  }

  async fetchKeywordTable(): Promise<KeywordRow[]> {
    const { keywords } = await import("../../mocks/seo");
    return keywords;
  }
}

export const createGa4Client = () => new MockGa4Client();
