# Review — T-002-01-01 traced-operation-runner

## Verdict

The acceptance criterion is met.

The repository now has a composable `runOperation` seam and an executable test
suite. A resolving stub produces a passed trace with its operation name and
measured duration. A permanently pending stub produces an explicit timeout
failure at its 40 ms budget, receives an aborted signal, and cannot hang the
suite because the test itself has a one-second ceiling. The full suite completes
in roughly 0.16 seconds and exits normally.

The runner is repo-local and framework-free. It has no fleet service, Astro,
Cloudflare, provider, network, or new package dependency.

## What changed

### Product files

| File | Change |
|---|---|
| `src/lib/operation-runner.ts` | **Created.** Public operation/trace/result types, input validation, monotonic timing, deadline race, timer cleanup, cooperative abort, error normalization, and `runOperation`. |
| `test/operation-runner.test.mjs` | **Created.** Four Node tests covering pass, callback failure, never-resolving timeout, abort, bounded completion, and invalid configuration. |
| `package.json` | **Modified.** Added `npm test`, invoking Node's test runner and native TypeScript loader. Existing scripts and dependencies are unchanged. |

No production page, route, environment variable, deployment configuration,
receipt module, lockfile, or generated asset was modified. No file was deleted.

### Workflow artifacts

Created the complete phase set under `docs/active/work/T-002-01-01/`:

- `research.md` — repository/runtime map and constraints;
- `design.md` — alternatives, decisions, and scope boundaries;
- `structure.md` — file/module/interface blueprint;
- `plan.md` — ordered implementation and verification steps;
- `progress.md` — execution log, evidence, and deviations;
- `review.md` — this handoff.

Ticket frontmatter was not edited. Lisa advanced its phase automatically as
artifacts appeared, as expected.

## Public contract

The primary call is:

```ts
runOperation({
  name: 'receipt',
  timeBudgetMs: 2_000,
  invoke: ({ signal }) => fetch(url, { signal }),
});
```

Successful result:

```ts
{
  trace: {
    operationName: 'receipt',
    durationMs: 12.34,
    outcome: 'passed'
  },
  value: /* callback value */
}
```

Timeout result:

```ts
{
  trace: {
    operationName: 'receipt',
    durationMs: 2001.2,
    outcome: 'failed',
    failure: {
      kind: 'timeout',
      message: 'Operation "receipt" exceeded its 2000 ms time budget.'
    }
  }
}
```

Callback rejection has the same failed outcome with
`failure.kind: 'operation'`. Callers can decide pass/fail from `outcome` and
render a more specific cause from `failure.kind`; no consumer needs to parse the
human message.

Successful values are preserved but never copied into the trace. Failed traces
contain no value. This keeps trace evidence serializable and avoids placing
arbitrary provider output in ordinary logs by default.

## Implementation assessment

### Bounded settlement

The operation and deadline are normalized into an internal settled union and
raced. The runner clears the timer whichever branch wins. A never-resolving
promise therefore cannot prevent the returned result from settling at the
deadline, and a quick operation does not leave a long timer keeping Node alive.

The callback invocation is deferred through a promise continuation. Synchronous
throws and asynchronous rejections consequently share one operation-failure path.
Both fulfillment and rejection handlers remain attached after timeout, so a late
operation rejection does not become unhandled.

### Cancellation

Each callback receives a unique `AbortSignal`. At timeout the matching controller
is aborted. Standard `fetch` calls can use this to stop underlying network work,
which is the needed seam for T-002-01-03.

The runner correctly limits its guarantee to its own settlement. JavaScript
cannot preempt synchronous CPU work or callbacks that ignore cancellation. This
is documented in the public context comment and remains an important usage rule.

### Trace safety

Trace data includes only name, duration, outcome, and normalized failure data.
It does not include callback arguments, result data, rejected object serialization,
or stacks. Non-Error objects fall back to `Operation failed` instead of being
stringified.

Non-empty `Error.message` and rejected strings are retained because an ops check
needs an actionable reason. Full secret redaction is not implemented here; see
Open concerns.

### Input behavior

Whitespace-only names and non-positive/non-finite budgets are rejected before
the callback starts. These are harness programming errors, not operation traces,
so they reject `runOperation` with `TypeError`/`RangeError` rather than falsely
reporting a broken boundary.

## Acceptance evidence

| Acceptance clause | Evidence | Verdict |
|---|---|---|
| Test suite invokes stub operations through runner | All four cases call `runOperation` directly with local stubs. | Met |
| Passing stub trace has operation name | Asserts exact `passing-stub`. | Met |
| Passing stub trace has duration | Asserts finite, non-negative `durationMs`. | Met |
| Passing stub trace has outcome | Asserts `outcome === 'passed'`. | Met |
| Never-resolving stub is cut off at budget | Pending promise returns a trace at ~41 ms for a 40 ms budget. | Met |
| Timeout is explicit failure | Asserts `outcome === 'failed'` and `failure.kind === 'timeout'` plus named message. | Met |
| Suite completes in seconds, never hangs | Per-test ceiling is 1,000 ms; observed suite is ~156 ms and process exits normally. | Met |

