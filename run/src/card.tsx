import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { str, useColors, Icon, MONO } from "../../kit";

/**
 * `{% run %}` — one collapsed card for a whole agent turn. The daemon buffers the
 * turn's ORIGINAL primitive cards and wraps them un-escaped:
 *
 *   {% run status="done" took="12.3s" tokens="4.1k" %}
 *   {% tool name="Read" detail="agent.rs" /%}
 *   {% diff file="render.rs" added=40 removed=2 %}…{% /diff %}
 *   {% bash %}…{% /bash %}
 *   {% /run %}
 *
 * The host renders the nested primitives into `children` (see CardHost's
 * renderBody), so they show as the real tool/diff/bash cards — not a lossy
 * summary. Collapsed by default (✓ took · tokens · ▸ N steps); tap to expand the
 * full trace. Keeping each turn to one quiet card is what makes a multi-window /
 * multi-chat layout usable. The streaming "Generating…/Stop" state is a separate
 * card (the daemon emits this one closed, at end of turn).
 */
function Run({ took, tokens, children }: { took?: string; tokens?: string; children?: React.ReactNode }) {
  const c = useColors();
  const { maxWidth } = useHost();
  const [open, setOpen] = React.useState(false);
  const steps = React.Children.toArray(children).length;
  const summary = [str(took), str(tokens) ? `${str(tokens)} tok` : ""].filter(Boolean).join(" · ") || "done";

  return (
    <View style={{ alignSelf: "stretch", maxWidth, gap: 8 }}>
      <Pressable
        onPress={() => steps > 0 && setOpen((o) => !o)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 8,
          paddingVertical: 5, paddingHorizontal: 11, borderRadius: 10,
          borderWidth: 0.5, borderColor: c.border, backgroundColor: c.card,
          alignSelf: "flex-start",
        }}
      >
        <Icon name="check" size={13} color={c.success} />
        <Text style={{ fontFamily: MONO, fontSize: 12, color: c.muted }}>{summary}</Text>
        {steps > 0 ? (
          <Text style={{ fontSize: 12, color: c.accent, fontWeight: "600" }}>
            {open ? "▾" : "▸"} {steps} step{steps === 1 ? "" : "s"}
          </Text>
        ) : null}
      </Pressable>

      {open && steps > 0 ? <View style={{ gap: 8 }}>{children}</View> : null}
    </View>
  );
}

export default defineCard({ tag: "run", component: Run as React.ComponentType });
