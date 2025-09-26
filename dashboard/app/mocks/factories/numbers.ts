export const roundTo = (value: number, precision = 2): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const sum = (values: number[]): number => {
  return values.reduce((total, current) => total + current, 0);
};

export const average = (values: number[]): number => {
  if (!values.length) {
    return 0;
  }

  return sum(values) / values.length;
};

export const percentage = (
  part: number,
  total: number,
  precision = 1,
): number => {
  if (total === 0) {
    return 0;
  }

  return roundTo((part / total) * 100, precision);
};

export const deltaPercentage = (
  current: number,
  previous: number,
  precision = 1,
): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return roundTo(((current - previous) / previous) * 100, precision);
};

export const weightedPick = <T>(values: T[], index: number): T => {
  return values[index % values.length]!;
};

