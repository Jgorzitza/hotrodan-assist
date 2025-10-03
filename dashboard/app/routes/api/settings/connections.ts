import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { inc } from "~/lib/metrics/metrics.server";
import { isMockMode, getStoreDomainFromParams } from "~/lib/env.server";
import { authenticate } from "~/shopify.server";
import { storeSettingsRepository } from "~/lib/settings/repository.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  inc("api_settings_connections_hits_total", "Settings connections endpoint hits");

  let shopDomain: string;
  if (isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "demo-shop.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  const settings = await storeSettingsRepository.getSettings(shopDomain);
  return json({ shopDomain, connections: settings.connections });
};

