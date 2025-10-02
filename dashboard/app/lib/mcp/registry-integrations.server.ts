import { ConnectorRegistry, type ConnectorMetadata } from "~/lib/connectors/registry.server";

export const buildDefaultConnectorRegistry = () => {
  const registry = new ConnectorRegistry();

  const connectors: ConnectorMetadata[] = [
    { id: "shopify", name: "Shopify Admin", version: "1.0.0", capabilities: ["read", "metrics", "health"] },
    { id: "zoho_mail", name: "Zoho Mail", version: "1.0.0", capabilities: ["read", "health"] },
    { id: "gsc", name: "Google Search Console", version: "1.0.0", capabilities: ["read", "metrics", "health"] },
    { id: "bing_wmt", name: "Bing Webmaster Tools", version: "1.0.0", capabilities: ["read", "metrics", "health"] },
    { id: "ga4", name: "Google Analytics 4", version: "1.0.0", capabilities: ["read", "metrics", "health"] },
  ];

  for (const meta of connectors) {
    registry.register(meta, {});
  }

  return registry;
};