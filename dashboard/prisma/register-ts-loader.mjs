import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const prismaDir = dirname(fileURLToPath(import.meta.url));
// Register the existing ts-loader so Prisma can execute TypeScript seeds without --loader.
register("./ts-loader.mjs", pathToFileURL(`${prismaDir}/`));
