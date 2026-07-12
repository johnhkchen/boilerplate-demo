# Research — T-010-01-01

## Ticket frame

- Ticket: `T-010-01-01`, `define-boundary-contract-and-receipt-instance`.
- Parent story: `S-010-01`, `declared-boundary-contract`.
- Current phase at assignment start: `research`.
- The ticket has no dependencies.
- The work is the first dependency for the later Node harness, browser flow, and
  swap-proof stories in epic `E-010`.
- The ticket owns a declaration artifact, not a consumer migration.
- The acceptance command is a focused `node --test` invocation over a new test.
- The acceptance also requires a source grep proving the new module has no
  `node:*` imports.

## Problem already present in the repository

- The shipped integration harness describes one concrete receipt throughout.
- `/api/receipt` is repeated in server checks, flow checks, documentation, and
  test configuration.
- `DEMO_SIGNING_KEY` is the receipt route's out-of-band verification secret.
- `src/lib/ops-check.ts` currently owns its own receipt response narrowing.
- `src/lib/ops-check.ts` imports `BOUNDARY_NAME`, `verifyReceipt`, and `Receipt`
  directly from `src/lib/receipt.ts`.
- `tests/demo-flow.spec.ts` directly names the receipt DOM and expected patterns.
- `tests/support/flow-contract.ts` repeats the primary action accessible name.
- Those consumers are deliberately outside this ticket's edit boundary.
- The new declaration is therefore additive during this ticket.
- No current behavior changes merely because the declaration exists.

## Governing scope

- `docs/active/stories/S-010-01.md` defines the source scope precisely.
- It calls for `src/lib/boundary-contract.ts`.
- That module defines the portable `BoundaryContract` shape.
- It exports `receiptBoundary`, the first concrete instance.
- The instance is built from pure helpers in `src/lib/receipt.ts`.
- This ticket must not edit check scripts.
- This ticket must not edit `src/lib/ops-check.ts` or
  `src/lib/integration-check.ts`.
- This ticket must not edit `tests/demo-flow.spec.ts`.
- This ticket must not edit `tests/support/flow-contract.ts`.
- This ticket must not edit the receipt route or page.
- It must not add a second shipped boundary.

## Existing receipt implementation

- `src/lib/receipt.ts` is framework-free.
- It imports no Node modules.
- It uses platform Web Crypto through global `crypto`.
- It exports `BOUNDARY_NAME` with value `receipt`.
- It exports the `Receipt` interface.
- A receipt contains six response fields:
  - `boundary`;
  - `issuedAt`;
  - `nonce`;
  - `algorithm`;
  - `signature`;
  - `keySource`.
- `algorithm` is the literal `HMAC-SHA256`.
- `keySource` is the literal `server-env`.
- `nonce` is lowercase hex from 16 random bytes.
- A generated nonce is therefore 32 hexadecimal characters.
- `signature` is the lowercase hexadecimal encoding of HMAC-SHA256.
- A generated signature is therefore 64 hexadecimal characters.
- The canonical signed message joins `boundary`, `issuedAt`, and `nonce`.
- `makeReceipt(key)` creates a genuinely signed receipt.
- `verifyReceipt(key, receipt)` recomputes the HMAC and compares signatures.
- Neither helper reads environment variables.
- Their parameters make them suitable for a pure declaration instance.

## Existing fault helper

- `src/lib/fault.ts` exports `corruptSignature(receipt)`.
- The function maps every hexadecimal digit to a different hexadecimal digit.
- It retains signature length and lowercase-hex shape.
- It leaves all other receipt fields unchanged.
- A corrupted receipt therefore remains shape-valid.
- Its signature no longer verifies against the original key.
- The helper is a direct fit for the verification rejection acceptance case.
- The production boundary declaration need not import the fault helper.
- The new test can use it to create a realistic invalid-signature fixture.

## Current server edge

- `src/pages/api/receipt.ts` serves the exemplar.
- Its public path is `/api/receipt`.
- It reads the signing key from `env.DEMO_SIGNING_KEY`.
- It calls `makeReceipt` for the healthy response.
- The route also supports explicit fault modes, but those modes are not part of
  the declaration introduced by this ticket.
- The ticket does not change the route response or signing algorithm.

## Current page landmark

- `src/pages/index.astro` declares the display name `Demo Runway`.
- The display name renders in the page's `h1`.
- The receipt card heading is `A fresh signed note`.
- The current healthy flow locates the page heading `Demo Runway`.
- The page's primary action label is `Ask for a fresh note`.
- That label is also the button's accessible name.
- The status element selector is `#receipt-status`.
- The response body selector is `#receipt-body`.
- The nonce evidence selector is `#receipt-nonce`.
- The signature evidence selector is `#receipt-signature`.
- The healthy flow expects the nonce to match `/^[0-9a-f]{32}$/`.
- The healthy flow expects the signature to match `/^[0-9a-f]{64}$/`.
- The page fetches `/api/receipt` on load and on primary-action activation.
- These values are existing literals to declare, not new user-facing copy.

## Current flow contract

- `tests/support/flow-contract.ts` centralizes test project names, step labels,
  budgets, and the local base URL.
- It repeats `Ask for a fresh note` as `PRIMARY_ACTION_NAME`.
- The later `S-010-03` story will re-export declaration values through that
  support module.
