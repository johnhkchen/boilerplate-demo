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
## Step 3 — pure signing helper src/lib/receipt.ts ✅

- Implemented `BOUNDARY_NAME`, `Receipt`, `canonicalMessage`, `signReceipt`,
  `makeReceipt` (with `now`/`randomBytes` injectors), `verifyReceipt`. Web Crypto
  HMAC-SHA256, hex-encoded; no env access in this module.
- **Verify** (throwaway Node script, not committed): deterministic signature for
  fixed key/now/nonce ✓; `verifyReceipt` round-trips ✓; tampered nonce → false ✓;
  wrong key → false ✓; key string absent from `JSON.stringify(receipt)` ✓; fresh
  nonce per real call ✓.

### Deviation note — commit hygiene
Step 2's first commit used `git add -A`, which swept in unrelated pre-existing
untracked scaffolding and other tickets' unstaged edits. Caught immediately:
`git reset --soft HEAD~1 && git reset` restored the working tree exactly, then
re-committed only this ticket's files. Working tree's prior `M` files
(index.astro, base.css, …) and untracked docs left untouched. Going forward:
explicit path lists on `git add`, never `-A`.
## Step 4 — HTTP boundary src/pages/api/receipt.ts ✅

- `export const prerender = false` + `GET` handler. Reads
  `locals.runtime.env.DEMO_SIGNING_KEY`; validates (missing/blank → 500 safe
  shape); else `makeReceipt(key)` → 200 JSON, `content-type: application/json`.
- **Verify** (live `astro dev`, platformProxy loaded `.dev.vars` — log:
  "Using vars defined in .dev.vars"):
  - `GET /api/receipt` → **200**, JSON with a `signature`; `content-type` correct.
  - Two calls differ in `nonce` + `issuedAt` → live, not a cached file.
  - Served signature **validates** against the real key via `verifyReceipt`, and
    **fails** against a wrong key → the route genuinely used the server secret.
  - Blanked the key + restarted → **500** `boundary_misconfigured` with the safe
    detail and **no key value / no stack trace**; restored the key afterward.
  - Note: local dev port was 4322 (4321 in use by another process).
## Step 5 — index.astro render — pending
## Step 6 — wrangler.jsonc — pending
## Step 7 — acceptance verification — pending
