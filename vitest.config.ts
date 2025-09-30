import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["app/mocks/**/*.test.ts"],
    environment: "node"
  }
});
