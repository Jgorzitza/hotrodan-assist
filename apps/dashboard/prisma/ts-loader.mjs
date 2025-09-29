import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const TS_EXTENSIONS = [".ts", ".tsx"];
const EXTENSION_CANDIDATES = ["", ...TS_EXTENSIONS, ".js", ".mjs", ".cjs"];
const appRoot = new URL("../app/", import.meta.url);

function findCandidateUrls(specifier, baseUrl) {
  const candidates = [];
  for (const ext of EXTENSION_CANDIDATES) {
    candidates.push(new URL(`${specifier}${ext}`, baseUrl));
    candidates.push(new URL(`${specifier}/index${ext}`, baseUrl));
  }
  return candidates;
}

function pickExistingUrl(candidates) {
  for (const candidate of candidates) {
    try {
      if (existsSync(fileURLToPath(candidate))) {
        return candidate;
      }
    } catch (error) {
      // Ignore invalid URL to path conversions and continue searching.
    }
  }
  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("~/")) {
    const relative = specifier.slice(2);
    const candidates = findCandidateUrls(relative, appRoot);
    const match = pickExistingUrl(candidates);
    if (match) {
      return { url: match.href, shortCircuit: true };
    }
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const baseUrl = context.parentURL ?? import.meta.url;
    const candidates = findCandidateUrls(specifier, baseUrl);
    const match = pickExistingUrl(candidates);
    if (match) {
      return { url: match.href, shortCircuit: true };
    }
  }

  if (TS_EXTENSIONS.some((ext) => specifier.endsWith(ext))) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (TS_EXTENSIONS.some((ext) => url.endsWith(ext))) {
    const filename = fileURLToPath(url);
    const source = await readFile(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        sourceMap: false,
      },
      fileName: filename,
    });

    return {
      format: "module",
      shortCircuit: true,
      source: outputText,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
