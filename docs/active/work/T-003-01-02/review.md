# Review — T-003-01-02 shared-passcode-gate

Handoff document. What changed, how well it is covered, and what a human should weigh.

## What this ticket delivered

A reusable, server-side check of the shared low-stakes backstage passcode that the two
downstream paths — the submit route (T-003-02-01) and the agent retrieve seam
(T-003-03-01) — compose over with a single line. It is the pure gate primitive only; no
route is wired here because none exists yet to gate.

## Files changed

| File                      | Action | Summary                                                             |
| ------------------------- | ------ | ------------------------------------------------------------------- |
| `src/lib/passcode.ts`     | create | The gate: pure `checkPasscode` core + `guardPasscode` Response adapter. |
| `test/passcode.test.mjs`  | create | 14 unit cases driving the gate (the acceptance criterion).           |
| `package.json`            | modify | Added the new test file to the `test` script list.                   |
| `src/env.d.ts`            | modify | Declared server-only `DEMO_PASSCODE: string`.                        |
| `.dev.vars.example`       | modify | Documented `DEMO_PASSCODE` (header, prod secret path, framing).      |

Commits: `4d8f5a2` (module) → `8d305b5` (tests + wiring) → `02789b8` (env + docs).

## How it works

- **Presentation:** client sends the passcode in the `x-demo-passcode` header
  (`PASSCODE_HEADER`) — method-agnostic, out of URLs/logs/bodies, so one gate covers a POST
  submit and a GET retrieve.
- **Decision:** `checkPasscode(configured, presented)` returns a `GateDecision` discriminated
  union in the repo's `OperationResult` idiom, with the HTTP status embedded:
  - blank server passcode → `misconfigured` / **500** (fail closed, checked first so a broken
    gate never blames the visitor — mirrors `receipt.ts` key-before-fault ordering);
  - no passcode presented (null/empty/whitespace) → `missing` / **401**;
  - present but wrong → `mismatch` / **403**;
  - exact match → `allowed`.
- **Comparison:** best-effort length-independent constant-time compare (`constantTimeEqual`)
  over exact bytes — removes the trivial first-mismatch timing signal without over-promising
  at this stakes level, and avoids surprising whitespace/case equivalences.
- **Adapter:** `guardPasscode(request, configured)` returns `null` to proceed or a finished
  JSON denial `Response` (`{ gate, error, detail }`, plain-English `detail` per brand voice).

## Acceptance criteria — met

> A unit test drives the gate: a request with a missing or wrong passcode is rejected
> (401/403) and a correct one passes; the passcode is read server-side and never appears in
> any browser-shipped bundle.

- Missing → 401, wrong → 403, correct → pass: covered by direct `checkPasscode` cases and by
  `guardPasscode` end-to-end over a real `Request`. ✅
- Read server-side / never in a browser bundle: **structural.** The passcode is only ever a
  function argument; the pure core embeds no literal; its source `DEMO_PASSCODE` is a
  server-only env var that is not `PUBLIC_`-prefixed, so Astro/Vite never inline it into
  client output (the same guarantee `DEMO_SIGNING_KEY` relies on). A test asserts
  `PASSCODE_ENV` is non-`PUBLIC_`, and another asserts no denial body echoes the passcode. ✅

## Test coverage

52 tests pass (38 prior + 14 new); `npm run build` is green. New coverage:
- correct pass; wrong → 403; missing over `{null, undefined, '', '   ', '\t\n'}` → 401;
  blank configured over `{undefined, null, '', '   '}` → 500 (fail closed) even when a
  "matching" value is presented; misconfigured-precedence over missing.
- `constantTimeEqual` via `checkPasscode`: equal, one-char diff, prefix/length mismatch both
  directions, no-trim exactness.
- `passcodeFromHeaders` present/absent; `describeDecision` slugs+detail; `guardPasscode`
  Response for all four outcomes (status, content-type, `gate`, `error`); no-echo of the
  secret.

### Gaps / not covered (by design)

- No HTTP/integration test — this ticket has no route surface; the downstream route (
  T-003-02-01), mobile UI (T-003-02-02), and seam (T-003-03-01) tickets own end-to-end
  exercise of the gate through a live server.
- `leak:check` is **not** extended to scan built assets for `DEMO_PASSCODE`; the bundle
  guarantee here is structural, not enforced by the scanner. See open concerns.

## Open concerns / notes for a human reviewer

1. **Missing-vs-wrong status split (401 vs 403)** exposes a mild "was a passcode presented"
   distinction. Deliberate and documented in `design.md`: this is a low-stakes gate the
   holder is meant to pass, the door's existence is not secret (public epic intent), and the
   DX/clarity win was judged worth it. Flag if a reviewer wants both collapsed to 403.
2. **Constant-time compare is best-effort**, not a hard guarantee (portable JS can't promise
   true constant time). Correct for a low-stakes gate; do not treat it as protecting a real
   secret. `receipt.ts` deliberately uses plain `===` for its signing key in trusted
   contexts — different threat model.
3. **`leak:check` coverage** currently keys only on `DEMO_SIGNING_KEY`. Extending it to also
   assert `DEMO_PASSCODE` never reaches the bundle would convert the structural guarantee
   into an executable one — a reasonable, small future hardening, intentionally out of scope.
4. **`DEMO_PASSCODE` is typed required** (`string`). A deployment that forgets to set it gets
   a clean 500 from the gate rather than a type error; that is the intended fail-closed
   behavior, but note it is only enforced at request time, not at build.

## Verification commands

```
npm test        # tests 52, pass 52, fail 0
npm run build   # client + server build Complete
```
