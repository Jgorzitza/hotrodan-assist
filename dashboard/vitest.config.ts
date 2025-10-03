import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const disableVitestWsPlugin = () => ({
  name: "disable-vitest-ws",
  apply: "serve",
  configureServer(server) {
    if (!process.env.VITEST) return;
    const environments = server.environments ?? {};
    for (const env of Object.values(environments)) {
      if (env && typeof env.listen === "function") {
        env.listen = async () => {};
      }
    }
  },
});

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [disableVitestWsPlugin()],
  resolve: {
    alias: {
      "~": resolve(rootDir, "app"),
      "~/": resolve(rootDir, "app"),
      "@shopify/polaris": resolve(rootDir, "test/__mocks__/polaris.ts"),
      "@shopify/app-bridge-react": resolve(rootDir, "test/__mocks__/app-bridge-react.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}", "app/**/__tests__/**/*.{ts,tsx}"],
    testTimeout: 15000,
    watch: false,
    // Disable Vite HMR during vitest runs to avoid sandbox WS bindings.
    server: {
      hmr: false,
    },
  },
});
