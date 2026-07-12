# Research — T-010-03-01

## Ticket position

- Ticket: `T-010-03-01`, `flow-reads-declared-landmark`.
- Parent story: `S-010-03`.
- Current phase at assignment start: Research.
- Dependency: `T-010-01-01`.
- The dependency is complete at repository commit `ba3f399`.
- Its source commit is `55f1f18`, which introduced the portable boundary declaration.
- The ticket acceptance checks the healthy and stalled Playwright projects.
- It also requires a zero-result literal grep over `tests/demo-flow.spec.ts`.
- The grep literals are `Demo Runway`, `#receipt-`, and `/api/receipt`.
- The heading and primary-action name must have one definition in
  `src/lib/boundary-contract.ts` and be re-exported through
  `tests/support/flow-contract.ts`.

## Repository state

- The working tree was already dirty before ticket-owned source work.
- Modified infrastructure paths include `.codex/hooks.json`, `.lisa.toml`,
  `.lisa/.gitignore`, `.lisa/hooks/on-heartbeat.sh`, and `.lisa/provenance.jsonl`.
- Modified board paths include the tickets for `T-010-02-01` and this ticket.
- Untracked Lisa infrastructure includes `.lisa-commit.lock` and two hook files.
- Those paths are automation-owned or unrelated and must remain untouched.
- No ticket-owned flow source file is currently modified or staged.
- Phase artifacts belong in this attempt-private work directory.
- Lisa, not this attempt, publishes admitted artifacts to `docs/active/work`.

## Existing boundary declaration

- `src/lib/boundary-contract.ts` is an I/O-free TypeScript module.
- It imports the receipt boundary name and verification helper from
  `src/lib/receipt.ts`.
- It exports `BoundaryEvidence`.
- A boundary evidence record has `name`, `selector`, and `pattern` fields.
- It exports `BoundaryLandmark`.
- A boundary landmark has `heading`, `statusSelector`, `bodySelector`,
  `evidence`, and `primaryActionName` fields.
- It exports generic `BoundaryContract<Body>`.
- A boundary contract has server identity and response behaviors plus a
  `landmark` record.
- The concrete `receiptBoundary` instance is the current exemplar declaration.
- Its path is `/api/receipt`.
- Its heading is `Demo Runway`.
- Its status selector is `#receipt-status`.
- Its body selector is `#receipt-body`.
- Its evidence list declares nonce and signature rows.
- The nonce selector is `#receipt-nonce` with a 32-character lowercase-hex regex.
- The signature selector is `#receipt-signature` with a 64-character
  lowercase-hex regex.
- Its primary action name is `Ask for a fresh note`.
- These values are already covered by `test/boundary-contract.test.mjs`.

## Existing flow support boundary

- `tests/support/flow-contract.ts` is imported by Playwright configuration and
  both public and backstage browser specs.
- It exports project names, report step names, budgets, the local base URL, and
  the backstage passcode.
- It currently defines `PRIMARY_ACTION_NAME` as its own string literal.
- The identical string also exists in `receiptBoundary.landmark`.
- Its comment says generated demos must update the constant when renaming the
  page template slot.
- That comment describes the pre-declaration coupling between page and test.
- The support module currently does not import `receiptBoundary`.
- The support module contains no Node-only imports or runtime I/O.
- `playwright.config.ts` reads only budgets, projects, base URL, and backstage
  passcode from it.
- `tests/backstage-flow.spec.ts` reads backstage-specific exports from it.
- Therefore adding receipt-flow exports does not alter those consumers unless
  their existing names or values change.

## Existing public flow spec

