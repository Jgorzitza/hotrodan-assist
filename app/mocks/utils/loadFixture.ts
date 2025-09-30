import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_ROOT = resolve(__dirname, "../../../prompts/dashboard/examples");

const cache = new Map<string, unknown>();

export function loadFixture<T>(name: string): T {
  if (cache.has(name)) {
    return cache.get(name) as T;
  }
  const filePath = resolve(FIXTURE_ROOT, name);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as T;
  cache.set(name, parsed);
  return parsed;
}
