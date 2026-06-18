import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";

/**
 * Built-in sample card. Identical authoring to the web copy — proof the same RN
 * source renders on both platforms (react-native-web on web, real RN here).
 * Usage in a message: `{% quote symbol="AAPL" price="$214.30" change="+1.8%" /%}`
 */
function Quote({
  symbol = "—",
  price = "",
  change = "",
}: {
  symbol?: string;
  price?: string;
  change?: string;
}) {
  const { theme, sendAction } = useHost();
  const t = theme.tokens;
  const up = !change.trim().startsWith("-");

  return (
    <View style={[styles.card, { backgroundColor: t.float, borderColor: t.border }]}>
      <View style={styles.row}>
        <Text style={[styles.symbol, { color: t.text }]}>{symbol}</Text>
        {price ? <Text style={[styles.price, { color: t.text }]}>{price}</Text> : null}
      </View>
      {change ? (
        <Text style={[styles.change, { color: up ? t.success : t.error }]}>{change}</Text>
      ) : null}
      <Pressable
        style={[styles.btn, { backgroundColor: t.accent }]}
        onPress={() => sendAction("buy", { symbol })}
      >
        <Text style={[styles.btnText, { color: t.onAccent }]}>Buy {symbol}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 8, minWidth: 180 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  symbol: { fontSize: 18, fontWeight: "700" },
  price: { fontSize: 16, fontWeight: "600" },
  change: { fontSize: 13, fontWeight: "600" },
  btn: { paddingVertical: 9, borderRadius: 9999, alignItems: "center", marginTop: 2 },
  btnText: { fontSize: 14, fontWeight: "600" },
});

export default defineCard<{ symbol?: string; price?: string; change?: string }>({
  tag: "quote",
  attributes: {
    symbol: { type: "string", required: true },
    price: { type: "string" },
    change: { type: "string" },
  },
  component: Quote,
});
