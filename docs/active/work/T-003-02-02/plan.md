# Plan — T-003-02-02 phone-friendly-backstage-form

Ordered, independently-verifiable steps. Each step ends in a green build/typecheck and an atomic
commit. Testing strategy is defined per step and summarized at the end.

## Step 1 — the backstage page (`src/pages/backstage.astro`)

Author the static-first page: intro card, form (passcode / type radios / link / note / submit),
confirmation panel, inline browser controller `<script>`, and token-valued scoped `<style>` for
the new form controls.

- Copy: plain kitchen-table English, warm host energy; state the security level honestly and
  refuse secrets (product-spec requirement).
- Payload: POST exactly `{ type, url, text }` as `application/json` with `x-demo-passcode`; never
  send `submittedAt`. Handle 201 / 401 / 403 / 422 / other + network error; disable button while
  in flight; move focus to the confirmation heading on success.
- Accessibility: labelled controls, `<fieldset>`/`<legend>` for the radios, `role="alert"` error
  region, `aria-live` confirmation, 44px touch targets via `--control-height`, no bare
  color/radius/shadow/font literals in `<style>`.

**Verify:** `npm run build` succeeds and emits `dist/backstage/index.html` (or `dist/backstage.html`);
grep the built page + client chunk to confirm the passcode value/`DEMO_PASSCODE` is NOT inlined
(it is only ever typed by the user at runtime). **Commit:** `feat(backstage): phone-friendly
submission form page (T-003-02-02)`.

## Step 2 — test harness plumbing (contract + config + package.json)

- `tests/support/flow-contract.ts`: add `FLOW_PROJECT.backstage`, backstage step labels,
  `BACKSTAGE_PASSCODE`, and a startup/step budget bump for the migration prefix.
- `playwright.config.ts`: add the `backstage` project (`devices['Pixel 5']`, `testMatch` the
  backstage spec); pin `healthy`/`stalled` to `demo-flow.spec.ts`; prefix the `webServer.command`
  with `npx wrangler d1 migrations apply BACKSTAGE_DB --local &&`; add `DEMO_PASSCODE` to
  `webServer.env`.
- `package.json`: add `test:flow:backstage`.

**Verify:** `npx playwright test --list` enumerates the projects and shows each spec mapped to its
intended project (backstage spec doesn't exist yet, so verify config parses and healthy/stalled
still list `demo-flow`). Re-run after Step 3. **Commit:** `test(backstage): mobile flow project,
passcode env, and D1 migration in the dev server (T-003-02-02)`.

## Step 3 — the phone-viewport spec (`tests/backstage-flow.spec.ts`)

Write the three-step test: open the form on a phone, submit a unique reference, confirm the entry
is retrievable through `GET /api/backstage/feed` with the passcode header. Guard so it runs only
under the `backstage` project. Use a per-run unique nonce in the note text so it asserts on its
own entry irrespective of pre-existing rows.

**Verify:** `npm run test:flow:backstage` runs green end to end against the dev server (migration
applied, passcode bound). Confirm the "confirm it reached the store" step actually finds the nonce
entry (i.e. the read seam returns it), not just the on-page confirmation. **Commit:**
`test(backstage): prove phone submission lands in the store via the feed seam (T-003-02-02)`.

## Step 4 — regression + non-inlining sweep

- `npm test` (Node unit/route suites) stays green — no server modules changed, so this is a
  guardrail against accidental breakage.
- `npm run test:flow` (the desktop demo flow) stays green — confirms the `testMatch` split did not
  disturb the existing receipt flow.
- Re-run `npm run build` and grep the emitted client assets for the passcode literal / any
  `x-demo-passcode` value to reconfirm nothing sensitive is inlined (P3).

**Verify:** all three green. **Commit:** only if a fix was needed; otherwise fold evidence into
`progress.md`/`review.md`.

## Testing strategy

- **Unit / route:** already covered by `test/backstage-route.test.mjs` (POST handler + store) and
  `test/backstage-retrieval.test.mjs` (feed seam). This ticket adds no server logic, so no new
  Node unit test is required; the browser test is the meaningful new coverage.
- **Browser (the acceptance):** `tests/backstage-flow.spec.ts` on a phone device preset drives the
  real form against the running dev server and verifies persistence through the real read seam —
  the end-to-end "submit then retrieve" loop the epic defines. Waits are bounded by the shared
  budgets; a failure retains a Playwright trace (config `trace: 'retain-on-failure'`).
- **Verification criteria (map to acceptance):**
  1. Phone viewport: the `backstage` project uses a mobile device (`isMobile`, touch, phone
     width). ✔
  2. Visitor enters passcode + submits a reference/feedback + sees a confirmation: steps 1–2 of
     the spec assert the confirmation panel and echoed note. ✔
  3. The submission appears in the store: step 3 reads it back through `GET /api/backstage/feed`
     and matches the unique nonce, type, and url. ✔
- **Non-inlining (P3 guardrail):** build + grep confirms neither the shared passcode nor its
  header value is baked into any client asset; the passcode is only ever the user's runtime input.

## Risks and mitigations

- **Local D1 lock race** if migration and dev server start concurrently → mitigated by chaining
  `migrations apply && npm run dev` in one command (migration completes before the server takes
  the lock). Idempotent: already-applied migrations are skipped.
- **Slower startup** from the migration prefix → mitigated by bumping `serverStartup` budget.
- **`testMatch` split** could accidentally drop the desktop flow → Step 4 re-runs `test:flow` to
  confirm healthy still executes `demo-flow.spec.ts`.
- **base.css invariant** (no literals) for new form controls → styles use only `var(--…)` tokens;
  if a genuinely new control token is needed it is added to `tokens.css`, not hardcoded.
- **Wrangler not applying migration in some environments** (no local D1) → the chained command
  creates local state on first run exactly as prior tickets did; the spec fails loudly (not
  silently) if the store is unreachable, which is the correct signal.

## Out of scope (respecting epic non-goals)

Registered users/roles/billing, moderation, editing/threading, file uploads, notifications, and a
homepage link to the backstage. Pasted-image intake is a richer future signal, not this v1.
