/**
 * Post-build script for Netlify deployment.
 * TanStack Start + Cloudflare adapter does not emit index.html (SSR generates HTML at runtime).
 * This script generates a minimal HTML shell so Netlify can serve the app as an SPA.
 *
 * TanStack Start's startClient() (cE) requires window.$_TSR to be defined — normally injected
 * by the SSR server. We inject a minimal CSR stub that satisfies all invariants and lets the
 * router boot in pure client-side rendering mode.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const distClient = "dist/client/assets";
const files = readdirSync(distClient);

// Find the CSS bundle
const cssFile = files.find((f) => f.endsWith(".css"));
if (!cssFile) throw new Error("CSS file not found in dist/client/assets");

// Find the JS chunk that contains the hydrateRoot bootstrap side effect
const jsFile = files.find((f) => {
  if (!f.endsWith(".js")) return false;
  const content = readFileSync(join(distClient, f), "utf8");
  return content.includes("hydrateRoot") && content.includes("StrictMode");
});
if (!jsFile) throw new Error("Bootstrap JS not found in dist/client/assets");

// TanStack Start's startClient() requires window.$_TSR to be defined (injected by the SSR
// server during normal operation). Without it, the invariant at `window.$_TSR || Re()` throws.
// Providing an empty-but-valid stub lets the router boot in CSR (client-side only) mode:
//   - matches: [] means every route match falls into the CSR branch (no hydration attempted)
//   - dehydratedData: null skips server-data rehydration
//   - manifest: null is stored as n.ssr.manifest (optional, used for preloading)
//   - h: () => {}  is called as a post-init notification (window.$_TSR?.h())
const tsrStub = `window.$_TSR={router:{matches:[],lastMatchId:null,manifest:null,dehydratedData:null},buffer:[],h:function(){}};`;

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SALEA 2026 — Student Academic &amp; Leadership Excellence Awards</title>
    <meta name="description" content="SALEA 2026: Recognising Excellence, Celebrating Leadership, Inspiring Greatness. Nominate outstanding student leaders and academics." />
    <meta name="author" content="DUT Student Services" />
    <meta property="og:title" content="SALEA 2026 — Student Academic &amp; Leadership Excellence Awards" />
    <meta property="og:description" content="Recognising Excellence. Celebrating Leadership. Inspiring Greatness." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Inter:wght@300;400;500;600;700&display=swap" />
    <link rel="stylesheet" href="/assets/${cssFile}" />
    <script>${tsrStub}</script>
  </head>
  <body>
    <script type="module" src="/assets/${jsFile}"></script>
  </body>
</html>`;

writeFileSync("dist/client/index.html", html);
console.log(`✓ Generated dist/client/index.html`);
console.log(`  CSS: ${cssFile}`);
console.log(`  JS:  ${jsFile}`);
