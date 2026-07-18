import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { defineCard, useHost } from "@mafold/cards";

/**
 * `{% bgtasks n=2 /%}` — end-of-turn notice that N background shells started
 * this turn are (or may still be) running after the reply finished. Emitted by
 * the daemon at Done when the turn launched `run_in_background` Bash tasks:
 * their completion has no live lifecycle signal in headless claude, so the
 * results surface in the NEXT reply (the session-queue notification the
 * daemon's empty-turn retry drains). This card makes that invisible tail
 * visible — the 2026-07-18 "silent watcher" incident class.
 */
function BgTasks(props: Record<string, unknown>) {
  const host = useHost();
  const t = host.theme.tokens;
  const n = typeof props.n === "number" ? props.n : 1;
  return (
    <View style={[styles.wrap, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={styles.glyph}>⏳</Text>
      <Text style={[styles.text, { color: t.muted }]}>
        {n} 个后台任务仍在运行 — 结果会出现在下一条回复里
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: { fontSize: 13 },
  text: { fontSize: 12.5, lineHeight: 17, flexShrink: 1 },
});

export default defineCard({
  tag: "bgtasks",
  attributes: { n: { type: "number" } },
  examples: [
    { name: "One task", props: { n: 1 } },
    { name: "Several", props: { n: 3 } },
  ],
  component: BgTasks,
});
