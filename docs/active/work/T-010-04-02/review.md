# Review — T-010-04-02

## Outcome

The ticket is complete. The swap-proof harness now includes an explicit omitted-route scenario:
the alternate page remains reachable and continues to declare `/api/parcel-proof`, while the
fixture server supplies no successful route contract at that path and answers HTTP 404. The real
unchanged operation CLI and healthy Playwright flow both exit non-zero. Raw and normalized
evidence name `parcel-proof`, and the direct operation evidence reports HTTP 404. With the live
receipt exemplar continuously intact, the exact `npm run verify` chain passes end to end.

## Source commit

- Commit: `e772dd1d2ef47a9070dcf8b2b01bc472a59a5a32`.
- Message: `test: prove missing boundary route fails`.
- Mechanism: `lisa commit-ticket`.
- Exact include: `test/swap-proof.test.mjs`.
- Commit stat: 1 file changed, 33 insertions.
- Commit path inspection contains exactly the intended test file.
- Ticket-owned source is clean after commit.
- The ordinary Git index is empty.

## File modified

### `test/swap-proof.test.mjs`

The fixture server gains a `missing` mode on the exact alternate declared route. In that mode it:

- continues to serve the parcel fixture page at `/`;
- recognizes requests for `/api/parcel-proof`;
- answers the declared path with HTTP 404 and plain `not found` text;
- returns before allocating a parcel ticket;
- returns before signing or constructing any parcel response;
- leaves every other scenario unchanged.

The same file gains one sibling subtest after the healthy baseline. It:

- creates a fresh isolated mirror;
- starts the missing-mode server;
- runs the byte-copied real operation script;
- runs the byte-copied real healthy browser-flow stack;
- requires both child processes to exit non-zero;
- requires raw operation output to name `parcel-proof [operation]`;
- requires raw operation output to contain `boundary answered HTTP 404`;
- requires browser output to name the awaited receipt-boundary-response step;
- normalizes operation and flow evidence through the existing integration coordinator;
- requires the aggregate result to be failed;
- requires both normalized records to name `parcel-proof`;
- requires normalized operation kind `operation`;
- requires normalized browser kind `timeout`;
- requires the summary to contain `parcel-proof [operation]` and
  `parcel-proof [timeout]`.

## Files not changed

- `src/lib/boundary-contract.ts` was not changed.
- `src/pages/api/receipt.ts` was not changed, removed, or temporarily renamed.
- No production file below `src/` was changed.
- No runnable script below `scripts/` was changed.
- `tests/demo-flow.spec.ts` was not changed.
- `tests/support/flow-contract.ts` was not changed.
- `playwright.config.ts` was not changed.
- The alternate declaration fixture was not changed.
- `package.json` and its verify command were not changed.
- Ticket phase/status frontmatter was not manually changed.

Commit-scoped diff inspection confirms the only source path is the swap-proof harness.

## Architecture assessment

The proof preserves the dependency direction established by T-010-04-01:

```text
alternate declaration in isolated mirror
  -> unchanged operation CLI
  -> unchanged browser flow support/spec

fixture page remains reachable
  -> declared alternate route request
  -> missing-mode HTTP 404
  -> operation exits 1 with named contract + status
  -> browser exits non-zero when declared evidence stays absent

child evidence
  -> existing integration normalization
  -> failed result naming parcel-proof
```

No production switch or mutable declaration rewrite was introduced. This is important in the
repository's shared Lisa worktree: a test crash cannot strand the actual receipt route as
deleted, and concurrent work never observes a temporary production fault.

## Missing versus other fault modes

The scenario matrix now distinguishes five boundary states:

- healthy: a present route returns a valid, signed alternate response;
- missing: the declared route answers 404 and returns no alternate response;
- broken: a present route returns a shape-valid body with invalid proof;
- stalled: a present route accepts the request but never settles;
- leak: a present route returns a valid body containing forbidden secret material.

