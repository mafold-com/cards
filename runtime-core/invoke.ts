/**
 * `@mafold/runtime-core` — the pure-JS async `invoke()` facade (§5). Every host
 * capability is reached the SAME way: `invoke(method, params): Promise<value>`,
 * across the transport boundary, ALWAYS async, JSON in / JSON out. The guest end
 * sends an `InvokeMessage` with a fresh `callId` and parks a `{resolve,reject}`
 * keyed by it; the host end runs the capability and posts a `ResultMessage` back,
 * which settles the parked promise.
 *
 * This is the engine behind `useApp()` — each `app.storage.get`, `app.ui.scan`,
 * `app.room.change`, etc. is a thin `(...) => invoke("storage.get", {...})` facade.
 * It is also what dispatches host → guest `event` / `host` messages to the
 * reconciler's listeners.
 */
import type {
  GuestTransport,
  HostTransport,
} from "./transport";
import type {
  EventMessage,
  HostMessage,
  InvokeMethod,
  JSONObject,
  JSONValue,
  ResultMessage,
} from "./protocol";

/** A capability that the host knows nothing about. */
export const ERR_UNKNOWN_METHOD = "unknown_method";
/** A capability whose `CapabilityId` was not declared in the manifest. */
export const ERR_PERMISSION_DENIED = "permission_denied";

export class InvokeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InvokeError";
    this.code = code;
  }
}

/** What the guest core exposes to the SDK facades + the reconciler. */
export interface GuestBridge {
  /** Call a host capability (§5). Rejects with `InvokeError` on `result.ok === false`. */
  invoke(method: InvokeMethod, params?: JSONObject): Promise<JSONValue>;
  /** Subscribe to host → guest `event` messages (node events, §2.2). */
  onEvent(cb: (msg: EventMessage) => void): () => void;
  /** Subscribe to host → guest `host` lifecycle/bootstrap messages (§2.2). */
  onHost(cb: (msg: HostMessage) => void): () => void;
  /** Tear down the bridge (reject all pending invokes, drop subscriptions). */
  dispose(): void;
}

/**
 * Build the guest-side bridge over a `GuestTransport`. Pure JS, no platform refs.
 */
export function createGuestBridge(transport: GuestTransport): GuestBridge {
  let nextCallId = 1;
  const pending = new Map<number, { resolve: (v: JSONValue) => void; reject: (e: Error) => void }>();
  const eventCbs = new Set<(m: EventMessage) => void>();
  const hostCbs = new Set<(m: HostMessage) => void>();
  let disposed = false;

  const unsub = transport.onMessage((msg) => {
    if (disposed) return;
    switch (msg.t) {
      case "result": {
        const entry = pending.get(msg.callId);
        if (!entry) return;
        pending.delete(msg.callId);
        if (msg.ok) entry.resolve(msg.value ?? null);
        else entry.reject(new InvokeError(msg.error?.code ?? "error", msg.error?.message ?? "invoke failed"));
        return;
      }
      case "event":
        for (const cb of eventCbs) cb(msg);
        return;
      case "host":
        for (const cb of hostCbs) cb(msg);
        return;
    }
  });

  return {
    invoke(method, params = {}) {
      if (disposed) return Promise.reject(new InvokeError("disposed", "bridge disposed"));
      const callId = nextCallId++;
      return new Promise<JSONValue>((resolve, reject) => {
        pending.set(callId, { resolve, reject });
        transport.post({ t: "invoke", callId, method, params });
      });
    },
    onEvent(cb) {
      eventCbs.add(cb);
      return () => eventCbs.delete(cb);
    },
    onHost(cb) {
      hostCbs.add(cb);
      return () => hostCbs.delete(cb);
    },
    dispose() {
      disposed = true;
      unsub();
      for (const { reject } of pending.values()) reject(new InvokeError("disposed", "bridge disposed"));
      pending.clear();
      eventCbs.clear();
      hostCbs.clear();
    },
  };
}

/**
 * The host-side invoke dispatcher (§6.3). A host registers ONE handler per method
 * (`room.change → roomPut`, `chat.send → sendMessage`, `storage.get → …`); the
 * dispatcher routes incoming `InvokeMessage`s to it, gates on declared
 * capabilities, and posts the `ResultMessage` back. Unknown method → `unknown_method`;
 * a method whose capability was not declared → `permission_denied` (§4/§5).
 *
 * This is the seam that replaces the OLD direct-call host (web `new Function`, iOS
 * `__mafoldHostEval` running guest code in-realm): the host no longer imports the
 * guest's component — it only answers invokes and applies mutations.
 */
export type InvokeHandler = (params: JSONObject) => Promise<JSONValue> | JSONValue;

export interface HostDispatcherOptions {
  /** The method → capability gate. A method absent from this map needs no gate
   *  (e.g. `storage.*`, `room.*`, `ui.close`, `__sendAction`). A method present
   *  here is rejected unless its `CapabilityId` is in `granted`. */
  capabilityOf?: Partial<Record<InvokeMethod, string>>;
  /** The set of capability ids the manifest declared (and the host granted). */
  granted?: ReadonlySet<string>;
}

export interface HostDispatcher {
  /** Register the handler for one method. */
  on(method: InvokeMethod, handler: InvokeHandler): void;
  dispose(): void;
}

/** Default method → capability gate, per §5. Methods omitted need no capability. */
export const DEFAULT_CAPABILITY_OF: Partial<Record<InvokeMethod, string>> = {
  "chat.list": "chat.read",
  "chat.send": "chat.send",
  "chat.subscribe": "chat.read",
  "room.open": "room",
  "room.change": "room",
  "room.increment": "room",
  "ui.setTitle": "ui.setTitle",
  "ui.resize": "ui.resize",
  "ui.haptic": "ui.haptic",
  "ui.button": "ui.button",
  "ui.popup": "ui.popup",
  "ui.scan": "ui.scan",
  "ui.pickPhoto": "ui.pickPhoto",
  "ui.pickContact": "ui.pickContact",
  "ui.getLocation": "ui.getLocation",
};

export function createHostDispatcher(
  transport: HostTransport,
  opts: HostDispatcherOptions = {},
): HostDispatcher {
  const handlers = new Map<InvokeMethod, InvokeHandler>();
  const capabilityOf = opts.capabilityOf ?? DEFAULT_CAPABILITY_OF;
  const granted = opts.granted ?? new Set<string>();
  let disposed = false;

  const unsub = transport.onMessage((msg) => {
    if (disposed || msg.t !== "invoke") return;
    const { callId, method, params } = msg;
    const reply = (m: Omit<ResultMessage, "t" | "callId">) =>
      transport.post({ t: "result", callId, ...m });

    const cap = capabilityOf[method];
    if (cap && !granted.has(cap)) {
      reply({ ok: false, error: { code: ERR_PERMISSION_DENIED, message: `capability not granted: ${cap}` } });
      return;
    }
    const handler = handlers.get(method);
    if (!handler) {
      reply({ ok: false, error: { code: ERR_UNKNOWN_METHOD, message: `unknown method: ${method}` } });
      return;
    }
    Promise.resolve()
      .then(() => handler(params))
      .then((value) => reply({ ok: true, value: value ?? null }))
      .catch((e: unknown) =>
        reply({
          ok: false,
          error: { code: e instanceof InvokeError ? e.code : "error", message: e instanceof Error ? e.message : String(e) },
        }),
      );
  });

  return {
    on(method, handler) {
      handlers.set(method, handler);
    },
    dispose() {
      disposed = true;
      unsub();
      handlers.clear();
    },
  };
}
