# Design — T-002-01-03 exemplar-boundary-ops-check

## Decision summary

Add a **pure, injectable core** `src/lib/ops-check.ts` that composes the operation
runner (T-002-01-01) with the exemplar boundary (T-002-01-02): it `fetch`es
`GET /api/receipt` through `runOperation`, validates the response is a real
`receipt`, optionally re-verifies the HMAC signature against an out-of-band key, and
returns the runner's discriminated result plus a human-readable, stack-free trace
line. A **thin CLI wrapper** `scripts/ops-check.ts` resolves configuration from the
environment (URL, budget, key — including a `.dev.vars` fallback), prints the trace,
and sets the process exit code. A committed Node test suite drives the core with a
**stub `fetch`**, so healthy / down / hung / tampered paths are proven without a
server. One `npm run ops:check` script is added.

This mirrors the repo's established **pure-core / thin-edge** split (`receipt.ts` vs
`api/receipt.ts`; `operation-runner.ts` pure) and reuses, rather than reinvents, the
runner's timing, abort, timeout, and stack-free failure guarantees.

## Decision 1 — command shape: pure lib + thin CLI

### Chosen: `src/lib/ops-check.ts` (pure) + `scripts/ops-check.ts` (I/O edge)

The core exports a function that takes an explicit config (including an injectable
`fetchImpl`) and returns data. It performs **no** env reads, argv parsing, stdout
writes, file reads, or `process.exit`. All of that lives in the CLI wrapper.

Why:

- It matches the house pattern exactly. Every side-effect-free unit in this repo is
  a `src/lib/*.ts`; every edge (`api/receipt.ts`, the future script) is thin.
- It makes the healthy / down / hung / tampered behaviors **unit-testable with a
  stub fetch** — no live server, suite stays sub-second, mirroring the runner's own
  test discipline. This is what lets us finally land committed boundary coverage,
  the gap T-002-01-02's review flagged.
- The CLI wrapper stays small enough to read at a glance; the logic that matters is
  covered by tests, not by an executable script that tests can't import cleanly.

### Rejected: single `scripts/ops-check.ts` doing everything

Fewer files, but the interesting logic (validation, verification, exit decision)
becomes reachable only by spawning the process. Tests would need child-process
plumbing or a live server, contradicting the repo's stub-only, seconds-fast suite.
Rejected on testability.

### Rejected: put it under `src/pages/` or make it an API route

The ops check is an operator tool, not a page or a served route. It must not enter
the Astro build graph or ship to the edge. `scripts/` keeps it clearly out of the
site. (Astro only bundles what pages import; `src/lib/ops-check.ts` is imported only
by the script and the test, so it is excluded from the build regardless — verified
as a plan step.)

## Decision 2 — operation name = `BOUNDARY_NAME`

The `runOperation` call uses `name: BOUNDARY_NAME` (`'receipt'`), imported from
`src/lib/receipt.ts`.

Because the runner echoes `name` into `trace.operationName` on **both** pass and
fail, the boundary is named in the healthy trace *and* in the server-down trace —
even though the down case has no response to inspect. This is the cleanest possible
satisfaction of "still naming the boundary": it falls out of one field, no string
plumbing, and it stays correct when T-002-01-04 makes the boundary fault.

Rejected: a decorated name like `ops-check:receipt`. It dilutes the literal boundary
handle the ticket asks to see and would drift from `BOUNDARY_NAME`. The command is
already identified by its own output header; the *operation* should be the boundary.

## Decision 3 — what the operation actually checks

Inside `invoke({ signal })`, in order, each failure `throw`ing so the runner records
a stack-free `kind: 'operation'` failure whose message names the reason:

1. `const res = await fetchImpl(url, { signal, headers: { accept: 'application/json' } })`
   — a connection error (server down) rejects here; the runner catches it.
2. `if (!res.ok) throw new Error('boundary answered HTTP ' + res.status)` — a `500
   boundary_misconfigured` (missing key) becomes an explicit failure, not a pass.
3. Parse JSON; **validate the receipt shape** and that `receipt.boundary ===
   BOUNDARY_NAME`. A wrong/garbage body throws `unexpected response shape` rather
   than passing on any 200.
4. **If** an out-of-band key is present: `verifyReceipt(key, receipt)`; `false`
   throws `signature did not verify against the out-of-band key`.
5. Return `{ receipt, signatureVerified: <bool> }` as the runner's `value`.

Rationale — this is the ticket's thesis made real: "'the integration works' is a
green check instead of an assumption." A bare 200 only proves *something* answered.
Re-verifying the signature proves the **server used the secret the browser never
sees** — the actual integration. `receipt.ts` was built (pure, `verifyReceipt`
exported, key held out-of-band) precisely so this command could do it.

## Decision 4 — signature verification is best-effort, mismatch is fatal

Three cases, deliberately asymmetric:

| Situation | Result | Why |
|---|---|---|
| Key present, signature valid | **pass**, `signatureVerified: true` | strongest evidence |
| Key present, signature invalid | **fail** (`operation`) | integration is genuinely broken — a served receipt the real key rejects means wrong key or tampering |
| No key available | **pass**, `signatureVerified: false` | reachable + correct boundary + fresh receipt is still real evidence; we simply couldn't hold the key out-of-band here |