The missing branch runs before sequence allocation and signing, so it cannot be confused with a
malformed or invalid parcel response. The HTTP status assertion further pins absence behavior.

## Acceptance assessment

### Omitted declared route exits non-zero

Passed. The operation child launches the real copied `scripts/ops-check.ts` against the declared
alternate URL. Its exit code is asserted non-zero when that path returns 404.

Passed independently at the audience layer. The real copied healthy Playwright flow exits
non-zero because the page never reveals the declared response body after the missing route
answer.

The parent test remains green because those expected-red child exits are explicitly asserted as
correct harness behavior.

### Failure names the missing or unsatisfied contract

Passed. Raw operation output contains all three useful pieces:

```text
parcel-proof
[operation]
boundary answered HTTP 404
```

The boundary name comes from the alternate contract supplied to the unchanged operation stack,
not from the missing response. That proves the failure remains attributable even when no valid
body exists.

Normalized evidence also names:

```text
parcel-proof [operation]
parcel-proof [timeout]
```

The second kind describes the bounded browser symptom. The first and its raw HTTP 404 message
provide the specific missing-route diagnosis.

### Swap-proof harness asserts the behavior

Passed. The new scenario is a child of the default `test/swap-proof.test.mjs` parent and therefore
runs under both the focused command and `npm test`/`npm run verify`.

### Receipt exemplar passes end to end

Passed. The exact command `npm run verify` exited zero with the shipped declaration and Astro
route unchanged. Its integration operation printed a passed receipt trace with signature
verified against the out-of-band key. Receipt healthy flow and leak checks also passed.

### Complete verify chain

Passed. The command successfully completed:

1. test;
2. typecheck;
3. integration check;
4. backstage flow;
5. deploy dry-run.

Because `package.json` connects these stages with `&&`, the final zero exit proves every stage
completed successfully.

## Focused test evidence

Final command:

```sh
node --experimental-strip-types --test test/swap-proof.test.mjs
```

Result:

- 6 tests passed;
- 0 failed;
- 0 skipped, cancelled, or todo;
- healthy scenario passed in about 0.61 seconds;
- missing scenario passed in about 5.83 seconds;
- broken scenario passed in about 0.06 seconds;
- stalled scenario passed in about 5.78 seconds;
- leak scenario passed in about 0.06 seconds;
- total duration about 12.40 seconds.

The 45-second parent timeout retains ample measured headroom.

## Full verification evidence

### Node tests

`npm test`, as the first verify stage, passed:

- 186 tests;
- 186 passed;
- 0 failed, skipped, cancelled, or todo;
- duration about 12.63 seconds.

The count increased by one from the prior 185-test suite because the missing-route child is now
part of the default harness.

### Typecheck

The verify typecheck stage passed:

- Astro checked 65 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript no-emit passed;
- Wrangler confirmed generated Worker types are current.

### Receipt integration

The integration stage passed in about 3.5 seconds within its 45-second budget:

- `receipt` operation passed;
- signature verified against the out-of-band key;
- healthy Playwright flow passed;
- leak check passed;
- 27 client assets were checked;
- one response body was checked;
- every normalized integration record passed and named `receipt`.

### Backstage flow

The mobile backstage project passed its single full-flow test. All six named steps passed:

- locked dashboard;
- wrong passcode refusal;
- unlock and list;
- submit without second credential;
- complete an entry;
- delete an entry.

### Deploy dry-run

- Astro build completed.
- Static index and backstage routes prerendered.
- Cloudflare Worker modules/assets assembled.
- Expected bindings were reported.
- Wrangler exited successfully at `--dry-run` without publishing.

## Test coverage assessment

Coverage is proportionate and directly executable:

- actual HTTP server behavior, not a mocked response object;
- actual declared alternate URL;
- actual operation CLI process exit;
- actual Playwright process exit;
- actual browser-visible absence of declared evidence;
- actual normalization and summary formatting;
- full repository regression suite;
- live receipt integration with signature verification;
- mobile backstage flow;
- production build and dry deployment assembly.

