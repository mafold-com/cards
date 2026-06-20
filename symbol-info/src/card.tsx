import React from "react";
import { Text } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell } from "../../shell";

/** Symbol info — RN port of SymbolInfoCardView. props = { ticker, name, exchange, market }. */
function SymbolInfo(props: Record<string, unknown>) {
  const { theme } = useHost();
  const ticker = (props.ticker as string) || "—";
  const market = props.market as string | undefined;
  const exchange = props.exchange as string | undefined;
  const name = ((props.name as string) || (props.shortName as string)) as string | undefined;
  const sub = market && exchange ? `${market} · ${exchange}` : name;

  return (
    <CardShell icon="tag" title={ticker}>
      {sub ? <Text style={{ color: theme.tokens.muted, fontSize: 13 }}>{sub}</Text> : null}
    </CardShell>
  );
}

export default defineCard({ tag: "symbol-info", component: SymbolInfo });
