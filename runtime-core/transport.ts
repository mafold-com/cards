/**
 * `@mafold/runtime-core` — the pluggable TRANSPORT seam (§6). The guest core never
 * touches a native global; it only holds a `GuestTransport`. Each platform supplies
 * the concrete adapter:
 *   - web card:  Worker / MessageChannel postMessage, guest in a SES Compartment
 *   - web app:   cross-origin sandboxed <iframe> postMessage (origin-checked)
 *   - iOS open:  offscreen WKWebView-as-sandbox (WKScriptMessageHandler ↔
 *                evaluateJavaScript) — a JS sandbox that ONLY runs guest JS, it
 *                does NOT render; rendering stays native RN on the host side.
 *   - iOS trusted fallback: same realm (skip the transport hop) but STILL emit the
 *                same mutation stream, so the host renderer code is one path.
 *
 * The two ends are symmetric: `GuestTransport` carries `{mutate|invoke}` out and
 * `{event|result|host}` in; `HostTransport` is its mirror.
 */
import type { GuestToHost, HostToGuest } from "./protocol";

/** The guest side: the core posts `{mutate|invoke}` and receives `{event|result|host}`. */
export interface GuestTransport {
  /** Send one envelope to the host. */
  post(msg: GuestToHost): void;
  /** Subscribe to host → guest envelopes; returns an unsubscribe. */
  onMessage(cb: (msg: HostToGuest) => void): () => void;
}

/** The host side: mirror of `GuestTransport`. */
export interface HostTransport {
  post(msg: HostToGuest): void;
  onMessage(cb: (msg: GuestToHost) => void): () => void;
}

/**
 * An in-memory transport PAIR — the canonical adapter for the trusted same-realm
 * fallback (iOS first-party / owner code, §6.2) and for tests. It wires a guest
 * end to a host end with zero serialization (still the exact envelope shapes), so
 * the host renderer runs the SAME mutation path it would for a sandboxed guest.
 *
 * Real cross-realm adapters (postMessage / WKWebView) live in the web + iOS hosts;
 * they implement these same two interfaces over their boundary.
 */
export function createMemoryTransportPair(): { guest: GuestTransport; host: HostTransport } {
  const toGuest = new Set<(m: HostToGuest) => void>();
  const toHost = new Set<(m: GuestToHost) => void>();
  // Deliver async to honour the "everything is async, never reentrant" contract
  // (mirrors a real postMessage boundary; a sync handler can't observe mid-frame).
  const defer =
    typeof queueMicrotask === "function"
      ? queueMicrotask
      : (fn: () => void) => Promise.resolve().then(fn);

  const guest: GuestTransport = {
    post(msg) {
      defer(() => {
        for (const cb of toHost) cb(msg);
      });
    },
    onMessage(cb) {
      toGuest.add(cb);
      return () => toGuest.delete(cb);
    },
  };
  const host: HostTransport = {
    post(msg) {
      defer(() => {
        for (const cb of toGuest) cb(msg);
      });
    },
    onMessage(cb) {
      toHost.add(cb);
      return () => toHost.delete(cb);
    },
  };
  return { guest, host };
}
