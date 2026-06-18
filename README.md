# Mafold cards

One shared source for every chat card. Cards are **published to the Mafold API
and hot-loaded** by the web + iOS clients — they are NOT bundled into the apps.
Edit a card → `publish` → both clients pick it up, no App Store / Cloudflare
deploy.

## Why

Before, the agent-card family + finance cards were duplicated in
`mafold-web/.../cards/cards/` and `mafold-ios/CardsRN/src/cards/`, bundled into
each client, and changing one meant shipping both apps. Now there is **one
source, distributed over the API**.

## Architecture (cards-as-a-service)

```
this repo (mafold-com/cards)              the clients (web + iOS)
─────────────────────────────            ─────────────────────────────
 sdk/      @mafold/cards types            each provides the runtime:
 kit/      shared RN helpers               - defineCard / useHost impl
 <tag>/    one project per card            - a loader: resolveCards(tag)
   mafold.card.json  { tag, version }        → fetch bundle → eval with
   src/card.tsx      defineCard(...)          react / react-native /
 publish-all  →  esbuild + upload           @mafold/cards injected
                  to api.mafold.com         → registerCard → render
                  (global scope)           - a PERSISTENT cache (tag@version)
```

- **A card depends only on three externals**: `react`, `react-native`,
  `@mafold/cards`. **No `../` file routing** — `@mafold/cards` is a package name
  the publish externalizes and each client injects at load. So the same source
  runs on web (react-native-web) and iOS (Hermes).
- **`@mafold/cards` is a contract, not an implementation.** `sdk/` is types-only
  (for authoring/typecheck). The runtime is provided per-client.
- **Publishing** bundles each card (esbuild, externals above) and uploads it to
  the backend. `global`-scope cards (the first-party set here) are visible to
  everyone; a user's own cards are family-scoped (self-only).
- **Clients bundle zero cards.** Any `{% tag … %}` → resolveCards → fetch →
  register → render, served from a per-client persistent cache after first load.

## Authoring

```
mafold cards init <tag>            # scaffold <tag>/ (mafold.card.json + src/card.tsx)
cd <tag> && mafold cards dev       # live preview at http://127.0.0.1:8787
mafold cards publish               # bundle + upload (one card)
```

A card:

```tsx
import { defineCard, useHost } from "@mafold/cards";
import { View, Text } from "react-native";

function Quote({ symbol = "—", price = "" }: { symbol?: string; price?: string }) {
  const { theme } = useHost();
  const t = theme.tokens;
  return (
    <View>
      <Text style={{ color: t.text }}>{symbol} {price}</Text>
    </View>
  );
}
export default defineCard({ tag: "quote", component: Quote });
```

Shared helpers (chips, the theme `useColors`, parsers) live in `kit/` and are
imported relatively + inlined into each bundle by esbuild.

## Publishing the whole set

```
node scripts/publish-all.mjs        # publish every card in this repo
```

CI (`.github/workflows/publish.yml`) runs this on push to `main`, using a
repo secret token for the global publisher account.

## The set

Agent family (the daemon's Claude Code output): `tool` `task` `web` `skill`
`result` `todo` `diff` `bash` `thinking` `stats` `ask` · plus `compact`.
Finance: `quote` `balance` `kline` `position` `news` `symbol-info`
`trade-suggestion` `order` `prompt` `instrument-list`.
