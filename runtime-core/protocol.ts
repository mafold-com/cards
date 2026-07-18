/**
 * `@mafold/runtime-core` — the remote-ui PROTOCOL (the wire format shared by every
 * host + guest). See docs/unified-runtime-v0.md §2 / §7 / §1.1.
 *
 * The model (Roblox-style "compute/render split"): untrusted guest code runs in an
 * ISOLATED realm and EMITS a whitelisted view tree as serializable mutations; a
 * TRUSTED host renders REAL native UI from those mutations. Everything here is
 * plain JSON — it has to cross a postMessage / WKWebView / Worker boundary — and
 * everything is async. No native handle, no synthetic event, no function ever
 * touches this wire.
 *
 * This file is the SINGLE SOURCE OF TRUTH for the envelope shapes; web + iOS hosts
 * and the guest reconciler all speak exactly these types.
 */

// ── JSON primitives (nothing on the wire is ever non-serializable) ───────────
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [k: string]: JSONValue;
}
export type JSONArray = JSONValue[];

// ── §1.1 app-id = "owner/slug" (reverse-DNS is DEAD) ─────────────────────────
/**
 * Parse a GLOBAL app-id into `{owner, slug}`, or null if malformed. Logic is the
 * client-side mirror of `mafold-api/src/apps_api.rs::parse_app_id` (split on the
 * FIRST "/"; owner = account name with at most one ":" segment; slug = card-tag
 * shape). Clients do NOT re-run the server's ownership check (publish gates that
 * via `require_can_manage`) — this only rejects structurally invalid ids so a
 * resolve/list response can't smuggle a reverse-DNS or empty id back in.
 *
 * Legal: "mafold/wallet", "ops/todo", "mafold:ai/notes".
 * Illegal: "com.mafold.wallet", "noslash", "/leading", "trailing/".
 */
export function parseAppId(id: string): { owner: string; slug: string } | null {
  const i = id.indexOf("/");
  if (i <= 0 || i === id.length - 1) return null;
  const owner = id.slice(0, i);
  const slug = id.slice(i + 1);
  if (owner.length > 64 || slug.length > 64) return null;
  const OWNER = /^[a-z][a-z0-9_]*(:[a-z][a-z0-9_]*)?$/;
  const SLUG = /^[a-z][a-z0-9-]*$/;
  return OWNER.test(owner) && SLUG.test(slug) ? { owner, slug } : null;
}

/** True iff `id` is a well-formed "owner/slug". */
export function isAppId(id: string): boolean {
  return parseAppId(id) !== null;
}

// ── §2.1 node handles + prop values ──────────────────────────────────────────
/** A guest-allocated, monotonically-increasing integer. 0 is the root container. */
export type NodeId = number;
/** The root container the host pre-creates; guest's first `insert` mounts here. */
export const ROOT_NODE: NodeId = 0;

/** A component-vocabulary tag (§3): "View" / "Text" / "Canvas" / … */
export type Tag = string;

export type PropValue = string | number | boolean | null | JSONObject | JSONArray;
export type Props = Record<string, PropValue>;

// ── §2.1 guest → host: a frame's worth of tree mutations ─────────────────────
export type Mutation =
  /** Create an (unmounted) node. */
  | { op: "create"; id: NodeId; tag: Tag; props: Props }
  /** Set a Text leaf's string value (the child of a <Text>). */
  | { op: "text"; id: NodeId; value: string }
  /** Set/delete one prop (`value === undefined` deletes it). */
  | { op: "setProp"; id: NodeId; key: string; value: PropValue | undefined }
  /** Mount/move a child under `parent` before `before` (null → append). */
  | { op: "insert"; parent: NodeId; id: NodeId; before: NodeId | null }
  /** Detach a child (NOT destroyed — may be re-inserted). */
  | { op: "remove"; parent: NodeId; id: NodeId }
  /** Destroy a node and free its host mapping. */
  | { op: "destroy"; id: NodeId }
  /** A Canvas node's painter-ordered draw list (§7). */
  | { op: "draw"; id: NodeId; list: DrawList };

/** guest → host: all tree changes for one frame, applied in array order. */
export interface MutationBatch {
  t: "mutate";
  /** Monotonic; the host drops out-of-order / duplicate frames on retry. */
  seq: number;
  ops: Mutation[];
}

