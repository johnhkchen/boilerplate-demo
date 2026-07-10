# Progress — T-002-01-01 traced-operation-runner

## Status

Implementation started after completing Research, Design, Structure, and Plan.

Selected shape: a framework-free `runOperation` function accepts an operation
name, millisecond time budget, and callback. It returns structured pass/fail trace
data, preserves successful values, classifies timeout separately from callback
failure, and passes an `AbortSignal` for cooperative cancellation.

## Baseline

- Ticket frontmatter: `status: open`, `phase: research` (left untouched; Lisa owns
  transitions).
- Product tree clean relative to tracked files at implementation start.
- Repository contains numerous pre-existing untracked Lisa/Vend/governance files;
  they are unrelated and will not be swept into this work.
- No existing `test` script, test framework, test config, or committed product
  unit suite.
- Runtime used here: Node 26.4.0, npm 11.17.0.

## Planned units

- [x] Add `src/lib/operation-runner.ts` public contract and bounded behavior.
- [x] Add `test/operation-runner.test.ts` coverage.
- [x] Add `npm test` command with no new package dependency.
- [x] Run focused suite and production build regression.
- [x] Inspect final diff and complete review handoff.

## Workflow deviation — Git metadata is read-only

After Research, an exact-path staging/commit attempt failed before staging:

```text
fatal: Unable to create '.git/index.lock': Operation not permitted
```

The workspace permission profile allows reading `.git` but not writing it, and
approval escalation is unavailable. Incremental commits required by the RDSPI
Implement phase therefore cannot be created in this session. Work will still be
performed in the atomic file-level units defined by `plan.md`, with each unit and
its verification recorded here. No broad `git add` will be attempted.

Intended commit boundaries:

1. `Add traced operation runner (T-002-01-01)` — runtime source.
2. `Test traced operation timeout behavior (T-002-01-01)` — suite and package
   command.
3. `Add review artifact for traced operation runner (T-002-01-01)` — handoff.

## Implementation log

### Unit 1 — runtime source

Completed `src/lib/operation-runner.ts`:

- public discriminated trace/result types;
- explicit operation name and millisecond budget options;
- positive-budget/name/callback validation before invocation;
- callback normalization for synchronous throw and asynchronous rejection;
- monotonic duration measurement;
- deadline race with timer cleanup;
- cooperative cancellation through `AbortSignal`;
- serializable operation-versus-timeout failure evidence;
- attached late-rejection handling after timeout.

Conceptual atomic unit complete. Git commit unavailable per the permission
deviation above.

### Unit 2 — test command and suite

Completed:

- added `npm test` using Node's built-in test runner and native type stripping;
- added passing-stub assertions for name, duration, outcome, and preserved value;
- added synchronous operation-failure normalization coverage;
- added a never-resolving stub with a 40 ms operation budget and independent
  1,000 ms test timeout;
- asserted the timeout failure kind/message and cooperative signal abort;
- added invalid-name/budget checks proving callbacks do not begin;
- added no package, config file, or lockfile churn.

Conceptual atomic unit complete. Git commit unavailable per the permission
deviation above.

### Verification

Focused suite, first run:

```text
$ npm test
tests 4 | pass 4 | fail 0
timeout case: 40.67 ms
suite duration: 150.81 ms
command wall time: 0.21 s
```

The process exited normally despite the permanently pending stub promise. No
unhandled rejection, open-handle, or cancellation warning was emitted.

TypeScript audit after the first suite run:

```text
$ ./node_modules/.bin/tsc --noEmit
initial: failed (generic rejection arm + missing Node declarations for .ts test)
```

The generic annotation was corrected. The dependency-free test wrapper moved to
`.mjs` as recorded below. Final verification after those fixes:

```text
$ npm test
tests 4 | pass 4 | fail 0
timeout case: 41.81 ms
suite duration: 156.30 ms
command wall time: 0.23 s

$ ./node_modules/.bin/tsc --noEmit
exit 0 (0.73 s)

$ npm run build
exit 0 (1.76 s)
static index prerendered; Cloudflare server entry built

$ git diff --check
exit 0
```

Build output contained the pre-existing Cloudflare session-binding information
and Sharp runtime warning; neither is introduced or changed by this ticket.

Final focused audit:

- `package-lock.json` unchanged;
- no operation-runner/test strings found in `dist/` (the unused harness primitive
  is not browser-shipped);
- only `package.json`, `src/lib/operation-runner.ts`, `test/`, and this ticket's
  work directory are in the focused change set;
- ticket `phase` advanced automatically while artifacts appeared; no ticket
  frontmatter was edited by this work, consistent with Lisa ownership.

## Acceptance criterion checkpoint

- [x] Passing stub invoked through the runner.
- [x] Passed trace contains operation name, duration in milliseconds, and outcome.
- [x] Never-resolving stub settles at its 40 ms budget.
- [x] Timeout is an explicit failed trace with `failure.kind: 'timeout'`.
- [x] Suite has a 1,000 ms independent timeout and completes in ~0.16 seconds.
- [x] Node process exits normally; pending stub does not hang it.
- [x] Callback receives a signal which is aborted at timeout.

Implementation is complete and ready for the Review artifact.

## Deviations from Design / Structure / Plan

1. **Git commits unavailable:** the permission deviation above.
2. **Test wrapper changed from `.ts` to `.mjs`:** the first `tsc --noEmit` audit
   found that this repository does not install `@types/node`, so a TypeScript
   wrapper could execute through native stripping but could not type-check its
   `node:test` / `node:assert` imports. The test now uses plain ESM while still
   importing and exercising the real `.ts` runner through Node's type-strip
   loader. This preserves zero dependency/lockfile churn and lets `tsc --noEmit`
   check production TypeScript cleanly. The same audit found and prompted a fix
   to the runner's two-branch generic `.then` annotation before final verification.
