import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { defineCard, useHost } from "@mafold/cards";

/**
 * `{% chatrecord %}` — the merge-forward "聊天记录" chip. ATTACHMENT-DRIVEN:
 * the host bubble maps `Attachment::ChatRecord` onto this tag (the
 * attachment→card bridge) and passes the frozen snapshot as real props — the
 * tag is never parsed out of typed text, so there is no spoofing surface.
 * Tap → `host.openCard("chatrecord-view", …)`: the host presents the
 * transcript card in its own modal chrome (older hosts without `openCard`
 * simply ignore the tap).
 */

type Entry = {
  sender_name?: string;
  sender_username?: string;
  content?: string;
  attachments?: { kind?: string; filename?: string }[];
};

/** Mirror of the host bubbles' one-line preview for a frozen entry. */
function previewOf(e: Entry): string {
  const body = (e.content || "").trim();
  if (body) return body;
  const a = e.attachments?.[0];
  if (!a) return "";
  if (a.kind === "photo") return "[图片]";
  if (a.kind === "video") return "[视频]";
  if (a.kind === "file") return "📎 " + (a.filename || "");
  if (a.kind === "chat_record") return "[聊天记录]";
  return "[附件]";
}

const BLUE = "#5A78E6";

function ChatRecordChip(props: Record<string, unknown>) {
  const host = useHost();
  const t = host.theme.tokens;
  const title = (props.title as string) || "聊天记录";
  const entries = (Array.isArray(props.entries) ? props.entries : []) as Entry[];
  const open = () => {
    const h = host as unknown as {
      openCard?: (tag: string, props?: Record<string, unknown>, opts?: { title?: string }) => void;
    };
    h.openCard?.("chatrecord-view", { title, entries }, { title });
  };
  return (
    <Pressable onPress={open} style={[styles.wrap, { backgroundColor: t.card }]}>
      <View style={styles.titleRow}>
        {/* mini two-bubble glyph on the brand-blue tile */}
        <View style={[styles.glyph, { backgroundColor: BLUE }]}>
          <View style={styles.g1} />
          <View style={styles.g2} />
        </View>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.lines}>
        {entries.slice(0, 3).map((e, i) => (
          <Text key={i} style={[styles.line, { color: t.muted }]} numberOfLines={1}>
            {(e.sender_name || e.sender_username || "?") + ": " + previewOf(e)}
          </Text>
        ))}
      </View>
      <View style={[styles.foot, { borderTopColor: t.border }]}>
        <Text style={[styles.footText, { color: t.subtle || t.muted }]}>
          聊天记录 · {entries.length} 条
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, padding: 10, maxWidth: 300, alignSelf: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  glyph: { width: 16, height: 16, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  g1: { position: "absolute", left: 3, top: 4, width: 7, height: 5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.95)" },
  g2: { position: "absolute", right: 3, bottom: 3, width: 7, height: 5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.6)" },
  title: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  lines: { marginTop: 4 },
  line: { fontSize: 12, lineHeight: 17 },
  foot: { marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  footText: { fontSize: 11 },
});

export default defineCard({
  tag: "chatrecord",
  examples: [
    {
      name: "Chip",
      props: {
        title: "和 Eons 的聊天记录",
        entries: [
          { sender_name: "ops", content: "这个思路可行" },
          { sender_name: "Eons", content: "我来写个 demo" },
          { sender_name: "ops", content: "", attachments: [{ kind: "photo" }] },
        ],
      },
    },
  ],
  component: ChatRecordChip,
});
