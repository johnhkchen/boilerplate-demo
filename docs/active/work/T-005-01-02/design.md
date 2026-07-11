# T-005-01-02 — playwright-labeled-action-assertion — Design

Decisions grounded in research.md. Four questions had real alternatives.

## Q1 — What does "the stalled variant passes" assert?

The stalled project currently fails by construction (its original
T-002-02-01 role: demonstrate bounded failure). The AC supersedes that:
all projects must pass. Options:

**A. Expected-failure annotation (`test.fail()` on stalled).** Preserves
the always-red demonstration; the run goes green because the failure is
declared expected. Rejected: it asserts *nothing* about the stalled page
(any failure satisfies it — a blank page would pass), burns the full 5–8s
timeout on every run, and its passes-when-it-fails semantics are exactly
the kind of subtlety the next reader re-diagnoses. The AC's "the existing
signed-receipt steps stay green … and a new budgeted step …" reads as real
assertions, not an expectation inversion.

**B. Assert the stalled page's observable truth (chosen).** When
`/api/receipt` never answers, what is observably true: the static shell
parsed (heading visible), `#receipt-status` stays visible narrating the
wait, `#receipt-body` stays hidden, and the labeled primary action exists
and *still responds to activation* (its click handler runs synchronously —
the button observably disables and the narrated loading state holds while
the stalled round trip hangs). This converts the variant from a
demonstration-by-failure into a positive assertion of the same property —
"failure is observable and bounded" — and keeps the run green. This is the
faithful translation of the variant's purpose under the new contract, and
it directly advances P2 (works observably) and P3 (responds safely even
when the boundary is down).

**C. Delete the stalled project.** Out of scope — `playwright.config.ts`
is read-only for this ticket, and the variant still earns its keep under B.

## Q2 — One branching test or two guarded tests?

**A. Single test, branch per project inside steps** (current pattern —
the `page.route` guard already branches). Rejected: with B from Q1, two of
three steps would diverge; the test title "renders the signed receipt"
becomes false for stalled; traces and failures get harder to read.

**B. Two tests in the same spec, each guarded to its project (chosen).**
The existing test keeps its title, steps, and selectors verbatim (AC:
"existing signed-receipt steps stay green"), gains only the guard and the
new primary-action step, and runs on `healthy`. A second test — "the
stalled boundary stays narrated and the labeled action still answers" —
runs on `stalled`. The skip-guard idiom is already established in
`backstage-flow.spec.ts` (`test.skip(testInfo.project.name !== …)`).
Cost: the other project reports one "skipped" per run; acceptable — the
report stays legible and each test is a straight line.

**C. Separate spec files per project.** Rejected: needs `testMatch`
changes in the read-only config.

## Q3 — What counts as "observes a response" for the primary action?

Constraint from the story's honest boundary: existence and response only —
no convincingness claim.

- **Healthy (chosen): the nonce changes.** Capture `#receipt-nonce` text
  before activation; after clicking, expect it to differ and still match
  `/^[0-9a-f]{32}$/`, and expect the button re-enabled (round trip
  complete, action re-armed). Every `/api/receipt` GET mints a fresh
  32-hex nonce, so "text changed" is a page-visible proof the activation
  produced a *new* server answer (collision odds negligible). This is what
  the room sees, and it is exactly the assertion T-005-01-01's review
  handed off. Alternative — `page.waitForResponse('/api/receipt')` — sits
  at the network layer, not the page surface; the DOM signal subsumes it
  (the nonce cannot change unless the response landed). Not layered on
  top: one signal, closest to the visitor.
- **Stalled (chosen): the synchronous UI reaction.** After clicking,
  expect the button disabled (the handler ran; double-tap protection is
  live) and the loading narration held (`#receipt-status` visible,
  `#receipt-body` hidden). That is the whole honest claim available when
  the server never answers: the action *responded*, even though the
  boundary didn't.

## Q4 — Where does the label string contract live?

The accessible name "Ask for a fresh note" is authored in
`index.astro`'s `PRIMARY_ACTION_LABEL` frontmatter slot. A spec cannot
import an `.astro` frontmatter const. Options:

- **Hardcode in the spec.** Rejected: the ticket's job is to *pin the
  epic's contract*; contract strings in this repo live in
  `flow-contract.ts` (precedent: `BACKSTAGE_PASSCODE`, "the single value …
  so the gate and the form cannot drift").
- **Export from a shared `src/` module and import into both.** Rejected:
  `src/` is read-only for this ticket, and templating the page from a
  test-support file inverts the dependency.
- **Const in `flow-contract.ts`, with comments on both ends (chosen).**
  `PRIMARY_ACTION_NAME = 'Ask for a fresh note'` beside a comment naming
  `index.astro`'s slot as the authoring side. Deliberate duplication: if a
  generated demo renames the slot without updating the contract, the suite
  fails on a named step with a role/name locator in the message — that
  legible failure *is* the check working ("keep the main flow honest").
  The `index.astro` side already carries the "renaming here reshapes the
  surface" comment; no `src/` edit needed.

## Locator and budget choices

- Locator: `page.getByRole('button', { name: PRIMARY_ACTION_NAME })` —
  role-first, matching the backstage spec's idiom
  (`getByRole('button', { name: 'Send it over' })`). Accessible-name
  matching normalizes the whitespace Astro leaves around
  `{PRIMARY_ACTION_LABEL}`. Default (non-exact) name matching, same as the
  backstage precedent; the page has exactly one button, and strict-mode
  violation would surface any future ambiguity.
- Not `#primary-action`: the AC says "locates … by its accessible
  verb-forward name" — the id stays out of the locator so the assertion
  proves the *label*, not the plumbing. (The id remains T-005-01-01's
  documented hook; nothing here forbids future tests using it.)
- New step names in `FLOW_STEP`, following the existing plain-language
  pattern: `activateAction: 'activate the labeled primary action'` and
  `observeStall: 'observe the stalled boundary stays narrated'`.
- New budget `FLOW_BUDGET_MS.actionStep = 5_000` for the activation step —
  same class as `receiptStep` (one boundary round trip) but named for what
  it bounds, so a slow replay fails on its own line. Worst-case step sum
  per test: 10s + 5s + 5s = the existing 20s `test` cap — consistent; the
  cap only binds when something is already failing. The stalled test's
  state observation reuses `receiptStep` (it watches the same boundary
  wait). `globalTimeout` headroom improves: baseline burned 5–8s on the
  stalled timeout; the new stalled test settles in milliseconds.
- No copy-text pinning beyond the action label: asserting the literal
  "Asking the server…" string would couple the suite to copy the
  cold-read ticket (T-005-01-03) may still revise, and the AC pins only
  the action's name. Visibility of `#receipt-status` (whose only job is
  narration) carries the claim without the string.

## What this deliberately does not do

- No assertion that the page is convincing, pretty, or verb-forward in
  copy — N4 (not automated theater); that's the sibling cold-read ticket.
- No `#backstage-link` assertion — outside this AC.
- No changes to `playwright.config.ts`, `package.json` scripts, or
  `backstage-flow.spec.ts`.
- No new npm script for the stalled project — `test:flow:stalled` already
  exists and now goes green.

## Consequence for the suite's meaning (flagged for the human reviewer)

After this ticket, the repo no longer contains an always-red
demonstration run; T-002-02-01's "fails at the configured timeout" behavior
is retired in favor of a green assertion of the same observability
property. The stalled test itself documents this in a comment. If the
project ever wants the red-run demo back, it is one deliberate assertion
flip away — but the AC is unambiguous that green-on-all-projects is the
new contract.
