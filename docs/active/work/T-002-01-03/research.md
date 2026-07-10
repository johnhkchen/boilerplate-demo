# Research — T-002-01-03 exemplar-boundary-ops-check

## Ticket in one line

Turn the exemplar boundary into the first *directly-invokable traced operation*: a
command that runs the boundary through the operation runner and reports a green
check (with latency) when the demo is healthy, and a bounded, boundary-named
failure when it is not. This is descriptive only — no solution here.

## The single acceptance criterion, decomposed

> The ops check command exits zero against the healthy local demo, printing a
> trace that names the exemplar boundary with its latency; run with the dev
> server down, it exits non-zero within its time budget still naming the boundary
> — not a hung fetch or raw stack trace.

Five observable clauses:

1. **Command exists and is runnable** — something a person (or CI) invokes.
2. **Healthy → exit 0** — against a running local demo.
3. **Healthy → trace names the boundary + latency** — human-readable evidence,
   not just a silent zero exit.
4. **Down → exit non-zero, within a time budget** — bounded, never a hung fetch.
5. **Down → still names the boundary; no raw stack trace** — structured failure,
   not a leaked Node error dump.

## What already exists (the two dependencies)

### T-002-01-01 — the operation runner (`src/lib/operation-runner.ts`)

Framework-free. `runOperation<T>({ name, timeBudgetMs, invoke })` returns a promise
that **always settles** with a discriminated result:

- `{ trace: PassedOperationTrace; value: T }` on success;
- `{ trace: FailedOperationTrace }` on rejection or timeout.

Key properties this ticket leans on directly:

- `trace.operationName` echoes the caller's `name` verbatim → **naming the
  boundary is just passing `name`.**
- `trace.durationMs` is the monotonic elapsed time → **latency is already
  measured**, no clock work needed here.
- `trace.outcome` (`'passed' | 'failed'`) → **the exit-code decision** is one
  field read.
- On failure, `trace.failure = { kind: 'operation' | 'timeout', message }`. Timeout
  is data, not an exception; `message` never contains a stack (Decision 5 of the
  runner design). → **"no raw stack trace" is a property we inherit** as long as we
  print the trace, not a caught error.
- `invoke` receives `{ signal }`; the runner aborts that signal at `timeBudgetMs`.
  `fetch` honors `AbortSignal`. → **"not a hung fetch" is inherited** — a stalled
  connection is cut at budget and reported as `kind: 'timeout'`.
- Invalid config (empty name / non-positive budget) throws `TypeError`/`RangeError`
  *before* invoking — a harness-config error, distinct from a boundary failure.

The runner imports nothing but platform globals. It has a committed Node test suite
(`test/operation-runner.test.mjs`, 4 tests, green) run via
`node --experimental-strip-types --test`.

### T-002-01-02 — the exemplar boundary

Two modules, deliberately split pure-core / thin-HTTP:

- `src/lib/receipt.ts` (pure, framework-free):
  - `BOUNDARY_NAME = 'receipt'` — the stable handle. Its comment literally says it
    is the handle "for tracing / ops-check."
  - `Receipt` shape: `{ boundary, issuedAt, nonce, algorithm, signature, keySource }`.
  - `makeReceipt(key, opts?)` — builds a fresh HMAC-SHA256-signed receipt.
  - `verifyReceipt(key, receipt)` — recomputes the signature and compares. Its
    comment says it is "for tests and the ops-check, which hold the key
    out-of-band." → **the boundary was designed anticipating this ticket.**
  - `canonicalMessage`, `signReceipt` — the signing primitives (Web Crypto).
  - Never reads env; never holds a key beyond the argument.

- `src/pages/api/receipt.ts` (thin HTTP, `prerender = false`):
  - `GET /api/receipt` reads `locals.runtime.env.DEMO_SIGNING_KEY`.
  - Missing/blank key → `500 { boundary: 'receipt', error: 'boundary_misconfigured' }`.
  - Success → `200` with the JSON receipt (2-space pretty-printed).
  - The key is server-only; it appears in no client asset (verified in T-002-01-02).

So the boundary the command must hit is **`GET /api/receipt` on the local demo**,
returning a JSON receipt whose signature can be re-verified with the same key held
out-of-band.

## How the demo runs locally

- `npm run dev` → `astro dev`. Astro's dev server default is **`http://localhost:4321`**.
- `astro.config.mjs`: `output: 'static'` + Cloudflare adapter with
  `platformProxy: { enabled: true }` — this surfaces `.dev.vars` at
  `Astro.locals.runtime.env` under `astro dev`, so `/api/receipt` reads its key the
  same way in dev and in the deployed Worker.
