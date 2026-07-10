# Review — T-002-01-03 exemplar-boundary-ops-check

Handoff for a human reviewer: what changed, how it was verified, and what to watch.

## What shipped

The exemplar boundary is now the template's first **directly-invokable traced
operation**. A new command — `npm run ops:check` — runs `GET /api/receipt` through
the operation runner (T-002-01-01), validates the response is a real signed
`receipt`, re-verifies its HMAC signature against a key held out-of-band, and prints
a readable pass/fail trace. "The integration works" is now a green check with a
latency number, not an assumption — and when the demo is down the same command fails
fast, still naming the boundary, with no hung fetch and no raw stack trace.

## Files created / modified

| File | Change | Why |
|---|---|---|
| `src/lib/ops-check.ts` | **new** | pure core: compose `runOperation` + `fetch` + `verifyReceipt`; format a stack-free trace line |
| `scripts/ops-check.ts` | **new** | thin CLI: resolve config from env (+ `.dev.vars` key fallback), print, set exit code |
| `test/ops-check.test.mjs` | **new** | 8-case Node suite driving the core with a stub `fetch` |
| `package.json` | modified | add `ops:check` script; widen `test` to run both suites |

No dependency/lockfile change. The boundary, its route, the page, deploy config, and
env contract are untouched. Committed in 5 incremental commits, each a self-contained
unit; files staged explicitly (shared branch).

## Design shape (what a reviewer should look at)

- **Pure-core / thin-edge**, matching the house pattern (`receipt.ts` vs
  `api/receipt.ts`). `src/lib/ops-check.ts` reads no env, writes no stdout, calls no
  `process.exit`, and takes an **injectable `fetch`** — which is exactly what lets the
  suite prove every path with stubs and no server. `scripts/ops-check.ts` is the only
  file that touches the outside world.
- **The boundary is named by reusing the runner contract**, not by string plumbing:
  `runOperation({ name: BOUNDARY_NAME, … })` puts `'receipt'` in `trace.operationName`
  on *both* pass and fail — so the down case names the boundary even though there is no
  response to inspect. "No raw stack" and "not a hung fetch" are inherited from the
  runner (it normalizes failures to a stack-free message and aborts at the budget); the
  core never catches its own errors, which is what keeps that guarantee intact.
- **Signature verification is best-effort but a mismatch is fatal** (design D4): a
  present key that *rejects* the signature fails the check (integration genuinely
  broken); an *absent* key still green-checks a reachable, well-formed receipt but
  marks it "not checked". This keeps the command runnable where the secret isn't held,
  without silently downgrading the strongest evidence when it is.

## Acceptance criterion — evidence

All five clauses of the single AC, verified **live** against `astro dev` (key in
`.dev.vars`) and by the committed suite:

1. **Command exists / runs** — `npm run ops:check`.
2. **Healthy → exit 0** — verified: exit `0`.
3. **Healthy → trace names boundary + latency** — `✓ receipt — passed in 39.4 ms`,
   plus `issued at` / `one-time` / `signature verified against the out-of-band key`.
4. **Down → non-zero, within budget** — server stopped: exit `1`,
   `✗ receipt — failed in 31.7 ms  [operation]` (31.7 ms ≪ 2000 ms budget).
5. **Down → names boundary, no stack** — output names `receipt`; grep for stack
   frames (`    at `) in the failure output → **0**. Message is the runner's
   normalized `fetch failed`, not a Node error dump.

Bonus: a bad budget (`OPS_CHECK_TIMEOUT_MS=0`) exits `2` with
`ops check misconfigured: Operation time budget must be a positive finite number.` —
a check-config error kept distinct from a boundary failure.

## Test coverage — and gaps

- **Committed, deterministic (`test/ops-check.test.mjs`, 8 cases; 12 total green,
  sub-second):** healthy+valid-key → passed & named; server-down → failed `operation`
  & named; **stalled → `timeout` within budget** (budget 40 ms, outer test timeout
  1000 ms — the "not a hung fetch" proof); wrong-key → failed (signature); non-ok
  status → failed (names 500); malformed body → failed (no pass on any 200); no-key →
  passed but `signatureVerified: false`; `formatBoundaryTrace` smoke (renders,
  stack-free). This is also the **first committed automated coverage of the exemplar
  boundary** — the gap T-002-01-02's review explicitly deferred to this story.
- **Verified live but not automated:** real-`fetch` abort behavior, `.dev.vars` key
  pickup, and the exit codes of the CLI wrapper itself (the wrapper is thin glue; its
  logic is covered via the core). A child-process test of `scripts/ops-check.ts` was
  not added — deliberately, to avoid spawning/servers in the suite.
- **Not covered:** a live *hanging* server (a socket that accepts but never answers).
  The timeout guarantee is proven at the seam by the stalled unit case instead; a real
  hang would exercise the same runner abort path.

## Open concerns / notes for downstream

- **Deviation logged:** the default host was corrected `127.0.0.1` → `localhost`
  during Implement. `astro dev` binds/advertises `localhost:4321`, which resolves to
  IPv6 `::1` on this machine; `curl 127.0.0.1:4321` was *refused* while
  `localhost:4321` returned 200. The IPv4 default would have false-negated a healthy
  demo. Now defaults to the host Astro prints; `DEMO_BASE_URL`/`OPS_CHECK_URL` override
  for `wrangler dev`, CI, or a deployed URL. (`design.md` D5 updated to match reality.)
- **Node floor:** like the runner suite, both the command and its tests use
  `--experimental-strip-types` (Node 26 here). Same version-floor caveat T-002-01-01
  raised; no `engines` pin added, to avoid changing the template's support contract for
  tooling reasons.
- **`.dev.vars` key fallback** is a convenience for zero-config local runs; it is
  tolerant (missing file / parse trouble → run without verification, never an error).
  Env `DEMO_SIGNING_KEY` always wins. It reads only `.dev.vars` in CWD.
- **Interfaces kept stable** for T-002-01-04 (boundary-fault-modes), which
  `depends_on` this ticket: it will set a fault flag on the boundary and rerun this
  same command, relying on `formatBoundaryTrace` already printing `failure.kind`
  (`operation` vs `timeout`) and the exit contract (0 pass / 1 boundary-fail / 2
  misconfig). Nothing in that ticket needs to edit `ops-check.ts` — it edits the
  boundary and observes this command.
- **Concurrency:** sibling Lisa threads (e.g. T-002-02-01's Playwright work) committed
  to this shared branch during the session. My commits touch only this ticket's four
  files; other untracked entries in `git status` are not mine.

## Bottom line

AC met and verified end-to-end on the running demo and by a committed, deterministic
suite. The one thing a reviewer should consciously note is the **host default
correction** (now `localhost`, matching Astro) and its rationale. The command composes
the two existing seams into the story's first real green check without touching the
boundary itself.
