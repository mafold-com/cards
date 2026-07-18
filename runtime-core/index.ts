/**
 * `@mafold/runtime-core` — the SHARED remote-ui core for the Mafold unified runtime
 * (docs/unified-runtime-v0.md). ONE runtime, two profiles:
 *   - `@mafold/card` (render-only) and `@mafold/app` (interactive) both ride this.
 *
 * It owns: the §2 protocol envelopes, the §3 component vocabulary + style guard,
 * the §7 Skia draw-list types, the §5 invoke facade (guest bridge + host
 * dispatcher), the §6 transport seam, the §1.2 AppManifest + "owner/slug" parser,
 * and the guest-side reconciler (`mountRemote`).
 *
 * Consumed by BOTH hosts: web (react-native-web renderer) and iOS (native Fabric
 * renderer) import the protocol/vocabulary/invoke pieces; the GUEST bundle imports
 * `mountRemote` + the SDK facades. Nothing here references a platform global.
 */

// §1.1 / §1.2 — id + manifest
export { parseAppId, isAppId } from "./protocol";
export type { AppManifest, AppKind, AppPanel, AppPanelSize } from "./manifest";
export { parseManifest, parseManifests } from "./manifest";

// §2 / §7 — protocol envelopes + draw list
export type {
  JSONValue,
  JSONObject,
  JSONArray,
  NodeId,
  Tag,
  PropValue,
  Props,
  Mutation,
  MutationBatch,
  InvokeMessage,
  InvokeMethod,
  EventMessage,
  ResultMessage,
  HostMessage,
  HostKind,
  GuestToHost,
  HostToGuest,
  Color,
  DrawList,
  DrawCmd,
  PathSeg,
} from "./protocol";
export { ROOT_NODE, DRAW_LIST_MAX_BYTES } from "./protocol";

// §3 — component vocabulary + capability ids + style guard
export type { CapabilityId, ComponentTag, StyleObject } from "./vocabulary";
export {
  CAPABILITY_IDS,
  isCapabilityId,
  COMPONENT_TAGS,
  isComponentTag,
  STYLE_KEYS,
  filterStyle,
  EVENT_PROPS,
  isEventProp,
} from "./vocabulary";

// §6 — transport seam
export type { GuestTransport, HostTransport } from "./transport";
export { createMemoryTransportPair } from "./transport";

// §5 — invoke facade (guest bridge + host dispatcher)
export type {
  GuestBridge,
  HostDispatcher,
  HostDispatcherOptions,
  InvokeHandler,
} from "./invoke";
export {
  createGuestBridge,
  createHostDispatcher,
  InvokeError,
  ERR_UNKNOWN_METHOD,
  ERR_PERMISSION_DENIED,
  DEFAULT_CAPABILITY_OF,
} from "./invoke";

// the guest reconciler
export type { RemoteMount } from "./reconciler";
export { mountRemote } from "./reconciler";