The test does not merely assert a helper returns failure; it proves the runnable harness edges
produce non-zero processes.

## Classification review

The first focused run expected the browser record to normalize as `flow`. Actual Playwright
output includes timeout language because the declared body visibility assertion exhausts its
five-second bound, so the established coordinator correctly classifies it as `timeout`.

The final assertion uses `timeout` and records that observed contract. This does not obscure the
root cause because:

- operation output immediately identifies HTTP 404;
- operation normalization identifies `operation`;
- the browser process is independently required non-zero;
- the browser output names the awaited boundary-response step;
- the normalized browser record still names `parcel-proof`.

No integration classifier was weakened or changed for this ticket.

## Cleanup and failure safety

- The fixture server binds only to loopback on an ephemeral port.
- Each scenario owns a fresh server and mirror.
- Server sockets are tracked and destroyed during teardown.
- Child processes retain their existing 15-second outer timeout.
- Missing browser failure remains bounded by the declared five-second step.
- Temporary `.swap-proof-*` directories are recursively removed.
- No temporary directory remained after focused or full verification.
- The live route was never touched, so no restoration step can fail.

## Copy review

The copy voice and length standard was read before implementation.

- No production visitor-facing copy changed.
- No fixture HTML, accessible name, title, status, data label, or action changed.
- The new subtest name and regex assertions are engineering diagnostics.
- HTTP status text is operator-only evidence.
- No copy element needed word/character counts.
- No projector/phone copy cold-read was triggered.

The existing parcel fixture copy compliance from T-010-04-01 remains unchanged.

## Repository hygiene

- `git diff --check -- test/swap-proof.test.mjs` passed.
- Commit path list contains exactly one ticket-owned source file.
- The source file is clean after commit.
- The ordinary Git index is empty.
- No harness temporary directory remains.
- Unrelated orchestration-owned worktree changes were preserved and excluded.
- Attempt artifacts were written only to the private assignment directory; Lisa controls
  admission/publication to the shared work path.

## Open concerns and limitations

- No critical issue or acceptance gap remains.
- The omission is represented by an isolated HTTP fixture returning 404 rather than physically
  deleting Astro's route file. This is intentional shared-worktree safety; at the observable
  contract boundary, the declared route is unsatisfied exactly as an omitted handler is.
- The browser symptom is a bounded timeout rather than an immediate route-status assertion,
  because the public page does not render an error state for the fixture's failed fetch. The
  operation edge supplies the immediate HTTP 404 diagnosis, while the browser edge proves the UI
  cannot falsely pass.
- The default Node suite now takes roughly five additional seconds because the missing browser
  proof intentionally waits for the declared visibility budget. Total measured time remains
  about 12.6 seconds and well within configured limits.
- The mirror dependency list remains explicit. Future relative-import changes will fail loudly
  and require updating the prior harness manifest; this ticket does not broaden that surface.
- Existing Astro `session.driver` deprecation and Playwright color-variable warnings remain
  unrelated and non-failing.

## Human reviewer focus

A reviewer can validate the ticket quickly by checking:

1. commit `e772dd1` contains only `test/swap-proof.test.mjs`;
2. the `missing` branch returns 404 before response construction;
3. both operation and flow child exit codes are asserted non-zero;
4. raw output pins `parcel-proof [operation]` and HTTP 404;
5. normalized output pins `parcel-proof` for operation and browser timeout;
6. `npm run verify` evidence includes successful signed receipt integration and deploy dry-run.

## Final assessment

T-010-04-02 meets its acceptance criterion. The harness is now demonstrably loud when its
declared route is absent, and it attributes the failure to the unsatisfied alternate contract.
The expected-red proof lives inside the green default suite. The shipped signed-receipt worked
example remains untouched and passes the complete verification pipeline. No critical follow-up
is required for this ticket.
