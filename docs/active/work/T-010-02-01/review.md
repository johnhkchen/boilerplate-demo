# Review — T-010-02-01

## Outcome

The ticket is complete. The ops-check core now gets boundary identity, response shape,
and verification behavior from a required `BoundaryContract`. The integration coordinator
gets its result identity from a required declaration argument. Neither core contains the
receipt-specific symbols prohibited by acceptance.

## Source commit

- Commit: `0748d9c93fe707f476e9dcbe41d9c3444df0ab3a`.
- Message: `refactor: run checks from boundary contract`.
- Mechanism: `lisa commit-ticket` with exact include paths.
- Size: 8 files changed, 134 insertions, 78 deletions.
- All ticket-owned source paths are clean after the commit.

## Files changed

### `src/lib/ops-check.ts`

- Replaced receipt constant, type, verifier, and private assertion coupling with
  a type-only `BoundaryContract` dependency.
- Required callers to supply a contract.
- Made successful values/results generic over the asserted body.
- Stored the generic payload as `body`.
- Delegated JSON narrowing to `contract.assertShape`.
- Delegated keyed verification to `contract.verify`.
- Named traces with `contract.name`.
- Removed receipt-only timestamp and nonce reads from generic formatting.

### `src/lib/integration-check.ts`

- Removed the receipt identity import.
- Added a structural `BoundaryIdentity` input.
- Derived all result boundary values from the supplied name.
- Generalized the boundary result type to `string`.
- Left command evidence, deadlines, summaries, reports, and redaction intact.

### `test/ops-check.test.mjs`

- Migrated existing receipt cases to explicit `receiptBoundary` injection.
- Updated successful payload access to the generic `body` field.
- Added a fake alternate `parcel` contract.
- Proved valid shape plus valid verification passes.
- Proved wrong shape fails.
- Proved bad verification fails.
- Proved the alternate contract name reaches the operation trace.

### `test/integration-check.test.mjs`

- Migrated every call to explicit declaration injection.
- Strengthened the healthy case with a `parcel` identity.
- Proved operation, flow, and leak results all store the supplied name.
- Preserved existing receipt summary and report coverage elsewhere.

### `test/fault.test.mjs`

- Passed the concrete receipt declaration to the existing broken-signature check.
- Preserved the fault's cryptographic failure evidence.

### Executable callers

- `scripts/ops-check.ts`, `scripts/integration-check.ts`, and
  `scripts/release-shared.ts` now select `receiptBoundary` explicitly.
- Their current route and environment lookup behavior is unchanged.
- This is the minimum caller adaptation required by the new core API.

## Acceptance assessment

### Fake alternate contract

Passed. The fixture deliberately lacks receipt-only fields and supplies its own name,
shape assertion, and verification rule. The three required outcomes are directly asserted.

### Forbidden core symbols

Passed. Exact grep for `BOUNDARY_NAME`, `verifyReceipt`, and `assertReceiptShape` across
`src/lib/ops-check.ts` and `src/lib/integration-check.ts` returned no matches.

### Existing suites

Passed. Existing ops and integration behavior remains green after explicit declaration
injection. Fault coverage is also green.

## Verification evidence

- Focused ops/integration/fault suites: **25 passed, 0 failed**.
- Full repository unit suite: **180 passed, 0 failed**.
- Astro check: **0 errors, 0 warnings, 0 hints**.
- TypeScript no-emit check: passed.
- Wrangler generated types check: passed and current.
- Whitespace/error check: `git diff --check` passed.
- Post-commit exact-path cleanliness check: passed.

## Behavior preserved

- Invalid time budgets still reject as configuration errors.
- Fetch rejection still becomes a stack-free operation failure.
- Stalled fetch still becomes a bounded timeout.
- Non-OK HTTP status still names the status.
- Shape failure still rejects a bare 200 response.
- Keyless execution still passes only after structural assertion and reports unverified.
- Keyed false verification still fails with signature evidence.
- Integration failures still do not short-circuit ordinary later checks.
- Overall integration deadlines still settle abort-ignoring runners.
- Reports still redact the configured secret.

## Copy review

- No visitor-facing surface changed.
- The copy standard classifies operator-only logs as out of scope.
- Generic formatting remains concise, plain, and stack-free.
- Removing receipt-only detail avoids inventing a body-rendering convention not declared
  by `BoundaryContract`.

## Open concerns

- No critical issue or acceptance gap is open.
- The generic formatter reports verification status but intentionally does not render
  contract-specific body evidence. The current contract has no presentation callback.
- Script URLs and key environment lookup remain receipt literals by design. Ticket
  `T-010-02-02` owns deriving those values from `contract.path` and `contract.keyEnv`.
- The browser-flow slice remains independently literal until story S-010-03, as documented
  by the parent story's honest boundary.
- Astro's deprecated `session.driver` notice is pre-existing and unrelated.

## Scope and repository hygiene

- No server response, signing algorithm, browser flow, or visitor copy changed.
- Concurrent T-010-03 changes were visible but untouched and excluded.
- Lisa-managed ticket/frontmatter, hooks, provenance, lock, and shared artifact paths were
  excluded from the exact-path source commit.
- No ticket-owned file remains staged, modified, or untracked.

## Handoff

The core API is settled for the dependent script-rewiring ticket: executable edges can now
use the same declaration they already pass to resolve route and key configuration without
another core edit. Lisa can publish this review and complete the ticket lease.
