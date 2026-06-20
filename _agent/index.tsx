/**
 * The agent-card family — one module, one `defineCard` export per tag. Each
 * `<tag>/src/card.tsx` re-exports its card as default; esbuild tree-shakes this
 * down to just that card (+ the kit helpers it uses) per bundle.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { str, num, MONO, useColors, Chip, Icon, toolIcon, parseTodoLine, parseAsk, styles, type TodoItem } from "../kit";

function Tool({ name, detail }: { name?: string; detail?: string }) {
  return <Chip icon={toolIcon(str(name))} label={str(name) || "tool"} detail={str(detail)} mono />;
}
function Task({ subagent, desc }: { subagent?: string; desc?: string }) {
  return <Chip icon="sparkles" label={`subagent · ${str(subagent) || "agent"}`} detail={str(desc)} />;
}
function Web({ query, url }: { query?: string; url?: string }) {
  return <Chip icon="web" label={query ? "web search" : "fetch"} detail={str(query) || str(url)} />;
}
function Skill({ name, args }: { name?: string; args?: string }) {
  return <Chip icon="sparkles" label={`/${str(name) || "skill"}`} detail={str(args)} accentLabel mono />;
}

function Result({ duration, tokens, cost }: { duration?: string; tokens?: string; cost?: string }) {
  const c = useColors();
  const bits = [str(duration), str(tokens) ? `${str(tokens)} tok` : "", str(cost)].filter(Boolean).join("  ·  ");
  return (
    <View style={[styles.result, { borderColor: c.border }]}>
      <Icon name="check" size={13} color={c.success} />
      <Text style={{ fontFamily: MONO, color: c.muted, fontSize: 12 }}>{bits || "done"}</Text>
    </View>
  );
}

function Todo({ body }: { body?: string }) {
  const c = useColors();
  const items = (body || "").split("\n").map(parseTodoLine).filter(Boolean) as TodoItem[];
  if (items.length === 0) return null;
  return (
    <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Icon name="checklist" size={13} color={c.muted} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: c.muted }}>Plan</Text>
      </View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Text style={{ color: it.status === "completed" ? c.success : it.status === "in_progress" ? c.accent : c.subtle, fontSize: 13, lineHeight: 18 }}>
            {it.status === "completed" ? "●" : it.status === "in_progress" ? "◐" : "○"}
          </Text>
          <Text style={{ flex: 1, fontSize: 13, color: it.status === "completed" ? c.muted : c.text, textDecorationLine: it.status === "completed" ? "line-through" : "none" }}>
            {it.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Diff({ file, added, removed, body }: { file?: string; added?: string; removed?: string; body?: string }) {
  const c = useColors();
  const lines = (body || "").split("\n").filter((l) => l.length > 0);
  const a = num(added), r = num(removed);
  return (
    <View style={[styles.diff, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={[styles.diffHead, { borderColor: lines.length ? c.border : "transparent" }]}>
        <Icon name="edit" size={14} color={c.muted} />
        <Text style={{ flex: 1, fontFamily: MONO, color: c.text, fontSize: 12 }} numberOfLines={1}>{str(file) || "file"}</Text>
        <Text style={{ fontFamily: MONO, fontSize: 12 }}>
          {a ? <Text style={{ color: c.success }}>+{a} </Text> : null}
          {r ? <Text style={{ color: c.error }}>−{r}</Text> : null}
        </Text>
      </View>
      {lines.map((l, i) => {
        const sign = l[0];
        const fg = sign === "+" ? c.success : sign === "-" ? c.error : c.muted;
        return <Text key={i} style={{ fontFamily: MONO, fontSize: 12, lineHeight: 17, color: fg, paddingHorizontal: 10 }}>{l}</Text>;
      })}
    </View>
  );
}

function Collapsible({ icon, summary, body, mono, muted }: { icon: string; summary: string; body?: string; mono?: boolean; muted?: boolean }) {
  const c = useColors();
  const { maxWidth } = useHost();
  const [open, setOpen] = React.useState(false);
  const text = (body || "").trim();
  if (!text) return null;
  return (
    // Concrete maxWidth (not "100%") so the expanded body fills the bubble — see Chip.
    <View style={[styles.collapsible, { borderColor: c.border, backgroundColor: c.card, paddingBottom: open ? 11 : 6, maxWidth }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Icon name={icon} size={14} color={c.muted} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }} numberOfLines={1}>{summary}</Text>
        <Text style={{ color: c.subtle, fontSize: 10 }}>{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open ? (
        <Text style={{ marginTop: 8, fontFamily: mono ? MONO : undefined, fontSize: mono ? 12 : 13, lineHeight: 17, color: muted ? c.muted : c.text }}>{text}</Text>
      ) : null}
    </View>
  );
}
function Bash({ body }: { body?: string }) { return <Collapsible icon="terminal" summary="Output" body={body} mono />; }
function Thinking({ body }: { body?: string }) { return <Collapsible icon="brain" summary="Thought process" body={body} muted />; }

function Stats({ body, ...props }: Record<string, unknown> & { body?: string }) {
  const c = useColors();
  // Fill the bubble's inner width — the tile grid (flexWrap + flexGrow) and the
  // per-model bars (flex:1) need a DEFINED width to flow into. Without it the
  // island hugs the card to its min content width and they collapse (tiles
  // stack 1-per-row, bars shrink to nothing).
  const { maxWidth } = useHost();
  const lines = (body || "").split("\n").filter(Boolean);
  const models = lines.filter((l) => l.startsWith("model|")).map((l) => l.split("|")).map((p) => ({ name: p[1] ?? "", display: p[2] ?? "", raw: Number(p[3] ?? 0) }));
  const maxRaw = Math.max(1, ...models.map((m) => m.raw));
  const tiles = ([
    ["Sessions", str(props.sessions)], ["Messages", str(props.messages)], ["Tool calls", str(props.tools)],
    ["Tokens", str(props.tokens)], ["Active days", str(props.days)], ["Busiest", str(props.hour)],
  ] as [string, string][]).filter(([, v]) => v && v !== "0");
  return (
    <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card, gap: 12, width: maxWidth }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="chart" size={14} color={c.text} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>Usage{props.since ? <Text style={{ color: c.muted, fontWeight: "400", fontSize: 11 }}>  · since {str(props.since)}</Text> : null}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tiles.map(([label, value]) => (
          <View key={label} style={{ flexBasis: "30%", flexGrow: 1, minWidth: 90, padding: 10, borderRadius: 9, borderWidth: 0.5, borderColor: c.border }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }}>{value}</Text>
            <Text style={{ fontSize: 11, color: c.muted }}>{label}</Text>
          </View>
        ))}
      </View>
      {models.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: c.muted }}>By model · tokens</Text>
          {models.map((m) => (
            <View key={m.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ width: 90, color: c.text, fontFamily: MONO, fontSize: 12 }} numberOfLines={1}>{m.name}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.border, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.max(3, (m.raw / maxRaw) * 100)}%`, backgroundColor: c.accent }} />
              </View>
              <Text style={{ width: 56, textAlign: "right", color: c.muted, fontSize: 12 }}>{m.display}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Ask({ body }: { body?: string }) {
  const c = useColors();
  const { sendAction } = useHost();
  const questions = React.useMemo(() => parseAsk(body || ""), [body]);
  const [picked, setPicked] = React.useState<Record<number, Set<number>>>({});
  const [sent, setSent] = React.useState(false);
  if (questions.length === 0) return null;
  const single = questions.length === 1 && !questions[0].multi;
  function commit(chosen: Record<number, Set<number>>) {
    const rows = questions.map((q, qi) => ({ head: q.header || q.question, labels: Array.from(chosen[qi] ?? []).map((i) => q.options[i]?.label).filter(Boolean).join(", ") }));
    if (rows.some((l) => !l.labels)) return;
    const text = rows.length === 1 ? rows[0].labels : rows.map((l) => `${l.head}: ${l.labels}`).join("\n");
    setSent(true);
    sendAction("ask:answer", text);
  }
  function toggle(qi: number, oi: number) {
    if (sent) return;
    const cur = new Set(picked[qi] ?? []);
    if (questions[qi].multi) (cur.has(oi) ? cur.delete(oi) : cur.add(oi));
    else { cur.clear(); cur.add(oi); }
    const next = { ...picked, [qi]: cur };
    setPicked(next);
    if (single) commit(next);
  }
  const allAnswered = questions.every((_, qi) => (picked[qi]?.size ?? 0) > 0);
  return (
    <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card, gap: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="help" size={14} color={c.text} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>{sent ? "Answered" : "Needs your input"}</Text>
      </View>
      {questions.map((q, qi) => (
        <View key={qi} style={{ gap: 6 }}>
          {q.header ? <Text style={{ fontSize: 11, fontWeight: "700", color: c.muted }}>{q.header.toUpperCase()}</Text> : null}
          {q.question ? <Text style={{ fontSize: 14, color: c.text }}>{q.question}</Text> : null}
          {q.options.map((o, oi) => {
            const on = picked[qi]?.has(oi) ?? false;
            return (
              <Pressable key={oi} onPress={() => toggle(qi, oi)} disabled={sent}
                style={{ padding: 10, borderRadius: 9, borderWidth: 1, borderColor: on ? c.accent : c.border, opacity: sent && !on ? 0.45 : 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: on ? c.accent : c.text }}>{o.label}</Text>
                {o.description ? <Text style={{ fontSize: 12, color: c.muted }}>{o.description}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      {!single && !sent ? (
        <Pressable onPress={() => commit(picked)} disabled={!allAnswered}
          style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9, backgroundColor: allAnswered ? c.accent : c.border }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: allAnswered ? c.onAccent : c.muted }}>Send</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const tool = defineCard({ tag: "tool", component: Tool as React.ComponentType });
export const task = defineCard({ tag: "task", component: Task as React.ComponentType });
export const web = defineCard({ tag: "web", component: Web as React.ComponentType });
export const skill = defineCard({ tag: "skill", component: Skill as React.ComponentType });
export const result = defineCard({ tag: "result", component: Result as React.ComponentType });
export const todo = defineCard({ tag: "todo", component: Todo as React.ComponentType });
export const diff = defineCard({ tag: "diff", component: Diff as React.ComponentType });
export const bash = defineCard({ tag: "bash", component: Bash as React.ComponentType });
export const thinking = defineCard({ tag: "thinking", component: Thinking as React.ComponentType });
export const stats = defineCard({ tag: "stats", component: Stats as React.ComponentType });
export const ask = defineCard({ tag: "ask", component: Ask as React.ComponentType });
