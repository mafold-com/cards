import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell, fmtNum } from "../../shell";

/** KLine stats — RN port of KLineCardView. props = { symbol, period, data:[{open,high,low,close,…}] }. */
function KLine(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const symbol = (props.symbol as string) || "—";
  const period = (props.period as string) || "";
  const data = (Array.isArray(props.data) ? props.data : []) as Record<string, unknown>[];
  const closes = data.map((d) => Number(d.close)).filter((n) => !isNaN(n));
  const highs = data.map((d) => Number(d.high)).filter((n) => !isNaN(n));
  const lows = data.map((d) => Number(d.low)).filter((n) => !isNaN(n));
  const last = closes[closes.length - 1];
  const first = closes[0];
  const changePct = first && last ? ((last - first) / first) * 100 : 0;
  const up = changePct >= 0;

  return (
    <CardShell icon="trend" title={`${symbol}${period ? " · " + period : ""}`}>
      {last != null ? (
        <View style={{ gap: 4 }}>
          <View style={styles.row}>
            <Text style={[styles.last, { color: t.text }]}>{fmtNum(last)}</Text>
            <Text style={{ color: up ? t.success : t.error, fontSize: 13, fontWeight: "600" }}>
              {up ? "+" : ""}
              {changePct.toFixed(2)}%
            </Text>
          </View>
          {highs.length > 0 && lows.length > 0 ? (
            <Text style={{ color: t.muted, fontSize: 12, fontFamily: "Menlo" }}>
              H {fmtNum(Math.max(...highs))}  L {fmtNum(Math.min(...lows))}  ·  {data.length} bars
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={{ color: t.subtle, fontSize: 13 }}>No data</Text>
      )}
    </CardShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  last: { fontSize: 18, fontWeight: "700" },
});

export default defineCard({ tag: "kline", component: KLine });
