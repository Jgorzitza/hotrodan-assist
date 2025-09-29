import { describe, expect, it } from "vitest";
import { DemandForecaster, VendorPerformanceAnalyzer, InventoryInsightGenerator, } from "../../../dashboard/app/lib/inventory/analytics";
// Helper function to create mock SKU data
const createMockSku = (id, velocity, status = "healthy") => ({
    id,
    title: `Product ${id}`,
    sku: `SKU-${id}`,
    vendorId: `vendor-${Math.floor(Math.random() * 3) + 1}`,
    vendorName: `Vendor ${Math.floor(Math.random() * 3) + 1}`,
    status,
    bucketId: "sea",
    onHand: Math.floor(Math.random() * 500) + 50,
    inbound: Math.floor(Math.random() * 100),
    committed: Math.floor(Math.random() * 50),
    coverDays: Math.floor(Math.random() * 30) + 7,
    safetyStock: Math.floor(Math.random() * 50) + 10,
    reorderPoint: Math.floor(Math.random() * 200) + 50,
    recommendedOrder: Math.floor(Math.random() * 100),
    stockoutDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    unitCost: {
        amount: Math.random() * 100 + 10,
        currency: "USD",
        formatted: "$" + (Math.random() * 100 + 10).toFixed(2),
    },
    velocity: {
        turnoverDays: Math.floor(Math.random() * 30) + 7,
        sellThroughRate: Math.random() * 0.8 + 0.1,
        lastWeekUnits: velocity,
    },
    trend: Array.from({ length: 6 }, (_, i) => ({
        label: `W-${6 - i}`,
        units: Math.floor(Math.random() * 50) + 10,
    })),
});
describe("DemandForecaster", () => {
    it("should generate demand forecast for SKU", () => {
        const sku = createMockSku("test-1", 100);
        const forecast = DemandForecaster.forecastDemand(sku, 6);
        expect(forecast.skuId).toBe("test-1");
        expect(forecast.sku).toBe("SKU-test-1");
        expect(forecast.currentDemand).toBe(100);
        expect(forecast.forecastedDemand).toHaveLength(6);
        expect(forecast.confidence).toBeGreaterThan(0);
        expect(forecast.confidence).toBeLessThanOrEqual(1);
        expect(["increasing", "decreasing", "stable"]).toContain(forecast.trend);
        expect(forecast.seasonality).toBeGreaterThan(0);
        expect(forecast.recommendedOrderQuantity).toBeGreaterThan(0);
    });
    it("should handle SKUs with limited trend data", () => {
        const sku = createMockSku("test-2", 50);
        sku.trend = [{ label: "W-1", units: 10 }]; // Only one data point
        const forecast = DemandForecaster.forecastDemand(sku);
        expect(forecast.confidence).toBeLessThan(0.5); // Lower confidence with limited data
        expect(forecast.forecastedDemand.length).toBeGreaterThan(0);
    });
    it("should calculate trend direction correctly", () => {
        const sku = createMockSku("test-3", 100);
        // Create increasing trend
        sku.trend = [
            { label: "W-6", units: 10 },
            { label: "W-5", units: 15 },
            { label: "W-4", units: 20 },
            { label: "W-3", units: 25 },
            { label: "W-2", units: 30 },
            { label: "W-1", units: 35 },
        ];
        const forecast = DemandForecaster.forecastDemand(sku);
        expect(forecast.trend).toBe("increasing");
    });
});
describe("VendorPerformanceAnalyzer", () => {
    it("should analyze vendor performance", () => {
        const skus = [
            createMockSku("sku-1", 100, "healthy"),
            createMockSku("sku-2", 50, "healthy"),
            createMockSku("sku-3", 25, "low"),
        ];
        const vendorMappings = [
            { id: "vendor-1", name: "Vendor 1", leadTimeDays: 30 },
            { id: "vendor-2", name: "Vendor 2", leadTimeDays: 45 },
        ];
        const performance = VendorPerformanceAnalyzer.analyzeVendorPerformance(skus, vendorMappings);
        expect(performance).toHaveLength(2);
        expect(performance[0]?.vendorId).toBe("vendor-1");
        expect(performance[0]?.totalSkus).toBeGreaterThan(0);
        expect(performance[0]?.overallScore).toBeGreaterThan(0);
        expect(performance[0]?.overallScore).toBeLessThanOrEqual(1);
        expect(performance[0]?.recommendations).toBeInstanceOf(Array);
    });
    it("should generate appropriate recommendations", () => {
        const skus = [
            createMockSku("sku-1", 10, "backorder"), // Low performance
            createMockSku("sku-2", 5, "low"), // Low performance
        ];
        const vendorMappings = [
            { id: "vendor-1", name: "Vendor 1", leadTimeDays: 60 }, // Long lead time
        ];
        const performance = VendorPerformanceAnalyzer.analyzeVendorPerformance(skus, vendorMappings);
        expect(performance[0]?.recommendations.length).toBeGreaterThan(0);
        expect(performance[0]?.recommendations.some(rec => rec.includes("delivery") || rec.includes("quality") || rec.includes("lead time"))).toBe(true);
    });
});
describe("InventoryInsightGenerator", () => {
    it("should generate stockout risk insights", () => {
        const skus = [
            createMockSku("sku-1", 100, "low"),
            createMockSku("sku-2", 50, "backorder"),
            createMockSku("sku-3", 200, "healthy"),
        ];
        const insights = InventoryInsightGenerator.generateInsights(skus);
        const stockoutInsights = insights.filter(insight => insight.type === "risk");
        expect(stockoutInsights.length).toBeGreaterThan(0);
        expect(stockoutInsights[0]?.priority).toBe("high");
        expect(stockoutInsights[0]?.title).toContain("Stockout");
    });
    it("should generate overstock insights", () => {
        const skus = [
            createMockSku("sku-1", 10, "healthy"),
            createMockSku("sku-2", 5, "healthy"),
        ];
        // Make them overstock by setting high onHand and coverDays
        skus[0].onHand = 500;
        skus[0].coverDays = 120;
        skus[0].bucketId = "overstock";
        const insights = InventoryInsightGenerator.generateInsights(skus);
        const overstockInsights = insights.filter(insight => insight.type === "opportunity");
        expect(overstockInsights.length).toBeGreaterThan(0);
        expect(overstockInsights.some(insight => insight.title.includes("Overstock"))).toBe(true);
    });
    it("should generate velocity insights", () => {
        const skus = [
            createMockSku("sku-1", 100, "healthy"), // Fast mover
            createMockSku("sku-2", 2, "healthy"), // Slow mover
            createMockSku("sku-3", 60, "healthy"), // Fast mover
        ];
        const insights = InventoryInsightGenerator.generateInsights(skus);
        const velocityInsights = insights.filter(insight => insight.title.includes("Fast Movers") || insight.title.includes("Slow Movers"));
        expect(velocityInsights.length).toBeGreaterThan(0);
    });
    it("should prioritize insights correctly", () => {
        const skus = [
            createMockSku("sku-1", 10, "backorder"), // High priority risk
            createMockSku("sku-2", 100, "healthy"), // High priority opportunity
            createMockSku("sku-3", 50, "healthy"), // Medium priority
        ];
        const insights = InventoryInsightGenerator.generateInsights(skus);
        // High priority insights should come first
        const highPriorityInsights = insights.filter(insight => insight.priority === "high");
        const mediumPriorityInsights = insights.filter(insight => insight.priority === "medium");
        expect(highPriorityInsights.length).toBeGreaterThan(0);
        expect(insights[0]?.priority).toBe("high");
    });
    it("should calculate estimated values correctly", () => {
        const skus = [
            createMockSku("sku-1", 10, "backorder"),
            createMockSku("sku-2", 20, "low"),
        ];
        // Set known values for testing
        skus[0].unitCost.amount = 100;
        skus[0].recommendedOrder = 50;
        skus[1].unitCost.amount = 50;
        skus[1].recommendedOrder = 30;
        const insights = InventoryInsightGenerator.generateInsights(skus);
        const stockoutInsight = insights.find(insight => insight.type === "risk");
        expect(stockoutInsight?.estimatedValue).toBeGreaterThan(0);
        // Should be sum of (unitCost * recommendedOrder) for at-risk SKUs
        expect(stockoutInsight?.estimatedValue).toBe(100 * 50 + 50 * 30);
    });
});
