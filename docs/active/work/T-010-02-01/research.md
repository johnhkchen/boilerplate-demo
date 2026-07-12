# Research — T-010-02-01

## Assignment and phase

- The ticket starts in `research`.
- The assignment requires all six RDSPI phases in one continuous pass.
- Phase artifacts belong in this attempt-private directory.
- Lisa owns ticket phase and status transitions.
- Ticket-owned source commits must use `lisa commit-ticket` with exact paths.
- The repository already contains unrelated Lisa and Codex working-tree changes.
- Those unrelated paths must remain untouched and excluded from ticket commits.

## Ticket intent

- The task is the first half of story `S-010-02`.
- The story makes the Node check core consume a declared boundary contract.
- This ticket settles the core API before the following ticket rewires URL and key lookup.
- Acceptance requires a fake alternate contract to exercise `runBoundaryCheck`.
- The fake must pass with a well-formed, valid body.
- It must fail when the contract rejects the body shape.
- It must fail when the contract rejects the signature.
- `src/lib/ops-check.ts` must not import or mention the receipt-specific symbols named by acceptance.
- `src/lib/integration-check.ts` must meet the same symbol-level constraint.
- Existing ops and integration unit suites must remain green.

## Existing contract declaration

- `src/lib/boundary-contract.ts` was added by dependency `T-010-01-01`.
- It exports `BoundaryContract<Body>`.
- A contract declares `name`, `path`, and `keyEnv`.
- It declares `assertShape(body: unknown): Body`.
- It declares async `verify(key: string, body: Body): Promise<boolean>`.
- It also carries browser landmark data outside this ticket's core needs.
- The module exports `receiptBoundary` as the current concrete declaration.
- `receiptBoundary.assertShape` validates the complete receipt response.
- It checks boundary identity against the receipt declaration.
- It checks issued time presence, nonce shape, algorithm, signature shape, and key source.
- `receiptBoundary.verify` delegates to the existing receipt HMAC verifier.
- The contract module has no Node-only or I/O dependency.

## Existing ops core

- `src/lib/ops-check.ts` is intended to be pure and framework-free.
- It accepts URL, time budget, optional key, and injectable fetch.
- It delegates timing and failure normalization to `runOperation`.
- It currently imports `BOUNDARY_NAME`, `verifyReceipt`, and `Receipt`.
- It owns a private `assertReceiptShape` duplicate.
- That duplicate validates only four non-empty string fields and boundary identity.
- The declaration now has stricter and canonical shape validation.
- `runBoundaryCheck` names the operation with `BOUNDARY_NAME`.
- It fetches JSON and calls the private receipt assertion.
- With a key, it directly calls `verifyReceipt`.
- Without a key, shape acceptance is sufficient for a passed operation.
- The returned value currently exposes `receipt` and `signatureVerified`.
- `formatBoundaryTrace` prints the receipt's `issuedAt` and `nonce` fields.
- Those field reads make the formatter structurally receipt-specific.
- Failure output depends only on the operation trace.
- Passed output can remain useful with name, duration, and verification status.

## Existing integration core

- `src/lib/integration-check.ts` coordinates operation, flow, and leak command evidence.
- It has no need to inspect response bodies or signatures itself.
- It currently imports `BOUNDARY_NAME` solely to pin result identity.
- `IntegrationCheckResult.boundary` is typed as `typeof BOUNDARY_NAME`.
- Every passed, failed, timed-out, and skipped result stores `BOUNDARY_NAME`.
- Summary formatting reads the stored `check.boundary`.
- Report creation preserves that field while redacting output.
- Therefore the needed contract input is its declared `name`.
- The result type can use `string` because alternate contracts may declare any name.

## Callers and tests

- `scripts/ops-check.ts` calls `runBoundaryCheck` with only config today.
- `scripts/release-shared.ts` also calls it for release smoke checks.
- `scripts/integration-check.ts` calls `runIntegrationChecks` with only options.
- Story ticket `T-010-02-02` will later derive URLs and key environment names from the contract.
- This ticket still must settle required contract arguments at all compile-time callers.
- Passing `receiptBoundary` does not yet change their URL or key resolution.
- `test/ops-check.test.mjs` has eight receipt-based behavior tests.
- It asserts receipt operation names and reads the returned receipt.
- `test/fault.test.mjs` also invokes the ops core.
- `test/integration-check.test.mjs` has nine integration behavior tests.
- It currently relies on the implicit receipt name.
- `test/boundary-contract.test.mjs` already covers the concrete receipt contract.
- Package tests are explicitly enumerated in `package.json`.

## Genericity constraints

- A fake body need not have `issuedAt`, `nonce`, or other receipt fields.
- Generic return types must carry the contract's `Body` type.
- The core must call the supplied contract methods rather than reproduce their behavior.
- Shape assertion happens before signature verification.
- Verification is conditional on a non-empty out-of-band key, matching current behavior.
- The operation name must be available before fetch, including down-server and timeout cases.
- Therefore the supplied contract name must feed `runOperation` directly.
- A bad shape or false verification result should remain an operation failure.
- `runOperation` already removes stacks and distinguishes timeouts.
- Fetch injection and budget validation behavior should remain unchanged.

## Copy scope

- The copy standard was read as required by project guidance.
- The affected formatter is an operator-only CLI trace.
- Operator-only logs are explicitly outside the user-facing copy standard.
- No visitor-visible copy, accessible name, metadata, or dynamic UI state changes here.
- Existing concise, plain operational wording remains a useful local convention.

## Verification surface

- Direct alternate-contract tests prove actual dependency inversion.
- Existing receipt ops tests protect current behavior.
- Existing integration tests protect sequencing, deadlines, formatting, and reports.
- Fault tests protect corrupted-signature behavior through the concrete declaration.
- Type checking is important because TypeScript callers live outside the focused unit files.
- A source grep provides the exact named-symbol acceptance proof.
- `git diff --check` catches whitespace and patch errors.
- Full `npm test` is proportional because the shared check types have several callers.

## Working-tree constraints

- Pre-existing modified files include `.codex/hooks.json`, Lisa configuration/hooks,
  provenance, and active ticket files.
- An untracked Lisa lock and hooks also predate implementation.
- Phase publication may create shared work artifacts asynchronously.
- Only exact ticket-owned source paths may enter the Lisa source commit.
- Phase artifacts themselves remain outside that source commit.

## Research conclusion

- The portable declaration is already the canonical source for identity, shape, and verification.
- The ops core is coupled by imports, duplicated validation, types, and formatting field access.
- The integration core is coupled by one import, a literal-derived type, and repeated assignments.
- All direct callers are known and can supply the current declaration without doing the next ticket's URL/key work.
- No browser-flow, server response, cryptography, or visitor-copy change is required.
