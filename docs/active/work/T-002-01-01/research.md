# Research — T-002-01-01 traced-operation-runner

## Ticket scope

This ticket creates the smallest reusable operation seam in the integration
harness: give an asynchronous boundary call a stable name and a hard time budget,
invoke it, and return structured evidence describing how it ended.

The ticket starts in `phase: research`. Its only acceptance criterion contains
two behavioral cases and one suite-level safety property:

1. A resolving stub is invoked through the runner.
2. Its trace records the operation name, elapsed duration, and successful outcome.
3. A never-resolving stub is stopped at its configured time budget.
4. Timeout is represented as an explicit failure, rather than a raw platform error.
5. The test process finishes in seconds and cannot inherit the stub's infinite wait.

This phase maps existing code and constraints. It does not select an implementation.

## Repository baseline

The project is an Astro 5 template deployed through Cloudflare. The current
runtime and tooling surface is intentionally small:

```text
package.json                 Astro, Cloudflare adapter, Wrangler; no test script
package-lock.json            npm lockfile, lockfileVersion 3
astro.config.mjs             static-first Astro with one on-demand route
wrangler.jsonc               Cloudflare Worker plus static-assets configuration
src/lib/receipt.ts           pure, framework-free exemplar boundary logic
src/pages/api/receipt.ts     thin Astro HTTP boundary around receipt logic
src/pages/index.astro        static page which fetches the receipt boundary
src/env.d.ts                 Cloudflare runtime environment typing
```

There is currently no runner, tracing module, timeout utility, test directory,
test configuration, `test` script, or committed automated product-logic test.
`npm ls --depth=0` reports only `@astrojs/cloudflare`, `astro`, and `wrangler`.

The local environment is Node 26.4.0 and npm 11.17.0. The project does not declare
a Node engine floor. Astro 5 remains the broad runtime constraint; implementation
and test-tool choices therefore should not accidentally depend only on Node 26.

## Existing boundary shape

`src/lib/receipt.ts` establishes a useful local pattern:

- application logic is TypeScript under `src/lib/`;
- the module has no Astro import and no environment reads;
- dependencies such as time and random bytes are injectable where determinism helps;
- interfaces and exported functions describe the reusable public seam;
- platform-independent Web APIs are preferred over Node-only APIs;
- the HTTP route stays thin and owns environment access and response formatting.

The receipt module exports a stable `BOUNDARY_NAME = 'receipt'`. Downstream ticket
T-002-01-03 is expected to turn that boundary into the first real operation. The
runner built here therefore needs to accept names supplied by callers; it should
not know about receipt, HTTP, Astro, Cloudflare, or any provider.

The receipt functions return promises and are already suitable operation bodies.
The HTTP boundary also uses promise-returning `fetch` semantics. The common
denominator for this ticket is consequently a zero-argument asynchronous function,
with its eventual result carried back to the caller.

## Product and charter requirements

The product specification describes the integration harness as composable
primitives for timeouts, failures, polling, and browser-compatible results. It
specifically requires:

- expected-duration and hard-time-budget support;
- structured tracing with correlation identifiers, boundary timings, safe
  summaries, and redaction;
- bounded waits and actionable traces on failure;
- tests and programs as the preferred current source of truth.

This ticket covers only the first layer of that larger surface: named invocation,
a hard budget, duration, outcome, and timeout evidence. Correlation identifiers,
summaries, redaction policy, retries, polling, browser flow checks, and a combined
harness command are described by the epic but are not named by this ticket's
acceptance criterion.

Charter P2 is the direct reason for the work: a stalled boundary must become
explicit evidence quickly instead of an indefinite spinner. P7 requires the
primitive and its checks to run from the repository with no fleet service.
Guardrails require shared primitives to use composition, remain light when unused,
and avoid becoming an all-provider abstraction.

## Story and downstream dependency map

The story `S-002-01` contains four tickets:

- T-002-01-01 (this ticket): generic traced operation runner.
- T-002-01-02: exemplar receipt boundary, already implemented.
- T-002-01-03: an ops-check command that composes the runner with the receipt
  boundary and reports a named pass/fail trace.
- T-002-01-04: deliberate broken and stalled boundary modes, verified through the
  same command.

T-002-01-03 explicitly depends on this ticket and the receipt ticket. Its
acceptance criterion requires a healthy local operation to exit zero with the
boundary name and latency, and an unavailable server to exit non-zero within the
budget without a raw stack trace. That makes the runner's structured return/error
contract a downstream public interface, even though this ticket tests only stubs.

T-002-01-04 will distinguish a normal operation failure from a timeout failure.
The trace shape therefore needs an outcome that is machine-discriminable, not
only a preformatted human sentence.

Later story `S-002-02` adds Playwright time budgets and a combined check. Those
layers can consume trace records but do not need the runner to import Playwright.

## Time and cancellation realities

