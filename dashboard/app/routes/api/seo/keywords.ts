import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";
import { isMockMode, getStoreDomainFromParams } from "../../../lib/env.server";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type { SeoKeywordIntent, SeoKeywordRow } from "~/types/dashboard";

const intentFilter = (rows: SeoKeywordRow[], intent?: SeoKeywordIntent | "all") => {
  if (!intent || intent === "all") return rows;
  return rows.filter((row) => row.intent === intent);
};

const searchFilter = (rows: SeoKeywordRow[], q?: string) => {
  if (!q) return rows;
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.query.toLowerCase().includes(needle));
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const scenario = scenarioFromRequest(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const intent = (url.searchParams.get("intent") ?? "all") as SeoKeywordIntent | "all";
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

  let shopDomain: string;
  if (USE_MOCK_DATA || isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "seo-keywords.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const dataset = getSeoScenario({ scenario });
  const filtered = searchFilter(intentFilter(dataset.keywords, intent), q);
  const rows = filtered.slice(0, Math.max(1, Math.min(limit, 1000)));

  return json({
    shopDomain,
    scenario,
    total: filtered.length,
    rows,
  });
};