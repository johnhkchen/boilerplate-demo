# Progress — T-003-02-02 phone-friendly-backstage-form

Tracks Implement against `plan.md`. Updated as steps land; deviations noted with rationale.

## Status

- [x] Step 1 — `src/pages/backstage.astro` (page + form + controller + styles)
- [x] Step 2 — test harness plumbing (contract + config + package.json)
- [x] Step 3 — `tests/backstage-flow.spec.ts` (phone-viewport proof) + isolated dev config
- [x] Step 4 — regression + non-inlining sweep

## Log

- **Step 1 — page.** Authored `src/pages/backstage.astro` per structure.md: intro card with an
  honest security-level line, the form (passcode / type radios / optional link / note), an
  `aria-live` confirmation panel, an inline browser controller `<script>`, and token-only scoped
  styles (44px touch targets, no literals). `npm run build` emits `/backstage/index.html`; grep
  confirmed no `DEMO_PASSCODE` in any client HTML/JS. Committed `966bfcb`.

- **Step 2 — harness plumbing.** Added `FLOW_PROJECT.backstage`, `BACKSTAGE_STEP`,
  `BACKSTAGE_PASSCODE`, and a startup-budget bump to the flow contract; added the `backstage`
  Playwright project (Pixel 5) with per-project `testMatch` so desktop/phone flows don't cross;
  prefixed the dev server command with `wrangler d1 migrations apply --local`; added the
  `test:flow:backstage` script. `playwright test --list` confirmed `demo-flow` stays on
  healthy/stalled. Committed `bf7c60c`.

- **Step 3 — spec + DEVIATION.** Wrote `tests/backstage-flow.spec.ts` (open form → submit a
  reference on a phone → read it back through `GET /api/backstage/feed`). First failures were
  mechanical (a `getByLabel('Link')` that also matched the "A link or reference" radio → fixed
  with `{ exact: true }`). The real find: the dev server loaded the developer's repo-root
  `.dev.vars` (which pins `DEMO_PASSCODE="hunter2-day1-demo"`), and `.dev.vars` OVERRIDES the
  process-env passcode — so the form's submissions were gated on a value the test could not know.
  **Deviation from plan.md:** added an isolated Wrangler config
  `tests/support/backstage.wrangler.jsonc` (outside the repo root, so `.dev.vars` is not loaded)
  and pointed the dev server at it via `DEMO_WRANGLER_CONFIG_PATH` — the exact seam
  `scripts/integration-check.ts` already uses to escape `.dev.vars`. Verified empirically: with
  the isolated config the server reports "Using vars defined in process.env", accepts the test
  passcode (201), and rejects the `.dev.vars` value (403). Pinned the server's `DEMO_PASSCODE` to
  `BACKSTAGE_PASSCODE` (not `?? env`) so it can never drift from the spec. Flow passes green.

- **Step 4 — regression.** `npm test` → 80/80 pass (no server modules changed). `npm run
  test:flow` (desktop receipt, shares the modified webServer) → green, so the `testMatch` split
  and isolated-config change did not disturb the receipt flow. Fresh `npm run build` + client
  grep → no passcode/env value in any client HTML/JS (P3). Committed with Step 3.

## Deviations from plan

- **Isolated Wrangler config (Step 3).** plan.md assumed `DEMO_PASSCODE` in `webServer.env` plus
  `CLOUDFLARE_INCLUDE_PROCESS_ENV` would suffice. It does not when a repo-root `.dev.vars` is
  present, because `.dev.vars` wins. Resolved with the repo's established isolation seam
  (`DEMO_WRANGLER_CONFIG_PATH` → a config outside the repo root). This makes the test
  deterministic on both a clean checkout/CI (no `.dev.vars`) and a developer machine (with one).
