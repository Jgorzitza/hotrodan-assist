// Minimal live-mode helper for inventory vendor mapping overlay.
// In tests, this returns an empty mapping and performs no network I/O.
export type AdminClient = unknown;

export type VendorSkuEntry = {
  sku: string;
  vendor: string;
  title: string;
};

export async function fetchSkuVendorMapFromAdmin(_admin: AdminClient): Promise<VendorSkuEntry[]> {
  // Intentionally return an empty array for now. The inventory loader treats
  // this as a no-op overlay when USE_MOCK_DATA is false during unit tests.
  return [];
}

