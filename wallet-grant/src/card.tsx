import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% wallet-grant spender="claude" user="alice" state="pending" /%}` — a
 * wallet-metered bot (e.g. @claude) posts this as its reply when the user has
 * no standing debit authorization yet. Taps dispatch through the generic
 * component-action pipe:
 *   授权 → `wgrant|approve|<spender>` — the SERVER creates the grant for the
 *          TAPPER (server-side identity; the card only proposes). Uncapped by
 *          default; a monthly cap is editable in the wallet panel any time.
 *   拒绝 → `wgrant|deny|<spender>` — nothing is created.
 * `state` (the server's stamp) renders the settled, non-tappable card:
 * pending → granted / denied. Mirrors the builder-grant / gate cards.
 */
function WalletGrant({
  spender = "",
  user = "",
  state = "pending",
}: {
  spender?: string;
  user?: string;
  state?: string;
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
      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>👛  钱包扣款授权</Text>

      {state === "granted" ? (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.accent }}>
          ✓ 已授权 @{spender} 按用量扣款 —— 可随时在钱包面板撤销或设每月上限
        </Text>
      ) : state === "denied" ? (
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.muted }}>已拒绝</Text>
      ) : (
        <>
          <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.muted }}>
            @{spender} 按真实用量从你的 token 钱包扣费（官方价加权）。
            Mafold 没有特权账户 —— 不授权就一个 token 都扣不走；授权后也可随时撤销、可设每月上限。
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
            <Pressable
              onPress={() => sendAction(`wgrant|approve|${spender}`)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: c.accent }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.onAccent || "#fff" }}>授权</Text>
            </Pressable>
            <Pressable
              onPress={() => sendAction(`wgrant|deny|${spender}`)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: c.border }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.muted }}>拒绝</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 11.5, color: c.subtle }}>点击者即授权人 —— 服务端只认真实身份。</Text>
        </>
      )}
    </View>
  );
}

export default defineCard({
  tag: "wallet-grant",
  attributes: {
    spender: { type: "string" },
    user: { type: "string" },
    state: { type: "string" },
  },
  examples: [
    { name: "Pending", props: { spender: "claude", user: "alice" } },
    { name: "Granted", props: { spender: "claude", user: "alice", state: "granted" } },
    { name: "Denied", props: { spender: "claude", user: "alice", state: "denied" } },
  ],
  component: WalletGrant as React.ComponentType,
});
