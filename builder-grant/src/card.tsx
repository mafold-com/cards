import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% builder-grant requester="…" user="…" scopes="a,b" days="7" state="pending" /%}`
 * — the delegation consent card (docs/builder-delegation-v0.md). A builder
 * account requests permission to create sites/apps ON BEHALF OF `user`; tapping
 * Approve dispatches `bgrant|approve|<requester>|<scopes>|<days>` (|-separated: usernames contain ":") (grantor is
 * ALWAYS the tapper server-side, so the action string can't grant for anyone
 * else). The server then edits this message to state="granted"/"denied" and the
 * card re-renders in place.
 */

const SCOPE_LABELS: Record<string, string> = {
  "site.deploy": "部署站点 (*.mafold.app)",
  "app.register": "注册 mini-app",
  "app.install": "装进会话",
};

function BuilderGrant({
  requester = "",
  user = "",
  scopes = "",
  days = "7",
  state = "pending",
  by = "",
}: {
  requester?: string;
  user?: string;
  scopes?: string;
  days?: string;
  state?: string;
  by?: string;
}) {
  const c = useColors();
  const { sendAction, maxWidth } = useHost();
  const scopeList = scopes.split(",").filter(Boolean);
  const pending = state === "pending";
  const granted = state === "granted";

  return (
    <View
      style={{
        alignSelf: "stretch", maxWidth,
        borderRadius: 14, borderWidth: 0.5, borderColor: c.border,
        backgroundColor: c.card, padding: 14, gap: 10,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
        🔐 构建授权请求
      </Text>
      <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.text }}>
        <Text style={{ fontWeight: "700" }}>@{requester}</Text> 请求为{" "}
        <Text style={{ fontWeight: "700" }}>@{user}</Text> 构建应用（有效期 {days} 天）：
      </Text>
      <View style={{ gap: 4 }}>
        {scopeList.map((s) => (
          <Text key={s} style={{ fontSize: 13, color: c.muted }}>
            •  {SCOPE_LABELS[s] ?? s}
          </Text>
        ))}
      </View>

      {pending ? (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          <Pressable
            onPress={() => sendAction(`bgrant|approve|${requester}|${scopes}|${days}`)}
            style={{
              flex: 1, alignItems: "center", paddingVertical: 10,
              borderRadius: 10, backgroundColor: c.accent,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>批准</Text>
          </Pressable>
          <Pressable
            onPress={() => sendAction(`bgrant|deny|${requester}|${scopes}|${days}`)}
            style={{
              flex: 1, alignItems: "center", paddingVertical: 10,
              borderRadius: 10, borderWidth: 0.5, borderColor: c.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.muted }}>拒绝</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: granted ? c.accent : c.muted }}>
          {granted ? `✅ 已授权${by ? `（@${by}）` : ""} · 可在 Apps → Manage 撤销` : "已拒绝"}
        </Text>
      )}
    </View>
  );
}

export default defineCard({
  tag: "builder-grant",
  attributes: {
    requester: { type: "string" },
    user: { type: "string" },
    scopes: { type: "string" },
    days: { type: "string" },
    state: { type: "string" },
    by: { type: "string" },
  },
  examples: [
    {
      name: "Pending",
      props: { requester: "mafold:app", user: "opsdu", scopes: "site.deploy,app.register,app.install", days: "7", state: "pending" },
    },
    {
      name: "Granted",
      props: { requester: "mafold:app", user: "opsdu", scopes: "site.deploy", days: "7", state: "granted", by: "opsdu" },
    },
  ],
  component: BuilderGrant as React.ComponentType,
});
