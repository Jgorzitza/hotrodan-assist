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
});
