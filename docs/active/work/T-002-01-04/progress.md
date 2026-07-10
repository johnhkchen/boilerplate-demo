# Progress — T-002-01-04 boundary-fault-modes

## Status: implementation complete, all acceptance criteria verified live.

## Commits (incremental, in order)

1. `Add pure fault module: parse mode + corrupt signature (T-002-01-04)`
   — `src/lib/fault.ts`.
2. `Cover fault module + broken→ops-check failure with a stub suite (T-002-01-04)`
   — `test/fault.test.mjs`, `package.json` (test list).
3. `Wire DEMO_FAULT broken/stalled modes into the boundary route (T-002-01-04)`
   — `src/pages/api/receipt.ts`, `src/env.d.ts`.
4. `Document the DEMO_FAULT toggle in .dev.vars.example (T-002-01-04)`
   — `.dev.vars.example`.

## Steps vs. plan

- **Step 1 (pure module)** — done as planned. `flipHexDigit` private, only
  `type Receipt` imported. Added a bonus property in tests: the flip is its own
  inverse (`corruptSignature∘corruptSignature = identity`), a free correctness check.
- **Step 2 (unit tests)** — done. `npm test` → **17 pass / 0 fail**, ~170 ms, no
  server. New cases: parse table, corrupt-signature properties (differs, same-length
  hex, `verifyReceipt` false-vs-true), and the compose test proving a broken-server
  body drives `runBoundaryCheck` to an `operation` failure naming `receipt`.
- **Step 3 (route + types)** — done. Key-validation stays first; `stalled` returns an
  abort-aware hanging `Promise<Response>`; `broken` serves `corruptSignature(receipt)`
  as a 200; healthy path unchanged. `Env.DEMO_FAULT?: string` added. `npx astro build`
  succeeds; client build transformed **1 module** → `fault.ts` stays out of the client
  bundle (imported only by the on-demand route + tests), as intended.
- **Step 4 (docs)** — done. Plain-English `# DEMO_FAULT` block in `.dev.vars.example`,
  commented-out so healthy stays the default.
- **Step 5 (live)** — done; results below.
- **Step 6 (review.md)** — next.

## DEVIATION — how the fault reaches the dev server

**Plan assumed** `CLOUDFLARE_INCLUDE_PROCESS_ENV=true DEMO_FAULT=… npm run dev` would
surface the toggle on `locals.runtime.env` (it is what `playwright.config.ts` uses for
`DEMO_SIGNING_KEY`). **Observed:** under `astro dev` with
`platformProxy: { enabled: true }`, that flag did **not** surface `DEMO_FAULT` — the
first `broken` run passed clean (fault read as `off`). The reliable channel in dev is
the **`.dev.vars` file itself** (the exact channel `DEMO_SIGNING_KEY` already travels).
Adding `DEMO_FAULT=broken` / `=stalled` to `.dev.vars` worked immediately.

**Resolution / impact:**
- No code change needed — the route reads `env.DEMO_FAULT` correctly; this is purely
  *how an operator sets it locally*.
- `.dev.vars.example` already documents the `.dev.vars` channel (correct). The
  `CLOUDFLARE_INCLUDE_PROCESS_ENV` suggestion in `plan.md`/`structure.md` is superseded
  by "put `DEMO_FAULT` in `.dev.vars`" for `astro dev`. In production it is a normal
  Worker var (`wrangler secret put` / `[vars]`), unaffected.
- `.dev.vars` is gitignored (`git check-ignore` confirmed); it was backed up, edited
  for each live run, and **restored pristine** (final `git diff .dev.vars` empty).

## Live verification (the acceptance criteria) — the identical `npm run ops:check`

Dev server = `npm run dev` (holds the key via `.dev.vars`); the check re-reads the
same key, so signature detection is live.

| Mode (`.dev.vars`) | Command | Output (trace) | Exit |
|---|---|---|---|
| unset | `npm run ops:check` | `✓ receipt — passed in 50.5 ms` · `signature verified against the out-of-band key` | **0** |
| `broken` | `npm run ops:check` | `✗ receipt — failed in 41.0 ms  [operation]` · `signature did not verify against the out-of-band key` | **1** |
| `stalled` | `OPS_CHECK_TIMEOUT_MS=1500 npm run ops:check` | `✗ receipt — failed in 1506.3 ms  [timeout]` · `Operation "receipt" exceeded its 1500 ms time budget.` | **1** |

Notes:
- **broken** raw body (via `curl`) was a well-formed 200 receipt — only the
  `signature` field differed — confirming a naive "did it return 200?" check would
  have passed it while `ops:check` caught it.
- **stalled** failed at **1506.3 ms** against a **1500 ms** budget: it fails *at* the
  budget (the runner's own deadline; the ~6 ms is scheduling overhead), not after —
  the "no spinning" property. Every mode named the boundary (`receipt`) and, on
  failure, the kind (`[operation]` / `[timeout]`).

## Acceptance criteria — met

- ✅ `broken` → non-zero, reports boundary (`receipt`) + failure kind (`operation`).
- ✅ `stalled` → fails at the time budget (1506 ≈ 1500 ms), naming the boundary.
- ✅ unset → the identical command passes clean (exit 0).

## Housekeeping

- Scratch files (`scratch_dev.log`, backup) and `dist/` removed; no stray `astro dev`
  left running. The only non-ticket working-tree changes (`.gitignore`,
  `package-lock.json`) pre-existed this session and were left untouched.
