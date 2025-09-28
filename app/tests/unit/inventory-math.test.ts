import { describe, expect, it } from 'vitest';
import { calculateReorderPoint, calculateSafetyStock } from '../../lib/dashboard/inventory';

describe('inventory math utilities', () => {
  it('calculates reorder point with safety stock', () => {
    const result = calculateReorderPoint({
      averageDailySales: 10,
      leadTimeDays: 5,
      safetyStock: 15
    });
    expect(result).toBe(65);
  });

  it('rounds up fractional reorder point', () => {
    const result = calculateReorderPoint({
      averageDailySales: 3.5,
      leadTimeDays: 2,
      safetyStock: 1
    });
    expect(result).toBe(8);
  });

  it('calculates safety stock using service level factor', () => {
    const result = calculateSafetyStock(4, 3, 1.64);
    expect(result).toBe(8);
  });

  it('guards against negative inputs', () => {
    expect(() =>
      calculateReorderPoint({ averageDailySales: -1, leadTimeDays: 2, safetyStock: 0 })
    ).toThrowError();
    expect(() => calculateSafetyStock(-1, 0, 1.64)).toThrowError();
  });
});
