import React from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { str, useColors, Icon, toolIcon, MONO } from "../../kit";

/**
 * `{% run %}` — one collapsed card for a whole agent turn, instead of streaming
 * every tool/bash/diff/thinking as its own card (the old noisy waterfall). The
 * mafold-agent daemon buffers a turn's steps and emits ONE run card:
 *
 *   {% run status="done" took="12.3s" tokens="4.1k" %}
 *   tool|Read|agent.rs
 *   diff|agent.rs|+12 −3
 *   bash|Output|cargo build … Finished
 *   {% /run %}
 *
 * Body = one `kind|label|detail` line per step; attrs carry status + the done
 * summary. While the turn is still running the bot bubble shows the client's
 * own typing indicator, so `status="working"` is just a fallback here.
 *
 * Collapsed by default: `✓ took · tokens · ▸ N steps`. Tap to expand the trace.
 * Keeping each turn to one quiet card is what makes a multi-window / multi-chat
 * layout usable.
 */

type Step = { kind: string; label: string; detail: string };

function parseSteps(body?: string): Step[] {
  const out: Step[] = [];
  for (const line of (body || "").split("\n")) {
    if (!line.trim()) continue;
    const p = line.split("|");
    out.push({ kind: (p[0] || "tool").trim(), label: p[1] || "", detail: p.slice(2).join("|") });
  }
  return out;
}

function stepIcon(kind: string, label: string): string {
  switch (kind) {
    case "tool": return toolIcon(label);
    case "bash": return "terminal";
    case "diff": return "edit";
    case "todo": return "checklist";
    case "think": case "thinking": return "brain";
    case "task": case "skill": return "sparkles";
    case "web": return "web";
    default: return "wrench";
  }
}

/** A softly pulsing dot — the "still working" heartbeat. */
function Pulse({ color }: { color: string }) {
  const a = React.useRef(new Animated.Value(0.35)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(a, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: a }} />;
}

function Run({ status, took, tokens, body }: { status?: string; took?: string; tokens?: string; body?: string }) {
  const c = useColors();
  const { maxWidth } = useHost();
  const steps = React.useMemo(() => parseSteps(body), [body]);
  const [open, setOpen] = React.useState(false);

  const pill = {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 8,
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: 10,
    borderWidth: 0.5, borderColor: c.border, backgroundColor: c.card,
    alignSelf: "flex-start" as const, maxWidth,
  };

  // ── still running: a quiet heartbeat + the latest action ──────────────────
  if (str(status) !== "done") {
    const last = steps[steps.length - 1];
    return (
      <View style={pill}>
        <Pulse color={c.accent} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.muted }}>Working</Text>
        {last ? (
          <Text numberOfLines={1} style={{ fontSize: 12, color: c.subtle, flexShrink: 1 }}>
            {last.label}{last.detail ? ` · ${last.detail}` : ""}
          </Text>
        ) : null}
      </View>
    );
  }

  // ── done: collapsed summary, tap to expand the step trace ─────────────────
  const summary = [str(took), str(tokens) ? `${str(tokens)} tok` : ""].filter(Boolean).join(" · ") || "done";
  return (
    <View style={{ alignSelf: "flex-start", maxWidth }}>
      <Pressable onPress={() => steps.length > 0 && setOpen((o) => !o)} style={pill}>
        <Icon name="check" size={13} color={c.success} />
        <Text style={{ fontFamily: MONO, fontSize: 12, color: c.muted }}>{summary}</Text>
        {steps.length > 0 ? (
          <Text style={{ fontSize: 12, color: c.accent, fontWeight: "600" }}>
            {open ? "▾" : "▸"} {steps.length} step{steps.length === 1 ? "" : "s"}
          </Text>
        ) : null}
      </Pressable>

      {open ? (
        <View style={{ marginTop: 6, gap: 5, paddingLeft: 3 }}>
          {steps.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name={stepIcon(s.kind, s.label)} size={13} color={c.muted} />
              <Text style={{ fontSize: 13, fontWeight: "500", color: c.text }} numberOfLines={1}>{s.label || s.kind}</Text>
              {s.detail ? (
                <Text style={{ fontSize: 12, color: c.muted, flexShrink: 1, fontFamily: MONO }} numberOfLines={1}>{s.detail}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default defineCard({ tag: "run", component: Run as React.ComponentType });
