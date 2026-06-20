import { View, Text, StyleSheet } from "react-native";
import { defineCard, useHost } from "@mafold/cards";
import { Icon } from "../../kit";

/**
 * `/compact` result card — a progress bar showing how much conversation context
 * was freed. The mafold-agent daemon emits it after running Claude Code's
 * `/compact`, passing the pre/post token counts:
 *   {% compact before="143000" after="9000" /%}
 * The bar is split kept-vs-freed; with no numbers it degrades to a one-liner.
 */
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

function Compact({ before = "", after = "" }: { before?: string; after?: string }) {
  const { theme } = useHost();
  const t = theme.tokens;

  const b = Math.max(0, parseInt(before, 10) || 0);
  const a = Math.max(0, parseInt(after, 10) || 0);
  const hasData = b > 0 && a <= b;
  const freed = Math.max(0, b - a);
  const reduce = hasData ? Math.round((freed / b) * 100) : 0;

  return (
    <View style={[styles.card, { backgroundColor: t.float, borderColor: t.border }]}>
      <View style={styles.head}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="archive" size={15} color={t.text} />
          <Text style={[styles.title, { color: t.text }]}>Context compacted</Text>
        </View>
        {hasData ? <Text style={[styles.badge, { color: t.success }]}>−{reduce}%</Text> : null}
      </View>

      {hasData ? (
        <>
          <View style={[styles.track, { backgroundColor: t.border }]}>
            {/* kept context (accent) + freed space (green), proportional */}
            <View style={{ flex: Math.max(a, 1), backgroundColor: t.accent }} />
            <View style={{ flex: Math.max(freed, 0), backgroundColor: t.success }} />
          </View>
          <View style={styles.legend}>
            <Text style={[styles.sub, { color: t.muted }]}>
              {k(b)} → {k(a)} tokens
            </Text>
            <Text style={[styles.sub, { color: t.success }]}>freed {k(freed)}</Text>
          </View>
        </>
      ) : (
        <Text style={[styles.sub, { color: t.muted }]}>
          older messages summarized — continuing with full continuity
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 9, minWidth: 220 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 14, fontWeight: "700" },
  badge: { fontSize: 13, fontWeight: "700" },
  track: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
  legend: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sub: { fontSize: 12, fontWeight: "500" },
});

export default defineCard<{ before?: string; after?: string }>({
  tag: "compact",
  attributes: {
    before: { type: "string" },
    after: { type: "string" },
  },
  component: Compact,
});
