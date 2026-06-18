import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHost } from "@mafold/cards";

/**
 * Shared card chrome — header (emoji icon + title) over content, on a bordered
 * surface. RN port of the SwiftUI `CardShell` (SF Symbols → emoji so there's no
 * icon-font dependency). Reads theme tokens from the host so it matches the app
 * on iOS and the web client identically.
 */
export function CardShell({
  icon,
  title,
  children,
  maxWidth = 300,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
  maxWidth?: number;
}) {
  const { theme } = useHost();
  const t = theme.tokens;
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border, maxWidth }]}>
      <View style={styles.header}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  icon: { fontSize: 13 },
  title: { fontSize: 14, fontWeight: "600" },
});

export const fmtNum = (v: number): string =>
  Math.abs(v) > 0 && Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2);

/** label ←→ value row used by the data-dense cards. */
export function KVRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useHost();
  const t = theme.tokens;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: t.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: color ?? t.text, fontSize: 12, fontFamily: "Menlo" }}>{value}</Text>
    </View>
  );
}
