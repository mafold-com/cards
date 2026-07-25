import React from "react";
import { View } from "react-native";
import { defineCard, useHost, HostMessage } from "@mafold/cards";

/**
 * `{% chatrecord-view %}` — the merge-forward TRANSCRIPT, presented full-screen
 * by the host via `openCard` (the chip card triggers it). The card owns the
 * container (run grouping, spacing, nesting UX — hot-updatable); each frozen
 * message renders through `<HostMessage/>`, the SDK primitive the HOST
 * implements with its native MessageBubble — so rows are pixel-identical to
 * the live timeline and evolve with it. A nested chat_record inside an entry
 * renders (inside the host bubble) as another chip card → recursion for free.
 */

type Entry = { sender_username?: string; ts?: string };

/** Chronological order, whatever order the sender froze them in — stable for
 *  equal/missing timestamps (original index is the tiebreak). */
function chronological(entries: Entry[]): Entry[] {
  return entries
    .map((e, i) => ({ e, i, t: Date.parse(e.ts || "") }))
    .sort((a, b) => {
      const ta = Number.isNaN(a.t) ? 0 : a.t;
      const tb = Number.isNaN(b.t) ? 0 : b.t;
      return ta - tb || a.i - b.i;
    })
    .map((x) => x.e);
}

function Transcript(props: Record<string, unknown>) {
  const host = useHost();
  const entries = chronological((Array.isArray(props.entries) ? props.entries : []) as Entry[]);
  return (
    <View style={{ width: host.maxWidth }}>
      {entries.map((e, i) => {
        const runStart = i === 0 || entries[i - 1].sender_username !== e.sender_username;
        const runEnd = i === entries.length - 1 || entries[i + 1].sender_username !== e.sender_username;
        return (
          <View key={i} style={{ marginTop: i > 0 && runStart ? 8 : 0 }}>
            <HostMessage entry={e} runStart={runStart} runEnd={runEnd} />
          </View>
        );
      })}
    </View>
  );
}

export default defineCard({
  tag: "chatrecord-view",
  examples: [
    {
      name: "Transcript",
      props: {
        entries: [
          { sender_name: "ops", sender_username: "ops", ts: "2026-07-19T03:00:00Z", content: "这个思路可行" },
          { sender_name: "Eons", sender_username: "eons", ts: "2026-07-19T03:01:00Z", content: "我来写个 demo" },
        ],
      },
    },
  ],
  component: Transcript,
});
