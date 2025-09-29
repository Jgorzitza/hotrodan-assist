import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateReorderPoint, calculateSafetyStock, calculateStockoutDate, calculateTrendStats, aggregateTrendSeries, calculateStatisticalReorderPoint, calculateDemandStandardDeviation, calculateVelocityDeciles, getZScore, } from "../../../dashboard/app/lib/inventory/math";
describe("calculateStockoutDate", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("projects the depletion date using the current clock", () => {
        vi.setSystemTime(new Date("2024-09-10T00:00:00.000Z"));
        const result = calculateStockoutDate(120, 12);
        expect(result.toISOString()).toBe("2024-09-20T00:00:00.000Z");
    });
    it("falls back to 30 days out when daily sales are non-positive", () => {
        vi.setSystemTime(new Date("2024-04-01T00:00:00.000Z"));
        const result = calculateStockoutDate(500, 0);
        expect(result.toISOString()).toBe("2024-05-01T00:00:00.000Z");
    });
});
describe("aggregateTrendSeries", () => {
    it("sums multiple trend series by index", () => {
        const result = aggregateTrendSeries([
            [
                { label: "W-3", units: 10 },
                { label: "W-2", units: 12 },
                { label: "W-1", units: 14 },
            ],
            [
                { label: "W-3", units: 8 },
                { label: "W-2", units: 9 },
                { label: "W-1", units: 11 },
            ],
        ]);
        expect(result).toEqual([
            { label: "W-3", units: 18 },
            { label: "W-2", units: 21 },
            { label: "W-1", units: 25 },
        ]);
    });
    it("ignores invalid series values and falls back to placeholder labels", () => {
        const result = aggregateTrendSeries([
            [
                { label: "", units: Number.NaN },
                { label: "W-1", units: 9.4 },
            ],
            null,
            [
                { label: "", units: undefined },
                { label: "", units: 3 },
            ],
        ]);
        expect(result).toEqual([
            { label: "P1", units: 0 },
            { label: "W-1", units: 12 },
        ]);
    });
});
describe("calculateReorderPoint", () => {
    it("adds lead demand and safety stock, rounding up", () => {
        const result = calculateReorderPoint({
            dailySales: 18,
            leadTimeDays: 7,
            safetyStockDays: 5,
        });
        expect(result).toBe(216);
    });
    it("rounds fractional totals", () => {
        const result = calculateReorderPoint({
            dailySales: 3.5,
            leadTimeDays: 9,
            safetyStockDays: 2.3,
        });
        expect(result).toBe(40);
    });
});
describe("calculateSafetyStock", () => {
    it("scales the variance by lead time", () => {
        const result = calculateSafetyStock(20, 32, 12);
        expect(result).toBe(144);
    });
    it("clamps negative variance to zero", () => {
        const result = calculateSafetyStock(24, 20, 14);
        expect(result).toBe(0);
    });
});
describe("calculateTrendStats", () => {
    it("returns null for empty trend arrays", () => {
        expect(calculateTrendStats([])).toBeNull();
    });
    it("derives summary statistics for weekly demand", () => {
        const stats = calculateTrendStats([
            { label: "W-1", units: 18 },
            { label: "W-2", units: 22 },
            { label: "W-3", units: 27 },
        ]);
        expect(stats).not.toBeNull();
        expect(stats?.average).toBe(22);
        expect(stats?.latest).toEqual({ label: "W-3", units: 27 });
        expect(stats?.deltaPercentage).toBe(23);
        expect(stats?.highest).toEqual({ label: "W-3", units: 27 });
        expect(stats?.lowest).toEqual({ label: "W-1", units: 18 });
    });
    it("sanitizes non-finite values and suppresses delta calculation when prior is zero", () => {
        const stats = calculateTrendStats([
            { label: "W-3", units: 12 },
            { label: "W-2", units: Number.NaN },
            { label: "W-1", units: 9 },
        ]);
        expect(stats).not.toBeNull();
        expect(stats?.latest).toEqual({ label: "W-1", units: 9 });
        expect(stats?.highest).toEqual({ label: "W-3", units: 12 });
        expect(stats?.lowest).toEqual({ label: "W-2", units: 0 });
        expect(stats?.deltaPercentage).toBeNull();
    });
});
describe("getZScore", () => {
    it("returns correct Z-scores for common service levels", () => {
        expect(getZScore(0.90)).toBe(1.28);
        expect(getZScore(0.95)).toBe(1.65);
        expect(getZScore(0.99)).toBe(2.33);
    });
    it("defaults to 95% service level for unknown values", () => {
        expect(getZScore(0.85)).toBe(1.65);
        expect(getZScore(1.5)).toBe(1.65);
    });
});
describe("calculateDemandStandardDeviation", () => {
    it("calculates standard deviation for demand history", () => {
        const demandHistory = [10, 12, 8, 15, 11, 9, 13];
        const result = calculateDemandStandardDeviation(demandHistory);
        expect(result).toBeCloseTo(2.38, 1);
    });
    it("returns 0 for insufficient data", () => {
        expect(calculateDemandStandardDeviation([])).toBe(0);
        expect(calculateDemandStandardDeviation([5])).toBe(0);
    });
});
describe("calculateStatisticalReorderPoint", () => {
    it("calculates ROP using statistical formula", () => {
        const result = calculateStatisticalReorderPoint({
            meanDailyDemand: 20,
            leadTimeDays: 7,
            demandStandardDeviation: 5,
            serviceLevel: 0.95,
        });
        // ROP = 20 * 7 + 1.65 * 5 * √7 = 140 + 1.65 * 5 * 2.65 = 140 + 21.8 = 162
        expect(result).toBe(162);
    });
    it("handles zero standard deviation", () => {
        const result = calculateStatisticalReorderPoint({
            meanDailyDemand: 15,
            leadTimeDays: 5,
            demandStandardDeviation: 0,
            serviceLevel: 0.95,
        });
        // ROP = 15 * 5 + 1.65 * 0 * √5 = 75 + 0 = 75
        expect(result).toBe(75);
    });
});
describe("calculateVelocityDeciles", () => {
    it("calculates velocity deciles for SKUs", () => {
        const skus = [
            { id: "sku1", velocity: { lastWeekUnits: 100 } },
            { id: "sku2", velocity: { lastWeekUnits: 80 } },
            { id: "sku3", velocity: { lastWeekUnits: 60 } },
            { id: "sku4", velocity: { lastWeekUnits: 40 } },
            { id: "sku5", velocity: { lastWeekUnits: 20 } },
        ];
        const result = calculateVelocityDeciles(skus);
        expect(result).toHaveLength(5); // 5 SKUs = 5 deciles
        expect(result[0]?.decile).toBe(1);
        expect(result[0]?.minVelocity).toBe(100);
        expect(result[0]?.maxVelocity).toBe(100);
        expect(result[0]?.skuIds).toEqual(["sku1"]);
        expect(result[4]?.decile).toBe(5);
        expect(result[4]?.minVelocity).toBe(20);
        expect(result[4]?.maxVelocity).toBe(20);
        expect(result[4]?.skuIds).toEqual(["sku5"]);
    });
    it("handles empty SKU list", () => {
        const result = calculateVelocityDeciles([]);
        expect(result).toEqual([]);
    });
    it("handles single SKU", () => {
        const skus = [{ id: "sku1", velocity: { lastWeekUnits: 50 } }];
        const result = calculateVelocityDeciles(skus);
        expect(result).toHaveLength(1);
        expect(result[0]?.decile).toBe(1);
        expect(result[0]?.skuCount).toBe(1);
    });
});
