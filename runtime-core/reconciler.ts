/**
 * `@mafold/runtime-core` — the GUEST-side reconciler. This is the "compute" half of
 * the compute/render split: it runs inside the isolated realm, renders the guest's
 * React tree against a REMOTE host (not the DOM, not native RN), and emits a stream
 * of serializable §2 mutations over the transport. The "render" half — turning
 * those mutations into REAL native views — lives in the per-platform host (web
 * react-native-web, iOS Fabric).
 *
 * Built on `react-reconciler` (an external the host bundle injects, like
 * react/react-native): we supply a custom host-config whose "instances" are just
 * `{id}` handles. Every create/insert/remove/setProp/text is buffered into the
 * current frame's `MutationBatch` and flushed once per commit (resetAfterCommit) —
 * one batch per frame, in array order, exactly as §2.1 requires. Function props
 * (event handlers) never cross the wire: they're kept in a guest-side table and
 * fired when the host posts back the matching `event` (§2.2).
 */
import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import type { ReactNode } from "react";
import type {
  EventMessage,
  Mutation,
  NodeId,
  Props,
  PropValue,
} from "./protocol";
import { ROOT_NODE } from "./protocol";
import {
  EVENT_PROPS,
  isComponentTag,
  type ComponentTag,
} from "./vocabulary";
import type { GuestBridge } from "./invoke";
import type { GuestTransport } from "./transport";
import { createGuestBridge } from "./invoke";

// ── a guest-side host node (just a handle + its bookkeeping) ──────────────────
interface RemoteInstance {
  id: NodeId;
  tag: ComponentTag;
  /** Live event handlers (NEVER serialized) keyed by wire event type. */
  handlers: Map<string, (payload: Record<string, unknown>) => void>;
}

interface TextInstance {
  id: NodeId;
}

/** Per-mount state: the frame buffer, node table, id allocator, bridge. */
interface RemoteRoot {
  ops: Mutation[];
  seq: number;
  nextId: NodeId;
  /** id → instance, so host `event`s find their handler. */
  nodes: Map<NodeId, RemoteInstance>;
  bridge: GuestBridge;
  flush(): void;
}

function isEvent(tag: ComponentTag, prop: string): boolean {
  return prop in (EVENT_PROPS[tag] ?? {});
}

/** Split a guest's React props into wire props + the event-handler table. */
function partitionProps(
  tag: ComponentTag,
  props: Record<string, unknown>,
  handlers: Map<string, (p: Record<string, unknown>) => void>,
): Props {
  const wire: Props = {};
  const eventMap = EVENT_PROPS[tag] ?? {};
  handlers.clear();
  for (const key of Object.keys(props)) {
    if (key === "children") continue;
    const val = props[key];
    if (isEvent(tag, key)) {
      // A handler becomes mere PRESENCE on the wire (host registers a listener).
      if (typeof val === "function") {
        handlers.set(eventMap[key], val as (p: Record<string, unknown>) => void);
        wire[key] = true;
      }
      continue;
    }
    if (typeof val === "function") continue; // no other function prop crosses the wire
    wire[key] = val as PropValue;
  }
  return wire;
}

/**
 * Build the `react-reconciler` host-config for the remote tree. Each method just
 * appends a §2 mutation to the current frame buffer; `resetAfterCommit` flushes
 * the whole frame as ONE `MutationBatch`.
 */