- `.dev.vars` (gitignored) holds `DEMO_SIGNING_KEY="devkey_…_TESTMARKER_do_not_ship"`.
  `.dev.vars.example` is the committed template.
- `wrangler.jsonc` points `main` at the emitted Worker; only `/api/*` invokes it.
  Production secret is a deploy step (`wrangler secret put DEMO_SIGNING_KEY`).

"Healthy local demo" therefore = `astro dev` (or `wrangler dev`) running with a key
in `.dev.vars`. "Dev server down" = nothing listening on the port → `fetch` rejects
with a connection error (ECONNREFUSED), fast.

## Repo conventions the command must fit

- **Runtime:** Node `v26.4.0`. TypeScript runs **directly** via
  `node --experimental-strip-types` — no build step for tooling. Source must be
  *erasable* TS (no enums/namespaces/param-properties); the existing lib files
  already are.
- **Imports across executed `.ts`** use an **explicit `.ts` extension** (see the
  test importing `../src/lib/operation-runner.ts`). Astro's own routes import
  without extension because a bundler resolves them; anything Node executes directly
  needs the extension.
- **Pure-core / thin-edge split** is the house pattern: `receipt.ts` (pure) vs
  `api/receipt.ts` (thin), `operation-runner.ts` (pure). A new command should keep
  its logic pure/testable and push I/O (env, argv, stdout, `process.exit`, file
  reads) to a thin wrapper.
- **Tests:** `test/*.test.mjs`, Node built-in runner, no framework dependency. The
  one `test` script names its file explicitly. Stubs only — no server, no network,
  suite finishes in well under a second with an outer per-test timeout guarding the
  timeout case.
- **Brand voice (global CLAUDE.md):** any human-read copy (a `--help` line, a status
  line) is plain kitchen-table English — no "orchestration/leverage/observability"
  jargon. This is CLI output, minor surface, but the rule still applies.
- **Commits:** incremental, one logical unit each; footer
  `Co-Authored-By: Claude Opus 4.8 (1M context)`. Multiple Lisa threads share this
  branch; a file lock serializes commits. Touch only this ticket's files.

## Constraints & assumptions surfaced

- **The exit-code contract is the product.** CI and humans read `$?`; the trace text
  is the explanation. Both must be right.
- **"Names the boundary" is satisfied by `operationName`**, which the runner fills
  from `name`. Setting `name: BOUNDARY_NAME` makes both the pass and fail traces name
  `receipt` with no extra machinery — including the down case, where there is no
  response to inspect.
- **Time budget must bound the down case.** ECONNREFUSED is already fast, but a
  server that accepts the socket and never answers would hang a naked `fetch`
  forever. The budget + abort is what makes clause 4 true in the *hard* case, not
  just the easy one.
- **Signature verification is available but optional.** The key can be held
  out-of-band (env, or read from `.dev.vars`). Verifying proves the server *used the
  secret* — the honest form of "the integration works." Whether a mismatch or a
  missing key is fatal is a Design decision, not a fact.
- **Target URL / port / budget must be overridable.** Hard-coding `localhost:4321`
  works for the default `astro dev`, but `wrangler dev` uses a different port and CI
  may point elsewhere. Some override (env var) is needed; the default should match
  `astro dev`.
- **`localhost` vs `127.0.0.1`:** `localhost` may resolve to IPv6 `::1`; a dev server
  bound only to IPv4 would then refuse even while "up." The default host choice
  interacts with this — noted for Design, not decided here.
- **Downstream (T-002-01-04, boundary-fault-modes)** `depends_on: [T-002-01-03]` and
  will set a fault flag making the boundary broken/stalled, expecting the ops check
  to "name the offender and failure kind" and "fail at the time budget." So this
  command's output should already surface `failure.kind` and stay generic about
  *why* the boundary failed — it must not hard-code assumptions about a healthy-only
  world. It owns the healthy + server-down paths; the fault flag is the next ticket.
- **T-002-02-01 (Playwright flow)** is a *separate* browser-level budgeted check on a
  different track (`S-002-02`); it does not share files with this command. No
  coordination needed beyond not colliding on the boundary contract.
- **No committed test covers the boundary yet** — T-002-01-02's review explicitly
  flagged that gap and handed it to this story's runner/ops-check tickets. This
  ticket is the natural place to land automated coverage of the boundary via the
  runner.

## Open questions carried into Design

1. Where does the command live and how is it invoked (npm script name, file path)?
2. Pure lib + thin CLI, or a single script? (House pattern suggests the former.)
3. Does the check verify the signature, and is a mismatch / missing key fatal?
4. What exactly does a passing vs failing run print, and how is config resolved
   (URL, budget, key)?
5. How is the timeout (hang) path tested without a real hanging server?
