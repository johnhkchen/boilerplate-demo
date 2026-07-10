# Design — T-002-01-01 traced-operation-runner

## Decision summary

Build a framework-free TypeScript function, `runOperation`, which accepts a
named operation and a positive time budget. It invokes the callback with an
`AbortSignal`, races its normalized result against a deadline, and always returns
a discriminated result containing a structured trace. Passing operations include
their value. Rejections and timeouts return a failed trace; timeout is identified
by `failure.kind: 'timeout'`.

Use Node's built-in test runner with native TypeScript type stripping for this
first pure-library suite. The repository gains one `npm test` command and no test
framework dependency.

This decision is grounded in the existing pure `src/lib/receipt.ts` pattern, the
repo-local/P7 constraint, the downstream CLI requirements, and the absence of any
existing test runner.

## Decision 1 — result contract

### Chosen: return a discriminated pass/fail result for every operation outcome

```ts
type OperationResult<T> =
  | { trace: PassedOperationTrace; value: T }
  | { trace: FailedOperationTrace };
```

Every call that actually begins produces trace evidence. Callers inspect
`trace.outcome`; command-line consumers can render the same data and choose their
exit status without catching exceptions or parsing a message.

The public trace vocabulary is:

```ts
type OperationOutcome = 'passed' | 'failed';
type OperationFailureKind = 'operation' | 'timeout';

interface OperationTraceBase {
  operationName: string;
  durationMs: number;
}

interface PassedOperationTrace extends OperationTraceBase {
  outcome: 'passed';
}

interface FailedOperationTrace extends OperationTraceBase {
  outcome: 'failed';
  failure: {
    kind: OperationFailureKind;
    message: string;
  };
}
```

Timeout is modeled as a failed outcome with a machine-readable failure kind. This
keeps the high-level pass/fail evidence simple while preserving the distinction
T-002-01-04 will need between a broken operation and a stalled one.

### Rejected: return a trace on success and throw on failure

This is idiomatic for application calls, but awkward for a harness whose product
is failure evidence. A CLI would need to know which thrown values carry a trace,
normalize arbitrary errors, and avoid printing raw stacks. It also makes a timed-
out result less directly serializable.

### Rejected: throw a custom `OperationTimeoutError`

A custom error is useful when timeout is exceptional control flow. Here timeout
is an expected and tested outcome. Carrying it as data reduces try/catch ceremony
and makes JSON/stdout reporting straightforward. Input contract violations still
throw synchronously/asynchronously as programming errors, because they do not
represent an invoked operation outcome.

### Rejected: outcome values `success`, `error`, and `timeout`

Three top-level states conflate two dimensions: whether the check passed and why
it failed. The chosen two-level shape supports a direct exit-code decision on
`outcome` and a detailed decision on `failure.kind`.

## Decision 2 — invocation interface

### Chosen: a single options object with explicit units

```ts
interface RunOperationOptions<T> {
  name: string;
  timeBudgetMs: number;
  invoke: (context: OperationContext) => T | PromiseLike<T>;
}

interface OperationContext {
  signal: AbortSignal;
}

async function runOperation<T>(
  options: RunOperationOptions<T>,
): Promise<OperationResult<T>>;
```

An object is slightly more verbose than positional parameters but keeps the call
site readable:

```ts
runOperation({
  name: 'receipt',
  timeBudgetMs: 2_000,
  invoke: ({ signal }) => fetch(url, { signal }),
});
```

The `Ms` suffix makes the unit explicit. A generic result preserves data for the
next ticket without including it in the trace itself. The runner does not accept
arguments or know provider protocols; callers close over what they need.

### Name validation

`name` must be a non-empty, non-whitespace string. Invalid names throw a
`TypeError` before the callback starts. The trace is evidence about a named call;
silently accepting an empty label would defeat the main debugging property.

### Budget validation

`timeBudgetMs` must be finite and greater than zero. Invalid values throw a
`RangeError` before the callback starts. Clamping or treating invalid input as an
instant operation timeout would hide a harness configuration defect as a boundary
failure.

## Decision 3 — cancellation semantics

### Chosen: bounded settlement plus cooperative `AbortSignal`

The runner creates an `AbortController` per call and passes its signal to the
operation. When the deadline wins, the runner aborts that signal with a timeout
reason and returns the timeout trace.

This supplies real cancellation for Web APIs that honor signals, especially the
`fetch` call needed by T-002-01-03. It also lets a stub prove that timeout was
announced. A callback that ignores the signal may continue in the background;
the runner still guarantees its own result settles on budget.

The contract explicitly does not claim to preempt:

- synchronous CPU loops that block the event loop;
- third-party APIs that ignore the signal;
- externally launched work with no cancellation mechanism.

That limit is inherent to JavaScript rather than a runner design omission.

### Rejected: `Promise.race` with no signal

