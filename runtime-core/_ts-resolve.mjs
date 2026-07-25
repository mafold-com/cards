// Test-only ESM resolve hook: let Node run the extensionless-import TS source
// (the repo uses "moduleResolution":"Bundler", so source imports omit extensions).
// Maps a bare relative specifier "./x" → "./x.ts" when the .ts file exists, so
//   node --import ./runtime-core/_ts-resolve.mjs runtime-core/smoke.test.ts
// runs the real core. NOT part of the shipped runtime — purely a verification harness.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Self-register this module's hooks (the `resolve` export below) onto the loader.
register("./_hooks.mjs", pathToFileURL(import.meta.filename));
