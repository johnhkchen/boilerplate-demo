# T-005-01-01 — verb-forward-index-recomposition — Research

Descriptive map of the surface being recomposed, the systems that observe it,
and the constraints that bound the change. No solutions proposed here.

## The ticket in one line

Recompose `src/pages/index.astro` so the page introduces itself: verb-forward
section labels, exactly one clay-button primary action, a visible leave-a-note
path to `/backstage`, and the name/primary-action strings lifted into obvious
frontmatter template slots.

## Acceptance criteria decomposed

1. In built index HTML, every section's eyebrow/heading states what the
   visitor **does** there (e.g. "Watch the server answer").
2. Exactly **one** element styled as `.clay-button` is present on the page.
3. A link **labeled in leave-a-note terms** routes to `/backstage`.
4. Demo name + primary-action label are **clearly-marked frontmatter consts**.
5. `npm run build` succeeds; the existing leak check finds no passcode or
   team-internal detail in the public page output.

## The page as it stands — src/pages/index.astro (211 lines)

Two stacked `.clay-surface` sections inside `<main>`, both capped to
`--measure` (34rem):

1. **Identity card** (`aria-labelledby="title"`): eyebrow "Ready when you
   are", `<h1>{name}</h1>` ("Demo Runway"), tagline, lede. The copy is
   descriptive/maker-outward ("This is the working starting point… point your
   coding agent at it") — the exact problem the epic names.
2. **Receipt card** (`aria-labelledby="receipt-heading"`, `aria-live=
   "polite"`): eyebrow "Fresh from the server", h2 "A signed note, made just
   now", lede, then a `.clay-well` panel holding `#receipt-status` ("Asking
   the server…") and a hidden `#receipt-body` `<dl>` with `#receipt-issued`,
   `#receipt-nonce`, `#receipt-signature`.

Frontmatter consts today: `name`, `tagline`, `title`, `description` — plain
consts, not marked as template slots, and no primary-action string exists.

**No button, no link of any kind on the page.** Backstage is unreachable from
the front door. `.clay-button` count in built index HTML today: zero.

The inline `<script>` runs once at module top level: fetches `/api/receipt`,
validates the payload shape (`isReceiptPayload`), fills the three `<dd>`s,
unhides `#receipt-body`; on failure rewrites `#receipt-status` to "The server
didn't answer just now — try a refresh." It is not re-invokable (no function
wrapper, no event wiring).

The `<style>` block is token-only (INVARIANT stated in-file: every value is a
`var(--…)`; retheme happens in tokens.css, never here). Existing classes:
`.eyebrow`, `.tagline`, `.lede`, `.receipt-*`.

## The clay vocabulary available (read-only context)

- `src/styles/base.css` defines `.clay-surface`, `.clay-well`, `.clay-button`
  (accent bg, raised shadow, `:active` recesses to inset, `--control-height`
  = 44px touch target), `.clay-chip`. `.clay-button` is element-agnostic
  (`display:inline-flex` etc. — works on `<a>` or `<button>`).
- `src/styles/tokens.css` supplies `--measure`, `--color-accent`,
  `--control-height`, spacing/type scales. Both files are **out of scope to
  edit** (story: "clay tokens/primitives are read-only context").

## Backstage — the destination (read-only)

