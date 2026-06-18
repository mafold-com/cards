import React from "react";
import { Text } from "react-native";
import { defineCard } from "@mafold/cards";
import { useHost } from "@mafold/cards";
import { CardShell } from "../../shell";

/** Prompt — RN port of PromptCardView. props = { name, description, content }. */
function Prompt(props: Record<string, unknown>) {
  const { theme } = useHost();
  const t = theme.tokens;
  const name = (props.name as string) || "Prompt";
  const description = props.description as string | undefined;
  const content = props.content as string | undefined;

  return (
    <CardShell icon="✨" title={name}>
      {description ? <Text style={{ color: t.muted, fontSize: 13 }}>{description}</Text> : null}
      {content ? (
        <Text style={{ color: t.subtle, fontSize: 12, fontFamily: "Menlo" }} numberOfLines={3}>
          {content}
        </Text>
      ) : null}
    </CardShell>
  );
}

export default defineCard({ tag: "prompt", component: Prompt });
