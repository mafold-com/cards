import React from "react";
import { Text } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell, fmtNum } from "../../shell";

/** Wallet balance — RN port of BalanceCardView. props = { CUR: {free,locked,total}, … }. */
function Balance(props: Record<string, unknown>) {
  const { theme } = useHost();
  const balances = Object.entries(props)
    .filter(([, v]) => v && typeof v === "object" && "total" in (v as object))
    .map(([currency, v]) => ({ currency, total: Number((v as { total: unknown }).total) || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <CardShell icon="wallet" title="Wallet Balance">
      <Text style={{ color: theme.tokens.muted, fontSize: 13 }} numberOfLines={2}>
        {balances.map((b) => `${b.currency}: ${fmtNum(b.total)}`).join(", ") || "—"}
      </Text>
    </CardShell>
  );
}

export default defineCard({
  tag: "balance",
  // props are keyed by currency: { USDT: { free, locked, total }, … }.
  examples: [
    {
      name: "Multi-currency",
      props: {
        USDT: { free: 8200, locked: 300, total: 8500 },
        ETH: { free: 3.1, locked: 0.4, total: 3.5 },
        BTC: { free: 0.42, locked: 0, total: 0.42 },
      },
    },
    { name: "Single asset", props: { USDT: { free: 1000, locked: 0, total: 1000 } } },
  ],
  component: Balance,
});
