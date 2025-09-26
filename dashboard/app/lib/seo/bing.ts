export type BingPageMetric = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
};

export interface BingClient {
  fetchPageMetrics(params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<BingPageMetric[]>;
}

export class MockBingClient implements BingClient {
  async fetchPageMetrics(): Promise<BingPageMetric[]> {
    return [
      {
        url: "https://hotrodan.com/collections/turbo-kit",
        clicks: 420,
        impressions: 8240,
        ctr: 5.1,
      },
      {
        url: "https://hotrodan.com/blogs/tech/heat-management",
        clicks: 218,
        impressions: 5410,
        ctr: 4.0,
      },
    ];
  }
}

export const createBingClient = () => new MockBingClient();
