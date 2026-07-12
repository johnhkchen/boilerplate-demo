# Progress — T-010-02-02

## Status

Implementation, verification, and the Lisa source commit are complete. The four
ticket-owned script files are clean. No ticket frontmatter or shared work artifact was
edited by this attempt.

## Completed implementation

### Operation executable

- Updated `scripts/ops-check.ts`.
- Parameterized `.dev.vars` key lookup with a key environment name.
- Replaced the parsed-name comparison literal with the helper argument.
- Replaced the default route suffix with `receiptBoundary.path`.
- Normalized a trailing `DEMO_BASE_URL` slash before appending the declared path.
- Replaced direct key lookup with `process.env[receiptBoundary.keyEnv]`.
- Passed the same declared key name to `.dev.vars` fallback lookup.
- Preserved `OPS_CHECK_URL` precedence, timeout behavior, core call, formatting, and exits.

### Leak executable

- Updated `scripts/leak-check.ts`.
- Imported the current `receiptBoundary` declaration.
- Parameterized `.dev.vars` key lookup with `keyEnv`.
- Replaced the default response suffix with `receiptBoundary.path`.
- Replaced direct key lookup with the declaration's key name for both process and file
  sources.
- Preserved `LEAK_CHECK_URL`, bundle directory, timeout, formatter, and exit behavior.

### Integration executable

- Updated `scripts/integration-check.ts`.
- Added a type-only `BoundaryContract` import.
- Defined a local `RuntimeBoundary` pick containing only `path` and `keyEnv`.
- Changed `resolveConfig` to receive the runtime declaration and dynamically read its key.
- Changed temporary Wrangler config creation to receive the declaration and use a computed
  `vars` property.
- Changed `commandFor` to receive the declaration.
- Built a single `boundaryUrl` from `config.baseUrl` and `contract.path`.
- Assigned that URL to operation `OPS_CHECK_URL` and leak `LEAK_CHECK_URL`.
- Assigned the signing key to the child environment at `[contract.keyEnv]`.
- Left flow configuration base-only as required by the story boundary.
- Passed `receiptBoundary` from `main` at every runtime helper call.
- Preserved deadlines, build/server lifecycle, fault injection, redaction, reports, and cleanup.

### Release helper

- Updated `scripts/release-shared.ts`.
- Replaced the local smoke-check route suffix with `receiptBoundary.path`.
- Replaced the deployed hostname verification suffix with `receiptBoundary.path`.
- This closes the acceptance criterion's recursive `scripts/` grep boundary.
- No release control flow or public function signature changed.

## Plan deviations

- No material implementation deviation.
- No new unit test was added because the changed helpers are private executable-edge code,
  and importing the integration script would execute its lifecycle.
- This matches the planned test design: exact source scans plus the self-contained executable
  integration check directly prove the configuration wiring.
- The integration run generated its normal ignored build/report outputs; none is a ticket
  source path or commit input.

## Static verification

Command:

```sh
rg -n '/api/receipt' scripts
```

Result: no matches, exit status consistent with an empty grep.

Command:

```sh
rg -n 'DEMO_SIGNING_KEY' \
  scripts/ops-check.ts scripts/leak-check.ts scripts/integration-check.ts
```

Result: no matches. All three executable edges resolve the current key name through the
declaration.

Command:

```sh
git diff --check
```

Result: passed.

Diff scope before commit:

- 4 files changed;
- 39 insertions;
- 21 deletions;
- only the four planned script paths modified by this ticket.

## Focused verification

Command:

```sh
node --experimental-strip-types --test \
  test/boundary-contract.test.mjs \
  test/ops-check.test.mjs \
  test/leak-check.test.mjs \
  test/integration-check.test.mjs \
  test/fault.test.mjs
```

Result:

- 42 tests passed;
- 0 failed;
- 0 skipped;
- declaration, operation, leak, integration, and fault behavior all green.

## Full unit verification

Command:

```sh
npm test
```

Result:

- 180 tests passed;
- 0 failed;
- 0 cancelled;
- 0 skipped.

## Type and framework verification

Command:

```sh
npm run typecheck
```

Result:

- Astro check: 63 files, 0 errors, 0 warnings, 0 hints;
- TypeScript no-emit check: passed;
- Wrangler generated types check: passed and current.

Observed notice:

- Astro printed the existing deprecated `session.driver` string-signature notice.
- It is unrelated to ticket paths and did not affect exit status.

## Executable integration verification

Command:

```sh
npm run integration:check
```

Result: passed in 4.4 seconds within the 45-second budget.

Child evidence:

- `npm run ops:check`: passed; receipt signature verified with the out-of-band key.
- `npm run test:flow -- --project=healthy` through the configured npm script: one healthy
  test passed and the stalled-only case was correctly skipped.
- `npm run leak:check`: passed; 27 client assets and 1 response body checked.
- Normalized operation, flow, and leak results all reported passed.
- Report was written to the normal ignored `test-results/integration-report.json` path.
- Owned server shutdown and temporary config cleanup completed.

Observed non-failing notices:

- The same pre-existing Astro session deprecation appeared during build/server startup.
- The inspector selected an alternate port because 9229 was occupied.
- Playwright noted `NO_COLOR` was overridden by `FORCE_COLOR`.
- None is caused by or relevant to the declaration wiring.

## Acceptance mapping

- `npm run ops:check` passes against the receipt dev server: proven as the integration
  operation child.
- `npm run leak:check` passes against the same server: proven as the integration leak child.
- `npm run integration:check` passes: proven directly.
- `grep -rn '/api/receipt' scripts/` is empty: proven with the equivalent recursive ripgrep.
- Integration `commandFor` builds both named child URLs from `contract.path`: implemented
  through one `boundaryUrl` and inspected in the final diff.
- All three executable edges resolve the signing-key environment name from the declaration.

## Repository hygiene before commit

- Ordinary Git index contains no staged paths.
- Ticket source changes are limited to:
  - `scripts/ops-check.ts`;
  - `scripts/leak-check.ts`;
  - `scripts/integration-check.ts`;
  - `scripts/release-shared.ts`.
- Unrelated Lisa, Codex, ticket metadata, hooks, provenance, and lock changes remain untouched.
- Attempt-private phase artifacts are excluded from the source commit.

## Source commit

- Commit: `90cf61c6524ef63b895dae08cf129ee63346ea7e`.
- Message: `refactor: resolve checks from boundary declaration`.
- Mechanism: `lisa commit-ticket` with all four exact script include paths.
- Commit stat: 4 files changed, 39 insertions, 21 deletions.
- Post-commit exact-path status: clean.
- Post-commit ordinary index: empty.

## Remaining work

- Write `review.md` with the final acceptance and handoff assessment.
- Stop on this ticket after Review while Lisa completes publication and seat handling.
