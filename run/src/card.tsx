import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { str, useColors } from "../../kit";

/**
 * `{% run summary="Ran 2 shell commands" %} …nested primitive cards… {% /run %}`
 *
 * One collapsible group for a CONSECUTIVE run of tool calls — the daemon groups
 * back-to-back tools (between narration) into a single card, labelled in plain
 * language ("Read 1 file, ran 1 shell command"). The host renders the nested
 * primitives as `children`; collapsed by default, tap to expand the real
 * tool/output cards. Narration text separates groups, so the reply reads as a
 * transcript: …text… [run group] …text… [run group].
 */
function Run({ summary, children }: { summary?: string; children?: React.ReactNode }) {
  const c = useColors();
  const { maxWidth } = useHost();
  const [open, setOpen] = React.useState(false);
  const steps = React.Children.toArray(children).length;
  const label = str(summary) || (steps > 0 ? `${steps} step${steps === 1 ? "" : "s"}` : "Details");

  return (
    <View style={{ alignSelf: "stretch", maxWidth, gap: 8 }}>
      <Pressable
        onPress={() => steps > 0 && setOpen((o) => !o)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
          borderWidth: 0.5, borderColor: c.border, backgroundColor: c.card,
        }}
      >
        <Text style={{ color: c.subtle, fontSize: 12, width: 10 }}>{open ? "▾" : "▸"}</Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text, flex: 1 }} numberOfLines={1}>{label}</Text>
      </Pressable>
      {open && steps > 0 ? <View style={{ gap: 8, paddingLeft: 4 }}>{children}</View> : null}
    </View>
  );
}

export default defineCard({ tag: "run", component: Run as React.ComponentType });
