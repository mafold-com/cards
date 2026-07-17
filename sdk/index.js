/**
 * `@mafold/cards` — DEV STUB runtime. In production this module name is
 * externalized at bundle time and every Mafold client (web / iOS / mac / cli
 * preview) injects its real runtime at load; this file exists so cards
 * typecheck and unit-test OUTSIDE a host.
 */

/** Identity — matches every host's behavior. */
export function defineCard(def) {
  return def;
}

/** Host-injected in every real runtime; outside a host there is no theme,
 *  no action pipe and no measured width — fail loudly instead of guessing. */
export function useHost() {
  throw new Error(
    "@mafold/cards: useHost() is host-injected — render this card inside a Mafold client (or mock useHost in tests).",
  );
}
