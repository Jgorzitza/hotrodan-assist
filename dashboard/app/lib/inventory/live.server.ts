import type { AdminApiContext } from "~/types/dashboard";

export type SkuVendorMapEntry = {
  sku: string;
  vendor: string;
  title: string;
};

// Placeholder live fetch using Shopify Admin context. In tests and mock mode
// this is never invoked, but the module must exist for Vite to resolve.
export const fetchSkuVendorMapFromAdmin = async (
  _admin: AdminApiContext,
): Promise<SkuVendorMapEntry[]> => {
  return [];
};

