# Plan — T-002-01-01 traced-operation-runner

## Goal and completion gate

Implement a reusable named-operation runner whose returned promise always settles
within a valid time budget, emits structured pass/fail evidence, and cooperatively
aborts work at timeout. Commit a unit suite that proves both a passing stub and a
never-resolving stub, with an independent test timeout that prevents the suite
from hanging.

The implementation is complete only when:

- the exact ticket acceptance criterion is covered by executable tests;
- the suite exits zero in seconds;
- a timeout trace is explicitly machine-identifiable;
- the package production build remains green;
- no unrelated or governance files enter the implementation diff;
- `progress.md` records work, evidence, deviations, and remaining concerns.

## Step 1 — establish implementation tracking

Create `docs/active/work/T-002-01-01/progress.md` before product edits.

Record:

- ticket and selected design summary;
- planned implementation units;
- baseline repository state;
- the failed attempt to create `.git/index.lock`;
- that incremental commits are impossible under the current read-only `.git`
  permission, while file-level units will still be kept separate and documented.

Verification:

- `progress.md` exists in the required directory;
- ticket frontmatter remains unchanged;
- no unrelated file has been staged (the failed lock prevented staging).

Atomic commit intent: `Start traced operation runner implementation log`.
Actual commit may be unavailable because of the documented sandbox constraint.

## Step 2 — implement the public type contract

Create `src/lib/operation-runner.ts` with the exported types from Structure:

- outcome and failure-kind literal unions;
- trace base, passed trace, failed trace, and trace union;
- operation context and operation callback;
- run options;
- typed operation result union.

Keep the module framework-free. Do not import receipt, Astro, Cloudflare, Node
modules, or test utilities.

Verification:

- exported members match `structure.md` names;
- passed trace cannot contain a required failure;
- failed trace always contains a failure;
- successful results carry generic `value`;
- operation context contains the standard `AbortSignal`.

This step establishes the downstream interface before behavior fills it in.

## Step 3 — implement validation and normalization

Add private input validators before any invocation starts:

- reject a non-string, empty, or whitespace-only operation name with `TypeError`;
- reject non-number, non-finite, zero, or negative `timeBudgetMs` with
  `RangeError`;
- reject a non-function `invoke` with `TypeError` for JavaScript callers.

Add a private unknown-error message normalizer:

- non-empty `Error.message` passes through;
- non-empty rejected strings pass through;
- all other values become `Operation failed`;
- never serialize arbitrary objects or stacks.

Verification:

- visual review confirms validation precedes clock/controller/callback creation;
- helpers do not mutate caller values or expose operation data.

## Step 4 — implement bounded invocation

Inside `runOperation`:

1. validate inputs;
2. record `performance.now()`;
3. create one `AbortController`;
4. schedule callback invocation through a promise continuation;
5. normalize its fulfillment/rejection to an internal settled union;
6. create the deadline promise and keep the timer handle;
7. race operation and deadline;
8. clear the timer in `finally`;
9. compute non-negative duration;
10. construct and return the discriminated result.

The deadline callback resolves its own race branch and aborts the controller. The
operation promise retains a rejection handler even after timeout, preventing late
unhandled rejection.

Timeout failure data:

```text
outcome: failed
failure.kind: timeout
failure.message: Operation "<name>" exceeded its <budget> ms time budget
```

Normal rejection failure data:

```text
outcome: failed
failure.kind: operation
failure.message: normalized callback reason
```

Verification before tests:

- every race branch constructs required trace fields;
- only passed branch returns `value`;
- unused deadline is cleared on fast success/failure;
- timeout branch aborts the same signal given to the callback.

Atomic commit intent for Steps 2–4: `Add traced operation runner (T-002-01-01)`.
Update `progress.md` with completed behavior and any deviation before continuing.

## Step 5 — add the first test command

Modify only `package.json` scripts, preserving every existing command. Add:

```json
"test": "node --experimental-strip-types --test test/operation-runner.test.ts"
```

Do not modify dependencies or `package-lock.json`; there is no new package.

Verification:

- `package.json` remains valid JSON;
- `npm test` points at an existing explicit file once Step 6 lands;
- existing `dev`, `build`, `preview`, `astro`, `deploy`, and `deploy:dry` scripts
  are unchanged.

## Step 6 — add unit tests

Create `test/operation-runner.test.ts` using `node:test` and
`node:assert/strict`.

### Passing-stub test

- name: `records a passed trace and preserves the operation value`;
- operation name: `passing-stub`;
- budget: large enough that a normal CI scheduler cannot race it;
- callback confirms signal is not aborted and returns a sentinel object;
- assert operation name, `passed`, finite/non-negative duration, and identical
  result value;
