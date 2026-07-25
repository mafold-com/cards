/**
 * `@mafold/runtime-core` — the component VOCABULARY (the platform design surface)
 * + the capability ids + the style-key whitelist. See docs/unified-runtime-v0.md
 * §3 / §5.
 *
 * The host renderer only honours these tags; an unknown tag falls back to `View`
 * + `console.warn`. Every prop on the wire is a JSON value — a function prop (an
 * `onPress` handler) is replaced by the mere PRESENCE of the prop (= "host, please
 * register a listener") and the host fires it back as an `event` message (§2.2).
 */

// ── §1.2 capability ids declared in a manifest ───────────────────────────────
/** The stable string id of a capability a manifest may request (§5). The host
 *  gates `invoke()` on these: a method whose capability is not declared rejects
 *  with `permission_denied`. `net` / continuous streams / raw handles are NOT in
 *  this open-tier set (trusted-only). */
export type CapabilityId =
  // free tier
  | "storage"
  | "chat.read"
  | "chat.send"
  | "room"
  // picker tier (user-initiated, host shows a NATIVE picker, returns a result)
  | "ui.scan"
  | "ui.pickPhoto"
  | "ui.pickContact"
  | "ui.getLocation"
  // host-chrome tier
  | "ui.button"
  | "ui.popup"
  | "ui.haptic"
  | "ui.setTitle"
  | "ui.resize";

/** The complete set, for runtime validation of a manifest's `capabilities`. */
export const CAPABILITY_IDS: readonly CapabilityId[] = [
  "storage",
  "chat.read",
  "chat.send",
  "room",
  "ui.scan",
  "ui.pickPhoto",
  "ui.pickContact",
  "ui.getLocation",
  "ui.button",
  "ui.popup",
  "ui.haptic",
  "ui.setTitle",
  "ui.resize",
];

const CAP_SET = new Set<string>(CAPABILITY_IDS);
export function isCapabilityId(x: unknown): x is CapabilityId {
  return typeof x === "string" && CAP_SET.has(x);
}

