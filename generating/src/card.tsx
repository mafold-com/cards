import React from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% generating %}` — the cross-platform "the bot is still generating" indicator
 * with a real Stop, replacing the iOS-only native `GeneratingCardView` (and web's
 * bare typing dots). The client renders it WHILE a reply streams (by tag, not from
 * message content); tapping Stop dispatches `sendAction("stop")`, which the host
 * wires to the existing stop flow (drop in-flight deltas + send `/stop`, which the
 * daemon turns into a real cancel of the running turn).
 */
function Dots({ color }: { color: string }) {
  const v0 = React.useRef(new Animated.Value(0.3)).current;
  const v1 = React.useRef(new Animated.Value(0.3)).current;
  const v2 = React.useRef(new Animated.Value(0.3)).current;
  const dots = [v0, v1, v2];
  React.useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 170),
          Animated.timing(v, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.3, duration: 360, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {dots.map((v, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: v }} />
      ))}
    </View>
  );
}

function Generating() {
  const c = useColors();
  const { sendAction, maxWidth, theme } = useHost();
  const stopBg = theme.tokens.bubble || "rgba(127,127,127,0.16)";
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        alignSelf: "stretch", maxWidth,
        paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12,
        borderWidth: 0.5, borderColor: c.border, backgroundColor: c.card,
      }}
    >
      <Dots color={c.accent} />
      <Text style={{ fontSize: 13, color: c.muted }}>Generating…</Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => sendAction("stop")}
        style={{
          flexDirection: "row", alignItems: "center", gap: 5,
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
          backgroundColor: stopBg,
        }}
      >
        <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c.text }} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>Stop</Text>
      </Pressable>
    </View>
  );
}

export default defineCard({ tag: "generating", component: Generating as React.ComponentType });
