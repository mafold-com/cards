import React from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { useColors } from "../../kit";

/**
 * `{% generating %}` — the cross-platform "the bot is still generating" indicator
 * with a real Stop. The client renders it WHILE a reply streams (content-driven:
 * the producer emits the tag into the draft and drops it at the end); tapping
 * Stop dispatches `sendAction("stop")` → the host's existing cancel flow.
 *
 * Claude-Code-style animation: a sparkle glyph "blooms" through
 * `· ✢ ✳ ✶ ✻ ✽` in a ping-pong loop with a 2s opacity breath, next to a
 * whimsical gerund. When the producer streams progress props
 * (`started`/`beat`/`tokens`, all optional), the card shows elapsed time +
 * token count, and the sparkle DEFLATES back toward `·` when the stream
 * stalls (beat stops advancing) — the animation reflects real progress, not
 * a timer. Without props (older daemons) it stays fully bloomed.
 */

/** CC's exact frames: the star grows from a dot into a flower and back. */
const FRAMES = ["·", "✢", "✳", "✶", "✻", "✽"];
const FRAME_MS = 120;
/** beat unchanged this long → the stream is stalled → deflate the sparkle. */
const STALL_MS = 3000;

/** Whimsical gerunds (CC-flavored); picked per turn, stable across re-renders. */
const WORDS = [
  "Brewing", "Cerebrating", "Churning", "Clauding", "Coalescing", "Cogitating",
  "Conjuring", "Crafting", "Crunching", "Deliberating", "Effecting", "Finagling",
  "Forging", "Hatching", "Herding", "Ideating", "Incubating", "Inferring",
  "Jitterbugging", "Levitating", "Lollygagging", "Manifesting", "Marinating",
  "Meandering", "Moonwalking", "Moseying", "Mulling", "Musing", "Mustering",
  "Noodling", "Orbiting", "Orchestrating", "Percolating", "Perusing",
  "Philosophising", "Photosynthesizing", "Pondering", "Pontificating",
  "Pouncing", "Prestidigitating", "Puttering", "Puzzling", "Razzle-dazzling",
  "Recombobulating", "Reticulating", "Ruminating", "Scampering", "Schlepping",
  "Shenaniganing", "Shimmying", "Simmering", "Skedaddling", "Sketching",
  "Smooshing", "Spelunking", "Spinning", "Stewing", "Synthesizing", "Tinkering",
  "Transmuting", "Vibing", "Whirring",
];

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

/**
 * The blooming sparkle. Isolated so its 120ms frame ticks re-render ONLY this
 * tiny Text, never the whole card. `active=false` eases the bloom back down to
 * the small frames (CC's stalled-stream deflate); intensity is smoothed so the
 * transition breathes instead of snapping.
 */
function Sparkle({ color, active }: { color: string; active: boolean }) {
  const [glyph, setGlyph] = React.useState(FRAMES[1]);
  const intensity = React.useRef(1);
  const activeRef = React.useRef(active);
  activeRef.current = active;
  const breath = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    let step = 0;
    const cycle = FRAMES.length * 2 - 2; // ping-pong: 0..n-1..1
    const id = setInterval(() => {
      step = (step + 1) % cycle;
      const pp = step < FRAMES.length ? step : cycle - step; // 0..n-1..0
      const target = activeRef.current ? 1 : 0;
      intensity.current += (target - intensity.current) * 0.12;
      const idx = Math.round(pp * Math.max(0.08, intensity.current));
      setGlyph(FRAMES[Math.min(idx, FRAMES.length - 1)]);
    }, FRAME_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CC's 2s sinusoidal color pulse → an opacity breath here (RN Text color
  // can't animate on the native driver; opacity can).
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 0.45, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.Text
      style={{
        width: 20, textAlign: "center", fontSize: 15, lineHeight: 18,
        color, opacity: breath, fontWeight: "600",
      }}
    >
      {glyph}
    </Animated.Text>
  );
}

interface GeneratingProps {
  /** Turn start (producer clock, epoch ms) — elapsed baseline + word seed. */
  started?: number;
  /** Activity counter — bumps while the harness streams; frozen = stalled. */
  beat?: number;
  /** Streamed output tokens so far (or the producer's estimate). */
  tokens?: number;
  /** Background shells started this turn (CC's "1 shell" footer parity). */
  shells?: number;
}

function Generating({ started, beat, tokens, shells }: GeneratingProps) {
  const c = useColors();
  const { sendAction, maxWidth, theme } = useHost();
  const stopBg = theme.tokens.bubble || "rgba(127,127,127,0.16)";

  // Mount-time fallbacks: an old daemon sends no props; a skewed producer
  // clock (elapsed negative or absurd) falls back to the mount clock too.
  const mountAt = React.useRef(Date.now()).current;
  const [now, setNow] = React.useState(Date.now());
  const base = started && now - started >= 0 && now - started < 6 * 3600_000 ? started : mountAt;

  // Word: seeded by the turn start so every snapshot re-render (and every
  // client) shows the SAME word for the whole turn.
  const word = React.useMemo(() => {
    const seed = Math.abs(Math.floor(started ?? mountAt));
    return WORDS[seed % WORDS.length];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Stall detection: stamp when `beat` last ADVANCED; the 1s ticker below
  // re-evaluates freshness. No beat prop (old daemon) → always active.
  const lastBeat = React.useRef({ beat, at: Date.now() });
  React.useEffect(() => {
    if (beat !== lastBeat.current.beat) lastBeat.current = { beat, at: Date.now() };
  }, [beat]);
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const active = beat === undefined || now - lastBeat.current.at < STALL_MS;

  const meta: string[] = [fmtElapsed(now - base)];
  if (tokens && tokens > 0) meta.push(`↓ ${fmtTokens(tokens)} tokens`);
  if (shells && shells > 0) meta.push(`⏳ ${shells} shell${shells > 1 ? "s" : ""}`);

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        alignSelf: "stretch", maxWidth,
        minHeight: 48,
        paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12,
        borderWidth: 0.5, borderColor: c.border, backgroundColor: c.card,
      }}
    >
      <Sparkle color={c.accent} active={active} />
      <Text numberOfLines={1} style={{ flexShrink: 0, fontSize: 13, lineHeight: 18, fontWeight: "500", color: c.text }}>
        {word}…
      </Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, lineHeight: 18, color: c.muted }}>
        {meta.join(" · ")}
      </Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => sendAction("stop")}
        style={{
          flexDirection: "row", alignItems: "center", gap: 5,
          minHeight: 30,
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
          backgroundColor: stopBg,
        }}
      >
        <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c.text }} />
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.text }}>Stop</Text>
      </Pressable>
    </View>
  );
}

export default defineCard({
  tag: "generating",
  attributes: {
    started: { type: "number" },
    beat: { type: "number" },
    tokens: { type: "number" },
    shells: { type: "number" },
  },
  examples: [
    { name: "Streaming", props: {}, description: "no props (older producers) — full bloom, mount-clock timer" },
    {
      name: "Live progress",
      props: { started: Date.now() - 34_000, beat: 42, tokens: 5240 },
      description: "producer heartbeat: elapsed + token count; sparkle deflates if `beat` stops advancing",
    },
  ],
  component: Generating as React.ComponentType,
});
