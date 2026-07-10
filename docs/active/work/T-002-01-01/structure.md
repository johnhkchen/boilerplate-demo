# Structure — T-002-01-01 traced-operation-runner

## Change map

```text
package.json
  MODIFY  add the repository's first `test` script

src/lib/operation-runner.ts
  CREATE  framework-free operation invocation, deadline, abort, and trace types

test/operation-runner.test.ts
  CREATE  Node unit suite for pass, failure, timeout, cleanup, and validation

docs/active/work/T-002-01-01/progress.md
  CREATE  implementation log, verification evidence, and commit deviation
```

No production route, page, deploy configuration, environment contract, styling,
or receipt code changes. No files are deleted. No npm dependency or lockfile
change is expected because the test suite uses the Node runtime already present.

The RDSPI artifacts `research.md`, `design.md`, `structure.md`, `plan.md`, and
eventually `review.md` live beside `progress.md` but are workflow documentation,
not runtime modules.

## Runtime module boundary

### Location

`src/lib/operation-runner.ts`

The existing `src/lib/receipt.ts` is framework-independent boundary logic. The
new runner sits beside it as a generic harness primitive. Neither module imports
the other. T-002-01-03 will compose them or compose the runner with `fetch` from a
separate command module.

The runner imports no Astro, Cloudflare, Node, or provider package. It relies only
on portable platform globals:

- `AbortController` / `AbortSignal`;
- `performance.now()`;
- `setTimeout` / `clearTimeout`;
- `Promise`.

### Public types

```ts
export type OperationOutcome = 'passed' | 'failed';

export type OperationFailureKind = 'operation' | 'timeout';

export interface OperationFailure {
  kind: OperationFailureKind;
  message: string;
}

export interface OperationTraceBase {
  operationName: string;
  durationMs: number;
}

export interface PassedOperationTrace extends OperationTraceBase {
  outcome: 'passed';
}

export interface FailedOperationTrace extends OperationTraceBase {
  outcome: 'failed';
  failure: OperationFailure;
}

export type OperationTrace = PassedOperationTrace | FailedOperationTrace;

export interface OperationContext {
  signal: AbortSignal;
}

export type Operation<T> = (
  context: OperationContext,
) => T | PromiseLike<T>;

export interface RunOperationOptions<T> {
  name: string;
  timeBudgetMs: number;
  invoke: Operation<T>;
}

export type OperationResult<T> =
  | { trace: PassedOperationTrace; value: T }
  | { trace: FailedOperationTrace };
```

The trace union discriminates on `outcome`. The result union mirrors it, so TypeScript
callers gain access to `value` only after checking `trace.outcome === 'passed'`.
Failed traces always have a failure; passed traces never have one.

`OperationOutcome` and `OperationFailureKind` are exported even though their
literal members are visible through the interfaces. This lets downstream formatters
declare focused inputs without reconstructing unions.

### Public function

```ts
export async function runOperation<T>(
  options: RunOperationOptions<T>,
): Promise<OperationResult<T>>;
```

Input properties are intentionally named at every call site. `invoke` receives
one context object so future compatible context fields can be added without
changing positional parameters. This ticket adds only `signal`.

### Validation helpers

Private functions at the top of the implementation enforce:

- `name` is a string whose trimmed representation is not empty;
- `timeBudgetMs` is finite and greater than zero;
- `invoke` is callable (TypeScript enforces this statically; a runtime check keeps
  JavaScript callers from receiving an obscure deferred error).

Validation runs before the clock, controller, or operation starts. Invalid harness
configuration rejects `runOperation` with `TypeError` or `RangeError`; it does not
create an operation trace.

The operation name stored in the trace remains the caller's original non-empty
string rather than silently trimming or rewriting it. Validation only rejects a
whitespace-only value.

### Internal settled union

The file defines a non-exported union that normalizes race participants:

```ts
type SettledOperation<T> =
  | { kind: 'passed'; value: T }
  | { kind: 'failed'; reason: unknown }
  | { kind: 'timeout' };
```

The callback is invoked inside `Promise.resolve().then(...)`. A following two-armed
`.then(...)` converts resolution and rejection into `SettledOperation<T>`. Because
the rejection handler remains attached after the race settles, late rejection is
observed and cannot become unhandled.

