/**
 * Runtime smoke test for the pure-JS core (no React / no react-reconciler needed).
 * Run with Node's built-in TS type-stripping + the extensionless-resolve hook:
 *   node --experimental-strip-types --import ./runtime-core/_ts-resolve.mjs \
 *        runtime-core/smoke.test.ts
 * Exercises §1.1 id parsing, §1.2 manifest parse, §5 invoke round-trip + capability
 * gating, and §6 the memory transport pair. The reconciler (needs the external
 * `react-reconciler`) is covered by `tsc`, not this runtime test.
 */
import assert from "node:assert/strict";
import { parseAppId, isAppId } from "./protocol";
import { parseManifest, parseManifests } from "./manifest";
import { createMemoryTransportPair } from "./transport";
import { createGuestBridge, createHostDispatcher, InvokeError } from "./invoke";
import { isCapabilityId, filterStyle, isComponentTag } from "./vocabulary";

let passed = 0;
function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}

// ── §1.1 parseAppId mirrors apps_api.rs ──────────────────────────────────────
assert.deepEqual(parseAppId("mafold/wallet"), { owner: "mafold", slug: "wallet" });
assert.deepEqual(parseAppId("mafold:ai/notes"), { owner: "mafold:ai", slug: "notes" });
assert.deepEqual(parseAppId("ops/todo-list"), { owner: "ops", slug: "todo-list" });
assert.equal(parseAppId("com.mafold.wallet"), null); // reverse-DNS is DEAD
assert.equal(parseAppId("noslash"), null);
assert.equal(parseAppId("/leading"), null);
assert.equal(parseAppId("trailing/"), null);
assert.equal(parseAppId("Mafold/wallet"), null); // owner must start lowercase
assert.equal(parseAppId("mafold/Wallet"), null); // slug must start lowercase
assert.equal(parseAppId("a:b:c/x"), null); // at most one ":" segment
assert.equal(isAppId("mafold/wallet"), true);
ok("parseAppId matches the server's owner/slug rules");

// ── §1.2 manifest parse + legacy `permissions` fallback ──────────────────────
const m = parseManifest({
  id: "mafold/wallet",
  version: "1.2.0",
  name: "Wallet",
  icon: "wallet",
  capabilities: ["storage", "room", "bogus"],
});
assert.ok(m);
assert.equal(m!.id, "mafold/wallet");
assert.equal(m!.kind, "app");
assert.deepEqual(m!.capabilities, ["storage", "room"]); // "bogus" dropped
assert.equal(parseManifest({ id: "com.mafold.wallet", version: "1", name: "x" }), null);
assert.equal(parseManifest({ id: "mafold/wallet", name: "x" }), null); // no version
const legacy = parseManifest({ id: "ops/notes", version: "1", name: "N", permissions: ["chat.read"] });
assert.deepEqual(legacy!.capabilities, ["chat.read"]); // legacy field accepted
assert.equal(parseManifests('[{"id":"mafold/a","version":"1","name":"A"},{"id":"bad"}]').length, 1);
ok("parseManifest validates id, drops bad capabilities, accepts legacy permissions");

// ── §3 vocabulary guards ─────────────────────────────────────────────────────
assert.equal(isComponentTag("View"), true);
assert.equal(isComponentTag("WebView"), false);
assert.equal(isCapabilityId("ui.scan"), true);
assert.equal(isCapabilityId("net"), false); // not in the open-tier set
// transform is now ALLOWED but structurally validated: scalar ops kept, a smuggled
// function op stripped; unknown style keys still dropped.
const styled = filterStyle({ flex: 1, color: "#fff", transform: [{ scale: 2 }, { evil: () => {} }], bogusKey: 1, __proto__: "x" });
assert.deepEqual(styled, { flex: 1, color: "#fff", transform: [{ scale: 2 }] });
assert.equal(isComponentTag("Modal"), true); // expanded vocabulary
assert.equal(isComponentTag("WebView"), false);
ok("vocabulary: tag/capability guards + style whitelist (transform validated, unknown keys dropped)");

// ── §5 / §6 invoke round-trip + capability gating over the memory transport ──
async function main() {
  const { guest, host } = createMemoryTransportPair();
  const bridge = createGuestBridge(guest);
  const dispatcher = createHostDispatcher(host, { granted: new Set(["storage", "room"]) });

  const kv = new Map<string, string>();
  dispatcher.on("storage.set", (p) => {
    kv.set(p.key as string, p.value as string);
    return null;
  });
  dispatcher.on("storage.get", (p) => kv.get(p.key as string) ?? null);
  dispatcher.on("chat.send", () => null); // handler exists but chat.send is NOT granted

  // free-tier storage works
  await bridge.invoke("storage.set", { key: "k", value: "v" });
  assert.equal(await bridge.invoke("storage.get", { key: "k" }), "v");

  // gated method with an un-granted capability → permission_denied
  await assert.rejects(
    () => bridge.invoke("chat.send", { text: "hi" }),
    (e: unknown) => e instanceof InvokeError && e.code === "permission_denied",
  );

  // unknown method → unknown_method
  await assert.rejects(
    () => bridge.invoke("storage.remove", { key: "k" }), // no handler registered
    (e: unknown) => e instanceof InvokeError && e.code === "unknown_method",
  );

  bridge.dispose();
  dispatcher.dispose();
  ok("invoke round-trip: free works, ungranted → permission_denied, no-handler → unknown_method");

  console.log(`\nruntime-core smoke: ${passed} groups passed`);
}
await main();
