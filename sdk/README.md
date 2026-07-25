# @mafold/cards

The card SDK contract for [Mafold](https://mafold.com) — hot-loadable React
Native cards rendered inside chat via Markdoc tags (`{% kline %}`, …).

```tsx
import { defineCard, useHost } from "@mafold/cards";

export default defineCard({
  tag: "quote",
  attributes: { text: { type: "string", required: true } },
  component: ({ text }) => {
    const { theme, maxWidth } = useHost();
    /* render with theme.tokens, stay inside maxWidth */
  },
});
```

At publish time this package name is **externalized** — every Mafold client
(web, iOS, macOS, CLI preview) injects its real runtime when the card loads.
What you install from npm is the typed contract plus a dev stub (`defineCard`
is identity; `useHost` throws outside a host) so cards typecheck and unit-test
locally.

Docs: <https://mafold.com/docs/cards> · Card sources: this repo.