The deadline promise uses the same union and owns the timer handle. The timeout
callback resolves `{ kind: 'timeout' }` and aborts the per-call controller.
`runOperation` clears the timer in `finally` around the `Promise.race` await.

### Trace construction

After settlement, the function measures:

```ts
const durationMs = Math.max(0, performance.now() - startedAt);
```

Branches then construct fresh object literals:

- `passed` → `{ trace: { operationName, durationMs, outcome: 'passed' }, value }`;
- `failed` → `{ trace: { ..., outcome: 'failed', failure: { kind: 'operation',
  message: normalizeFailureMessage(reason) } } }`;
- `timeout` → `{ trace: { ..., outcome: 'failed', failure: { kind: 'timeout',
  message: timeoutMessage(name, budget) } } }`.

No operation value or arbitrary rejected object is copied into a trace.

### Failure normalization helper

A private `failureMessage(reason: unknown): string` returns:

1. `reason.message` for an `Error` with a non-empty message;
2. `reason` for a non-empty string;
3. `'Operation failed'` for all other cases.

This helper does not stringify objects. That prevents surprising getters,
circular-value errors, and accidental dumps of credentials or response bodies.

## Test module boundary

### Location and runtime

`test/operation-runner.test.ts`

The directory is top-level so tests are separate from browser/Worker build input.
It imports `node:test`, `node:assert/strict`, and the source module by explicit
`.ts` extension. The `package.json` command enables native type stripping before
Node loads the module.

The suite does not start Astro, Wrangler, a Worker, a browser, or a network server.
Its stubs run entirely in one Node process.

### Case 1 — passing operation

Invoke a stub named `passing-stub` with a generous budget. The stub confirms its
signal begins un-aborted and resolves a sentinel object.

Assertions:

- result trace outcome is `passed`;
- trace operation name is exactly `passing-stub`;
- duration is finite and non-negative;
- returned value is the same sentinel;
- no failure field is present;
- total test duration stays well below the unused budget, proving the cleared
  timer does not hold completion open.

### Case 2 — rejected operation

Reject an `Error('stub broke')` and assert outcome `failed`, failure kind
`operation`, normalized message, operation name, and finite duration. This covers
the generic pass/fail seam needed by future broken-mode work.

### Case 3 — never-resolving operation

Use a 40 ms budget. The callback records the signal and returns `new Promise(() =>
{})`. Await the result inside a test configured with a 1,000 ms outer timeout.

Assertions:

- result settles rather than hanging;
- outcome is `failed`;
- failure kind is `timeout`;
- message names the operation and 40 ms budget;
- trace duration is at least a tolerant lower bound and far below the outer limit;
- the passed signal is aborted after settlement.

The pending promise itself holds no event-loop resource, so the process exits once
the runner clears its own timer.

### Case 4 — invalid configuration

Table-drive whitespace name, zero, negative, infinite, and `NaN` budgets. Confirm
each rejects with the appropriate error and a spy callback is never invoked. This
protects the distinction between harness errors and operation failures.

## Package script

`package.json` adds one entry without changing existing scripts:

```json
"test": "node --experimental-strip-types --test test/operation-runner.test.ts"
```

The explicit file avoids differences in `.ts` test discovery across Node versions.
The command's exit code is the suite gate. No test config file is necessary.

## Ordering constraints

1. Add `progress.md` with the planned units and record the unavailable Git lock.
2. Add the runtime module and update progress.
3. Add the test module plus package script and update progress.
4. Run the focused suite; fix implementation or assertions if needed.
5. Run `npm run build` as a production regression check.
6. Inspect the focused diff/status and update progress with final evidence.
7. Write `review.md` only after all checks and diff review complete.

The source module can compile before tests exist. The package script and test file
land as one conceptual unit so the repository never points at a missing suite.

## Downstream interface stability

T-002-01-03 may rely on:

- `runOperation` and its options property names;
- `OperationContext.signal` for abortable fetch;
- `trace.operationName`, `trace.durationMs`, and `trace.outcome`;
- `trace.failure.kind` values `operation` and `timeout`;
- successful `value` preservation.

Human-readable messages are useful defaults but not a parsing contract. Downstream
logic must branch on discriminants, then format messages for stdout.
