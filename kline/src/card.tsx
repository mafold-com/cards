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
  // reduce, NOT `Math.max(...arr)` — `data` is untrusted card input, and spreading
  // a huge array into a function call can overflow the stack (client-side DoS).
  const hi = highs.reduce((mx, n) => (n > mx ? n : mx), -Infinity);
  const lo = lows.reduce((mn, n) => (n < mn ? n : mn), Infinity);
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
              H {fmtNum(hi)}  L {fmtNum(lo)}  ·  {data.length} bars
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

export default defineCard({
  tag: "kline",
  examples: [
    {
      name: "Uptrend",
      description: "price up over the window",
      props: {
        symbol: "BTCUSDT",
        period: "1h",
        data: [
          { open: 64000, high: 64500, low: 63800, close: 64200 },
          { open: 64200, high: 65200, low: 64100, close: 65000 },
          { open: 65000, high: 66000, low: 64800, close: 65800 },
        ],
      },
    },
    {
      name: "Downtrend",
      props: {
        symbol: "ETHUSDT",
        period: "15m",
        data: [
          { open: 3500, high: 3520, low: 3450, close: 3480 },
          { open: 3480, high: 3490, low: 3400, close: 3420 },
          { open: 3420, high: 3430, low: 3350, close: 3360 },
        ],
      },
    },
  ],
  component: KLine,
});
