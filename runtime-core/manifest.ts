/**
 * `@mafold/runtime-core` — the AppManifest contract (§1.2). The server (apps_api.rs)
 * only enforces `id` ("owner/slug") + `version` (non-empty); every other field is
 * stored verbatim and returned by resolve/list, so the manifest is a CLIENT
 * contract the server is transparent to. Both `@mafold/app` and `@mafold/card`
 * (and the cli's `mafold.app.json`) describe an app/card with this shape.
 */
import type { CapabilityId } from "./vocabulary";
import { isCapabilityId } from "./vocabulary";
import { parseAppId } from "./protocol";

/** One runtime, two profiles (§4): "card" = render-only, "app" = interactive. */
export type AppKind = "app" | "card";
export type AppPanelSize = "compact" | "tall" | "full";

export interface AppPanel {
  size?: AppPanelSize;
  detents?: ("medium" | "large")[];
}

export interface AppManifest {
  /** GLOBAL id = "owner/slug" (reverse-DNS is DEAD). immutable. */
  id: string;
  /** semver of THIS id; the server picks latest by semver_key, a bump hot-updates. */
  version: string;
  name: string;
  /** lucide icon name (v0); the launcher renders it. */
  icon: string;
  /** defaults to "app"; "card" profile is §4. */
  kind?: AppKind;
  /** RN bundle entry (the single compiled .js resolve returns); reserved for a
   *  future multi-file layout. */
  entry?: string;
  /** panel shape (app profile); cards ignore it. */
  panel?: AppPanel;
  /** Requested capabilities; the host gates `invoke()` on these (§5). An undeclared
   *  capability's invoke rejects with `permission_denied`. */
  capabilities?: CapabilityId[];
  /** card profile only: the Markdoc tag it answers (kind === "card"). */
  tag?: string;
}

/**
 * Parse + normalize an untrusted manifest object (e.g. one returned verbatim by
 * `resolveApps`), or null if `id` is not a valid "owner/slug" or `version`/`name`
 * are missing. This is the client-side guard the doc's gaps note requires (the
 * server only enforces id + version).
 *
 * Back-compat: a one-version grace window accepts the OLD `permissions` field as a
 * fallback for `capabilities` (and silently drops ids that aren't current
 * `CapabilityId`s). Remove `permissions` support next minor.
 */
export function parseManifest(raw: unknown): AppManifest | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || parseAppId(m.id) === null) return null;
  if (typeof m.version !== "string" || m.version.length === 0) return null;
  if (typeof m.name !== "string" || m.name.length === 0) return null;

  // capabilities: prefer the new field; fall back to legacy `permissions`.
  const rawCaps = Array.isArray(m.capabilities)
    ? m.capabilities
    : Array.isArray(m.permissions)
      ? m.permissions
      : [];
  const capabilities = rawCaps.filter(isCapabilityId);

  const kind: AppKind = m.kind === "card" ? "card" : "app";
  return {
    id: m.id,
    version: m.version,
    name: m.name,
    icon: typeof m.icon === "string" ? m.icon : "layout-grid",
    kind,
    entry: typeof m.entry === "string" ? m.entry : undefined,
    panel: (m.panel as AppPanel | undefined) ?? undefined,
    capabilities,
    tag: typeof m.tag === "string" ? m.tag : undefined,
  };
}

/**
 * Decode a list of manifests (e.g. a bot's `config["apps"]` JSON array, or a
 * `resolveApps`/`listApps` response). Invalid entries are dropped; an empty/invalid
 * input yields []. Mirrors the existing web/iOS `parseManifests`, now id-validated.
 */
export function parseManifests(input: string | unknown[] | null | undefined): AppManifest[] {
  if (!input) return [];
  let raw: unknown;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return [];
    }
  } else {
    raw = input;
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(parseManifest).filter((m): m is AppManifest => m !== null);
}
