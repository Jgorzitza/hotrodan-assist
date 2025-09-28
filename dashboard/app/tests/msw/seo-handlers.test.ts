import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  BING_PAGE_METRICS_URL,
  GA4_TRAFFIC_SUMMARY_URL,
  GA4_TRAFFIC_TREND_URL,
  GSC_COVERAGE_URL,
  GSC_KEYWORDS_URL,
  createSeoTestServer,
} from "~/tests/msw/seo-server";

type JsonResponse<T> = {
  status: number;
  body: T;
};

const fetchJson = async <T>(input: RequestInfo | URL): Promise<JsonResponse<T>> => {
  const response = await fetch(input);
  const body = (await response.json()) as T;
  return { status: response.status, body };
};

describe("SEO adapter MSW harness", () => {
  const testServer = createSeoTestServer();

  beforeAll(() => {
    testServer.server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    testServer.server.resetHandlers();
    testServer.useScenario({
      scenario: "base",
      latencyMs: 0,
      ga4: { mode: "ok", statusCode: undefined, errorMessage: undefined },
      gsc: { mode: "ok", statusCode: undefined, errorMessage: undefined },
      bing: { mode: "ok", statusCode: undefined, errorMessage: undefined },
    });
  });

  afterAll(() => {
    testServer.server.close();
  });

  it("returns GA4 summary metrics for the base scenario", async () => {
    testServer.useScenario({ scenario: "base" });

    const { status, body } = await fetchJson<{ totalUsers: number; sessions: number; conversions: number }>(
      GA4_TRAFFIC_SUMMARY_URL,
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({
      totalUsers: 18452,
      sessions: 23120,
      conversions: 842,
    });
  });

  it("serves GA4 trend points with date + metrics", async () => {
    const { status, body } = await fetchJson<Array<{ date: string; clicks: number; impressions: number; ctr: number }>>(
      GA4_TRAFFIC_TREND_URL,
    );

    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      date: expect.any(String),
      clicks: expect.any(Number),
      impressions: expect.any(Number),
      ctr: expect.any(Number),
    });
  });

  it("returns empty keyword + coverage payloads when scenario is empty", async () => {
    testServer.useScenario({ scenario: "empty" });

    const keywords = await fetchJson<unknown[]>(GSC_KEYWORDS_URL);
    const coverage = await fetchJson<unknown[]>(GSC_COVERAGE_URL);

    expect(keywords.status).toBe(200);
    expect(keywords.body).toHaveLength(0);
    expect(coverage.status).toBe(200);
    expect(coverage.body).toHaveLength(0);
  });

  it("propagates adapter error state with a 503 when Bing is offline", async () => {
    testServer.useScenario({ bing: { mode: "offline", statusCode: 503, errorMessage: "Bing adapter offline" } });

    const { status, body } = await fetchJson<{ error: string }>(BING_PAGE_METRICS_URL);

    expect(status).toBe(503);
    expect(body.error).toContain("Bing adapter offline");
  });
});
