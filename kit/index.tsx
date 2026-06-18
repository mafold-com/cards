/**
 * Shared helpers for the agent-card family — chips, the theme `useColors`, the
 * monospace stack, and the line-encoded body parsers. Each card imports what it
 * needs; esbuild inlines this into the card's bundle.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHost } from "@mafold/cards";

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
  return (
    <View style={[styles.chip, { borderColor: c.border, backgroundColor: c.card }]}>
      <Text style={{ fontSize: 13 }}>{icon}</Text>
      <Text style={{ fontWeight: "600", color: accentLabel ? c.accent : c.text, fontSize: 13 }} numberOfLines={1}>
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

export function toolIcon(name: string): string {
  switch (name.toLowerCase()) {
    case "bash": return "❯";
    case "read": case "notebookedit": return "📄";
    case "edit": case "write": case "multiedit": return "✏️";
    case "glob": case "grep": case "search": return "🔍";
    case "webfetch": case "websearch": return "🌐";
    case "task": case "agent": return "✦";
    default: return "🔧";
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
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignSelf: "flex-start", maxWidth: "100%" },
  result: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignSelf: "flex-start" },
  block: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 5 },
  diff: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", paddingBottom: 4 },
  diffHead: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});
