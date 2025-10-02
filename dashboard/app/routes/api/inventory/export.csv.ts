import type { LoaderFunctionArgs } from "@remix-run/node";

// CSV export route (mock-friendly)
// Path: /api/inventory/export.csv?shop=<shop>&limit=<n>&cursor=<cursor>
// - Returns text/csv payload
// - Supports simple offset-based pagination with base64 cursor
// - Emits RFC 5988 Link header with rel="next" when more pages exist
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "unknown";
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");

  const limit = clamp(parseInt(limitParam || "500", 10), 1, 1000);
  const offset = decodeCursor(cursorParam);

  // In mock mode, synthesize a deterministic inventory dataset
  // Keep stable ordering across calls so pagination is consistent
  const inventory = getMockInventory(shop);
  const total = inventory.length;

  const page = inventory.slice(offset, Math.min(offset + limit, total));

  const csv = buildCsv(page);

  const headers: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Cache-Control": "no-store",
  };

  const nextOffset = offset + limit;
  if (nextOffset < total) {
    const nextCursor = encodeCursor(nextOffset);
    // Preserve existing query params while updating cursor
    const nextUrl = new URL(request.url);
    nextUrl.searchParams.set("cursor", nextCursor);
    // Ensure limit and shop are preserved if provided
    nextUrl.searchParams.set("limit", String(limit));
    if (shop) nextUrl.searchParams.set("shop", shop);
    headers["Link"] = `<${nextUrl.toString()}>; rel="next"`;
  }

  return new Response(csv, { status: 200, headers });
};

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  try {
    const s = Buffer.from(cursor, "base64url").toString("utf8");
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

type InventoryRow = { sku: string; quantity: number; vendor: string };

function getMockInventory(shop: string): InventoryRow[] {
  // Produce a deterministic list, independent of runtime randomness.
  // Size chosen to exercise pagination by default.
  const total = 1200;
  const rows: InventoryRow[] = [];
  const shopTag = shop.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "SHOP";
  for (let i = 0; i < total; i++) {
    const sku = `${shopTag}-SKU-${String(i + 1).padStart(5, "0")}`;
    const quantity = (i * 7) % 50; // deterministic pseudo-variation
    const vendor = `Vendor ${1 + (i % 10)}`;
    rows.push({ sku, quantity, vendor });
  }
  return rows;
}

function buildCsv(rows: InventoryRow[]): string {
  const header = "sku,quantity,vendor\n";
  const body = rows
    .map((r) => [r.sku, String(r.quantity), escapeCsv(r.vendor)].join(","))
    .join("\n");
  return header + body + (rows.length ? "\n" : "");
}

function escapeCsv(value: string): string {
  // Simple CSV escaping for commas/quotes/newlines
  if (/[",\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}