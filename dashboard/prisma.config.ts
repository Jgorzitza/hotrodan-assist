import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const seedLoaderPath = fileURLToPath(new URL("./prisma/ts-loader.mjs", import.meta.url));
const seedRegisterPath = fileURLToPath(new URL("./prisma/register-ts-loader.mjs", import.meta.url));
const seedScriptPath = fileURLToPath(new URL("./prisma/seed.ts", import.meta.url));
const hasSeedHarness =
  existsSync(seedLoaderPath) && existsSync(seedRegisterPath) && existsSync(seedScriptPath);

// Defaults for Prisma CLI. Local npm scripts still override --schema when targeting SQLite.
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(hasSeedHarness
    ? {
        migrations: {
          seed: "node --import ./prisma/register-ts-loader.mjs prisma/seed.ts",
        },
      }
    : {}),
});