// ── §2.3 guest → host: invoke a host capability (§5) ─────────────────────────
import type { CapabilityId } from "./vocabulary";

/** Methods invocable over the bridge (§5). A superset of the manifest capability
 *  ids: it also covers chat/room verbs and the always-present `ui.close`. */
export type InvokeMethod =
  | CapabilityId
  | "storage.get"
  | "storage.set"
  | "storage.remove"
  | "storage.keys"
  | "chat.list"
  | "chat.send"
  | "chat.subscribe"
  | "room.open"
  | "room.change"
  | "room.increment"
  | "ui.close"
  | "ui.setTitle"
  | "ui.resize"
  | "ui.haptic"
  | "ui.button"
  | "ui.popup"
  | "ui.scan"
  | "ui.pickPhoto"
  | "ui.pickContact"
  | "ui.getLocation"
  /** card profile's only outbound call (§4.2): card → host → host's session. */
  | "__sendAction";

export interface InvokeMessage {
  t: "invoke";
  /** Pairs with the host's ResultMessage. */
  callId: number;
  method: InvokeMethod;
  params: JSONObject;
}

// ── §2.2 host → guest: events + results + lifecycle ──────────────────────────
/** host → guest: an event fired on a node (onPress / onChangeText / onLayout …). */
export interface EventMessage {
  t: "event";
  id: NodeId;
  /** The prop name minus its "on" prefix, lower-cased: onPress→"press". */
  type: string;
  /** Whitelisted, serializable fields only (§3 per-event) — never a native obj. */
  payload: JSONObject;
}

/** host → guest: the result of one `invoke` (§5). */
export interface ResultMessage {
  t: "result";
  callId: number;
  ok: boolean;
  value?: JSONValue;
  error?: { code: string; message: string };
}

/** host → guest lifecycle kinds + bootstrap. */
export type HostKind =
  | "init"
  | "resume"
  | "background"
  | "close"
  | "themeChanged"
  | "roomUpdate";

/** host → guest: lifecycle + initial bootstrap (`init` carries §4 boot payload). */
export interface HostMessage {
  t: "host";
  kind: HostKind;
  data?: JSONObject;
}

// ── the 5 envelopes, each direction ──────────────────────────────────────────
/** guest → host. */
export type GuestToHost = MutationBatch | InvokeMessage;
/** host → guest. */
export type HostToGuest = EventMessage | ResultMessage | HostMessage;

// ── §7 host Skia draw-list ───────────────────────────────────────────────────
export type Color = string; // "#rrggbb" / "#rrggbbaa" / "rgba(...)"

/** A painter-ordered draw list for a Canvas node. Coordinates are Canvas-local dp. */
export interface DrawList {
  width: number;
  height: number;
  cmds: DrawCmd[];
}

export type DrawCmd =
  | { c: "clear"; color?: Color }
  | { c: "rect"; x: number; y: number; w: number; h: number; fill?: Color; stroke?: Color; strokeWidth?: number; radius?: number }
  | { c: "circle"; cx: number; cy: number; r: number; fill?: Color; stroke?: Color; strokeWidth?: number }
  | { c: "line"; x1: number; y1: number; x2: number; y2: number; stroke: Color; strokeWidth?: number; cap?: "butt" | "round" | "square" }
  | { c: "path"; d: PathSeg[]; fill?: Color; stroke?: Color; strokeWidth?: number; close?: boolean }
  | { c: "text"; x: number; y: number; text: string; size: number; color: Color; font?: string; align?: "left" | "center" | "right"; weight?: "normal" | "bold" }
  | { c: "image"; uri: string; x: number; y: number; w: number; h: number }
  | { c: "save" }
  | { c: "restore" }
  | { c: "translate"; x: number; y: number }
  | { c: "scale"; x: number; y: number }
  | { c: "rotate"; deg: number }
  | { c: "clipRect"; x: number; y: number; w: number; h: number };

export type PathSeg =
  | { m: number[] } // moveTo [x,y]
  | { l: number[] } // lineTo [x,y]
  | { q: number[] } // quadTo [cx,cy,x,y]
  | { b: number[] } // cubicTo [c1x,c1y,c2x,c2y,x,y]
  | { z: true }; // close

/** Hard cap on a single draw list's serialized size (anti-DoS, §7). */
export const DRAW_LIST_MAX_BYTES = 64 * 1024;
