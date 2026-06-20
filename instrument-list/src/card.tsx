import React from "react";
import { View, Text } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell } from "../../shell";

/** Instrument list — RN port of InstrumentListCardView. props = { instruments: [...] }. */
function InstrumentList(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const arr = (Array.isArray(props.instruments) ? props.instruments : []) as Record<string, unknown>[];
  const items = arr.filter((d) => typeof d.displayName === "string");

  return (
    <CardShell icon="list" title="Instruments">
      {items.length === 0 ? (
        <Text style={{ color: t.subtle, fontSize: 13 }}>None</Text>
      ) : (
        <View style={{ gap: 4 }}>
          {items.slice(0, 6).map((d, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: t.text, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                {d.displayName as string}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: t.muted, fontSize: 11 }}>{(d.assetClass as string) ?? ""}</Text>
            </View>
          ))}
        </View>
      )}
    </CardShell>
  );
}

export default defineCard({ tag: "instrument-list", component: InstrumentList });
