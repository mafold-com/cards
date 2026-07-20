import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { MONO, num, useColors } from "../../kit";

/**
 * `{% bgtasks n=2 %} t|…/o|… lines {% /bgtasks %}` — end-of-turn notice that N
 * background shells started this turn are (or may still be) running after the
 * reply finished. Emitted by the daemon at Done when the turn launched
 * `run_in_background` Bash tasks; the completion-wakeup monitor then LIVE-EDITS
 * this card (~10s cadence) with each task's status and log tail until they all
 * exit and the wrap-up reply lands. This card makes that invisible tail visible
 * — the 2026-07-18 "silent watcher" incident class.
 *
 * Body lines (daemon-emitted, `{%`-escaped, absent on old daemons):
 *   t|<started_ms>|<running|done>|<command>   — one per task
 *   o|<log line>                              — tail lines of the preceding t
 * No body → the legacy static pill (no expand affordance).
 */

type Task = { started: number; status: string; cmd: string; tail: string[] };

const MAX_TASKS = 8;
const MAX_TAIL = 8;

function parseTasks(body: string): Task[] {
  const tasks: Task[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("t|")) {
      const p = line.split("|");
      if (tasks.length >= MAX_TASKS) break;
      tasks.push({
        started: Number(p[1]) || 0,
        status: p[2] === "done" ? "done" : "running",
        cmd: p.slice(3).join("|").trim(),
        tail: [],
      });
    } else if (line.startsWith("o|")) {
      const t = tasks[tasks.length - 1];
      if (t && t.tail.length < MAX_TAIL) t.tail.push(line.slice(2));
    }
  }
  return tasks;
}

/** "42s" / "3m12s" / "1h04m" — elapsed since `started`; "" when implausible. */
function fmtElapsed(started: number, now: number): string {
  const s = Math.floor((now - started) / 1000);
  if (!started || s < 0 || s > 24 * 3600) return "";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

function TaskRow({ task, now }: { task: Task; now: number }) {
  const c = useColors();
  const running = task.status === "running";
  const elapsed = running ? fmtElapsed(task.started, now) : "";
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
        <Text style={{ color: running ? c.accent : c.success, fontSize: 12, lineHeight: 16 }}>
          {running ? "◐" : "●"}
        </Text>
        <Text
          style={{ flex: 1, fontFamily: MONO, fontSize: 11.5, lineHeight: 16, color: c.text }}
          numberOfLines={2}
        >
          {task.cmd || "(background task)"}
        </Text>
        <Text style={{ fontFamily: MONO, fontSize: 11, lineHeight: 16, color: c.muted }}>
          {running ? elapsed : "已结束"}
        </Text>
      </View>
      {task.tail.length > 0 ? (
        <View style={[styles.tail, { borderColor: c.border }]}>
          {task.tail.map((l, i) => (
            <Text
              key={i}
              style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 15, color: c.muted }}
              numberOfLines={1}
            >
              {l || " "}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BgTasks({ n, body }: { n?: unknown; body?: string }) {
  const host = useHost();
  const c = useColors();
  const [open, setOpen] = React.useState(false);
  const tasks = React.useMemo(() => parseTasks(body || ""), [body]);
  const expandable = tasks.length > 0;
  const live = tasks.filter((t) => t.status === "running").length;
  // Bare tag (old daemon / mid-scan): trust `n` and assume running.
  const count = expandable ? live : Math.max(1, num(n) || 1);
  const allDone = expandable && live === 0;

  // Elapsed clocks tick only while the card is EXPANDED and something still
  // runs — collapsed or settled cards cost zero timers (card-CPU discipline).
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!open || live === 0) return;
    setNow(Date.now()); // the card may have sat collapsed for a while
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, live]);

  const headline = allDone
    ? "后台任务已完成 — 结果见下方回复"
    : `${count} 个后台任务仍在运行 — 结果会出现在下一条回复里`;

  return (
    <View style={{ alignSelf: "flex-start", maxWidth: host.maxWidth, gap: 6 }}>
      <Pressable
        onPress={() => expandable && setOpen((o) => !o)}
        style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <Text style={styles.glyph}>{allDone ? "✓" : "⏳"}</Text>
        <Text style={[styles.text, { color: allDone ? c.success : c.muted }]}>{headline}</Text>
        {expandable ? (
          <Text style={{ color: c.subtle, fontSize: 11, marginLeft: 2 }}>{open ? "▾" : "▸"}</Text>
        ) : null}
      </Pressable>
      {open && expandable ? (
        <View style={[styles.detail, { borderColor: c.border, backgroundColor: c.card }]}>
          {tasks.map((t, i) => (
            <TaskRow key={i} task={t} now={now} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: { fontSize: 13 },
  text: { fontSize: 12.5, lineHeight: 17, flexShrink: 1 },
  detail: {
    gap: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  tail: {
    marginLeft: 19,
    paddingLeft: 8,
    borderLeftWidth: 2,
    gap: 1,
  },
});

export default defineCard({
  tag: "bgtasks",
  attributes: { n: { type: "number" } },
  examples: [
    { name: "One task (legacy bare tag)", props: { n: 1 } },
    {
      name: "Running with live detail",
      description: "tap ▸ to expand the tasks' commands, elapsed clocks and log tails",
      props: {
        n: 2,
        body:
          "t|1770000000000|running|cargo build --release 2>&1\n" +
          "o|   Compiling mafold-core v0.4.2\n" +
          "o|   Compiling mafold-cli v0.9.53\n" +
          "t|1770000004000|running|pnpm test --filter web\n" +
          "o|RUN  src/app/app/cards/split.test.ts\n",
      },
    },
    {
      name: "All finished",
      props: {
        n: 2,
        body:
          "t|1770000000000|done|cargo build --release 2>&1\n" +
          "o|    Finished `release` profile [optimized] target(s) in 92.41s\n" +
          "t|1770000004000|done|pnpm test --filter web\n" +
          "o|Tests  214 passed (214)\n",
      },
    },
  ],
  component: BgTasks as React.ComponentType,
});
