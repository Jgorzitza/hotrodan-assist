import { describe, it, expect } from "vitest";
import { loader } from "../api/inventory/health";

describe("api.inventory.health loader", () => {
  it("returns a healthy payload in mock-safe mode for a given shop", async () => {
    process.env.USE_MOCK_DATA = "true";
    const request = new Request("https://app.example.com/api/inventory/health?shop=hotrodan.com");
    const res = await loader({ request, params: {}, context: {} as never });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.shop).toBe("hotrodan.com");
    expect(json.useMockData).toBe(true);
    expect(json.components).toBeTruthy();
  });
});