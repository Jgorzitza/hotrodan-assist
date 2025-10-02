import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const projectDir = dirname(fileURLToPath(new URL("./", import.meta.url)));

loadEnv({ path: resolve(projectDir, ".env"), override: false });
loadEnv({ path: resolve(projectDir, ".env.local"), override: false });

const seedLoaderPath = fileURLToPath(new URL("./prisma/ts-loader.mjs", import.meta.url));
const seedRegisterPath = fileURLToPath(new URL("./prisma/register-ts-loader.mjs", import.meta.url));
const seedScriptPath = fileURLToPath(new URL("./prisma/seed.ts", import.meta.url));
const hasSeedHarness =
  existsSync(seedLoaderPath) && existsSync(seedRegisterPath) && existsSync(seedScriptPath);

// Choose schema based on DATABASE_URL so local dev can use SQLite
const dbUrl = process.env.DATABASE_URL || "";
const schemaPath = dbUrl.startsWith("file:")
  ? "prisma/schema.sqlite.prisma"
  : "prisma/schema.prisma";

export default defineConfig({
  schema: schemaPath,
  ...(hasSeedHarness
    ? {
        migrations: {
          seed: "node --import ./prisma/register-ts-loader.mjs prisma/seed.ts",
        },
      }
    : {}),
});
