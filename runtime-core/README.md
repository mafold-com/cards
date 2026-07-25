# @mafold/runtime-core

The **shared remote-ui core** of the Mafold unified runtime (see
`docs/unified-runtime-v0.md`). ONE runtime, two profiles — `@mafold/card`
(render-only) and `@mafold/app` (interactive) — both ride this core.

## The compute / render split (Roblox-style)

Untrusted guest code runs in an **isolated realm** and only ever *emits a
whitelisted view tree* as serializable mutations. A **trusted host** renders
**real native UI** from those mutations.

```
  guest realm (untrusted)                  host (trusted)
 ─────────────────────────                ───────────────────────────────
  React tree                               applies §2 mutations →
   │  mountRemote(<App/>, transport)        real native views
   ▼                                          web: react-native-web
  reconciler ──MutationBatch──► transport ──► iOS: native RN (Fabric)
   ▲                                          (NEVER react-native-web on iOS)
   │  invoke(method,params) ─────────────► HostDispatcher → capability
   └──────── event / result / host ◄──────  (storage/chat/room/ui/picker)
```

The "remote" in remote-ui is **another realm, not a server** — messages are
in-process memory passing over a `postMessage` / WKWebView / Worker boundary.

## What's here

| file | § | content |
|---|---|---|
| `protocol.ts` | §2 / §7 / §1.1 | wire envelopes (`MutationBatch` / `InvokeMessage` / `EventMessage` / `ResultMessage` / `HostMessage`), `DrawList`, `parseAppId` |
| `vocabulary.ts` | §3 / §5 | whitelisted component tags, `StyleObject` + `filterStyle` guard, event-prop map, `CapabilityId`s |
| `manifest.ts` | §1.2 | `AppManifest` (`id = "owner/slug"`), `parseManifest` / `parseManifests` |
| `transport.ts` | §6 | `GuestTransport` / `HostTransport` seam + an in-memory pair (trusted fallback / tests) |
| `invoke.ts` | §5 | `createGuestBridge` (async `invoke` facade) + `createHostDispatcher` (capability-gated router) |
| `reconciler.ts` | §2 | `mountRemote` — the guest-side React renderer that targets the remote tree |

## How each host consumes it

- **web** (`mafold-web/.../apps`): import the protocol + `createHostDispatcher`;
  the guest runs in a sandboxed cross-origin `<iframe>` (app) or a SES
  Compartment in a Worker (card); the host applies mutations into a
  **react-native-web** tree. `makeAppHost` becomes the invoke dispatcher's
  handler table (`invoke("room.change") → roomPut`, `invoke("chat.send") →
  sendMessage`, …); the room CRDT (`room.ts`, automerge-wasm) is unchanged.
- **iOS** (`mafold-ios/.../RNCards`): the guest runs in an **offscreen
  WKWebView-as-sandbox** (JS only, never renders); the host applies mutations
  into **native RN (Fabric)** views. Trusted first-party / owner code may skip
  the WKWebView and run in the main Hermes realm, but still emits the same
  mutation stream. `MafoldApps.swift`'s room/storage/messages become invoke
  handlers; the CRDT (`mafold-core Room`) is unchanged.

## externals

The guest reconciler is built on **`react-reconciler`**, which — like
`react` / `react-native` / `@mafold/cards` — is an **external injected by the
host bundle**, not bundled into the guest. `react-reconciler.d.ts` is a minimal
ambient shim so this package typechecks under the cards repo's lean toolchain;
it is superseded by the real types once the host installs the package.

The `cli` (`mafold-cli/src/cards.rs`) must add `@mafold/app`,
`@mafold/runtime-core`, and `react-reconciler` to its esbuild externals set for
`mafold apps {init|dev|publish}`.
