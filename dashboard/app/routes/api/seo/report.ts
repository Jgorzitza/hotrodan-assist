import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";
import { isMockMode, getStoreDomainFromParams } from "../../../lib/env.server";
import { storeSettingsRepository } from "../../../lib/settings/repository.server";
import { getMcpClientOverridesForShop } from "../../../lib/mcp/config.server";
import {
  getMcpSeoOpportunities,
  isMcpFeatureEnabled,
  shouldUseMcpMocks,
} from "../../../lib/mcp";
import { getSeoScenario, scenarioFromRequest } from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const scenario = scenarioFromRequest(request);

  let shopDomain: string;
  if (USE_MOCK_DATA) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "seo-report.myshopify.com";
  } else if (isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "seo-report.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const settings = await storeSettingsRepository.getSettings(shopDomain);
  const toggles = settings.toggles;
  const dataset = getSeoScenario({ scenario });

  let mcp = {
    enabled: false,
    usingMocks: true,
    opportunities: [] as Array<unknown>,
    source: "mock" as string | undefined,
    generatedAt: undefined as string | undefined,
  };

  const featureEnabled = isMcpFeatureEnabled(toggles);
  const usingMocks = shouldUseMcpMocks(toggles);
  if (featureEnabled || usingMocks) {
    const overrides = usingMocks ? undefined : await getMcpClientOverridesForShop(shopDomain);
    const resp = await getMcpSeoOpportunities(
      { shopDomain, params: { limit: 5 } },
      toggles,
      overrides,
    );
    mcp = {
      enabled: featureEnabled,
      usingMocks,
      opportunities: resp.data,
      source: resp.source,
      generatedAt: resp.generatedAt,
    };
  }

  return json({
    shopDomain,
    scenario,
    range: dataset.range,
    scorecard: dataset.scorecard,
    insightCount: dataset.insights.length,
    keywordCount: dataset.keywords.length,
    pageCount: dataset.pages.length,
    actionCount: dataset.actions.length,
    trafficCount: dataset.traffic.length,
    mcp,
  });
};