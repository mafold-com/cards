import React from "react";
import { defineCard, HtmlFrame } from "@mafold/cards";

/**
 * `{% html %}…raw HTML…{% /html %}` — renders the body as a LIVE, sandboxed web
 * surface (interactive: JS runs, but the document is origin-isolated from the
 * app). One source on both platforms: the `HtmlFrame` primitive that each client
 * injects into `@mafold/cards` mounts a sandboxed `<iframe srcdoc>` on web and a
 * WKWebView (react-native-webview) on iOS. The HTML arrives as the container
 * tag's `body` (same convention as `{% diff %}` / `{% bash %}`); HtmlFrame owns
 * the JS↔native height bridge so the card hugs its content.
 *
 *   {% html %}
 *   <canvas id="c" width="280" height="120"></canvas>
 *   <script>drawChart(c)</script>
 *   {% /html %}
 */
function Html({ body }: { body?: string }) {
  return <HtmlFrame html={body ?? ""} />;
}

export default defineCard<{ body?: string }>({
  tag: "html",
  // The HTML arrives as the container tag's `body` (between {% html %}…{% /html %}).
  examples: [
    {
      name: "Live HTML",
      props: {
        body: '<div style="font:600 15px system-ui;padding:14px;text-align:center">Hello from a sandboxed card 👋</div>',
      },
      description: "rendered in an origin-isolated frame",
    },
  ],
  component: Html,
});