// ── §3.1 style: an RN-style subset; numbers = dp, colors = resolved strings ───
export interface StyleObject {
  // layout
  flex?: number;
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch";
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number;
  position?: "relative" | "absolute";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  // box
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderStyle?: "solid" | "dotted" | "dashed";
  borderTopWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  backgroundColor?: string;
  opacity?: number;
  overflow?: "visible" | "hidden";
  display?: "none" | "flex";
  // transform — array of single-op objects ([{translateX:n},{rotate:"45deg"}]).
  transform?: Array<Record<string, number | string>>;
  // text (only Text honours these; here for inheritance ergonomics)
  color?: string;
  fontSize?: number;
  fontWeight?: "400" | "500" | "600" | "700" | "800" | "bold" | "normal";
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  textAlign?: "auto" | "left" | "right" | "center";
  textAlignVertical?: "auto" | "top" | "bottom" | "center";
  lineHeight?: number;
  letterSpacing?: number;
  textDecorationLine?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textShadowColor?: string;
  textShadowRadius?: number;
  tintColor?: string;
  // shadow (normalized to cross-platform RN keys)
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * The exact set of allowed style keys. The host MUST filter an incoming `style`
 * prop down to this set, dropping anything else — this is the barrier that stops
 * a malicious guest from smuggling `transform` / a function / a prototype-injected
 * key through `style` into a real native view (§3.1). `transform`, `pointerEvents`
 * (a top-level prop, not a style), and arbitrary functions are deliberately ABSENT.
 */
export const STYLE_KEYS: ReadonlySet<string> = new Set<keyof StyleObject>([
  "flex", "flexDirection", "flexWrap", "alignItems", "justifyContent", "alignSelf",
  "gap", "rowGap", "columnGap",
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio",
  "position", "top", "right", "bottom", "left", "zIndex",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginHorizontal", "marginVertical",
  "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "paddingHorizontal", "paddingVertical",
  "borderWidth", "borderColor", "borderRadius", "borderStyle",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "backgroundColor", "opacity", "overflow", "display",
  "color", "fontSize", "fontWeight", "fontFamily", "fontStyle", "textAlign", "textAlignVertical",
  "lineHeight", "letterSpacing", "textDecorationLine", "textTransform",
  "textShadowColor", "textShadowRadius", "tintColor",
  "shadowColor", "shadowOpacity", "shadowRadius", "elevation",
  "transform",
] as (keyof StyleObject)[]);

/** Filter an untrusted style object to the whitelist (host-side guard, §3.1). */
export function filterStyle(style: unknown): StyleObject {
  const out: Record<string, unknown> = {};
  if (style && typeof style === "object" && !Array.isArray(style)) {
    for (const k of Object.keys(style as Record<string, unknown>)) {
      if (!STYLE_KEYS.has(k)) continue;
      const v = (style as Record<string, unknown>)[k];
      if (k === "transform") {
        const t = filterTransform(v);
        if (t) out.transform = t;
      } else if (typeof v === "string" || typeof v === "number") {
        // Defensive: never let a function/object that isn't a plain value through.
        out[k] = v;
      }
    }
  }
  return out as StyleObject;
}

/** `transform` is the one non-scalar style: an array of single-op objects. Keep
 *  only string/number op values so a function/object can't ride through it. */
function filterTransform(v: unknown): Array<Record<string, string | number>> | null {
  if (!Array.isArray(v)) return null;
  const out: Array<Record<string, string | number>> = [];
  for (const op of v) {
    if (!op || typeof op !== "object" || Array.isArray(op)) continue;
    const clean: Record<string, string | number> = {};
    for (const [k, val] of Object.entries(op as Record<string, unknown>)) {
      if (typeof val === "string" || typeof val === "number") clean[k] = val;
    }
    if (Object.keys(clean).length) out.push(clean);
  }
  return out.length ? out : null;
}

// ── §3.2 the whitelisted component tags ──────────────────────────────────────
/** The render-vocabulary tag names (the only tags a host will materialize). */
export type ComponentTag =
  | "View"
  | "Text"
  | "Image"
  | "ScrollView"
  | "Pressable"
  | "TextInput"
  | "Switch"
  | "ActivityIndicator"
  | "Canvas"
  // FlatList/SectionList are NOT here — they're JS compositions over ScrollView,
  // provided in the guest's injected `react-native` (so a dev writes standard RN).
  | "Modal"
  | "ImageBackground"
  | "KeyboardAvoidingView"
  | "Button"
  | "TouchableOpacity"
  | "TouchableHighlight";

export const COMPONENT_TAGS: readonly ComponentTag[] = [
  "View", "Text", "Image", "ScrollView", "Pressable", "TextInput",
  "Switch", "ActivityIndicator", "Canvas",
  "Modal", "ImageBackground", "KeyboardAvoidingView", "Button", "TouchableOpacity", "TouchableHighlight",
];

const TAG_SET = new Set<string>(COMPONENT_TAGS);
export function isComponentTag(x: unknown): x is ComponentTag {
  return typeof x === "string" && TAG_SET.has(x);
}

/**
 * Event prop name → wire `event.type` (§2.2): the host fires `event` messages with
 * these short types, and the guest reconciler maps a node's `onPress` etc. handler
 * to the matching type. Keyed per component so a host knows which native listeners
 * to attach. The payload schema for each is documented in §3.2 (e.g. `press` → {},
 * `changeText` → {text}, `layout` → {x,y,width,height}, `scroll` → {x,y}).
 */
export const EVENT_PROPS: Record<ComponentTag, Record<string, string>> = {
  View: { onLayout: "layout" },
  Text: { onPress: "press", onLongPress: "longPress" },
  Image: { onLoad: "load", onError: "error", onLoadStart: "loadStart", onLoadEnd: "loadEnd" },
  ScrollView: { onScroll: "scroll", onScrollBeginDrag: "scrollBeginDrag", onScrollEndDrag: "scrollEndDrag", onMomentumScrollBegin: "momentumScrollBegin", onMomentumScrollEnd: "momentumScrollEnd", onContentSizeChange: "contentSizeChange" },
  Pressable: { onPress: "press", onPressIn: "pressIn", onPressOut: "pressOut", onLongPress: "longPress" },
  TextInput: { onChangeText: "changeText", onSubmitEditing: "submitEditing", onFocus: "focus", onBlur: "blur", onEndEditing: "endEditing", onKeyPress: "keyPress" },
  Switch: { onValueChange: "valueChange" },
  ActivityIndicator: {},
  Canvas: { onPress: "press", onLayout: "layout" },
  Modal: { onRequestClose: "requestClose", onShow: "show", onDismiss: "dismiss" },
  ImageBackground: { onLoad: "load", onError: "error" },
  KeyboardAvoidingView: { onLayout: "layout" },
  Button: { onPress: "press" },
  TouchableOpacity: { onPress: "press", onPressIn: "pressIn", onPressOut: "pressOut", onLongPress: "longPress" },
  TouchableHighlight: { onPress: "press", onPressIn: "pressIn", onPressOut: "pressOut", onLongPress: "longPress" },
};

/** True iff `prop` on `tag` is an event handler (so the reconciler reflects it as
 *  presence + registers a callback rather than serializing the function). */
export function isEventProp(tag: ComponentTag, prop: string): boolean {
  return prop in (EVENT_PROPS[tag] ?? {});
}
