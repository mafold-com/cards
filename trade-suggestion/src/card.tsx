import React from "react";
import { View } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell, KVRow, fmtNum } from "../../shell";

/** Trade suggestion — RN port of TradeSuggestionCardView. */
function TradeSuggestion(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const instrument = (props.instrument as string) || (props.underlying as string) || "";
  const direction = ((props.direction as string) || "LONG").toUpperCase();
  const leverage = Number(props.leverage) || 1;
  const entry = Number(props.entry_price) || 0;
  const sl = Number(props.stop_loss) || 0;
  const tps = (Array.isArray(props.take_profit) ? props.take_profit : []) as Record<string, unknown>[];
  const market = (props.market_type as string) || "FUTURES";
  const confidence = props.confidence != null ? Number(props.confidence) : undefined;

  return (
    <CardShell icon="🎯" title={`${instrument} ${direction} ${leverage}x`}>
      <View style={{ gap: 3 }}>
        <KVRow label="Market" value={market} />
        <KVRow label="Entry" value={fmtNum(entry)} />
        <KVRow label="Stop" value={fmtNum(sl)} color={t.error} />
        {tps.map((tp, i) => (
          <KVRow
            key={i}
            label={`TP${i + 1}`}
            value={`${fmtNum(Number(tp.price) || 0)}  (${Number(tp.portion_pct) || 100}%)`}
            color={t.success}
          />
        ))}
        {confidence != null ? <KVRow label="Confidence" value={String(confidence)} /> : null}
      </View>
    </CardShell>
  );
}

export default defineCard({ tag: "trade-suggestion", component: TradeSuggestion });
