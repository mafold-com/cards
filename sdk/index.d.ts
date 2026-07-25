/**
 * `@mafold/cards` — the CARD SDK contract (render-only profile). Cards import this;
 * the publish externalizes it; each client (web / iOS) injects the real runtime at
 * load. So a card never imports a client's files — only this package name.
 *
 * A card is the render-only profile of the ONE unified runtime
 * (docs/unified-runtime-v0.md §4): it shares the remote-ui core (`@mafold/runtime-core`)
 * with `@mafold/app`, but its host surface is the minimal `{theme, sendAction,
 * maxWidth}` — NO useApp / storage / messages / room / picker. `sendAction` is the
 * card's only outbound channel (host routes it to the carrying conversation/parent
 * app); under the hood it is `invoke("__sendAction", …)`.
 */
import type { ComponentType } from "react";
// re-export the shared core types so a card author has one import surface.
export type {
  AppManifest,
  AppKind,
  CapabilityId,
  StyleObject,
  ComponentTag,
  DrawList,
  JSONValue,
} from "@mafold/runtime-core";
export { parseAppId, isAppId } from "@mafold/runtime-core";

export type CardAttrType = "string" | "number" | "boolean";

export interface CardAttr {
  type: CardAttrType;
  required?: boolean;
  default?: string | number | boolean;
}

/**
 * One sample render of the card — shown on its detail page so people (and other
 * developers) can see the card in action with real data, and so they learn how
 * to call it. Pure display hint: it ships inside the bundle and never affects
 * publishing or the in-chat render.
 */
export interface CardExample {
  /** Short label shown above this example's preview (e.g. "Gain", "Loss"). */
  name: string;
  /** The props passed to the component for this example. Real JS values (unlike
   *  Markdoc attributes, which arrive as strings) — write numbers/booleans as-is. */
  props: Record<string, unknown>;
  /** Optional one-line note explaining what this example demonstrates. */
  description?: string;
}

export interface CardDef<P = Record<string, unknown>> {
  /** The Markdoc tag this card answers to (e.g. "quote", "diff"). */
  tag: string;
  /** Declared attributes (coercion now; validation/codegen later). */
  attributes?: Record<string, CardAttr>;
  component: ComponentType<P>;
  /** Sample renders for the detail page (preview gallery). Strongly recommended —
   *  a card with no examples previews blank, so others can't tell what it does. */
  examples?: CardExample[];
}

export function defineCard<P = Record<string, unknown>>(def: CardDef<P>): CardDef<P>;

export interface CardTheme {
  scheme: "light" | "dark";
  /** Resolved colors keyed by token name: bg/bubble/float/card/text/muted/
   *  subtle/border/accent/onAccent/error/success. */
  tokens: Record<string, string>;
}

/** The render-only host surface a card sees (§4.2). Tiny by design. */
export interface CardHostApi {
  theme: CardTheme;
  /** Card → app (e.g. an `ask` card posting its answer). Under remote-ui this is
   *  `invoke("__sendAction", {id, payload})`. */
  sendAction: (id: string, payload?: unknown) => void;
  /** Max width (px) the card may occupy — the bubble's inner content box. */
  maxWidth: number;
  /** Optional native hint: content-width chips report their hugged width so iOS can tuck timestamps inline. */
  reportWidth?: (width: number) => void;
}

export function useHost(): CardHostApi;

/** Props for {@link HtmlFrame}. */
export interface HtmlFrameProps {
  /** Raw HTML document or fragment to render. Scripts run, but the document is
   *  origin-isolated from the app (sandboxed iframe / WKWebView, no app DOM or
   *  cookie access). */
  html: string;
  /** Max content height (px) before the frame scrolls internally. Default 600. */
  maxHeight?: number;
}

/** A live, sandboxed HTML surface — the render primitive behind `{% html %}`.
 *  Implemented per client (web: sandboxed `<iframe srcdoc>`; iOS: WKWebView via
 *  react-native-webview) and injected into `@mafold/cards` at load. Sizes itself
 *  to its content's height via a JS→host bridge. JS executes but cannot reach the
 *  host page. */
export const HtmlFrame: ComponentType<HtmlFrameProps>;
