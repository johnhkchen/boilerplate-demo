# Review — T-007-02-04 verify-checks-under-new-owner

Handoff for a human reviewer. What changed, how it was verified, and what remains
open. This is the **capstone** of S-007-02: it ran the demo's own checks against the
new-owner deployment — the drill's headline pass/fail.

## Verdict

**PASS.** All four demo checks run green against the served-local new-owner context
with the author's accounts and any fleet service removed from the runtime path:

| Check | Result | Evidence |
|-------|--------|----------|
| `integration:check` (operation/leak/flow-healthy) | green | `evidence/1-integration.txt`, `integration-report.json` |
| `ops:check` (new-owner signing key) | green | `evidence/2-ops.txt` |
| `leak:check` | green | `evidence/3-leak.txt` |
| `test:flow:backstage` (phone submit→retrieve) | green | `evidence/4-flow-backstage.txt`, `flow-report.json` |

Acceptance criterion — *"integration/leak/ops checks and Playwright main flow run
green against the new-owner deployment with the author's accounts and any fleet
service removed from the runtime path; any red check is recorded as a gap, not
hidden"* — **met**, within S-007-02's honest scrubbed-simulation boundary.

## What changed

**No product runtime code.** Per S-007-02, this ticket adds only drill tooling + docs
under `docs/active/work/T-007-02-04/`, plus a one-row update to the shared scorecard.

Created:
- `research.md`, `design.md`, `structure.md`, `plan.md` — RDSPI trail.
- `verify-checks.sh` — the row-7 driver (re-runnable from repo root).
- `checks-run.md` — the acceptance artifact (per-check record + boundary + gap ledger).
- `progress.md` — implement log (two fix cycles documented).
- `evidence/` — redacted per-leg transcripts + machine reports + `checks-report.json`.

Modified:
- `../T-007-02-01/transfer-signal.md` — row 7 (**Checks**) moved `deferred → pass
  (attempted)`; a "After the T-007-02-04 run" note added to the baseline summary. This
  is the scorecard's own contract ("downstream tickets move their owned rows"), the
  same pattern T-007-02-03 used for rows 1–4.

## How it was verified (and the two fix cycles)

The driver composes the three predecessor tools (scrub → config fill → fresh secrets)
and runs the four checks under `env -i` against a locally-served instance. It took
three runs to reach a clean green — both intermediate failures were **driver bugs, not
demo gaps**, and both were pre-documented hazards:

1. **Run 1 — leak red (`dist/server/.dev.vars`)**: the driver wrote a `.dev.vars` into
   the build tree, which `astro build` packaged into the bundle — exactly the operator
   rule T-007-02-02 found (`rotation-run.md:242`). Fix: don't write `.dev.vars`; serve
   via a private runtime wrangler config; the standalone ops/leak get the key via env.
2. **Run 1 — backstage flow red (`Another astro dev server is already running`)**: the
   stage-6 served instance orphaned (the daemonization hazard,
   `[[boilerplate-demo-playwright-daemonization]]`) and held astro's global dev lock.
   Fix: `stop_server` now kills orphans by port + `astro dev stop`; a pre-flow clear was
   added.
3. **Run 2 — green, but the generated signing key leaked into `flow-report.json`**
   (Playwright serializes `config.webServer.env`). Nothing was committed. Fix: the
   backstage flow does not need the new-owner signing key (it uses the public
   flow-contract passcode + default test key), so it is no longer passed; the redaction
   pass was extended to `.json` evidence.
4. **Run 3 — green and clean.** Verdict idempotent across runs 2 and 3.

Crucially, **`integration:check` — the demo's own end-to-end "works observably" gate —
was green from run 1**, which is the strongest single signal that the transferred demo
itself is sound; the intermediate reds were all in the driver's build/teardown/evidence
hygiene.

## Test coverage

- **No new unit tests**, by design: S-007-02 bars product runtime rewrites, and the
  "tests" for this ticket *are* the demo's own checks run against the new-owner context.
  Their green/red **is** the acceptance signal.
- **Coverage of the demo's own suite:** `integration:check` internally covers
  `operation`, `leak`, and the healthy desktop `flow`; standalone `ops:check` +
  `leak:check` re-run those boundaries against a separately-served instance with the
  real new-owner signing key; `test:flow:backstage` covers the phone submit→retrieve
  loop. The desktop main flow is covered inside `integration:check` and deliberately not
  double-run.
- **Not exercised (named):** the `stalled` Playwright project (fault-injection variant)
  and the Node unit-test suite `npm test` — the latter is *known* to fail on a
  re-pointed tree via the `test/promote.test.mjs:246` domain literal (row 3 / S-007-03),
  a unit-test gap upstream of row 7's runtime checks, not a check failure.
- **Isolation is itself tested** by the `env -i` boundary + local-only commands + the
  evidence secret-scan (no 48+-hex generated value survives anywhere).

## Open concerns / for human attention

1. **Deferred live leg (the honest boundary).** The checks ran against a *served-local*
   new-owner stand-in because no second Cloudflare account exists on this machine
   (`wrangler whoami` → author only). Running the identical checks against a **real
   deployed new-owner URL** (`DEMO_BASE_URL`/`PLAYWRIGHT_BASE_URL` → the deployed
   Worker) is the metered manual leg — named `deferred-live`, not faked as pass. A
   reviewer with a second account should run it to close the row fully.
2. **Environment-sensitive checks.** The dev-server-owning checks (integration,
   Playwright) only run reliably with the coding-agent env stripped (the driver's
   `env -i` handles this). Anyone re-running outside the driver must strip
   `CLAUDECODE`/`CODEX_THREAD_ID` etc. or hit the daemonization "exited early" artifact —
   an environment issue, not a demo bug (`transfer-signal.md`).
3. **Pre-existing S-007-02 gaps bound the drill (not this ticket's to fix):** the domain
   literal `test/promote.test.mjs:246` (row 3) and the `SESSION_COORDINATOR` DO-export
   seam (row 4) are carried to S-007-03. Row 7's own checks found no gap; these are
   listed only so they are not misread as check failures.
4. **`config.webServer.env` still serializes non-secret env** (HOME, PATH, npm vars) in
   `flow-report.json`. No secret remains, but a reviewer wanting a tighter evidence
   footprint could scrub that block; it was judged out of scope (paths, not credentials).

## Reviewer checklist

- [ ] `evidence/checks-report.json` `verdict: pass`, all four `exitCode: 0`.
- [ ] `evidence/flow-report.json` `config.webServer.env.DEMO_SIGNING_KEY` ==
      `playwright-local-test-key` (public), not a generated secret.
- [ ] No product file under `src/**`, `wrangler*.jsonc`, `migrations/**` changed
      (`git show --stat` for this ticket's commits).
- [ ] `transfer-signal.md` row 7 reads `pass (attempted)` with the live leg still
      `deferred`.
- [ ] Optional: re-run `docs/active/work/T-007-02-04/verify-checks.sh` → exit 0.