- This ticket leaves that repeated value in place temporarily.
- The later flow story needs the declaration to expose:
  - a heading;
  - a status selector;
  - a body selector;
  - evidence selectors and match patterns;
  - the primary action accessible name.
- The later flow can derive a stalled-route glob from the declared path.

## Current operation-check shape guard

- `src/lib/ops-check.ts` contains a private `assertReceiptShape` function.
- It rejects non-object and null bodies.
- It checks nonempty string values for `boundary`, `issuedAt`, `nonce`, and
  `signature`.
- It checks `boundary` equals `receipt`.
- It does not currently validate hexadecimal form or length.
- It does not currently validate `algorithm` or `keySource`.
- The ticket acceptance is stricter than this private guard.
- The later Node harness story will replace this private guard with the new
  contract's `assertShape` function.
- Until that migration, both guards coexist.

## Required portable contract data

- The epic describes the contract as boundary-owned and machine-checkable.
- The parent story names the contract members:
  - declared path;
  - key environment variable name;
  - `assertShape(body)`;
  - `verify(key, body)`;
  - page landmark information.
- Downstream story language explicitly refers to `contract.name`.
- Downstream story language explicitly refers to `contract.path`.
- The key declaration must identify `DEMO_SIGNING_KEY` without reading it.
- `assertShape` must transform an `unknown` body into a typed boundary body or
  throw.
- `verify` is asynchronous because Web Crypto signing is asynchronous.
- The shape should be generic over the response body so later tests can supply a
  fake alternate boundary type.
- Landmark evidence needs to pair each selector with its own expected pattern.
- Regular expressions are portable JavaScript values and require no Node import.

## Test conventions

- Unit tests live under `test/`.
- Most are `.test.mjs` files using `node:test` and `node:assert/strict`.
- TypeScript source is loaded directly by Node with
  `--experimental-strip-types`.
- Tests import source files with explicit `.ts` extensions.
- Existing receipt tests generate real signed fixtures with `makeReceipt`.
- Existing fault tests use `corruptSignature` to preserve shape while breaking
  verification.
- Tests generally use concise behavior-oriented names.
- The package's aggregate `npm test` command enumerates test files explicitly.
- The ticket asks for `node --test over a new boundary-contract test`; it does not
  explicitly require adding that test to the aggregate list.
- Repository convention nevertheless makes aggregate registration relevant if
  the new coverage is expected to run under `npm test` and `npm run verify`.

## TypeScript environment

- The project uses ESM (`"type": "module"`).
- TypeScript extends Astro's base configuration.
- Current library imports use explicit `.ts` extensions in pure modules.
- `src/lib/receipt.ts` already typechecks against platform Web Crypto globals.
- The package requires Node 22.12 or newer.
- No additional dependency is needed.
- No generated types are needed for this declaration.

## Copy-standard applicability

- `docs/knowledge/copy-voice-standard.md` was read because the contract stores
  existing user-facing strings.
- This ticket does not add or change rendered copy.
- It declares current copy literals for later test consumption.
- Affected declared surfaces are:
  - display-name/`h1` landmark: `Demo Runway`;
  - button label/accessibility name: `Ask for a fresh note`.
- `Demo Runway` is 2 words and 11 characters, within the display-name limits.
- `Ask for a fresh note` is 5 words and 20 characters, within the action-label
  limits.
- The button label begins with the specific action verb `Ask`.
- Selector strings, paths, environment variable names, and regex patterns are
  machine values and outside the copy envelope.
- No page cold-read is required because no public surface changes in this ticket.

## Repository state and boundaries

- The working tree was already dirty when this attempt began.
- Existing modified files include Lisa configuration/hooks and the active ticket.
- Existing untracked Lisa hook files are unrelated to this ticket.
- Those files must be preserved and excluded from ticket commits.
- The attempt-private work directory contains the assignment launcher and
  assignment text.
- Phase artifacts must be written only under the attempt-private work directory.
- Lisa owns publication to `docs/active/work/T-010-01-01/`.
- Lisa owns ticket phase/status transitions.
- Ticket source commits must use `lisa commit-ticket` with exact include paths.

## Acceptance observations

- A valid fixture must come from `makeReceipt`, not a hand-shaped object.
- Wrong-boundary rejection must isolate a changed `boundary` field.
- Missing-field rejection should cover at least one required response field.
- Blank-field rejection is part of the parent story's wording and is compatible
  with the ticket's missing-field case.
- Non-hex rejection must cover both nonce and signature to lock both evidence
  rules.
- Shape validation must not perform signature verification; a corrupted
  signature remains well-shaped hex and is rejected by `verify`, not
  `assertShape`.
- Verification must return `true` for the valid receipt.
- Verification must return `false` for the corrupted receipt.
- A source grep for `node:` in imports must be empty.

## Constraints and assumptions

- The declaration is static repository configuration, not environment access.
- The contract must remain importable by browser-oriented Playwright support as
  well as Node scripts.
- Browser portability excludes Node built-in imports from the new module.
- The receipt helpers are already portable and are the only needed dependency.
- Exact response shape can reject malformed objects without rejecting additional
  diagnostic fields; the current fault leak mode adds a field to a valid receipt.
- Extra-field policy is not specified by this ticket.
- Runtime schema libraries are absent and unnecessary for six fixed fields.
- Error text is operator/test evidence, not rendered visitor copy.
- No consumer is expected to read this declaration until later dependent tickets.
