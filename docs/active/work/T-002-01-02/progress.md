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
## Step 5 — render the boundary on the static page src/pages/index.astro ✅

- Added a second `.clay-surface` card holding a `.clay-well` panel with a
  server-rendered "Asking the server…" state and a `<dl>` (ids
  `#receipt-issued/-nonce/-signature`) filled by a bundled module `<script>` that
  `fetch`es `/api/receipt`. Error path shows a plain "didn't answer — try a
  refresh" line (no indefinite spinner; P2).
- `main` became a centered flex column so the two cards stack with rhythm; long
  hex values wrap with `overflow-wrap: anywhere`. Token vars only — no new
  color/radius/shadow/font literals. **Chose not to add a `--font-mono` token** to
  tokens.css because a concurrent thread (T-001-02-02) owns that file right now;
  avoided the cross-thread file race (Lisa concurrency rule).
- Refreshed the now-stale lede ("public URL and deploy-on-push arrive next" —
  both shipped) and `description` to point at the live boundary. Brand voice:
  plain, warm, no API/HMAC/endpoint jargon in visitor copy.
- **Verify:**
  - Served HTML contains the panel markup; grepped page **+ its bundled script**
    for the real key → **absent** (clause 3).
  - Headless Chromium (Playwright): after load, the loading line hides and the
    card shows `Made at`, a 32-hex `One-time tag`, and a 64-hex signature — i.e.
    the page **visibly renders the live response**. Screenshot saved as
    `page-render.png`. (The dark pill in it is the dev toolbar; absent in prod.)

## Note on concurrency
A parallel Lisa thread committed T-001-02-02 (`31a214a`, `5614cfd`) on this shared
branch mid-session, committing the previously-uncommitted `src/` edits. Verified
my four commits touched only this ticket's files; no entanglement.
## Step 6 — deploy wiring wrangler.jsonc (+ public/.assetsignore) ✅

- `wrangler.jsonc`: added `"main": "./dist/_worker.js/index.js"`,
  `"compatibility_flags": ["nodejs_compat"]`, and `assets.binding: "ASSETS"`;
  rewrote the header comment (edge assets + Worker only for `_routes.json` paths).
- **Deviation / discovery:** `wrangler deploy --dry-run` errored — the adapter
  emits a Pages-style `_worker.js/` directory *inside* the assets dir, which
  wrangler would upload as public assets (exposing Worker source). Fix: an
  `.assetsignore` listing `_worker.js` + `_routes.json`. Since `dist/` is
  gitignored and rebuilt, put it in **`public/.assetsignore`** — Astro copies
  `public/` into `dist/` on every build, so it travels with each build with no
  package.json/deploy-script change (kept T-001-01-02/03's scripts untouched).
- **Verify:** rebuild → `dist/.assetsignore` present; `wrangler deploy --dry-run`
  succeeds (only `env.ASSETS` binding; Worker deploys via `main`).

## Step 7 — full acceptance verification ✅

Ran against BOTH `astro dev` and a **production build served by the real Worker
runtime** (`wrangler dev`, which loaded `DEMO_SIGNING_KEY` from `.dev.vars`,
shown "(hidden)"):

1. **Live JSON (clause 1):** `curl /api/receipt` → 200 signed JSON; nonce/issuedAt
   differ per call. ✓ (both dev and prod build)
2. **Key server-only (clause 2):** the served signature **validates** against the
   real key via `verifyReceipt` and **fails** against a wrong key → the route
   genuinely consumed the server secret. ✓
3. **Key absent from client assets (clause 3):** `grep -rIF "$KEY" dist/` → empty;
   no `PUBLIC_` vars; distinctive marker absent. ✓
4. **Page static, no cold start (clause 4):** `dist/index.html` is prerendered
   HTML; `dist/_routes.json` excludes `/` (served from assets, Worker not
   invoked); real Worker serves `GET /` as static `text/html` 200. ✓
5. **Page renders the value (AC):** headless Chromium shows the card populated with
   the live signed values; `page-render.png` saved. ✓
6. **Misconfig safety:** blank key → 500 `boundary_misconfigured`, no value/stack. ✓
