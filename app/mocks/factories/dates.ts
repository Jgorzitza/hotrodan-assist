export const MOCK_NOW_ISO = "2024-04-04T16:00:00Z";

export function now(): Date {
  return new Date(MOCK_NOW_ISO);
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
