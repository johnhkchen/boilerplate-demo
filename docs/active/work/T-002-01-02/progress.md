# Progress — T-002-01-02 exemplar-api-boundary

Tracking the Plan's steps. Deviations noted inline.

## Step 1 — install Cloudflare adapter ✅

- **Deviation from Plan:** Plan named `@astrojs/cloudflare@^14`; v14 requires
  `astro ^7`. This repo runs `astro@5.18.2`, so installed **`@astrojs/cloudflare@^12`
  (12.6.13)**, whose peer is `astro ^5.7.0` — the correct match. Adapter major is
  pinned to Astro major; the version number was the only thing that changed, not
  the design.
- `npm ls` confirms `@astrojs/cloudflare@12.6.13` with `astro@5.18.2 deduped`.
- Note: npm printed `allow-scripts` warnings (sharp/esbuild/workerd postinstall not
  auto-run in this sandbox). Watched for impact in build/dev steps below.

## Step 2 — adapter wiring + env typing + env template ✅

- `astro.config.mjs`: added `adapter: cloudflare({ platformProxy: { enabled: true } })`;
  kept `output: 'static'`; rewrote the deferral comment to the reconciled reality.
- `src/env.d.ts`: typed `App.Locals` via `Runtime<{ DEMO_SIGNING_KEY: string }>`.
- `.dev.vars.example` committed (placeholder only); `.gitignore` now ignores
  `.dev.vars`; local `.dev.vars` holds a distinctive test key
  (`…ZZQ_UNIQ_TESTMARKER…`) so Step 7's dist grep is unambiguous.
- **Verify:** `npm run build` succeeds; emits `dist/index.html` **plus**
  `dist/_worker.js/` + `dist/_routes.json`. `_routes.json` already excludes `/`
  and `/_astro/*` → the page is edge-served, not Worker-served (clause 4 holds
  even before the boundary route exists).
- Build WARN (benign): "Cloudflare does not support sharp at runtime" — we use no
  runtime image service; prerendered pages are unaffected.
## Step 3 — lib/receipt.ts — pending
## Step 4 — api/receipt.ts — pending
## Step 5 — index.astro render — pending
## Step 6 — wrangler.jsonc — pending
## Step 7 — acceptance verification — pending
