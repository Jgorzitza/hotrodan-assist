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
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["app/**/*.test.{ts,tsx}", "app/**/__tests__/**/*.{ts,tsx}"],
    watch: false,
    // Disable Vite HMR during vitest runs to avoid sandbox WS bindings.
    server: {
      hmr: false,
    },
  },
});
