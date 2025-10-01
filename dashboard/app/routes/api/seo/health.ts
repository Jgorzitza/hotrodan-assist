import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../../../shopify.server";
import { isMockMode, getStoreDomainFromParams } from "../../../lib/env.server";
import { storeSettingsRepository } from "../../../lib/settings/repository.server";
import { runConnectionTest } from "../../../lib/settings/connection-tests.server";
import type { SettingsProvider } from "../../../types/settings";
import { getMcpClientOverridesForShop } from "../../../lib/mcp/config.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Resolve shop domain for multi-tenant environments (mock-friendly)
  let shopDomain: string;
  if (isMockMode()) {
    shopDomain = getStoreDomainFromParams(request.url) ?? "demo-shop.myshopify.com";
  } else {
    const { session } = await authenticate.admin(request);
    shopDomain = session.shop;
  }

  // Fetch secrets for each provider
  const providers: SettingsProvider[] = ["ga4", "gsc", "bing", "mcp"];

  const [ga4, gsc, bing, mcpKey] = await Promise.all([
    storeSettingsRepository.getDecryptedSecret(shopDomain, "ga4"),
    storeSettingsRepository.getDecryptedSecret(shopDomain, "gsc"),
    storeSettingsRepository.getDecryptedSecret(shopDomain, "bing"),
    storeSettingsRepository.getDecryptedSecret(shopDomain, "mcp"),
  ]);

  const overrides = await getMcpClientOverridesForShop(shopDomain);

  const results: Record<SettingsProvider, unknown> = {
    ga4: { status: "error", durationMs: 0, message: "Missing credential" },
    gsc: { status: "error", durationMs: 0, message: "Missing credential" },
    bing: { status: "error", durationMs: 0, message: "Missing credential" },
    mcp: { status: "error", durationMs: 0, message: "Missing credential" },
  };

  // Helper to test a single provider when credential exists
  const testIfPresent = async (
    provider: SettingsProvider,
    credential: string | null,
  ) => {
    if (!credential) return;
    const input =
      provider === "mcp"
        ? { provider, credential, overrides }
        : { provider, credential };
    results[provider] = await runConnectionTest(input as any);
  };

  await Promise.all([
    testIfPresent("ga4", ga4),
    testIfPresent("gsc", gsc),
    testIfPresent("bing", bing),
    testIfPresent("mcp", mcpKey),
  ]);

  return json({ shopDomain, results });
};