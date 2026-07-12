# Review — T-010-02-02

## Outcome

The ticket is complete. All Node check edges now derive the receipt boundary's route and
signing-key environment name from `receiptBoundary`. The integration command constructs
operation and leak child URLs from an explicitly supplied `contract.path`, and no
`/api/receipt` literal remains anywhere under `scripts/`.

## Source commit

- Commit: `90cf61c6524ef63b895dae08cf129ee63346ea7e`.
- Message: `refactor: resolve checks from boundary declaration`.
- Mechanism: `lisa commit-ticket` with exact repository-relative includes.
- Size: 4 files changed, 39 insertions, 21 deletions.
- All four ticket-owned source paths are clean after the commit.
- The ordinary Git index is empty.

## Files changed

### `scripts/ops-check.ts`

- Builds its default check URL from normalized `DEMO_BASE_URL` plus
  `receiptBoundary.path`.
- Preserves a full `OPS_CHECK_URL` override as highest precedence.
- Reads the process secret through `process.env[receiptBoundary.keyEnv]`.
- Parameterizes `.dev.vars` parsing by that same declared key name.
- Keeps timeout parsing, generic core invocation, output, and exit behavior unchanged.

### `scripts/leak-check.ts`

- Imports `receiptBoundary` as its concrete runtime declaration.
- Builds its default response URL from normalized base plus the declared path.
- Reads the process and `.dev.vars` secret through the declared key name.
- Preserves full URL override, bundle directory, timeout, core behavior, and exits.

### `scripts/integration-check.ts`

- Defines a local narrow runtime declaration type containing `path` and `keyEnv`.
- Passes that declaration into config resolution, temporary Wrangler config creation, and
  child command construction.
- Reads an externally supplied integration key through `contract.keyEnv`.
- Writes the generated/supplied key into temporary Wrangler vars at the declared name.
- Writes the key into child environments at the declared name.
- Builds one `boundaryUrl` from `config.baseUrl` and `contract.path` inside `commandFor`.
- Assigns the URL to both `OPS_CHECK_URL` and `LEAK_CHECK_URL`.
- Leaves the Playwright flow child base-only, matching the story's browser-slice boundary.
- Preserves build, lifecycle, timeout, redaction, report, and cleanup behavior.

### `scripts/release-shared.ts`

- Replaces the local release smoke route suffix with `receiptBoundary.path`.
- Replaces the deployed hostname poll route suffix with `receiptBoundary.path`.
- These two mechanical edits satisfy the exact recursive scripts grep.
- Existing release control flow and public functions are unchanged.

## Acceptance assessment

### Operation check passes

Passed. The self-contained integration lifecycle invoked `npm run ops:check` against its
receipt dev server. The check passed and verified the receipt signature with the
out-of-band key provided at the declaration's environment name.

### Leak check passes

Passed. The same lifecycle invoked `npm run leak:check` against the same server. It passed
after checking 27 browser assets and one raw response body.

### Integration check passes

Passed. `npm run integration:check` completed in 4.4 seconds within its 45-second budget.
Operation, healthy flow, and leak results all normalized to passed; report generation and
cleanup completed.

### No hardcoded receipt route in scripts

Passed. Recursive ripgrep for `/api/receipt` under `scripts/` returned no matches after the
edit and again after the source commit.

### `commandFor` uses the declaration

Passed. `commandFor(check, config, contract)` constructs
`${config.baseUrl}${contract.path}` once and assigns it to both child URL variables. It also
places the signing key at `[contract.keyEnv]` in the shared child environment.

## Test coverage

### Focused suite

- 42 passed, 0 failed.
- Covered boundary declaration values and verification.
- Covered generic ops check success/failure/timeout/alternate contract behavior.
- Covered leak asset/response evidence and failure safety.
- Covered integration ordering, timeout, failure classification, report metadata, and
  redaction.
- Covered concrete receipt fault behavior.

### Full unit suite

- 180 passed, 0 failed, 0 skipped.
- Confirms no regression across the repository's complete enumerated Node suite.

### Type and framework checks

- Astro: 63 files, 0 errors, 0 warnings, 0 hints.
- TypeScript no-emit: passed.
- Wrangler generated types: passed and current.
- `git diff --check`: passed before commit.

### Executable coverage

The integration command is the most relevant runtime evidence because it:

1. builds the current application;
2. creates isolated Wrangler vars using the declared key name;
3. starts the current receipt server;
4. invokes the exact operation npm script with a declaration-derived URL;
5. runs the current healthy browser flow;
6. invokes the exact leak npm script with the same declaration-derived URL;
7. records normalized results;
8. terminates the server and removes temporary configuration.

## Behavior preserved

- Check-specific full URL overrides still win over base-derived defaults.
- `DEMO_BASE_URL` remains the common base override.
- A trailing base slash no longer creates a double slash in ops-check; leak-check retains
  its prior normalization.
- Missing or malformed `.dev.vars` remains a tolerant keyless path for ops-check.
- Leak-check still fails safely when no usable secret reaches its core.
- Integration still generates a random key when its declared environment entry is absent.
- Fault vars still compose with the computed signing-key property.
- Secrets remain redacted from captured output and reports.
- Browser-flow route literals remain outside this story slice as explicitly documented.

## Copy review

- No visitor-facing copy, accessible name, metadata, or dynamic UI state changed.
- One operator-oriented source comment was made declaration-neutral.
- CLI output remained unchanged.
- The project copy standard did not govern any edited product surface.

## Open concerns and limitations

- No critical issue or acceptance gap remains.
- `commandFor` is private executable code rather than directly unit-exported. Its behavior is
  covered through the full integration lifecycle and exact source inspection. Moving it to a
  separate import-safe module would be unnecessary surface area for this ticket.
- The browser flow still owns its route wiring until `S-010-03`, exactly as the parent story
  defines.
- The release helper now uses the declared route but retains receipt-specific function names;
  renaming that public release API is outside this path/key-resolution task.
- Astro's deprecated `session.driver` notice is pre-existing and unrelated.
- Inspector-port and Playwright color notices observed in integration were non-failing and
  unrelated.

## Repository hygiene

- Unrelated modifications in Codex/Lisa configuration, hooks, provenance, lock state, and
  ticket metadata were preserved and excluded.
- Lisa-created shared work publication appeared after the source commit and was not edited by
  this attempt.
- Attempt phase artifacts remain in the private assignment directory for Lisa admission.
- No generated build or test report path entered the source commit.
- No ticket-owned source file remains staged, modified, or untracked.

## Handoff

The Node harness now uses the boundary declaration as the single source for route and key
configuration at every named executable edge. Current receipt behavior is fully green, and
the script layer no longer needs edits merely to change a future contract's path or key
environment name. Lisa can publish Review and complete this ticket's lease.