Additional evidence: the timeout test asserts the callback's signal becomes
aborted, and a broken stub asserts `failure.kind: 'operation'` without a stack.

## Verification performed

### Unit suite

```text
$ npm test
✔ records a passed trace and preserves the operation value
✔ records an operation failure without exposing a stack
✔ times out a never-resolving operation and aborts its signal (~41.81 ms)
✔ rejects invalid configuration before invoking the operation
tests 4 | pass 4 | fail 0 | duration 156.30 ms
```

Command exit 0; measured command wall time 0.23 seconds. No unhandled rejection,
open-handle warning, cancellation, skip, or TODO.

### TypeScript audit

```text
$ ./node_modules/.bin/tsc --noEmit
```

Exit 0. This check caught and prompted correction of the internal two-branch
`.then` generic annotation before handoff.

### Production regression

```text
$ npm run build
```

Exit 0. Astro prerendered `/index.html` and built the Cloudflare server entry.
The pre-existing adapter session-binding information and Sharp warning remain;
this ticket neither introduces nor changes them.

### Diff/artifact checks

- `git diff --check` exits 0.
- `package-lock.json` is unchanged.
- Search of `dist/` finds no test stub or runner validation strings; the unused
  harness primitive is not shipped to the browser.
- Focused status contains only `package.json`, the new runner/test, and this
  ticket's work artifacts, apart from pre-existing untracked governance content.

## Test coverage assessment

Coverage is proportionate to the ticket and directly exercises the public API:

- resolved synchronous callback and generic value preservation;
- finite/non-negative trace timing;
- synchronous throw normalization;
- explicit operation failure;
- permanently pending callback;
- hard deadline result;
- cooperative abort signal;
- outer suite timeout;
- invalid name, zero/negative/NaN/infinite budget;
- no invocation for invalid configuration.

Not covered in this ticket:

- a real `fetch`/receipt operation (owned by T-002-01-03);
- an asynchronously rejecting callback after timeout;
- a callback which actively handles the abort event;
- browser/Worker execution of the generic module;
- timer-overflow-scale budgets;
- correlation IDs, retry, polling, redaction, or report serialization;
- automated CI invocation of `npm test` (the deploy workflow currently only
  builds/deploys; the combined harness is later story scope).

None of these gaps blocks the stated stub acceptance criterion. The first gap is
the intended immediate downstream integration.

## Deviations from the plan

### Test wrapper extension

The planned test file was TypeScript. Runtime execution succeeded, but
`tsc --noEmit` showed the repository does not install Node type declarations for
`node:test` and `node:assert`. Rather than add a dependency and lockfile churn for
the wrapper, it was changed to `.mjs`. It still imports and executes the real
TypeScript runner through Node's native type-strip loader. Production TypeScript
now checks cleanly.

### Incremental commits unavailable

No commits could be created. The sandbox permits `.git` reads but rejected the
first exact-path stage/commit attempt with:

```text
fatal: Unable to create '.git/index.lock': Operation not permitted
```

Approval escalation is unavailable. `progress.md` records the intended three
atomic commit boundaries. This is the only incomplete workflow mechanic; product
files, artifacts, and verification are complete. A human/Lisa process with Git
write permission must stage and commit the focused changes.

## Open concerns and limitations

1. **Git commit required outside this sandbox.** Critical for repository history,
   but not a code defect. Use the exact focused paths; do not sweep the unrelated
   untracked governance tree.
2. **Native TypeScript test loading requires a modern Node.** Verified on Node
   26.4.0; the checked-in deploy workflow uses Node 24, which supports it. The repo
   has no formal `engines` declaration. An owner running an older Node may need to
   upgrade or later introduce a TS-aware test runner.
3. **Cancellation is cooperative.** A callback that ignores `signal` can continue
   after the timeout trace; synchronous event-loop blocking cannot be bounded by a
   timer. Downstream fetch operations must pass the signal.
4. **Error messages are not a complete redaction system.** Stacks/objects/results
   are excluded, but an upstream `Error.message` could itself contain sensitive
   text. Provider adapters should emit safe messages, and the epic's later
   redaction layer should sanitize ordinary reports.
5. **No CI test gate yet.** `npm test` is reproducible locally, but the existing
   deploy workflow does not invoke it. The later combined harness ticket is the
   appropriate place to make all checks one command/gate.

## Downstream readiness

T-002-01-03 can now wrap `GET /api/receipt` with no runner changes:

- name it with the existing `BOUNDARY_NAME`;
- use a finite `timeBudgetMs`;
- pass the provided signal to `fetch`;
- print `operationName` and a rounded `durationMs`;
- exit zero for `passed` and non-zero for `failed`;
- distinguish unavailable/broken from stalled using `failure.kind`;
- avoid raw stacks by rendering the structured trace.

T-002-01-04 can reuse the same result contract for broken and stalled fault modes.

## Handoff

Code and artifacts are ready for human review. Acceptance is fully met, focused
tests/type-check/build are green, and no product concern blocks the next ticket.
The only required operational follow-up is creating the documented commits from
an environment allowed to write Git metadata.
