import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(rootDir, "app"),
      "~/": resolve(rootDir, "app"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["app/**/*.test.{ts,tsx}", "app/**/__tests__/**/*.{ts,tsx}"],
    watch: false,
  },
});
