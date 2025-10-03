import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { inc } from "~/lib/metrics/metrics.server";
import { isMockMode, getStoreDomainFromParams } from "~/lib/env.server";
import { authenticate } from "~/shopify.server";
import { getMcpClientOverridesForShop } from "~/lib/mcp/config.server";
import { runConnectionTest } from "~/lib/settings/connection-tests.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  inc("api_mcp_health_hits_total", "MCP health endpoint hits");

  let shopDomain: string;
  if (isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "demo-shop.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  // Attempt a mock-safe MCP ping if credentials present; otherwise return warning
  const overrides = await getMcpClientOverridesForShop(shopDomain);
  const mcpKey = process.env.MCP_API_KEY ?? null;

  let result: any = { status: "warning", message: "No MCP key configured" };
  if (mcpKey) {
    result = await runConnectionTest({ provider: "mcp", credential: mcpKey, overrides } as any);
  }

  return json({ shopDomain, result });
};

