/**
 * The agent-card family — one module, one `defineCard` export per tag. Each
 * `<tag>/src/card.tsx` re-exports its card as default; esbuild tree-shakes this
 * down to just that card (+ the kit helpers it uses) per bundle.
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { str, num, MONO, useColors, Chip, Icon, Sparkline, Heatmap, toolIcon, parseTodoLine, parseAsk, styles, type TodoItem } from "../kit";

// Card data is UNTRUSTED (bot/agent-supplied). Cap every list we map over so a
// huge `diff`/`todo`/`stats` body can't mount tens of thousands of nodes and
// stack-overflow / freeze the client (a card-data DoS). Anything past the cap is
// summarized as "+N more" rather than rendered.
const MAX_ROWS = 300;

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
  const host = useHost();
  const bits = [str(duration), str(tokens) ? `${str(tokens)} tok` : "", str(cost)].filter(Boolean).join(" · ");
  return (
    // Keyed on the content (see kit's Chip): attrs fill in over the stream —
    // duration first, tokens/cost later — and the re-measure after the native
    // latch release must always re-report, or "✓ 114.5s…" stays truncated.
    <View
      key={bits}
      collapsable={false}
      onLayout={(e) => host.reportWidth?.(e.nativeEvent.layout.width)}
      style={[styles.result, { borderColor: c.border, maxWidth: host.maxWidth }]}
    >
      <Icon name="check" size={13} color={c.success} />
      <Text style={{ fontFamily: MONO, color: c.muted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{bits || "done"}</Text>
    </View>
  );
}

/** "+N more" footer shown when an untrusted list was capped at MAX_ROWS. */
function MoreRows({ extra }: { extra: number }) {
  const c = useColors();
  if (extra <= 0) return null;
  return <Text style={{ fontSize: 12, color: c.muted, fontStyle: "italic" }}>+{extra} more</Text>;
}

function Todo({ body }: { body?: string }) {
  const c = useColors();
  const all = (body || "").split("\n").map(parseTodoLine).filter(Boolean) as TodoItem[];
  const items = all.slice(0, MAX_ROWS);
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
      <MoreRows extra={all.length - items.length} />
    </View>
  );
}