JavaScript promises are not intrinsically cancellable. Racing an operation against
a timer can settle the runner at the deadline, but it cannot forcibly stop arbitrary
work already started inside the operation. A never-resolving stub is safe because
an unresolved promise alone does not keep the event loop alive. Real operations
such as `fetch` can stop their underlying work only if they receive and honor an
`AbortSignal`.

This distinction matters for the meaning of “cut off”:

- the runner can guarantee that its own returned promise settles by the budget;
- it can clear its deadline timer after any settlement;
- it can signal cooperative cancellation to an operation;
- it cannot preempt synchronous CPU work or a callback that ignores cancellation;
- it cannot make the event loop run while a synchronous callback is blocking.

The suite-level “never hanging” requirement is therefore testable with an operation
that returns a pending promise. A separate outer test timeout remains valuable as
a regression guard in case the runner itself fails to settle.

## Trace data boundaries

The acceptance criterion names three required success fields:

- operation name;
- duration;
- outcome.

Timeout additionally needs an explicit timeout failure. Downstream checks need to
render evidence and set exit codes, so a record should remain ordinary serializable
data. Raw `Error` instances are not reliably JSON-serializable and can carry stack
traces or sensitive messages. Conversely, throwing away every error distinction
would prevent the ops check from naming “timeout” versus “failure.”

Time measurement has two roles:

- a monotonic clock should measure elapsed duration so wall-clock adjustments do
  not produce negative or distorted timings;
- the budget timer controls when the invocation resolves as timed out.

`performance.now()` is available in modern browsers, Workers, and supported Node
runtimes and is monotonic. `Date.now()` is portable but wall-clock based. An
injected clock can make trace assertions deterministic, while tests of real timer
behavior still need a small tolerance because scheduling is not exact.

Durations can be fractional milliseconds. The repository has no established
rounding or unit convention. Naming a field with an `Ms` suffix would keep the
unit machine-readable and unambiguous.

## Operation call boundary

The runner must account for both ways a callback can fail:

- throw synchronously before returning a promise;
- return a promise that later rejects.

Wrapping invocation in a promise continuation normalizes both into the same
asynchronous path. The callback may also resolve to any value, which should be
preserved generically for later ops checks.

If timeout wins a race and the operation rejects later, a correctly attached race
handler prevents an unhandled rejection. The timeout handle must be cleared when
the operation wins so successful tests do not remain alive until the full budget.
The reverse path must also settle once and ignore late operation completion.

Budget validation is a boundary concern. Zero, negative, non-finite, or `NaN`
budgets cannot describe a useful positive hard deadline. No current repository
convention defines whether these inputs throw, return a failure record, or clamp;
the design phase must make that contract explicit.

## Test-tooling boundary

There is no committed test framework. Relevant repository facts are:

- source modules use TypeScript syntax;
- package type is ESM;
- TypeScript is currently transitive through Astro, not a direct test tool;
- no Node compatibility range is declared;
- the lockfile is committed and dependencies are installed through npm;
- acceptance explicitly asks for a test suite, not an ad hoc verification script.

A suitable test setup must load TypeScript/ESM, expose per-test or suite timeouts,
return a non-zero exit code on failure, and exit after the timeout case. It should
also compose with future unit tests for `receipt.ts` and not introduce a browser
or Cloudflare runtime for pure library logic.

## Working-tree and workflow constraints

The Git worktree contains many untracked Lisa/Vend/governance files. They belong
to the shared project context and must not be swept into implementation commits.
Tracked product files are clean at research start. Prior tickets commit their
phase artifacts selectively, sometimes alongside implementation progress and
with `review.md` in a final artifact-only commit.

The RDSPI workflow requires every remaining artifact under
`docs/active/work/T-002-01-01/`, incremental implementation commits, and a
continuously updated `progress.md`. The ticket's frontmatter must remain exactly at
its current phase/status; Lisa owns those transitions.

## Assumptions to carry forward

- The operation runner is framework-free TypeScript under `src/lib/`.
- Operations are asynchronous or promise-compatible and may return a typed value.
- “Cut off” guarantees bounded runner settlement; cooperative underlying abort is
  possible only through an explicit signal contract.
- Trace records contain no operation inputs or arbitrary result summaries by
  default, reducing accidental secret exposure.
- The first downstream consumer will be a Node-run ops check, but the primitive
  should remain compatible with Worker/browser Web APIs.
- Milliseconds are the natural unit because JavaScript timers and performance
  clocks use them.
- No production route or page needs modification for this ticket.

## Questions for Design

1. Should the runner return a success/failure union for every outcome, or return a
   trace on success and throw a structured error containing the failure trace?
2. Should operation callbacks receive an `AbortSignal` now so real `fetch` calls
   can cooperatively stop at the deadline?
3. What is the minimum trace schema that satisfies this ticket while leaving a
   clean extension seam for correlation and safe summaries?
4. Should duration be measured by an injectable monotonic clock, and how should
   fractional results be represented?
5. Which test runner fits the TypeScript/ESM project and supported Node range with
   the least durable setup cost?
6. Which invalid-budget behavior is clearest to callers and easiest for downstream
   command-line checks to distinguish from an operation failure?
