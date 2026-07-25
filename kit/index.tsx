/**
 * Shared helpers for the agent-card family — chips, the theme `useColors`, the
 * monospace stack, and the line-encoded body parsers. Each card imports what it
 * needs; esbuild inlines this into the card's bundle.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHost } from "@mafold/cards";

// react-native-svg is a HOST-PROVIDED external. Older app builds (and the web
// runtime) may not supply it, so require it DEFENSIVELY: a hoisted `import` makes
// the host's "unavailable module" throw uncaught, which aborts the bundle eval —
// the card then never registers and is stuck on "Loading card…". Catching it lets
// the card still load and render everything except the icon; new builds that DO
// provide svg render icons normally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RNSVG: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNSVG = require("react-native-svg");
} catch {
  /* host without react-native-svg → icons degrade to nothing, card still loads */
}

// Icons are rendered manually from Lucide's path data rather than via
// `lucide-react-native`'s components. Under the New Architecture, lucide's own
// `<Svg>` construction (it spreads `xmlns`/`data-testid` and forwards every prop
// — incl. `style` — onto each child `<Path>`) fails to draw on react-native-svg
// (the paths paint blank). Rendering the primitives ourselves — `style` only on
// the <Svg>, children inherit stroke — paints correctly and drops the lucide
// runtime dep. Data is Lucide v0.469 (ISC); each node is `[tag, attrs]`.
type SvgNode = [string, Record<string, string>];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SVG_ELS: Record<string, any> = RNSVG ? {
  path: RNSVG.Path, circle: RNSVG.Circle, rect: RNSVG.Rect, line: RNSVG.Line, polyline: RNSVG.Polyline,
} : {};
const NODES: Record<string, SvgNode[]> = {
  terminal: [["polyline", { points: "4 17 10 11 4 5" }], ["line", { x1: "12", x2: "20", y1: "19", y2: "19" }]],
  file: [["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }], ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }], ["path", { d: "M10 9H8" }], ["path", { d: "M16 13H8" }], ["path", { d: "M16 17H8" }]],
  edit: [["path", { d: "M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5" }], ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }], ["path", { d: "M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" }]],
  search: [["circle", { cx: "11", cy: "11", r: "8" }], ["path", { d: "m21 21-4.3-4.3" }]],
  web: [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }], ["path", { d: "M2 12h20" }]],
  sparkles: [["path", { d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" }], ["path", { d: "M20 3v4" }], ["path", { d: "M22 5h-4" }], ["path", { d: "M4 17v2" }], ["path", { d: "M5 18H3" }]],
  wrench: [["path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }]],
  brain: [["path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }], ["path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }], ["path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }], ["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }], ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }], ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }], ["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }], ["path", { d: "M6 18a4 4 0 0 1-1.967-.516" }], ["path", { d: "M19.967 17.484A4 4 0 0 1 18 18" }]],
  chart: [["path", { d: "M3 3v18h18" }], ["path", { d: "M18 17V9" }], ["path", { d: "M13 17V5" }], ["path", { d: "M8 17v-3" }]],
  help: [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }], ["path", { d: "M12 17h.01" }]],
  checklist: [["path", { d: "m3 17 2 2 4-4" }], ["path", { d: "m3 7 2 2 4-4" }], ["path", { d: "M13 6h8" }], ["path", { d: "M13 12h8" }], ["path", { d: "M13 18h8" }]],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  clipboard: [["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }], ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }], ["path", { d: "M12 11h4" }], ["path", { d: "M12 16h4" }], ["path", { d: "M8 11h.01" }], ["path", { d: "M8 16h.01" }]],
  archive: [["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }], ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }], ["path", { d: "M10 12h4" }]],
  list: [["path", { d: "M3 12h.01" }], ["path", { d: "M3 18h.01" }], ["path", { d: "M3 6h.01" }], ["path", { d: "M8 12h13" }], ["path", { d: "M8 18h13" }], ["path", { d: "M8 6h13" }]],
  trend: [["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17" }], ["polyline", { points: "16 7 22 7 22 13" }]],
  target: [["circle", { cx: "12", cy: "12", r: "10" }], ["circle", { cx: "12", cy: "12", r: "6" }], ["circle", { cx: "12", cy: "12", r: "2" }]],
  tag: [["path", { d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" }], ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }]],
  wallet: [["path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }], ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }]],
};

/** A themed vector icon. `name` is a key into `NODES` (see `toolIcon`). */
export function Icon({ name, size = 14, color, strokeWidth = 2 }:
  { name: string; size?: number; color?: string; strokeWidth?: number }) {
  // Host without react-native-svg (older app build / web w/o svg): render no
  // icon, so the rest of the card still shows instead of failing to load.
  if (!RNSVG) return null;
  const Svg = RNSVG.Svg;
  const node = NODES[name] ?? NODES.wrench;
  const col = color ?? "#888";
  // Decorative only — `pointerEvents="none"` keeps the SVG out of the touch
  // hit-test path (react-native-svg's new-arch hit-testing logs "RNSVGUse should
  // be a descendant of a SvgViewShadow" otherwise). `style` width/height go on
  // the <Svg> ONLY (Yoga needs it to size the box; on a child <Path> it breaks
  // drawing). `color` resolves `fill="currentColor"` (e.g. the tag dot).
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Svg
        width={size} height={size} viewBox="0 0 24 24" color={col}
        fill="none" stroke={col} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: size, height: size }}
      >
        {node.map(([tag, attrs], i) => {
          const El = SVG_ELS[tag];
          return El ? <El key={i} {...attrs} /> : null;
        })}
      </Svg>
    </View>
  );
}

/** A tiny inline line chart. Stretches to its container width; degrades to
 *  nothing on a host without react-native-svg (same graceful path as `Icon`). */
export function Sparkline({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) {
  if (!RNSVG || data.length < 2) return null;
  const Svg = RNSVG.Svg;
  const Polyline = RNSVG.Polyline;
  const w = 100;
  const max = data.reduce((m, n) => (n > m ? n : m), 1);
  const step = w / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`)
    .join(" ");
  return (
    <View pointerEvents="none" style={{ width: "100%", height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** GitHub-style activity heatmap — plain Views, no svg dependency. `data` =
 *  daily counts oldest→newest (last entry = today); `offset` = blank cells
 *  before the first day in the first week column (weekday alignment — the
 *  emitter computes it, the card just lays out column-major 7-row weeks).
 *  Oldest weeks that don't fit the island width are trimmed. */
export function Heatmap({ data, offset = 0, color }: { data: number[]; offset?: number; color: string }) {
  const c = useColors();
  const { maxWidth } = useHost();
  const cell = 9;
  const gap = 3;
  const rows = 7;
  // Untrusted input: cap the series so a huge body can't mount thousands of cells.
  const series = data.slice(-420);
  const off = Math.min(Math.max(0, Math.floor(offset)), rows - 1);
  const avail = typeof maxWidth === "number" && maxWidth > 0 ? maxWidth : 300;
  const maxWeeks = Math.max(4, Math.floor((avail + gap) / (cell + gap)));
  // Column-major cells: -1 = leading alignment blank (invisible).
  let cells: number[] = [...Array<number>(off).fill(-1), ...series];
  let weeks = Math.ceil(cells.length / rows);
  if (weeks > maxWeeks) {
    cells = cells.slice((weeks - maxWeeks) * rows);
    weeks = maxWeeks;
  }
  const max = series.reduce((m, n) => (n > m ? n : m), 1);
  const OPACITY = [0.45, 0.3, 0.55, 0.78, 1];
  return (
    <View pointerEvents="none" style={{ flexDirection: "row", gap }}>
      {Array.from({ length: weeks }, (_, w) => (
        <View key={w} style={{ gap }}>
          {Array.from({ length: rows }, (_, r) => {
            const v = cells[w * rows + r];
            // Trailing cells past today / leading alignment blanks: keep the box
            // (rows stay aligned) but paint nothing.
            const blank = v === undefined || v < 0;
            const lv = blank ? 0 : v === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((v / max) * 4)));
            return (
              <View
                key={r}
                style={{
                  width: cell, height: cell, borderRadius: 2,
                  backgroundColor: blank ? "transparent" : lv === 0 ? c.border : color,
                  opacity: blank ? 0 : OPACITY[lv],
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const str = (v: unknown): string => (v == null ? "" : String(v));
export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function useColors() {
  const { theme } = useHost();
  const t = theme.tokens;
  return {
    text: t.text || "#1a1a1a",
    muted: t.muted || "#6b7280",
    subtle: t.subtle || t.muted || "#9aa0a6",
    border: t.border || "rgba(127,127,127,0.22)",
    card: t.float || t.card || "rgba(127,127,127,0.06)",
    accent: t.accent || "#2f6b5e",
    success: t.success || "#2ea06b",
    error: t.error || "#d24b4b",
    onAccent: t.onAccent || "#ffffff",
  };
}
export type Colors = ReturnType<typeof useColors>;

/** A small content-width chip: emoji icon + label + muted detail. */
export function Chip({
  icon, label, detail, accentLabel, mono,
}: { icon: string; label: string; detail?: string; accentLabel?: boolean; mono?: boolean }) {
  const c = useColors();
  const host = useHost();
  // Cap at the island's real available width (a number), NOT "100%". A percentage
  // resolves against the hugging (auto-width) wrapper and collapses, so the detail
  // (flexShrink) truncates far too early. With the concrete width the chip grows
  // to fill the bubble and only truncates at the actual edge.
  const { maxWidth } = host;
  return (
    // Keyed on the content: a content change REMOUNTS the root so onLayout is
    // guaranteed to re-fire (RN only fires it when the layout CHANGES — a grown
    // label re-measured inside the released container must re-report even when
    // the final width happens to match). Pairs with the native width-latch
    // release on content change (iOS CardHostView.updateProps / RNIsland).
    <View
      key={`${icon}|${label}|${detail ?? ""}`}
      collapsable={false}
      onLayout={(e) => host.reportWidth?.(e.nativeEvent.layout.width)}
      style={[styles.chip, { borderColor: c.border, backgroundColor: c.card, maxWidth }]}
    >
      <Icon name={icon} size={14} color={accentLabel ? c.accent : c.text} />
      {/* flexShrink: 0 — the tool name must NEVER shrink. RN defaults flexShrink to
          0 so iOS shows it in full; react-native-web defaults to the CSS value (1),
          so on web the label was the thing that shrank + truncated ("Bash" → "B…")
          instead of the detail. Pin it to 0 so BOTH platforms truncate the detail. */}
      <Text style={{ fontWeight: "600", color: accentLabel ? c.accent : c.text, fontSize: 13, flexShrink: 0 }} numberOfLines={1}>
        {label}
      </Text>
      {detail ? (
        <Text style={{ color: c.muted, fontSize: 12, flexShrink: 1, fontFamily: mono ? MONO : undefined }} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/** Tool name → `Icon` name (key into ICONS). */
export function toolIcon(name: string): string {
  switch (name.toLowerCase()) {
    case "bash": return "terminal";
    case "read": case "notebookedit": return "file";
    case "edit": case "write": case "multiedit": return "edit";
    case "glob": case "grep": case "search": return "search";
    case "webfetch": case "websearch": return "web";
    case "task": case "agent": return "sparkles";
    default: return "wrench";
  }
}

export type TodoItem = { status: "completed" | "in_progress" | "pending"; text: string };
export function parseTodoLine(line: string): TodoItem | null {
  const m = /^\s*\[(.)\]\s?(.*)$/.exec(line);
  if (!m) return null;
  const status = m[1] === "x" || m[1] === "X" ? "completed" : m[1] === "~" ? "in_progress" : "pending";
  return { status, text: m[2] };
}

export type AskQ = { header: string; multi: boolean; question: string; options: { label: string; description: string }[] };
export function parseAsk(body: string): AskQ[] {
  const out: AskQ[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("q|")) {
      const p = line.split("|");
      out.push({ header: p[1] ?? "", multi: p[2] === "1", question: p.slice(3).join("|"), options: [] });
    } else if (line.startsWith("o|") && out.length) {
      const p = line.split("|");
      out[out.length - 1].options.push({ label: p[1] ?? "", description: p.slice(2).join("|") });
    }
  }
  return out.filter((q) => q.options.length > 0);
}

export const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignSelf: "flex-start" },
  result: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignSelf: "flex-start" },
  block: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 5 },
  // Collapsible (bash output / thinking): reads as a compact chip when closed
  // (matches the tool chip), only growing padding to host the body when open.
  collapsible: { paddingTop: 6, paddingHorizontal: 11, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignSelf: "flex-start" },
  diff: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", paddingBottom: 4 },
  diffHead: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});
