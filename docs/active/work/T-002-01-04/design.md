# Design — T-002-01-04 boundary-fault-modes

## Decision summary

Add a **pure fault module** `src/lib/fault.ts` that (a) parses an env value into a
`FaultMode` (`off | broken | stalled`) tolerantly, and (b) exposes a pure
`corruptSignature(receipt)` transform for the `broken` mode. Wire it into the **thin
edge** `src/pages/api/receipt.ts`: the route reads `env.DEMO_FAULT` alongside the
signing key and, after producing a normal signed receipt, either serves a
signature-corrupted `200` (`broken`) or hangs until the client gives up (`stalled`).
The **identical** `ops:check` command then observes all three outcomes purely from
server state. Prove `fault.ts` with a committed stub-driven Node suite
`test/fault.test.mjs` (including a compose-with-`runBoundaryCheck` case), and confirm
the live wiring against `astro dev` in Implement.

No change to `operation-runner.ts`, `ops-check.ts`, `receipt.ts` logic, the CLI, the
page, or deploy config. The runner and ops-check already turn a hang into a bounded
`timeout` failure and a wrong `200` into an `operation` failure — this ticket only
gives the *server* a way to enter those states, plus the tests that prove it does.

This mirrors the house **pure-core / thin-edge** split and reuses the existing
failure machinery instead of duplicating it.

## Decision 1 — where the fault lives: server env, not the command

### Chosen: `env.DEMO_FAULT`, read in the route like `DEMO_SIGNING_KEY`

The AC says "the **identical** command" passes/fails across modes. That is only
possible if the difference is **server state**. `DEMO_FAULT` is read from
`locals.runtime.env` exactly as the signing key is — fed by `.dev.vars` in dev and a
Worker var in prod — so an operator flips the demo's behavior without touching how
`ops:check` is invoked.

Why not the alternatives:

- **A CLI flag / query param on `ops:check`** (`--fault`, `?fault=broken`): breaks
  "identical command" outright — the *observer* would be choosing the outcome. The
  whole point is that a neutral probe discovers the fault.
- **A request header the check sends**: same problem, and it couples the probe to
  the fault vocabulary.
- **A separate `/api/receipt-broken` route**: two boundaries to keep in sync,
  pollutes the build graph, and `ops:check` points at one URL by design.

Reading env in the route (an edge that already reads env) keeps all I/O at the edge
and the new *logic* pure.

## Decision 2 — `broken` semantics: a well-formed 200 whose signature won't verify

### Chosen: `corruptSignature` — serve a real receipt, then flip its signature

`broken` returns `200` with a body that is shape-valid in every field **except** the
signature no longer matches `canonicalMessage`. `runBoundaryCheck` fetches it, passes
`assertReceiptShape`, then calls `verifyReceipt(key, receipt)` → `false` → throws
`signature did not verify against the out-of-band key` → `kind: 'operation'` failure
naming the boundary → exit `1`.

Why this over a blunter break:

- **It demonstrates *why the harness exists*.** A naive `curl -f` (or a "did it
  return 200?" check) would call this healthy. The ops-check catches it precisely
  because it re-verifies the signature against the out-of-band key. `broken` should
  exercise the crown-jewel check, not a check any tool would pass.
- **It reuses an already-tested core path.** ops-check's "wrong key → failed
  (signature does not verify)" test already proves the core rejects exactly this;
  `broken` just makes the *server* produce it. No new detection code.
- **Deterministic and pure.** `corruptSignature` maps each hex digit `d → (15 - d)`.
  Since `15 - d ≠ d` for every integer `d`, the result is guaranteed different, same
  length, still hex. No randomness (honoring the runner/receipt injection ethos).

### Rejected: `broken` → `500` error body

Robust (caught with no key, via `!res.ok`), but a `500` is the *boring* failure —
any health check catches it, and it overlaps semantically with the existing
`boundary_misconfigured` path. It would not show what shape/signature validation buys
you. Kept as the mental model for "the boundary errored," but not the chosen demo.

### Rejected: `broken` → blank/removed signature (caught by shape)

Also key-independent (the shape validator rejects an empty `signature`), but the
resulting message is the generic `unexpected response shape from the boundary` rather
than the pointed `signature did not verify`. Less legible about *what* broke.

### Accepted caveat (documented, not a defect)

Signature-level detection requires the check to **hold the out-of-band key**. The
demo's default `npm run ops:check` does — it parses the *same* `.dev.vars` the dev
server signs with (confirmed present). In a deliberately keyless environment the
harness cannot, by construction, detect a signature tamper (ops-check Decision 4:
"no key → pass, marked unverified"). That is the honest boundary of what a probe
without the secret can know, not a gap this ticket introduces. The AC is evaluated in
the demo's key-holding default. (If a future ticket needs a key-independent break,
the rejected `500`/blank variants are drop-in.)