function Diff({ file, added, removed, body }: { file?: string; added?: string; removed?: string; body?: string }) {
  const c = useColors();
  const allLines = (body || "").split("\n").filter((l) => l.length > 0);
  const lines = allLines.slice(0, MAX_ROWS);
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
      {allLines.length > lines.length ? (
        <Text style={{ fontFamily: MONO, fontSize: 12, lineHeight: 17, color: c.muted, fontStyle: "italic", paddingHorizontal: 10 }}>
          +{allLines.length - lines.length} more
        </Text>
      ) : null}
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
  const allModels = lines.filter((l) => l.startsWith("model|")).map((l) => l.split("|")).map((p) => ({ name: p[1] ?? "", display: p[2] ?? "", raw: Number(p[3] ?? 0) }));
  const models = allModels.slice(0, MAX_ROWS);
  // reduce (NOT `Math.max(...spread)`) so an untrusted, very long model list can't
  // blow the call stack via argument spreading.
  const maxRaw = models.reduce((mx, m) => (m.raw > mx ? m.raw : mx), 1);
  // Optional daily-activity sparkline: `spark|n,n,n` line in the body.
  const sparkLine = lines.find((l) => l.startsWith("spark|"));
  const spark = sparkLine ? sparkLine.slice(6).split(",").map(Number).filter((n) => !Number.isNaN(n)) : [];
  // Optional rate-limit bars: `limit|label|pct|note` lines.
  const limits = lines.filter((l) => l.startsWith("limit|")).slice(0, MAX_ROWS).map((l) => {
    const p = l.split("|");
    return { label: p[1] ?? "", pct: Math.min(100, Math.max(0, num(p[2]))), note: p.slice(3).join("|") };
  }).filter((l) => l.label);
  // Optional key-value rows: `kv|label|value` lines.
  const kvs = lines.filter((l) => l.startsWith("kv|")).slice(0, MAX_ROWS).map((l) => {
    const p = l.split("|");
    return { label: p[1] ?? "", value: p.slice(2).join("|") };
  }).filter((r) => r.label && r.value);
  // Optional GitHub-style heatmap: `heat|offset|n,n,n` (daily counts, last = today).
  const heatLine = lines.find((l) => l.startsWith("heat|"));
  const heatParts = heatLine ? heatLine.split("|") : [];
  const heat = heatParts.length > 2 ? heatParts[2].split(",").map(Number).filter((n) => Number.isFinite(n) && n >= 0) : [];
  const heatOffset = heatParts.length > 2 ? num(heatParts[1]) : 0;
  // Tiles: the classic props plus any extra `tile|label|value` body lines.
  const tiles = ([
    ["Sessions", str(props.sessions)], ["Messages", str(props.messages)], ["Tool calls", str(props.tools)],
    ["Tokens", str(props.tokens)], ["Active days", str(props.days)], ["Busiest", str(props.hour)],
  ] as [string, string][]).filter(([, v]) => v && v !== "0");
  for (const l of lines.filter((x) => x.startsWith("tile|")).slice(0, MAX_ROWS)) {
    const p = l.split("|");
    if (p[1] && p[2]) tiles.push([p[1], p.slice(2).join("|")]);
  }
  const title = str(props.title) || "Usage";
  const icon = str(props.icon) || "chart";
  const limitColor = (pct: number) => (pct >= 90 ? c.error : c.accent);
  return (
    <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card, gap: 12, width: maxWidth }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={14} color={c.text} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.text }}>{title}{props.since ? <Text style={{ color: c.muted, fontWeight: "400", fontSize: 11 }}>  · since {str(props.since)}</Text> : null}</Text>
      </View>
      {limits.length > 0 ? (
        <View style={{ gap: 8 }}>
          {limits.map((l) => (
            <View key={l.label} style={{ gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={{ flexShrink: 0, fontSize: 12, fontWeight: "600", color: c.text }}>{l.label}</Text>
                {l.note ? <Text style={{ flex: 1, textAlign: "right", fontSize: 11, color: c.muted }} numberOfLines={1}>{l.note}</Text> : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.border, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.max(2, l.pct)}%`, backgroundColor: limitColor(l.pct) }} />
                </View>
                <Text style={{ width: 38, textAlign: "right", fontFamily: MONO, fontSize: 12, color: limitColor(l.pct) }}>{Math.round(l.pct)}%</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {tiles.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tiles.map(([label, value]) => (
            <View key={label} style={{ flexBasis: "30%", flexGrow: 1, minWidth: 90, padding: 10, borderRadius: 9, borderWidth: 0.5, borderColor: c.border }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.text }} numberOfLines={1}>{value}</Text>
              <Text style={{ fontSize: 11, color: c.muted }} numberOfLines={1}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {heat.length > 6 ? <Heatmap data={heat} offset={heatOffset} color={c.accent} /> : null}
      {spark.length > 1 ? <Sparkline data={spark} color={c.accent} /> : null}
      {models.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: c.muted }}>By model · tokens</Text>
          {models.map((m) => (
            <View key={m.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ width: 90, color: c.text, fontFamily: MONO, fontSize: 12 }} numberOfLines={1}>{m.name}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.border, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.max(3, (m.raw / maxRaw) * 100)}%`, backgroundColor: c.accent }} />
              </View>
              <Text style={{ width: 76, textAlign: "right", color: c.muted, fontSize: 12 }} numberOfLines={1}>{m.display}</Text>
            </View>
          ))}
          <MoreRows extra={allModels.length - models.length} />
        </View>
      ) : null}
      {kvs.length > 0 ? (
        <View style={{ gap: 4 }}>
          {kvs.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={{ width: 104, flexShrink: 0, fontSize: 12, color: c.muted }} numberOfLines={1}>{r.label}</Text>
              <Text style={{ flex: 1, fontSize: 12, color: c.text }} numberOfLines={2}>{r.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Ask({ body, answered }: { body?: string; answered?: string }) {
  const c = useColors();
  const { sendAction } = useHost();
  const questions = React.useMemo(() => parseAsk(body || ""), [body]);
  // `answered` is stamped into the tag by the daemon once the answer was
  // consumed ({% ask %} → {% ask answered="…" %}), so the message content
  // itself records the answered state — a reloaded page or another device
  // renders the card answered instead of re-offering the buttons. Local
  // `sentLocal` only covers the gap until the stamped edit arrives.
  const answeredText = str(answered).trim();
  const stamped = answeredText.length > 0;
  const [picked, setPicked] = React.useState<Record<number, Set<number>>>({});
  const [sentLocal, setSentLocal] = React.useState(false);
  const sent = stamped || sentLocal;
  // Reconstruct the highlighted picks from the stamp. Answers are the tapped
  // labels — bare ("Yes, Hold") for one question, "Head: labels Head2: labels"
  // for multi-question asks (newlines flatten to spaces in the attribute) — so
  // scope each question to its own segment before matching option labels.
  const stampedPicks = React.useMemo(() => {
    const out: Record<number, Set<number>> = {};
    if (!stamped) return out;
    const heads = questions.map((q) => (q.header || q.question).trim() + ":");
    const starts = heads.map((h) => answeredText.indexOf(h));
    questions.forEach((q, qi) => {
      let seg = answeredText;
      if (starts[qi] >= 0) {
        let end = answeredText.length;
        starts.forEach((s2, j) => { if (j !== qi && s2 > starts[qi] && s2 < end) end = s2; });
        seg = answeredText.slice(starts[qi] + heads[qi].length, end);
      }
      const s = new Set<number>();
      q.options.forEach((o, oi) => { if (o.label && seg.includes(o.label)) s.add(oi); });
      out[qi] = s;
    });
    return out;
  }, [stamped, answeredText, questions]);
  const shown = stamped ? stampedPicks : picked;
  // A typed (free-text) reply answered this ask — no option matched, so show
  // the answer itself instead of leaving every button dimmed unexplained.
  const freeText = stamped && questions.every((_, qi) => (stampedPicks[qi]?.size ?? 0) === 0);
  if (questions.length === 0) return null;
  function commit(chosen: Record<number, Set<number>>) {
    const rows = questions.map((q, qi) => ({ head: q.header || q.question, labels: Array.from(chosen[qi] ?? []).map((i) => q.options[i]?.label).filter(Boolean).join(", ") }));
    if (rows.some((l) => !l.labels)) return;
    const text = rows.length === 1 ? rows[0].labels : rows.map((l) => `${l.head}: ${l.labels}`).join("\n");
    setSentLocal(true);
    sendAction("ask:answer", text);
  }
  function toggle(qi: number, oi: number) {
    if (sent) return;
    const cur = new Set(picked[qi] ?? []);
    if (questions[qi].multi) (cur.has(oi) ? cur.delete(oi) : cur.add(oi));
    else { cur.clear(); cur.add(oi); }
    setPicked({ ...picked, [qi]: cur });
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
            const on = shown[qi]?.has(oi) ?? false;
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
      {freeText ? (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
          <Icon name="check" size={13} color={c.success} />
          <Text style={{ flex: 1, fontSize: 13, color: c.muted }}>{answeredText}</Text>
        </View>
      ) : null}
      {!sent ? (
        <Pressable onPress={() => commit(picked)} disabled={!allAnswered}
          style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9, backgroundColor: allAnswered ? c.accent : c.border }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: allAnswered ? c.onAccent : c.muted }}>Send</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const tool = defineCard({
  tag: "tool",
  examples: [
    { name: "Read", props: { name: "Read", detail: "src/app/page.tsx" } },
    { name: "Bash", props: { name: "Bash", detail: "pnpm test" } },
  ],
  component: Tool as React.ComponentType,
});
export const task = defineCard({
  tag: "task",
  examples: [{ name: "Subagent", props: { subagent: "Explore", desc: "find the auth flow" } }],
  component: Task as React.ComponentType,
});
export const web = defineCard({
  tag: "web",
  examples: [
    { name: "Search", props: { query: "react server components caching" } },
    { name: "Fetch", props: { url: "https://example.com/docs" } },
  ],
  component: Web as React.ComponentType,
});
export const skill = defineCard({
  tag: "skill",
  examples: [{ name: "Skill", props: { name: "deploy", args: "--prod" } }],
  component: Skill as React.ComponentType,
});
export const result = defineCard({
  tag: "result",
  examples: [{ name: "Done", props: { duration: "12.4s", tokens: "1.8k", cost: "$0.03" } }],
  component: Result as React.ComponentType,
});
export const todo = defineCard({
  tag: "todo",
  // body = one todo per line: [x] done · [~] in progress · [ ] pending.
  examples: [
    {
      name: "Plan",
      props: { body: "[x] Read the codebase\n[~] Implement the fix\n[ ] Write tests\n[ ] Open a PR" },
    },
  ],
  component: Todo as React.ComponentType,
});
export const diff = defineCard({
  tag: "diff",
  // body = unified-diff lines (+/-/context); file/added/removed render the header.
  examples: [
    {
      name: "Edit",
      props: {
        file: "src/auth.ts",
        added: "2",
        removed: "1",
        body: " export function login() {\n-  return null;\n+  return session;\n+  // resolved\n }",
      },
    },
  ],
  component: Diff as React.ComponentType,
});
export const bash = defineCard({
  tag: "bash",
  // body = command output; collapsed by default (tap to expand).
  examples: [{ name: "Command output", props: { body: "$ pnpm build\n✓ compiled successfully in 3.2s" }, description: "tap to expand" }],
  component: Bash as React.ComponentType,
});
export const thinking = defineCard({
  tag: "thinking",
  examples: [
    {
      name: "Reasoning",
      props: { body: "The bug is in the reconnect path — the socket closes before the retry timer fires, so the resubscribe never lands." },
      description: "tap to expand",
    },
  ],
  component: Thinking as React.ComponentType,
});
export const stats = defineCard({
  tag: "stats",
  // Classic tiles come from props; body lines add sections (all optional):
  //   limit|label|pct|note   → rate-limit progress bar
  //   tile|label|value       → extra tile in the grid
  //   heat|offset|n,n,n      → daily-activity heatmap (offset = weekday blanks)
  //   spark|n,n,n            → sparkline
  //   model|name|display|raw → per-model token bar
  //   kv|label|value         → key-value row
  // `title` + `icon` props retitle the card ("Status", "Settings", …).
  examples: [
    {
      name: "Usage",
      props: {
        sessions: "42",
        messages: "1280",
        tools: "356",
        tokens: "2.1M",
        days: "18",
        since: "Jun 1",
        body:
          "limit|Session|5|resets 9:19am\nlimit|Week (all models)|23|resets Jul 3, 8:59pm\n" +
          "tile|Streak|12d\ntile|Best streak|18d\ntile|Longest session|9h 24m\n" +
          "heat|2|0,3,7,4,0,0,8,6,9,5,0,11,7,10,8,12,4,6,0,2,9,13,5,7,3,0,1,8,10,6,4,7,2,0,5,9,11,3,6,8\n" +
          "spark|3,7,4,8,6,9,5,11,7,10,8,12\n" +
          "model|opus-4.8|2.1M|2100000\nmodel|sonnet-4.6|820k|820000\nmodel|haiku-4.5|110k|110000\n" +
          "kv|Top skills|/claude-api 1%\nkv|Top subagents|Explore 1% · Plan 1%",
      },
    },
    {
      name: "Status",
      props: {
        title: "Status",
        icon: "target",
        body:
          "kv|Agent|idle\nkv|Harness|claude-code · v2.1.198\nkv|Model|default\n" +
          "kv|Session|8371f021 · context ≈ 132k\nkv|Workdir|~/Desktop/mafold\nkv|Daemon|v0.9.29 · up 3h 12m",
      },
    },
  ],
  component: Stats as React.ComponentType,
});
export const ask = defineCard({
  tag: "ask",
  // body = `q|header|multi|question` then `o|label|description` option lines.
  // Once the answer is consumed the daemon rewrites the tag to
  // `{% ask answered="…" %}` — the card then renders frozen as answered, so a
  // reload or another device can't answer it again.
  examples: [
    {
      name: "Question",
      props: { body: "q|Deploy target|0|Where should this deploy?\no|Cloudflare|Static + workers\no|Vercel|Zero-config Next.js" },
    },
    {
      name: "Answered",
      props: {
        body: "q|Deploy target|0|Where should this deploy?\no|Cloudflare|Static + workers\no|Vercel|Zero-config Next.js",
        answered: "Cloudflare",
      },
    },
  ],
  component: Ask as React.ComponentType,
});
