import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell, fmtNum } from "../../shell";

interface Pos { symbol: string; side: string; qty: number; leverage: number; }

/** Open positions — RN port of PositionCardView. props = { positions: [...] }. */
function Positions(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const raw = (Array.isArray(props.positions) ? props.positions : []) as Record<string, unknown>[];
  const positions: Pos[] = raw
    .filter((d) => typeof d.symbol === "string")
    .map((d) => ({
      symbol: d.symbol as string,
      side: (d.side as string) ?? "long",
      qty: Number(d.qty) || 0,
      leverage: Number(d.leverage) || 1,
    }));
  const longs = positions.filter((p) => p.side === "long").length;
  const shorts = positions.length - longs;

  return (
    <CardShell icon="📈" title="Positions">
      {positions.length === 0 ? (
        <Text style={{ color: t.subtle, fontSize: 13 }}>No open positions</Text>
      ) : (
        <>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {positions.length} open: {longs} long, {shorts} short
          </Text>
          <View style={{ gap: 4 }}>
            {positions.slice(0, 5).map((p, i) => {
              const long = p.side === "long";
              return (
                <View key={i} style={styles.row}>
                  <Text style={[styles.tag, { color: long ? t.success : t.error }]}>{long ? "L" : "S"}</Text>
                  <Text style={[styles.mono, { color: t.text }]}>{p.symbol}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.mono, { color: t.accent }]}>{p.leverage}x</Text>
                  <Text style={[styles.mono, { color: t.muted }]}>{fmtNum(p.qty)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </CardShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  tag: { width: 16, fontSize: 10, fontWeight: "700", fontFamily: "Menlo" },
  mono: { fontSize: 12, fontFamily: "Menlo" },
});

export default defineCard({ tag: "position", component: Positions });
