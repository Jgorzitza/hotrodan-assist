import { describe, it, expect } from "vitest";
import { loader } from "../api/inventory/export.csv";

// Server-only loader tests for CSV export
// Ensures content-type, basic shape, and Link header are present

describe("api.inventory.export.csv loader", () => {
  it("returns CSV for first page with Link header for next page", async () => {
    process.env.USE_MOCK_DATA = "true";
    const request = new Request(
      "https://app.example.com/api/inventory/export.csv?shop=hotrodan.com&limit=2",
    );
    const res = await loader({ request, params: {}, context: {} as never });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") || "").toMatch(/text\/csv/);

    const link = res.headers.get("link");
    expect(link).toBeTruthy();
    expect(link!).toMatch(/rel=\"next\"/);

    const text = await res.text();
    expect(text.startsWith("sku,quantity,vendor\n")).toBe(true);
    expect(text).toContain("HOTROD-SKU-00001");
  });

  it("follows Link cursor and returns next page without duplicates/omissions", async () => {
    process.env.USE_MOCK_DATA = "true";
    const limit = 3;
    const firstReq = new Request(
      `https://app.example.com/api/inventory/export.csv?shop=hotrodan.com&limit=${limit}`,
    );
    const res1 = await loader({ request: firstReq, params: {}, context: {} as never });
    expect(res1.status).toBe(200);
    const link = res1.headers.get("link");
    expect(link).toBeTruthy();
    const match = link!.match(/<([^>]+)>/);
    expect(match).toBeTruthy();
    const nextUrl = match![1];

    const csv1 = await res1.text();
    const rows1 = parseCsv(csv1).rows;
    expect(rows1.length).toBe(limit);
    expect(rows1[0].sku).toBe("HOTROD-SKU-00001");
    expect(rows1[limit - 1].sku).toBe("HOTROD-SKU-00003");

    const res2 = await loader({ request: new Request(nextUrl), params: {}, context: {} as never });
    expect(res2.status).toBe(200);
    const csv2 = await res2.text();
    const rows2 = parseCsv(csv2).rows;
    expect(rows2.length).toBe(limit);
    expect(rows2[0].sku).toBe("HOTROD-SKU-00004");

    // Validate no duplicates across pages
    const all = [...rows1.map(r => r.sku), ...rows2.map(r => r.sku)];
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});

function parseCsv(csv: string): { header: string[]; rows: { sku: string; quantity: number; vendor: string }[] } {
  const lines = csv.trim().split("\n");
  const header = (lines.shift() || "").split(",");
  const rows = lines
    .filter(Boolean)
    .map((line) => {
      const [sku, quantity, vendor] = line.split(",");
      return { sku, quantity: Number(quantity), vendor: vendor?.replace(/^\"|\"$/g, "") };
    });
  return { header, rows };
}