- `tests/demo-flow.spec.ts` runs under both `healthy` and `stalled` projects.
- Project guards ensure each test runs only in its named project.
- Both tests use `FLOW_STEP` names and nested time budgets.
- Both navigate with `waitUntil: 'commit'`.
- Both locate the primary heading with a hard-coded accessible name.
- Both locate the primary action with `PRIMARY_ACTION_NAME` from flow support.
- The healthy receipt step hard-codes the body and status selectors.
- It also hard-codes nonce and signature selectors and their regex patterns.
- The healthy action step hard-codes the nonce selector three more times.
- The stalled setup hard-codes a `**/api/receipt` route glob.
- The stalled observation and action steps hard-code status and body selectors.
- The comments also contain `/api/receipt` and `#receipt-` literals.
- Acceptance grep scans comments as well as executable code.
- Passing that grep therefore requires the spec to avoid those strings entirely.

## Healthy flow behavior

- The page commits its static HTML before the initial boundary response settles.
- The declared heading is used as proof that the static shell parsed.
- Success is observed when the declared body becomes visible.
- The declared status becomes hidden on success.
- Evidence values are checked against receipt-specific format regexes.
- The primary action must be visible and enabled.
- Before activation, the spec captures the current nonce value.
- After activation, a different nonce is page-visible proof of a new response.
- The nonce is then checked against the same receipt format again.
- The action must re-enable after the round trip completes.

## Stalled flow behavior

- Playwright registers an unresolved route handler before navigation.
- The route glob is derived conceptually from the same endpoint used by the page.
- The initial request remains in flight for the test duration.
- The static heading must still appear.
- The status must remain visible.
- The body must remain hidden.
- The action must exist under its accessible name and begin enabled.
- Clicking it creates another unresolved request and disables the action.
- The stalled narration and hidden body remain observable after activation.

## Page implementation relationship

- `src/pages/index.astro` still owns the rendered heading, action label, DOM IDs,
  and fetch path as page implementation literals.
- This ticket's acceptance targets only the browser flow spec and flow support.
- The page is not currently generated from `receiptBoundary`.
- The dependency established a declaration for checks to consume; it did not
  rewire the page.
- A mismatch between page and declaration should make the browser flow fail.
- That failure is the contract enforcement mechanism for this story.

## Test configuration and commands

- `npm run test:flow` invokes Playwright project `healthy`.
- `npm run test:flow:stalled` invokes Playwright project `stalled`.
- Both projects match only `tests/demo-flow.spec.ts`.
- Playwright owns a local Astro server on port 4323 unless an external base URL
  is supplied.
- The server receives a deterministic local signing key.
- The test timeout is 35 seconds and the global run timeout is 60 seconds.
- Receipt and action steps each have 5-second inner budgets.
- Traces are retained on failure.
- The expected acceptance state is green for both projects.

## Existing coverage

- `test/boundary-contract.test.mjs` locks all receipt landmark values.
- It maps evidence regexes through `.source` for deterministic comparisons.
- It also covers response shape and signature verification behavior.
- There is no focused unit test for flow-support re-exports.
- The Playwright specs exercise the support constants at runtime.
- TypeScript compilation covers imports and inferred readonly declaration shapes.
- The ticket's grep is a source-level architectural check distinct from runtime
  behavior.

## Copy standard applicability

- The copy voice and length standard applies because heading and accessible
  action strings are user-facing, even when referenced by tests.
- This ticket does not require changing either rendered string.
- `Demo Runway` is a two-word, 11-character display name.
- It satisfies the display-name landmark envelope and names-as-wayfinding rule.
- `Ask for a fresh note` is five words and 20 characters.
- It satisfies the action-label envelope and begins with the specific verb
  `Ask`.
- No dynamic visitor state, metadata, or adjacent explanation changes are in
  the ticket scope.

## Constraints and assumptions

- The declaration remains the source of truth for test-facing receipt landmarks.
- The generic evidence array order is stable: nonce first, signature second.
- The healthy flow needs one evidence item as the freshness witness.
- The current first evidence record is the nonce and changes on every response.
- All evidence records can be asserted with their declared regexes.
- Playwright accepts a `RegExp` directly in `toHaveText`.
- A route glob can be represented as a string built from the declared path.
- The flow support module is the intended import boundary for browser specs.
- Source commits must use `lisa commit-ticket` with exact repository-relative
  include paths.
- Ordinary `git add` and `git commit` are prohibited for ticket work.