## Decision 3 — `stalled` semantics: hang; let the runner bound it

### Chosen: the route returns a Promise that only settles on client abort

In `stalled` mode the route does **not** answer. It returns a `Promise<Response>`
that resolves (to a throwaway `499`, "client closed request") **only** when
`request.signal` aborts. `ops:check` runs the fetch through `runOperation`, whose
`setTimeout(timeBudgetMs)` fires, records a `kind: 'timeout'` failure, and
`controller.abort()`s the fetch. That abort propagates to the server's
`request.signal`, which settles the hung promise — no leaked handler.

Why this shape:

- **"Fails *at* the budget, not after" is the runner's guarantee, not ours.** The
  server must genuinely hang; the *client* bounds it. We deliberately do nothing that
  could answer before the budget.
- **Abort-aware, so it's a good citizen.** Tying the settle to `request.signal`
  means a hung request is cleaned up the instant the probe gives up, instead of
  pinning a connection until the process dies. If the signal never fires (a client
  with no timeout), it stays hung — which is exactly `stalled`.
- **Symmetry with the Playwright `stalled` project**, which stalls the *browser* via
  `page.route(… () => {})`. Same fault, other observer. Shared vocabulary
  (`stalled`) keeps the demo coherent.

### Rejected: `await new Promise(() => {})` (hang forever, ignore signal)

Simpler, and correctness for the AC is identical (the client still times out). But it
leaks the request handler until process exit. The signal-aware version costs three
lines and is cleaner; chosen for hygiene.

### Rejected: `setTimeout` longer than the budget then answer

"Slow" is not "stalled," and it would race the budget — flaky. A true stall is
unambiguous and is what the P2 charter wants proven.

## Decision 4 — parsing is tolerant and fail-safe

`parseFaultMode(raw)`: trim + lowercase; return `'broken'`/`'stalled'` on exact
match, else `'off'`. Consequences:

- **Unset / empty / whitespace → `off`** → the healthy path → "flag unset passes
  clean." The default must be healthy.
- **Unknown/typo (`brokn`) → `off`.** A fault the operator didn't ask for is worse
  than a no-op; the server must never *accidentally* break. Fault is strictly
  opt-in, matching the tolerant `.dev.vars` parser already in the CLI.

The parser is pure (no throw, no I/O) so it is trivially table-tested.

## Decision 5 — keep detection in the existing core; add zero ops-check code

The fault modes are engineered to land on paths `runBoundaryCheck` **already** owns:
`broken` → its signature-mismatch throw; `stalled` → the runner's timeout. So
`ops-check.ts`, `operation-runner.ts`, and `receipt.ts` are **untouched**. This is
the strongest evidence the harness from T-002-01-03 was built right: a new fault
needs no new detection, only new *injection*. `formatBoundaryTrace` already emits
`✗ receipt — failed in N ms [operation|timeout]` + message, satisfying "report the
boundary and the failure kind" with no formatting change.

## Decision 6 — testing strategy

Pure `fault.ts` is the only new unit, so it carries the new committed tests
(`test/fault.test.mjs`, Node built-in runner):

1. `parseFaultMode` table: `undefined/''/'  '/'nope' → off`; `'broken'/'BROKEN'/'
   stalled ' → broken/stalled` (case/space tolerance).
2. `corruptSignature`: output differs from input, **same length**, still `/^[0-9a-f]+$/`,
   and `verifyReceipt(KEY, corrupted) === false` while `verifyReceipt(KEY, original)
   === true` (proves the tamper is real and detectable).
3. **Compose**: feed a `corruptSignature(makeReceipt(KEY))` body through
   `runBoundaryCheck` with a stub `fetch` and `key: KEY` → failed trace,
   `kind: 'operation'`, `operationName === 'receipt'`, message matches `/signature/i`.
   This proves the *broken server → ops-check exit 1* contract at the seam without a
   server.

The `stalled` timeout path is already proven at the ops-check seam (the existing
`new Promise(() => {})` test) and by the runner's own suite, so it needs no
duplicate; the server-side hang is confirmed by a **live** `DEMO_FAULT=stalled npm
run dev` + `npm run ops:check` run in Implement (times out at the budget), alongside
live `broken` (exit 1) and unset (exit 0) runs. Live results recorded in
`progress.md`.

## Scope boundaries

Will **not**: touch the browser/Playwright flow, the page, the receipt or runner
logic, the ops-check core or CLI, retries/polling, or JSON reports. Adds one pure
module, one env read + two branches in the existing route, one type field, docs in
`.dev.vars.example`, and one test file.