This satisfies the never-resolving-stub test but leaves real fetches running after
the command has already reported failure. Since AbortController is a portable Web
API in Node, browsers, and Workers, omitting it would create avoidable downstream
cleanup work.

### Rejected: require operations to implement a custom `cancel()` interface

That is more machinery and less compatible with standard `fetch`. It would push
the primitive toward an integration framework, contrary to N2 and the composition
guardrail.

## Decision 4 — timing

### Chosen: `performance.now()` and millisecond duration

Use the monotonic performance clock immediately before scheduling invocation and
again after the race settles. Return `Math.max(0, end - start)` as `durationMs`,
without rounding. This preserves available precision and prevents a theoretical
negative duration from a nonconforming environment.

No clock injector is added to the public API. The acceptance criterion requires a
duration record, not an exact deterministic value, and adding scheduler/clock
dependencies would enlarge a very small seam. Tests assert that the value is a
finite non-negative number. The timeout test also compares observed duration to a
broad bound rather than an exact millisecond.

### Rejected: `Date.now()`

It is universal but wall-clock adjustments can distort elapsed time. The target
runtimes already provide the standard monotonic clock.

### Rejected: rounded integer duration

Rounding makes very fast stubs appear indistinguishable as zero and adds a display
policy to trace data. Human reporters can round when formatting stdout.

## Decision 5 — error normalization

Operation callbacks may throw synchronously, reject with an `Error`, or reject
with another value. Invocation is deferred through `Promise.resolve().then(...)`
so all three forms settle through one path.

Failure messages use:

- `error.message` when the reason is an `Error`;
- the string itself when the reason is a string;
- a fixed `Operation failed` fallback for other values.

The trace never includes a stack, callback input, callback output, or serialized
unknown object. This is a conservative first safety boundary: it is useful for an
agent without automatically copying arbitrary object contents into ordinary
feedback. Full redaction and safe summaries remain later harness scope.

Timeout messages are generated by the runner from the already-public operation
name and numeric budget. Example: `Operation "receipt" exceeded its 2000 ms time
budget.` The structured kind remains authoritative; consumers do not parse text.

## Decision 6 — race and cleanup mechanics

The operation promise is converted into an internal settled union with both
fulfillment and rejection handlers before it enters the race. Consequently, an
operation that rejects after timeout does not become an unhandled rejection.

The timeout promise stores its timer handle. Whichever branch wins, `finally`
clears that timer. This is load-bearing for the success case: a fast operation
with a long budget must not keep the test process alive until its unused deadline.

The timeout callback resolves its branch and aborts the signal. Promise settlement
is first-wins; late completion cannot replace the emitted timeout trace.

## Decision 7 — test setup

### Chosen: Node built-in test runner over native `.ts`

Add:

```json
"test": "node --experimental-strip-types --test test/operation-runner.test.ts"
```

The current Node 26 runtime executes erasable TypeScript directly. `node:test`
provides assertions, per-test timeouts, TAP output, exit codes, and process
cleanup without adding a framework dependency or configuration file. The runner
module uses only erasable TypeScript syntax, consistent with normal Astro source.

Tests cover:

1. resolved value and passed trace fields;
2. rejected operation and normalized operation failure;
3. pending operation, timeout failure kind/message, bounded elapsed time, and
   aborted signal;
4. invalid input rejection before callback invocation.

The timeout operation uses a budget measured in tens of milliseconds and an outer
test timeout measured in one second. This makes a broken implementation fail in
seconds, while leaving enough scheduling tolerance for loaded CI.

### Tradeoff: Node version floor for tests

Native type stripping is newer than the oldest Node version capable of running
Astro 5. The repo currently declares no engine and its actual runtime is Node 26.
This ticket will not add an `engines` declaration because that would change the
template's production support contract based only on test tooling. The test
command's prerequisite is documented as an open concern; if the project later
formalizes Node 20 support, it can add a lightweight TS-aware runner then.

### Rejected: add Vitest now

Vitest is an excellent future choice, especially if the pure-library suite grows.
For four tests it adds a direct dependency, lockfile churn, and another version
compatibility surface. The repository already has a capable test runner in its
actual Node environment, so that setup cost has not yet earned its place.

### Rejected: ad hoc executable assertion script

It could exit correctly but would not provide test isolation, named cases, outer
timeouts, or standard reporting. The acceptance criterion asks for a suite.

## Scope boundaries

This ticket will not:

- modify the receipt boundary or page;
- add the real receipt ops-check command (T-002-01-03);
- add fault flags (T-002-01-04);
- add retry, polling, heartbeat, or expected-duration behavior;
- assign correlation IDs or serialize report files;
- introduce Playwright or a combined harness command;
- claim to redact arbitrary third-party error strings comprehensively.

The chosen seam stays small enough to remain unused at zero runtime cost, while
giving downstream tickets a typed, test-worn contract rather than prose.