- assert failed-only data is absent by narrowing on outcome.

This is the direct first half of the acceptance criterion.

### Rejection test

- name: `records an operation failure without exposing a stack`;
- callback throws `Error('stub broke')` synchronously to exercise normalization;
- assert failed outcome, `operation` kind, exact safe message, name, and duration;
- assert serialized trace does not contain a stack field.

This gives downstream broken-mode work a tested foundation.

### Never-resolving timeout test

- name: `times out a never-resolving operation and aborts its signal`;
- configure the test itself with `{ timeout: 1_000 }`;
- operation budget: approximately 40 ms;
- callback stores the received signal and returns a permanently pending promise;
- measure outer wall elapsed only for a broad bounded assertion;
- assert failed outcome, `timeout` kind, name/budget in message, trace duration
  within tolerant bounds, outer completion below one second, and aborted signal.

This is the direct second half and the suite-level safety clause of the AC. If the
runner loses its deadline behavior, Node terminates the test at one second rather
than hanging indefinitely.

### Validation test

- table-drive invalid names/budgets;
- use `assert.rejects` for expected `TypeError`/`RangeError`;
- count callback invocations and assert zero.

This protects harness configuration from being mislabeled as operation failure.

Atomic commit intent for Steps 5–6: `Test traced operation timeout behavior
(T-002-01-01)`. Update `progress.md` before attempting the conceptual commit.

## Step 7 — run focused verification

Run `npm test` from the repository root.

Pass criteria:

- command exits 0;
- four named subtests pass;
- timeout case completes in substantially less than its one-second outer guard;
- overall suite duration is in seconds, normally far below one second;
- Node process exits without waiting on the never-resolving promise;
- output contains no unhandled rejection or open-handle warning.

If native TypeScript loading fails, first inspect whether the Node flag order or
explicit extension is wrong. Only reconsider adding a test dependency if the
repository's actual runtime cannot execute the designed command.

If timing assertions flake while the timeout kind is correct, widen only the
non-contract upper tolerance; do not weaken the one-second outer guard or remove
the explicit failure assertion.

Record exact output summary and elapsed duration in `progress.md`.

## Step 8 — run regression verification

Run `npm run build`.

Pass criteria:

- Astro build exits 0;
- static index and on-demand API route still build;
- the new library/test files do not enter browser assets unexpectedly;
- no production config requires a Node test-only module.

Then rerun `npm test` once after the build, verifying generated artifacts or
environment state did not affect the suite.

Optional focused inspection:

- search `dist/` for operation-runner source strings; absence is expected because
  no production module imports it yet;
- inspect `git status --short` and `git diff -- package.json
  src/lib/operation-runner.ts test/operation-runner.test.ts`.

Record results in `progress.md`.

## Step 9 — implementation self-review

Review against the acceptance criterion and design:

- operation name is caller-supplied and trace-preserved;
- duration uses a monotonic clock and explicit millisecond field;
- outcome is machine-readable;
- timeout is a failed outcome with explicit kind and safe message;
- operation result settles by budget for a pending promise;
- `AbortSignal` is actually aborted;
- fast success clears its timer;
- late rejection cannot be unhandled;
- no raw stack, inputs, results, or arbitrary objects enter failure trace;
- tests have their own finite timeout;
- test command exits without extra dependencies.

Use `git diff --check` for whitespace errors. Because the governance tree contains
untracked files, never use broad `git add -A` or treat the full untracked listing
as this ticket's diff.

## Step 10 — final progress update and review artifact

Update `progress.md` with:

- each completed conceptual unit;
- verification commands and results;
- actual changed files;
- any departures from Design/Structure/Plan;
- Git commit limitation and intended commit boundaries;
- remaining Node-version/test-tooling concern.

Write `review.md` as the human handoff. It must summarize changes, map tests to
acceptance clauses, assess coverage gaps, list open concerns, and clearly state
whether the acceptance criterion is met.

Do not modify the ticket's `phase` or `status` frontmatter. Stop after `review.md`
is written, as Lisa owns phase transitions.

## Planned atomic units

If Git metadata were writable, implementation would land as:

1. `Add traced operation runner (T-002-01-01)` — source module and progress entry.
2. `Test traced operation timeout behavior (T-002-01-01)` — package script,
   suite, and progress evidence.
3. `Add review artifact for traced operation runner (T-002-01-01)` — final
   progress/review handoff.

The current sandbox prevents creation of `.git/index.lock`, so these remain
documented commit units unless permissions change. Product and artifact files can
still be completed and fully verified without changing Git metadata.
