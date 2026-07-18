import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% customize field="whitelist" value="*" hint="…" /%}` — one-tap bot-setting
 * card (the builder-grant pattern). The bot EMITS it when its owner asks to
 * change a setting; tapping Apply dispatches the opaque action
 * `customize|<field>|<value>` through the generic component-action pipe. The
 * SERVER enforces everything (tapper must own the sender bot; field safelist),
 * applies the config, edits this card to `approve=true`, and the daemon
 * hot-reloads. The card only proposes — it holds no authority.
 *
 * `approve=true` (the server's stamp) renders the ✓ applied state from the
 * card's own field/value. Without a `value` the card is informational only
 * (points the owner at 定制 on the bot's profile).
 */
function Customize({
  field = "",
  value = "",
  title = "",
  hint = "",
  approve = false,
}: {
  field?: string;
  value?: string;
  title?: string;
  hint?: string;
  approve?: boolean | string;
}) {
  const c = useColors();
  const { sendAction, maxWidth } = useHost();
  const applied = approve === true || approve === "true";
  const heading = title || (field ? `设置 ${field}` : "定制这个 Bot");

  return (
    <View
      style={{
        alignSelf: "stretch", maxWidth,
        borderRadius: 14, borderWidth: 0.5, borderColor: c.border,
        backgroundColor: c.card, padding: 14, gap: 10,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>⚙  {heading}</Text>
      {hint && !applied ? (
        <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.muted }}>{hint}</Text>
      ) : null}

      {applied ? (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.accent }}>
          ✓ 已应用{field ? `：${field}${value ? ` = ${value}` : ""}` : ""}
        </Text>
      ) : field && value ? (
        <Pressable
          onPress={() => sendAction(`customize|${field}|${value}`)}
          style={{ alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: c.accent, marginTop: 2 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.onAccent || "#fff" }}>
            应用 · {field} = {value}
          </Text>
        </Pressable>
      ) : (
        <Text style={{ fontSize: 13, color: c.muted }}>
          在 Bot 资料页 → 定制 里修改{field ? ` ${field}` : "设置"}。
        </Text>
      )}
    </View>
  );
}

export default defineCard({
  tag: "customize",
  attributes: {
    field: { type: "string" },
    value: { type: "string" },
    title: { type: "string" },
    hint: { type: "string" },
    approve: { type: "boolean" },
  },
  examples: [
    {
      name: "Apply",
      props: { field: "whitelist", value: "*", hint: "所有人都能驱动它（在你机器上跑代码）。" },
    },
    {
      name: "Applied",
      props: { field: "whitelist", value: "*", approve: true },
    },
  ],
  component: Customize as React.ComponentType,
});
