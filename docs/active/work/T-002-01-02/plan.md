# Plan — T-002-01-02 exemplar-api-boundary

Ordered, independently verifiable steps. Each numbered step is a commit unit.

## Step 0 — branch check (no commit)

Already on `main` (Lisa's shared working branch per its concurrency model). No new
branch. Commits serialize via Lisa's file lock. Proceed.

## Step 1 — install the Cloudflare adapter

- `npm install --save-dev @astrojs/cloudflare@^14`
- Verify: `npm ls @astrojs/cloudflare` resolves; `package.json` devDeps updated.
- **Commit:** `Add @astrojs/cloudflare adapter dependency (T-002-01-02)`

## Step 2 — wire adapter, env typing, env template

- `astro.config.mjs`: import + `adapter: cloudflare({ platformProxy: { enabled:
  true } })`; keep `output: 'static'`; rewrite the deferral comment to the
  reconciled reality (pages static; adapter only powers the one boundary route).
- `src/env.d.ts`: type `App.Locals` via `@astrojs/cloudflare` `Runtime<Env>` with
  `Env = { DEMO_SIGNING_KEY: string }`.
- `.dev.vars.example` (committed): documents `DEMO_SIGNING_KEY`, placeholder value.
- `.gitignore`: add `.dev.vars`.
- `.dev.vars` (NOT committed): real dev value, e.g. a long random string, for local
  verification.
- Verify: `npm run build` still succeeds and still emits `dist/index.html` (no
  boundary route yet → may or may not emit `_worker.js`; either is fine here).
- **Commit:** `Wire Cloudflare adapter for hybrid rendering + env template (T-002-01-02)`
  (`.dev.vars` excluded by gitignore).

## Step 3 — pure signing helper `src/lib/receipt.ts`

- Implement `BOUNDARY_NAME`, `Receipt`, `canonicalMessage`, `signReceipt`,
  `makeReceipt` (with `now`/`randomBytes` injectors), `verifyReceipt`. Web Crypto
  only; hex encode.
- Verify (throwaway Node one-liner, not committed): `makeReceipt('k')` returns the
  full shape; `verifyReceipt(key, receipt)` is `true`; a tampered signature is
  `false`; the key string is absent from `JSON.stringify(receipt)`.
- **Commit:** `Add HMAC receipt signing helper (T-002-01-02)`

## Step 4 — the HTTP boundary `src/pages/api/receipt.ts`

- `export const prerender = false;` + `GET` handler. Read
  `locals.runtime?.env?.DEMO_SIGNING_KEY`; validate (missing/blank → `500` safe
  shape); else `makeReceipt(key)` → `200` JSON, `Content-Type: application/json`.
- Verify (dev server): start `npm run dev` (background), `curl -s
  localhost:4321/api/receipt` → `200` with `signature`; two curls show different
  `nonce`/`issuedAt` (live, not cached); temporarily blank the key → `500` safe
  shape with no key value; restore key.
- **Commit:** `Add /api/receipt secret-safe boundary route (T-002-01-02)`

## Step 5 — render the boundary on the static page `src/pages/index.astro`

- Add `.clay-well` panel (ids `#receipt-status`, `#receipt-body`) with a
  server-rendered "loading" state; add a module `<script>` that fetches
  `/api/receipt` and renders success/error (P2: no indefinite spinner).
- Page `<style>`: token vars only. Refresh the stale lede.
- Verify: `curl -s localhost:4321/ | grep -i receipt` shows the panel markup;
  load in the driven browser (Step 7) to confirm the value renders.
- **Commit:** `Render live signed receipt on the demo page (T-002-01-02)`

## Step 6 — deploy wiring `wrangler.jsonc`

- Add `"main": "dist/_worker.js"`; update header comment (edge assets + Worker only
  for `_routes.json` paths; account stays secret-free).
- Verify: `npm run build` emits `dist/_worker.js/` and `dist/_routes.json`;
  `dist/_routes.json` `exclude` contains `/` (or `/index.html`); `npx wrangler
  deploy --dry-run` succeeds (no account needed for dry-run).
- **Commit:** `Point wrangler at the emitted Worker for the boundary route (T-002-01-02)`

## Step 7 — full acceptance verification (no code; may fold into Step 6 commit)

Run the AC clauses end to end against a production build served locally, and record
results in `progress.md`:

1. **Live JSON:** `wrangler dev` (or `astro dev`) up → `curl /api/receipt` returns
   `200` JSON with a `signature`; repeated calls differ.
2. **Key server-only:** the value lives only in `.dev.vars` / Worker env; source
   reads it via `locals.runtime.env`, never a client constant.
3. **Key absent from client assets:** build with the key present, then
   `grep -rF "$DEMO_SIGNING_KEY" dist/` → **empty**. Also confirm no `PUBLIC_`
   prefix anywhere.
4. **Page static, no cold start:** `dist/index.html` present; `dist/_routes.json`
   excludes `/`; page load fetches the boundary client-side.
5. **Page renders the value:** drive the browser (skill `/run` or curl the page +
   the API) and confirm the signed value appears in the panel.

## Testing strategy

- **Unit (the high-value target):** `src/lib/receipt.ts` is pure and injectable.
  Assert: deterministic signature for fixed `key/now/nonce`; `verifyReceipt`
  round-trips; tamper → `false`; output JSON never contains the key. There is no
  test runner wired in the repo yet (package.json has no `test` script) — Design
  keeps the logic in an injectable pure module so a runner added by a later ticket
  (or the sibling T-002-01-01 runner) can cover it without refactor. For THIS
  ticket, verification is the throwaway Node check in Step 3 plus the live curl in
  Steps 4/7, recorded in `progress.md`. **Flag in Review:** no committed automated
  test — gap owned by the story's runner/ops-check tickets.
- **Integration:** the curl-the-dev-route checks (Steps 4, 7) are the integration
  evidence for this ticket. Sibling T-002-01-03 turns this into a committed green
  check.
- **Manual/visual:** browser load confirms the page renders the live value and the
  loading/error states behave (P2).

## Rollback / risk notes

- If `platformProxy` does not populate `locals.runtime.env` under `astro dev`
  (Research C2, Design risk 1): fall back to verifying via `wrangler dev` against
  the build (which definitely injects `.dev.vars`), and document the dev-run
  command. Do **not** add an `import.meta.env` key fallback that could inline the
  secret — the env path must stay runtime-only.
- If the adapter forces unexpected `_routes.json` behavior routing `/` through the
  Worker (Design risk 3): add an explicit `_routes.json`/`routes` exclusion; re-verify
  clause 4. (Expected unnecessary — adapter excludes prerendered paths by default.)
- Each step is its own commit, so any step can be reverted without unwinding the
  boundary logic.

## Definition of done (maps to AC)

- [ ] `curl` local `/api/receipt` → live JSON with a server-key signature (clause 1,2)
- [ ] `grep -rF "$DEMO_SIGNING_KEY" dist/` empty (clause 3)
- [ ] `dist/index.html` static; `/` excluded from Worker in `_routes.json` (clause 4)
- [ ] page visibly renders the signed value with loading/error states (AC + P2)
- [ ] committed `.dev.vars.example` carries no real secret; `.dev.vars` gitignored
- [ ] `review.md` records evidence and the automated-test gap
