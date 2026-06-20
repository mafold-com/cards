import React from "react";
import { View, Text } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell, fmtNum } from "../../shell";

/** Orders — RN port of OrderCardView. props = { orders: [...] }. */
function Orders(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const arr = (Array.isArray(props.orders) ? props.orders : []) as Record<string, unknown>[];
  const orders = arr.filter((d) => typeof d.symbol === "string");

  return (
    <CardShell icon="clipboard" title="Orders">
      {orders.length === 0 ? (
        <Text style={{ color: t.subtle, fontSize: 13 }}>No orders</Text>
      ) : (
        <View style={{ gap: 4 }}>
          {orders.slice(0, 5).map((o, i) => {
            const buy = ((o.side as string) ?? "buy") === "buy";
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: buy ? t.success : t.error, fontSize: 11, fontWeight: "700", width: 32 }}>
                  {buy ? "BUY" : "SELL"}
                </Text>
                <Text style={{ color: t.text, fontSize: 12, fontFamily: "Menlo" }}>{o.symbol as string}</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: t.muted, fontSize: 12, fontFamily: "Menlo" }}>
                  {(o.type as string) ?? "market"} {fmtNum(Number(o.qty) || 0)}@{fmtNum(Number(o.price) || 0)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </CardShell>
  );
}

export default defineCard({ tag: "order", component: Orders });
