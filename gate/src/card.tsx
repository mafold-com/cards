import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% gate user="alice" msg="<message-id>" done="" /%}` — the daemon EMITS this
 * when a NON-whitelisted user @-mentions the bot: instead of silently dropping
 * the message, the bot posts this as a reply to the requester, and the bot's
 * OWNER decides. Taps dispatch through the generic component-action pipe:
 *   放行 → `gate|allow|<user>|<msg>` — the SERVER (owner-checked) appends <user>
 *          to the bot's whitelist, then re-delivers the original <msg> so the
 *          bot answers it automatically; the card flips to done="allow".
 *   忽略 → `gate|ignore` — the card flips to done="ignore"; nothing else changes.
 * The card only proposes — the server enforces owner-only + does the work.
 * `done` (the server's stamp) renders the settled, non-tappable state.
 */
function Gate({
  user = "",
  msg = "",
  done = "",
}: {
  user?: string;
  msg?: string;
  done?: string;
}) {
  const c = useColors();
  const { sendAction, maxWidth } = useHost();

  return (
    <View
      style={{
        alignSelf: "stretch", maxWidth,
        borderRadius: 14, borderWidth: 0.5, borderColor: c.border,
        backgroundColor: c.card, padding: 14, gap: 10,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>🔔  @{user} 想找我</Text>

      {done === "allow" ? (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.accent }}>
          ✓ 已放行 @{user} —— ta 现在能自由找我了
        </Text>
      ) : done === "ignore" ? (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.muted }}>已忽略</Text>
      ) : (
        <>
          <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.muted }}>
            但 ta 不在我的白名单里。放行后 ta 能自由驱动我（在你机器上跑代码），
            并且我会自动回 ta 刚才那条消息。
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
            <Pressable
              onPress={() => sendAction(`gate|allow|${user}|${msg}`)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: c.accent }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.onAccent || "#fff" }}>放行</Text>
            </Pressable>
            <Pressable
              onPress={() => sendAction("gate|ignore")}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: c.border }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.muted }}>忽略</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 11.5, color: c.subtle }}>只有我的 owner 能操作。</Text>
        </>
      )}
    </View>
  );
}

export default defineCard({
  tag: "gate",
  attributes: {
    user: { type: "string" },
    msg: { type: "string" },
    done: { type: "string" },
  },
  examples: [
    { name: "Ask", props: { user: "alice", msg: "m-123" } },
    { name: "Allowed", props: { user: "alice", done: "allow" } },
    { name: "Ignored", props: { user: "alice", done: "ignore" } },
  ],
  component: Gate as React.ComponentType,
});
