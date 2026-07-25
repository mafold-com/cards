// The actual loader hooks (run on the loader thread), registered by _ts-resolve.mjs.
// Appends ".ts" to an extensionless relative specifier when that file exists, so the
// extensionless-import TS source ("moduleResolution":"Bundler") runs under Node for
// the runtime smoke test. Verification harness only — not shipped.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(specifier + ".ts", context);
    } catch {
      /* fall through to default resolution */
    }
  }
  return next(specifier, context);
}
