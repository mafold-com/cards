/**
 * Minimal ambient shim for `react-reconciler` so this package typechecks under the
 * cards repo's lean toolchain. `react-reconciler` is an EXTERNAL injected by each
 * host bundle (exactly like `react` / `react-native` / `@mafold/cards` are
 * externals here) — it is NOT bundled into the guest. The shim describes only the
 * surface the remote-ui renderer uses (the host-config + the returned Reconciler).
 *
 * The real types ship with `react-reconciler`; this shim is replaced by them when
 * the host installs the package. Kept intentionally permissive (the host config is
 * a large, version-sensitive interface) — correctness of the host config itself is
 * the renderer's responsibility, not this shim's.
 */
declare module "react-reconciler" {
  import type { ReactNode } from "react";

  export interface OpaqueRoot {
    [k: string]: unknown;
  }

  export interface Reconciler<Container> {
    createContainer(
      containerInfo: Container,
      tag: number,
      hydrate: unknown,
      hydrationCallbacks: unknown,
      isStrictMode: boolean,
      concurrentUpdatesByDefaultOverride: null | boolean,
      identifierPrefix: string,
      onRecoverableError: (error: unknown) => void,
      transitionCallbacks: unknown,
    ): OpaqueRoot;
    updateContainer(
      element: ReactNode,
      container: OpaqueRoot,
      parentComponent: unknown,
      callback: (() => void) | null,
    ): unknown;
    injectIntoDevTools(devToolsConfig: unknown): void;
  }

  // The host config is huge and version-dependent; accept any well-formed object.
  export default function ReactReconciler<Container>(
    hostConfig: Record<string, unknown>,
  ): Reconciler<Container>;

  export const DefaultEventPriority: number;
}

declare module "react-reconciler/constants" {
  export const DefaultEventPriority: number;
  export const ConcurrentRoot: number;
  export const LegacyRoot: number;
}
