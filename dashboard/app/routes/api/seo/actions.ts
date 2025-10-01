import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";
import { isMockMode, getStoreDomainFromParams } from "../../../lib/env.server";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import type { SeoAction, SeoActionPriority, SeoActionStatus } from "~/types/dashboard";

const priorityFilter = (rows: SeoAction[], priority?: SeoActionPriority | "all") => {
  if (!priority || priority === "all") return rows;
  return rows.filter((row) => row.priority === priority);
};

const statusFilter = (rows: SeoAction[], status?: SeoActionStatus | "all") => {
  if (!status || status === "all") return rows;
  return rows.filter((row) => row.status === status);
};

const searchFilter = (rows: SeoAction[], q?: string) => {
  if (!q) return rows;
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.title.toLowerCase().includes(needle) || row.description.toLowerCase().includes(needle));
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const scenario = scenarioFromRequest(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const priority = (url.searchParams.get("priority") ?? "all") as SeoActionPriority | "all";
  const status = (url.searchParams.get("status") ?? "all") as SeoActionStatus | "all";
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

  let shopDomain: string;
  if (USE_MOCK_DATA || isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "seo-actions.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const dataset = getSeoScenario({ scenario });
  const filtered = searchFilter(statusFilter(priorityFilter(dataset.actions, priority), status), q);
  const rows = filtered.slice(0, Math.max(1, Math.min(limit, 1000)));

  const totals = {
    now: dataset.actions.filter((a) => a.priority === "now").length,
    soon: dataset.actions.filter((a) => a.priority === "soon").length,
    later: dataset.actions.filter((a) => a.priority === "later").length,
  };

  return json({ shopDomain, scenario, total: filtered.length, rows, totals });
};