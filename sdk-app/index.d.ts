/**
 * `@mafold/app` — the mini-app SDK contract (interactive profile, types only). Apps
 * import this; the publish externalizes it; each client (web / iOS) injects the real
 * runtime at load. So an app never imports a client's files — only this package name.
 *
 * An app is the INTERACTIVE profile of the ONE unified runtime
 * (docs/unified-runtime-v0.md §4): it shares the remote-ui core (`@mafold/runtime-core`)
 * with the render-only `@mafold/card`, but exposes the full `useApp()` host surface
 * — context/messages/storage/ui/room/lifecycle + picker capabilities. Every method
 * is a pure async facade over `invoke(method, params)` (§5); a method whose
 * `CapabilityId` was not declared in the manifest is PRESENT but rejects with
 * `permission_denied`, so apps feature-detect with try/catch or by pre-reading the
 * granted-capability set.
 *
 * Names mirror the cards SDK on purpose (`defineApp` ⇄ `defineCard`, `useApp` ⇄
 * `useHost`). app-id is "owner/slug" (reverse-DNS is DEAD).
 */
import type { ComponentType } from "react";
import type { CardTheme } from "@mafold/cards"; // reuse the theme tokens verbatim
// The manifest + capability ids + id parser are the shared core's (one SSOT).
import type {
  AppManifest,
  AppKind,
  AppPanel,
  AppPanelSize,
  CapabilityId,
  JSONValue,
} from "@mafold/runtime-core";
export type { AppManifest, AppKind, AppPanel, AppPanelSize, CapabilityId };
export { parseAppId, isAppId, parseManifest, parseManifests } from "@mafold/runtime-core";

export interface AppContext {
  app: { id: string; version: string };
  me: { id: string; username: string; displayName: string; avatarUrl?: string };
  conversation: {
    id: string;
    isGroup: boolean;
    peer?: { username: string; displayName: string };
  };
  /** The bot whose config exposes this app in the conversation. */
  bot?: { username: string; displayName: string };
  /** Optional launch / deep-link payload. */
  launch?: unknown;
}

export interface AppMessage {
  id: string;
  role: "user" | "assistant" | string;
  senderUsername: string;
  text: string;
  createdAt: number;
}

/** Shared-room CRDT surface — multi-writer state for THIS (conversation, app).
 *  v0 authority model is PURE CRDT only. A change applies instantly + offline and
 *  converges across every participant via the room relay. Backed by the existing
 *  room (web automerge-wasm / iOS mafold-core `Room`); the SDK reaches it through
 *  `invoke("room.*", …)` + `host:roomUpdate` snapshots. */
export interface AppRoom {
  /** False until the room doc has loaded (wasm is lazy). */
  ready: boolean;
  /** Reactive snapshot of the room doc. */
  doc: Readonly<Record<string, unknown>>;
  /** Mutate the doc — local-first, auto-relayed, conflict-free. */
  change(fn: (draft: Record<string, unknown>) => void): void;
  /** Convenience: a PN-counter at `key` (concurrent increments sum). */
  counter(key: string): { value: number; increment: (by?: number) => void };
}

/** A one-shot picker result is normalized JSON — NEVER a raw native handle. */
export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
}
export interface ContactResult {
  name: string;
  phone?: string;
}
export interface LocationResult {
  lat: number;
  lng: number;
  accuracy: number;
}
export interface PopupButton {
  id: string;
  text: string;
  style?: "default" | "cancel" | "destructive";
}

/**
 * The host surface a running app sees (`useApp()`). An app can ONLY reach the
 * platform through this object — never a raw native module. Every member is a pure
 * async facade over the remote-ui `invoke` bridge. Capability-gated members are
 * PRESENT but reject `permission_denied` unless the manifest declared them.
 */
export interface AppHostApi {
  context: AppContext;
  theme: CardTheme;
  /** Group-shared CRDT state (see `AppRoom`). Bound to (conversation, app). */
  room: AppRoom;

  /** The capability ids the manifest declared + the host granted (feature-detect). */
  capabilities: ReadonlySet<CapabilityId>;

  /** Messaging — hard-scoped to `context.conversation.id`. Gated chat.read/chat.send. */
  messages: {
    list(opts?: { limit?: number; before?: string }): Promise<AppMessage[]>;
    send(text: string): Promise<void>;
    subscribe(cb: (m: AppMessage) => void): () => void;
  };

  /** Per-app isolated key/value store (namespaced `mfapp:<account>:<owner/slug>:`). */
  storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };

  /** Host UI: chrome + picker-mediated native capabilities (§5). */
  ui: {
    // host chrome
    close(): void;
    setTitle(title: string): Promise<void>;
    resize(size: AppPanelSize): Promise<void>;
    haptic(kind?: "light" | "select" | "success" | "error"): Promise<void>;
    button(opts: { label: string; visible: boolean; loading?: boolean }): Promise<void>;
    popup(opts: { title?: string; message: string; buttons: PopupButton[] }): Promise<{ buttonId: string }>;
    // picker-mediated (user-initiated; host shows a NATIVE picker; returns a result
    // or null on cancel). NEVER a raw camera/album/location handle.
    scan(): Promise<{ value: string } | null>;
    pickPhoto(): Promise<PhotoResult | null>;
    pickContact(): Promise<ContactResult | null>;
    getLocation(): Promise<LocationResult | null>;
  };

  /** Lifecycle; also surfaced as `useAppLifecycle(event, cb)`. */
  on(event: "resume" | "background" | "close", cb: () => void): () => void;

  /** Escape hatch for forward-compat: call any `invoke` method directly. */
  invoke(method: string, params?: Record<string, JSONValue>): Promise<JSONValue>;
}

/** A registered app: its manifest + the root RN component. */
export interface AppDef {
  manifest: AppManifest;
  component: ComponentType;
}

/** Register an app: a manifest + its root RN component (mirrors `defineCard`). */
export function defineApp(manifest: AppManifest, component: ComponentType): AppDef;

/** Read the host API from inside an app component. */
export function useApp(): AppHostApi;

/** Subscribe to a lifecycle event for the running app. */
export function useAppLifecycle(event: "resume" | "background" | "close", cb: () => void): void;
