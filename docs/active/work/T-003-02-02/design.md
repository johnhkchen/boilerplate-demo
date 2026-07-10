# Design — T-003-02-02 phone-friendly-backstage-form

Chooses one implementation, grounded in Research. The server half (route, gate, store, read
seam) is done and unchanged; this ticket adds the client page and a phone-viewport proof.

## Decision summary

Ship a static-first Astro page at `/backstage` that renders a single accessible form (passcode
+ entry type + optional link + text), and an inline browser `<script>` that POSTs
`{ type, url, text }` as `application/json` with the `x-demo-passcode` header to the existing
`POST /api/backstage/entries`, then swaps the form for a warm confirmation. Prove it with a new
mobile-viewport Playwright project that drives the form on a phone device and confirms the entry
landed by reading it back through the documented `GET /api/backstage/feed` seam.

This mirrors `index.astro` exactly (static page + inline fetch to an `/api/*` route + `aria-live`
region + clay/token styling), so the page reads as one family with the template and introduces
no new architecture.

## Options considered

### A. Page-view gate vs. submission gate (WHERE the passcode is enforced)

- **A1 — passcode is a form field; server gates the submit (CHOSEN).** The page is a plain
  static asset anyone can load; the passcode is one field, sent as the `x-demo-passcode` header
  only on submit. A wrong/missing passcode comes back as 401/403 and is shown inline.
- **A2 — passcode "unlock" screen, then reveal the form.** A two-step flow: enter passcode →
  the page verifies (against what?) → reveals the form.
- **A3 — make `/backstage` an on-demand route (`prerender = false`) and gate the page server-
  side**, refusing to render the form without a valid passcode.

Rationale for A1: The gate is a header check on the write; there is no server session or cookie,
and the passcode is explicitly low-stakes (a shared knock, not identity — Research: charter P3,
seam doc). A2 would need a separate "verify passcode" endpoint or would gate nothing real (the
form HTML is a public asset regardless), adding a route and a round-trip for no security gain.
A3 contradicts static-first (astro `output: 'static'`; only `/api/*` invokes the Worker — the
whole point of the boundary design) and would put a compute cold-start in front of a page that
should be a free edge asset (charter P6). A1 is the honest model that matches the existing gate:
one field, one header, server is the authority, and the page stays a static asset. The page will
plainly say the passcode is a shared low-stakes knock so the model is not oversold.

### B. Passcode persistence step vs. per-submit only

- **B1 — passcode lives in the form, re-used from the field on each submit within the session
  (CHOSEN).** After a successful send, "Send another" keeps the entered passcode in the field so
  a stakeholder can add several notes without re-typing it, but it is never written to storage,
  cookies, or the URL.
- **B2 — persist passcode to `localStorage`/cookie for convenience across reloads.**

Rationale: B2 would write a shared credential to disk on a possibly-shared phone for marginal
convenience, working against the "clearly labelled low-stakes, don't treat as a secret" stance
and the P3 guardrail. B1 keeps it in memory only, which is enough for the "add several entries"
flow the product spec implies (references + feedback in one sitting).

### C. Client-side validation depth

- **C1 — light, friendly client validation that mirrors the server, but the server stays the
  authority (CHOSEN).** Require non-blank text; require a link for the "reference" type and
  validate it is http(s); enforce the same max lengths as hints; but always POST and surface the
  server's `issues` if they slip through.
- **C2 — no client validation; rely entirely on the server 422.**
- **C3 — heavy bespoke validation, diverging from the server rules.**

Rationale: C1 gives a nontechnical phone user immediate, plain-English guidance (the point of
P3/P4) without duplicating the contract as a second source of truth — the server's
`validateBackstageSubmission` remains authoritative and its `issues` are shown if reached. C3
risks drift from `backstage-submission.ts`; C2 is a poor phone experience (a full round-trip to
learn "text must not be blank"). Note: the route requires EXACTLY `{ type, url, text }`, so the
client sends precisely those keys and nothing else.

### D. Type input (reference vs. feedback)

- **D1 — a two-option radio group in a `<fieldset>`/`<legend>` (CHOSEN).** Both options visible,
  keyboard- and screen-reader-friendly, large touch targets, no JS needed to render.
- **D2 — a `<select>` dropdown.** Fewer than a handful of options; a native select hides both
  choices behind a tap and reads worse on a phone.

D1 is the accessible, phone-friendly default for a tiny, fixed choice, and lets the link field's
"required for a reference" hint react to the selection.

### E. Proving persistence in the browser test

- **E1 — after UI confirmation, GET `/api/backstage/feed` with the passcode header and assert the
  unique submission is present (CHOSEN).** Exercises the real documented read seam end to end —
  literally E-003's "submit then retrieve" loop — with no DB coupling in the test.
- **E2 — query the local D1 SQLite file directly from the test.**
- **E3 — assert only the on-page confirmation, not the store.**

E1 satisfies the acceptance's "the submission then appears in the store" through the same seam a
real agent uses, and stays decoupled from storage internals (E2 would reach past the seam into
miniflare file layout). E3 fails the acceptance outright (never checks the store). The test tags
its `text` with a unique nonce so it asserts on its own entry regardless of pre-existing rows.

### F. How the phone-viewport test gets a working store + passcode

- **F1 — a dedicated `backstage` Playwright project on a mobile device preset, sharing the run's
  single `webServer`, whose command applies the D1 migration before starting `astro dev`, and
  whose env sets `DEMO_PASSCODE` alongside the existing `DEMO_SIGNING_KEY` (CHOSEN).**
- **F2 — a Playwright `globalSetup` that applies migrations.**
- **F3 — document a manual `wrangler d1 migrations apply` prerequisite.**

Rationale: The dev server binds `BACKSTAGE_DB` from `wrangler.jsonc` via platformProxy and reads
`DEMO_PASSCODE` from process env because `CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true'` is already set
(Research). The only gaps are (1) the local D1 schema and (2) the passcode value. Chaining
`wrangler d1 migrations apply BACKSTAGE_DB --local && npm run dev …` in the `webServer.command`
makes migration finish *before* the dev server takes the D1 lock — race-free, and idempotent
(already-applied migrations are skipped). F2 risks a lock race between globalSetup and the
webServer starting concurrently. F3 makes the acceptance non-self-executing. Setting
`DEMO_PASSCODE` in `webServer.env` is exactly how `DEMO_SIGNING_KEY` already flows.

Test isolation: healthy/stalled stay Desktop Chrome and keep driving `demo-flow.spec.ts`; the new
`backstage` project runs only `backstage-flow.spec.ts` on a phone. Because a second spec now
exists, each project pins its spec via `testMatch` so a project never runs the other's flow at the
wrong viewport.

## Brand voice for the copy

Plain kitchen-table English, warm host energy (user-global brand voice). "Backstage" is the
grab-able name for the surface; the labels state what you'd DO: a passcode you were handed, a link
or a note to pass along, "Send it over," "Got it — thanks." The security level is stated plainly
in one honest sentence ("a shared knock, not a vault — please don't paste passwords or keys"),
satisfying the product-spec requirement to label the level and refuse secrets.

## Consequences

- Introduces the template's first form controls. To honor the base.css invariant (no literal
  color/radius/shadow/font outside tokens), inputs/textarea/radios are styled with existing
  tokens and the clay vocabulary; any genuinely new control token is added to `tokens.css`, not
  hardcoded in the page.
- The homepage is deliberately not linked to `/backstage` (visually separate, invite-by-link).
- Startup budget grows slightly to absorb the migration step before `astro dev` is ready.
- No server code changes; the route/gate/store/seam contracts are consumed exactly as shipped.
