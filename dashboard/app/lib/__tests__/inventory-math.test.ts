import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateReorderPoint,
  calculateSafetyStock,
  calculateStockoutDate,
  calculateTrendStats,
  aggregateTrendSeries,
} from "../inventory/math";

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
        { label: "", units: undefined as unknown as number },
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
