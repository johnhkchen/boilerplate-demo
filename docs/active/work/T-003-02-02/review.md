# Review — T-003-02-02 phone-friendly-backstage-form

Handoff document. What changed, how it's covered, and what a human reviewer should know without
reading every diff.

## What shipped

A static-first `/backstage` page where a nontechnical stakeholder, given only the demo URL and
the shared passcode, submits a reference or a bit of feedback from a phone — no account, no
sign-in — and sees a warm confirmation. The submission is written through the existing
`POST /api/backstage/entries` route and is immediately retrievable through the documented
`GET /api/backstage/feed` seam, closing epic E-003's submit→retrieve loop. No server code
changed; this ticket is purely the client surface plus its phone-viewport proof.

## Files created

- `src/pages/backstage.astro` — the page. Intro card (name "Backstage", plain lede, an honest
  security-level note that refuses secrets); the form (passcode / reference-vs-feedback radios /
  optional link / note); an `aria-live` confirmation panel that echoes what was sent and offers
  "Send another"; an inline browser `<script>` controller; token-only scoped styles.
- `tests/backstage-flow.spec.ts` — the acceptance test, on the Pixel 5 device preset.
- `tests/support/backstage.wrangler.jsonc` — isolated Wrangler config for the test dev server
  (see "Notable decision" below).

## Files modified

- `playwright.config.ts` — added the `backstage` project (mobile viewport) with per-project
  `testMatch` so the desktop receipt flow and the phone backstage flow never run at the wrong
  viewport; the shared dev server now applies the D1 migration before `astro dev` starts, binds
  `DEMO_PASSCODE`, and is pointed at the isolated config via `DEMO_WRANGLER_CONFIG_PATH`.
- `tests/support/flow-contract.ts` — `FLOW_PROJECT.backstage`, `BACKSTAGE_STEP`,
  `BACKSTAGE_PASSCODE`, and larger `serverStartup`/`test`/`run` budgets to absorb the migration.
- `package.json` — `test:flow:backstage` script.

Commits: `966bfcb` (page), `bf7c60c` (harness plumbing), `7703472` (spec + isolated config).

## How it maps to the acceptance criterion

> On a phone viewport a visitor enters the passcode, submits a reference or feedback, and sees a
> confirmation; the submission then appears in the store — verifiable via a mobile-viewport UI
> check against the running demo.

- **Phone viewport:** the `backstage` Playwright project runs on `devices['Pixel 5']` (mobile,
  touch, phone width) against the live `astro dev` server. ✔
- **Enters passcode + submits a reference + sees a confirmation:** the spec fills the passcode,
  picks the reference radio, fills a link + note, taps "Send it over", and asserts the
  confirmation panel and its echoed note/link become visible. ✔
- **Appears in the store:** the spec then reads the entry back through the real
  `GET /api/backstage/feed` seam (same passcode header) and matches its unique text, `type`, and
  `url`. This is persistence proven through the documented interface, not a DB peek. ✔

## Test coverage

- **New browser E2E (the acceptance):** `tests/backstage-flow.spec.ts` — green
  (`npm run test:flow:backstage`), ~2.5s, three boxed steps with bounded budgets and
  retain-on-failure traces.
- **Regression:** `npm test` → 80/80 (no server modules touched). `npm run test:flow` (desktop
  receipt, which shares the now-modified webServer) → green, confirming the `testMatch` split and
  the isolated-config change did not disturb the receipt flow.
- **Existing server coverage still authoritative:** `test/backstage-route.test.mjs` (POST handler
  + store, all status codes) and `test/backstage-retrieval.test.mjs` (feed seam) already cover
  wrong/blank passcode, malformed payloads, and byte-for-byte round-trips at the unit/route level.
- **P3 non-inlining:** fresh `npm run build` + grep of client HTML/JS → the shared passcode and
  its value never appear in client output; the passcode is only the visitor's runtime input,
  sent solely in the `x-demo-passcode` header.

### Coverage gaps (deliberate, not blocking)

- The browser test drives the **reference happy path** only. The feedback type, the wrong-
  passcode inline error, and client-side validation messages are exercised by hand and by the
  route-level suite, but not asserted in the browser. A reviewer wanting belt-and-suspenders could
  add a second phone step for feedback + a wrong-passcode assertion; the current test satisfies the
  acceptance as written.
- No visual/screenshot assertion — layout is verified structurally (roles/labels/visibility), not
  pixel-compared. Consistent with the existing demo-flow test's approach.

## Notable decision a reviewer should sanity-check

**Isolated Wrangler config for the test dev server.** During Implement, the dev server was found
to load the developer's repo-root `.dev.vars`, which pins `DEMO_PASSCODE` to a machine-specific
value that **overrides** the process-env passcode — so the form's submissions were gated on a
value the test couldn't know. Fix: point the dev server at `tests/support/backstage.wrangler.jsonc`
via `DEMO_WRANGLER_CONFIG_PATH` (the exact seam `scripts/integration-check.ts` already uses).
Because that file lives outside the repo root, Wrangler doesn't load `.dev.vars`, and the passcode
comes deterministically from process env. Verified empirically: the server reports "Using vars
defined in process.env", accepts the test passcode (201), and rejects the `.dev.vars` value (403).
Trade-off: this config now governs the **shared** webServer, so the healthy/stalled receipt flows
also run against it — verified green, and arguably more deterministic than before.

## Open concerns / notes

- **Page view is not passcode-gated; the submit is.** By design: the passcode is a low-stakes
  shared knock (charter P3), the page must stay a free static edge asset (static-first, P6), and
  the server gate (header check) is the real boundary. The page says this plainly. If a reviewer
  wants the *form* hidden until a passcode is entered, that's a UX addition, not a security change.
- **No homepage link to `/backstage`.** Intentional — the backstage is "visually separate" and
  invite-by-link (product spec). Reachable by direct URL only.
- **Client validation mirrors the server** (`MAX_URL`/`MAX_TEXT`, http(s), non-blank text,
  link-required-for-reference) for a friendly phone experience; the server
  (`backstage-submission.ts`) remains the sole authority and its `issues` are surfaced if reached.
  Low drift risk; noted for future maintenance.
- **Local D1 accumulates test rows** in the gitignored `.wrangler/state`; each run tags its entry
  with a unique marker so assertions are unaffected. Nothing committed.
- **Out of scope (epic non-goals), untouched:** accounts/roles/billing, moderation,
  editing/threading, file/image uploads, notifications.

## Verdict

Acceptance met and demonstrated end to end on a phone viewport against the running demo. No server
behavior changed; all suites green; no secret inlined. Ready for human review.