function makeHostConfig(root: RemoteRoot) {
  const allocId = (): NodeId => root.nextId++;

  return {
    supportsMutation: true,
    supportsPersistence: false,
    isPrimaryRenderer: true,
    supportsHydration: false,
    noTimeout: -1 as const,

    getRootHostContext: () => ({}),
    getChildHostContext: (ctx: unknown) => ctx,
    getPublicInstance: (inst: RemoteInstance | TextInstance) => inst,
    prepareForCommit: () => null,
    resetAfterCommit: () => root.flush(),
    preparePortalMount: () => {},
    scheduleTimeout: (fn: (...a: unknown[]) => void, delay?: number) => setTimeout(fn, delay),
    cancelTimeout: (h: ReturnType<typeof setTimeout>) => clearTimeout(h),
    getCurrentEventPriority: () => DefaultEventPriority,
    getInstanceFromNode: () => null,
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    prepareScopeUpdate: () => {},
    getInstanceFromScope: () => null,
    detachDeletedInstance: () => {},
    clearContainer: () => {
      /* the host pre-creates ROOT_NODE; nothing to clear guest-side */
    },

    createInstance(type: string, props: Record<string, unknown>): RemoteInstance {
      const tag: ComponentTag = isComponentTag(type) ? type : "View";
      if (!isComponentTag(type)) console.warn(`[remote-ui] unknown tag "${type}" → View`);
      const handlers = new Map<string, (p: Record<string, unknown>) => void>();
      const id = allocId();
      const wire = partitionProps(tag, props, handlers);
      const inst: RemoteInstance = { id, tag, handlers };
      root.nodes.set(id, inst);
      root.ops.push({ op: "create", id, tag, props: wire });
      return inst;
    },

    createTextInstance(text: string): TextInstance {
      const id = allocId();
      root.ops.push({ op: "create", id, tag: "Text", props: {} });
      root.ops.push({ op: "text", id, value: text });
      return { id };
    },

    appendInitialChild(parent: RemoteInstance, child: RemoteInstance | TextInstance) {
      root.ops.push({ op: "insert", parent: parent.id, id: child.id, before: null });
    },
    appendChild(parent: RemoteInstance, child: RemoteInstance | TextInstance) {
      root.ops.push({ op: "insert", parent: parent.id, id: child.id, before: null });
    },
    appendChildToContainer(_container: unknown, child: RemoteInstance | TextInstance) {
      root.ops.push({ op: "insert", parent: ROOT_NODE, id: child.id, before: null });
    },
    insertBefore(parent: RemoteInstance, child: RemoteInstance | TextInstance, before: RemoteInstance | TextInstance) {
      root.ops.push({ op: "insert", parent: parent.id, id: child.id, before: before.id });
    },
    insertInContainerBefore(_container: unknown, child: RemoteInstance | TextInstance, before: RemoteInstance | TextInstance) {
      root.ops.push({ op: "insert", parent: ROOT_NODE, id: child.id, before: before.id });
    },
    removeChild(parent: RemoteInstance, child: RemoteInstance | TextInstance) {
      root.ops.push({ op: "remove", parent: parent.id, id: child.id });
      destroy(root, child);
    },
    removeChildFromContainer(_container: unknown, child: RemoteInstance | TextInstance) {
      root.ops.push({ op: "remove", parent: ROOT_NODE, id: child.id });
      destroy(root, child);
    },

    commitTextUpdate(node: TextInstance, _old: string, next: string) {
      root.ops.push({ op: "text", id: node.id, value: next });
    },

    // Modern react-reconciler (React 19) calls commitUpdate directly; we diff here.
    commitUpdate(
      inst: RemoteInstance,
      _type: string,
      oldProps: Record<string, unknown>,
      newProps: Record<string, unknown>,
    ) {
      const eventMap = EVENT_PROPS[inst.tag] ?? {};
      const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
      for (const key of keys) {
        if (key === "children") continue;
        const nv = newProps[key];
        const ov = oldProps[key];
        if (isEvent(inst.tag, key)) {
          if (typeof nv === "function") inst.handlers.set(eventMap[key], nv as (p: Record<string, unknown>) => void);
          else inst.handlers.delete(eventMap[key]);
          // presence flag only changes if the handler appeared/disappeared
          if (!!nv !== !!ov) root.ops.push({ op: "setProp", id: inst.id, key, value: nv ? true : undefined });
          continue;
        }
        if (typeof nv === "function") continue;
        if (nv === ov) continue;
        root.ops.push({ op: "setProp", id: inst.id, key, value: nv === undefined ? undefined : (nv as PropValue) });
      }
    },

    // Some react-reconciler versions ask for a prepared payload first.
    prepareUpdate() {
      return true; // always re-run commitUpdate (we diff inside it)
    },
    shouldSetTextContent: () => false,
    finalizeInitialChildren: () => false,
    commitMount: () => {},
    resetTextContent: () => {},
    hideInstance: (inst: RemoteInstance) => {
      root.ops.push({ op: "setProp", id: inst.id, key: "__hidden", value: true });
    },
    unhideInstance: (inst: RemoteInstance) => {
      root.ops.push({ op: "setProp", id: inst.id, key: "__hidden", value: undefined });
    },
    hideTextInstance: () => {},
    unhideTextInstance: () => {},
    maySuspendCommit: () => false,
  };
}

/** Recursively destroy a detached subtree's host mapping. */
function destroy(root: RemoteRoot, node: RemoteInstance | TextInstance) {
  root.ops.push({ op: "destroy", id: node.id });
  root.nodes.delete(node.id);
}

/** A live remote mount: drive the host tree + receive its events; unmount to stop. */
export interface RemoteMount {
  /** Emit a Canvas draw list (§7) for `id`, batched onto the next frame. */
  draw(id: NodeId, list: import("./protocol").DrawList): void;
  /** The bridge (for the SDK facades' `invoke`, and host/event subscriptions). */
  bridge: GuestBridge;
  /** Unmount the React tree and dispose the bridge. */
  unmount(): void;
}

/**
 * Mount a guest React tree against the host, over `transport`. The core doesn't
 * care whether `transport` is an iframe, a Worker, or a WKWebView — it only speaks
 * §2 envelopes. Returns a handle to unmount + a `bridge` for capability invokes.
 */
export function mountRemote(element: ReactNode, transport: GuestTransport): RemoteMount {
  const bridge = createGuestBridge(transport);

  const root: RemoteRoot = {
    ops: [],
    seq: 0,
    nextId: 1, // 0 is the host-provided ROOT_NODE
    nodes: new Map(),
    bridge,
    flush() {
      if (this.ops.length === 0) return;
      const batch = { t: "mutate" as const, seq: this.seq++, ops: this.ops };
      this.ops = [];
      transport.post(batch);
    },
  };

  // Route host → guest events to the owning node's handler (§2.2).
  const offEvent = bridge.onEvent((msg: EventMessage) => {
    const inst = root.nodes.get(msg.id);
    const handler = inst?.handlers.get(msg.type);
    if (handler) {
      try {
        handler(msg.payload);
      } catch (e) {
        console.warn("[remote-ui] event handler threw", e);
      }
    }
  });

  const reconciler = ReactReconciler<unknown>(makeHostConfig(root) as Record<string, unknown>);
  const container = reconciler.createContainer(
    {}, // container info — the host owns ROOT_NODE; guest only needs a handle
    0, // LegacyRoot tag (0); the renderer is mutation-based either way
    null,
    null,
    false,
    null,
    "mafold-remote",
    (err) => console.warn("[remote-ui] recoverable error", err),
    null,
  );
  reconciler.updateContainer(element, container, null, null);

  return {
    bridge,
    draw(id, list) {
      root.ops.push({ op: "draw", id, list });
      // a draw-only frame still flushes on the next microtask if no commit follows
      queueMicrotask(() => root.flush());
    },
    unmount() {
      reconciler.updateContainer(null, container, null, null);
      offEvent();
      bridge.dispose();
    },
  };
}