So a **missing key never fails the check** (the command must be runnable in
environments that don't hold the secret), but a **present key that rejects the
signature always fails** (silently downgrading would defeat the purpose). The trace
line states which mode ran, so a green check is never ambiguous about whether the
signature was actually checked.

Rejected: always require a key (fail when absent). Too brittle — a healthy demo
verified by curl in T-002-01-02 should still green-check here even if the operator
didn't export the secret. Rejected: never verify (200 is enough). Throws away the
one check that distinguishes "the server used the secret" from "a static file
answered." The best-effort split keeps both truths.

## Decision 5 — configuration resolution (in the CLI wrapper only)

| Setting | Source (first wins) | Default |
|---|---|---|
| URL | `OPS_CHECK_URL`, else `${DEMO_BASE_URL}/api/receipt` | `http://localhost:4321/api/receipt` |
| Time budget (ms) | `OPS_CHECK_TIMEOUT_MS` | `2000` |
| Out-of-band key | `DEMO_SIGNING_KEY`, else parsed from `.dev.vars` | *(absent → verify skipped)* |

Notes:

- **Default host `localhost`, matching Astro's advertised URL.** (Corrected during
  Implement — the initial `127.0.0.1` guess was backwards.) Observed reality on
  macOS: `astro dev` prints and binds `http://localhost:4321/`, and `localhost`
  resolves to IPv6 `::1`, where the server listens — so a hard-coded `127.0.0.1`
  (IPv4) is *refused* and a healthy demo looks "down". Defaulting to the exact host
  Astro advertises (`localhost`) is what makes the zero-config run reliable; Node's
  `fetch` resolves `localhost` to whichever family the server is on. `DEMO_BASE_URL`
  lets `wrangler dev` or CI point elsewhere.
- **`.dev.vars` fallback** means a plain local `npm run ops:check` re-verifies the
  signature against the *same* key the running dev server uses, with zero extra
  setup — the fallback parse is tiny, tolerant (missing file → skip), and lives only
  in the wrapper (file I/O at the edge). Env var still wins for CI/prod.
- **Budget `2000ms`** is the runner design's own example budget and comfortably
  covers a healthy local round-trip while bounding a hang. Overridable for slow CI.
- Non-numeric / non-positive `OPS_CHECK_TIMEOUT_MS` is rejected by `runOperation`'s
  own validation (`RangeError`) — the wrapper surfaces that as a config error with
  exit code `2`, distinct from a boundary failure (`1`).

## Decision 6 — output and exit codes

- **Pass:** exit `0`. Print one summary line naming the boundary and latency, e.g.
  `✓ receipt — passed in 12.3 ms`, followed by the receipt's `issued at`, `one-time
  tag`, and whether the signature was `verified` or `present (not checked — no key)`.
- **Fail (boundary):** exit `1`. Print `✗ receipt — failed in NNN ms  [operation|
  timeout]` and the trace's failure `message` on the next line. **Never** a stack —
  we print `trace.failure.message`, which the runner already normalized.
- **Config error:** exit `2`. Bad budget/URL before an operation runs — clearly a
  harness misconfiguration, not the boundary's fault.

Exit `1` vs `2` keeps CI able to distinguish "the demo is broken" from "you invoked
the check wrong." `failure.kind` is printed in-line so T-002-01-04 gets "name the
offender **and** failure kind" for free.

Copy is plain English (brand voice): "passed in", "the server didn't answer",
"signature verified" — no jargon.

## Decision 7 — testing strategy (stub fetch, no server)

`test/ops-check.test.mjs`, Node built-in runner, injecting `fetchImpl`:

1. **Healthy** — stub returns a `makeReceipt(KEY)` body; key `KEY` → passed trace,
   `operationName === 'receipt'`, finite `durationMs`, `signatureVerified === true`.
2. **Down** — stub `fetch` rejects (`Error('fetch failed')`) → failed trace,
   `kind: 'operation'`, still `operationName === 'receipt'`, bounded.
3. **Hung** — stub returns `new Promise(() => {})`, small budget (40 ms), outer test
   timeout 1000 ms → failed trace, `kind: 'timeout'`, `operationName === 'receipt'`,
   elapsed well under the outer limit. This is the "not a hung fetch" proof.
4. **Tampered / wrong key** — body signed with `KEY_A`, verified with `KEY_B` →
   failed trace, `kind: 'operation'`, message mentions the signature.
5. **Bad status** — stub `{ ok:false, status:500 }` → failed, message names HTTP 500.
6. **No key** — healthy body, no key → **passed**, `signatureVerified === false`.

All stubs are plain objects (`{ ok, status, json }`); no network, no `process.exit`
(the core returns data). The suite proves every acceptance clause at the seam level;
a live run against `astro dev` (Implement/Review) confirms the wiring end-to-end.

## Scope boundaries

This ticket will **not**: add the fault flag or broken/stalled modes (T-002-01-04);
add the Playwright browser flow (T-002-01-02.. S-002-02 / T-002-02-01); change the
boundary, its route, the page, or deploy config; add retries, polling, or JSON
report files; or introduce a test framework. It composes the two existing seams into
one runnable, tested check and nothing more.
