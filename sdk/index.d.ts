/**
 * `@mafold/cards` — the card SDK contract (types only). Cards import this; the
 * publish externalizes it; each client (web / iOS) injects the real runtime at
 * load. So a card never imports an app's files — only this package name.
 */
import type { ComponentType } from "react";

export type CardAttrType = "string" | "number" | "boolean";

export interface CardAttr {
  type: CardAttrType;
  required?: boolean;
  default?: string | number | boolean;
}

export interface CardDef<P = Record<string, unknown>> {
  /** The Markdoc tag this card answers to (e.g. "quote", "diff"). */
  tag: string;
  /** Declared attributes (coercion now; validation/codegen later). */
  attributes?: Record<string, CardAttr>;
  component: ComponentType<P>;
}

export function defineCard<P = Record<string, unknown>>(def: CardDef<P>): CardDef<P>;

export interface CardTheme {
  scheme: "light" | "dark";
  /** Resolved colors keyed by token name: bg/bubble/float/card/text/muted/
   *  subtle/border/accent/onAccent/error/success. */
  tokens: Record<string, string>;
}

export interface CardHostApi {
  theme: CardTheme;
  /** Card → app (e.g. an `ask` card posting its answer). */
  sendAction: (id: string, payload?: unknown) => void;
  /** Max width (px) the card may occupy — the bubble's inner content box. */
  maxWidth: number;
}

export function useHost(): CardHostApi;
