import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";

/** News headline — RN port of NewsCardView (accent bar + source + title). */
function News(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const title = (props.title as string) || (props.headline as string) || "";
  const source = (props.creator as string) || (props.source as string) || "";

  return (
    <View style={[styles.wrap, { backgroundColor: t.card, maxWidth: 300 }]}>
      <View style={[styles.bar, { backgroundColor: t.accent }]} />
      <View style={styles.body}>
        {source ? <Text style={[styles.source, { color: t.muted }]}>{source}</Text> : null}
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>{title || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderRadius: 8, overflow: "hidden" },
  bar: { width: 3 },
  body: { paddingHorizontal: 10, paddingVertical: 8, gap: 4, flexShrink: 1 },
  source: { fontSize: 12, fontFamily: "Menlo" },
  title: { fontSize: 14, fontWeight: "500" },
});

export default defineCard({ tag: "news", component: News });