`src/pages/backstage.astro` is already verb-forward ("Pass a link or a note
straight to the team", "Hand it over", "Send it over") and passcode-gated at
submit time (server-side `x-demo-passcode` header check; page view itself is
a free static asset). Its labels are the house's existing "leave-a-note"
vocabulary to align with. It contains two `.clay-button`s — irrelevant to AC
2, which counts only the index page.

## Observers of the index surface

- **tests/demo-flow.spec.ts** (healthy + stalled projects): asserts
  `getByRole('heading', { name: 'Demo Runway' })` visible after commit-wait
  goto, then `#receipt-body` visible / `#receipt-status` hidden /
  `#receipt-nonce` = 32-hex / `#receipt-signature` = 64-hex within
  `FLOW_BUDGET_MS.receiptStep` (5s). **These selectors and the h1 text are a
  contract the recomposition must not break.** The stalled project stalls
  `**/api/receipt` and expects the page to hold its loading state.
- **tests/support/flow-contract.ts**: budgets and step names. T-005-01-02
  (dependent ticket) will add a labeled-action assertion *there* — this
  ticket only needs to leave stable labels and DOM hooks for it.
- **Leak check** (`scripts/leak-check.ts` → `src/lib/leak-check.ts`): scans
  every file in `dist/` (excluding `_worker.js` and top-level metadata) plus
  the raw `/api/receipt` response body for the `DEMO_SIGNING_KEY` string
  (from env or `.dev.vars`). Needs a running server (default
  `http://localhost:4321`, override via `DEMO_BASE_URL`/`LEAK_CHECK_URL`).
  Exit 0 clean / 1 leak / 2 misconfigured. It greps for the signing key, not
  the passcode — the AC's "no passcode or team-internal detail" additionally
  binds the *copy we write* (nothing on the public page may mention or hint
  the passcode value or internal workflow detail).
- **Build**: `npm run build` = `astro build` (Astro 7, `@astrojs/cloudflare`
  adapter; index prerenders to a static asset in `dist/`).

## Story & epic constraints (S-005-01 / E-005)

- Scope is `index.astro` end to end; `backstage.astro`, all of `src/lib/*`,
  and the clay tokens/primitives are read-only context.
- **One new primary-action affordance** — story wording, singular.
- Copy stays **template placeholder with obvious slots** (N1): the generated
  demo's real name and primary action are named by the idea, not pre-baked.
- No CMS/content tooling (N5). Playwright may later check the action exists
  and responds, not that the page convinces (N4).
- T-005-01-02 (Playwright assertion) and T-005-01-03 (projector/phone
  cold-read pass) both depend on this ticket's settled labels and DOM hooks.
- Epic phrasing for labels: "Watch the server answer", "Leave a note for the
  team" — verb-forward examples the tickets reuse.

## Brand voice constraints (user-global CLAUDE.md, binding)

- Parlor, not portfolio: arrange for the visitor's benefit, warm host energy.
- Plain kitchen-table English; no category jargon in visitor-facing copy.
- **Names are wayfinding**: the h1 stays the grab-able name (`Demo Runway` —
  also pinned by the Playwright heading assertion); verbs belong in the
  labels around it.
- Labels orient by what you'd DO: verb-forward eyebrows/descriptors.
- What looks pressable is pressable: a `.clay-button` must genuinely act.

## Assumptions surfaced

- "Exactly one clay-button" is scoped to the index page's built HTML; the
  backstage link therefore must **not** be styled as `.clay-button`.
- The receipt card's existing IDs and the one-shot fetch behavior (including
  the stalled-project loading state) must survive recomposition.
- `.dev.vars` exists locally with `DEMO_SIGNING_KEY`, so the leak check can
  run against a local `wrangler dev`/`astro preview`-equivalent server.
- The h1 "Demo Runway" doubles as the name slot value; the test pins the
  rendered text, not the const's existence — lifting it into a marked slot
  const that renders the same string is safe.

## Files relevant to this ticket

| File | Role here |
| --- | --- |
| `src/pages/index.astro` | The only file expected to change |
| `src/styles/base.css`, `src/styles/tokens.css` | Clay primitives/tokens — consume, don't edit |
| `src/pages/backstage.astro` | Link target + vocabulary source — don't edit |
| `tests/demo-flow.spec.ts`, `tests/support/flow-contract.ts` | Contracts to keep green — don't edit (T-005-01-02 owns them) |
| `scripts/leak-check.ts`, `src/lib/leak-check.ts` | Verification gate — don't edit |
