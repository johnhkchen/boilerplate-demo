# Progress — T-007-02-04 verify-checks-under-new-owner

Implement-phase log. Honest boundary: served-local new-owner stand-in; live
deployed-URL re-run is the named deferred leg (no second Cloudflare account on this
machine — `wrangler whoami` → author only).

## Status

- [x] research.md, design.md, structure.md, plan.md written
- [x] Step 1 — `verify-checks.sh` authored
- [x] Step 2/3 — context stands up; four checks run (all green)
- [x] Step 4 — evidence captured (redacted)
- [x] Step 5 — checks-run.md written
- [x] Step 6 — scorecard row 7 moved to `pass`
- [ ] Step 7 — review.md

## Log

- **Run 1 — GAP (harness bugs, not demo gaps), fixed:**
  - `integration:check` green, `ops:check` green; `leak:check` **red**
    (`client asset: server/.dev.vars`) and `test:flow:backstage` **red**
    (`Another astro dev server is already running … 4337`).
  - Diagnosis: (a) leak red = my stage 3 wrote `.dev.vars` into the build tree, which
    `astro build` packaged into `dist/server/.dev.vars` — exactly the operator rule
    T-007-02-02 documented (`rotation-run.md:242`). (b) flow red = my stage-6 served
    instance orphaned (the daemonization hazard) and held astro's global dev lock, so
    the flow's own webServer couldn't start. **Both are driver bugs; the demo itself
    passed its own end-to-end gate (`integration:check` green).**
  - Fixes: stopped writing `.dev.vars` (serve via the private runtime wrangler config
    instead); made `stop_server` kill orphans by port + `astro dev stop`; added a
    pre-flow daemon clear.
- **Run 2 — PASS**, but the generated signing key leaked into `flow-report.json`
  (`config.webServer.env.DEMO_SIGNING_KEY`, serialized by Playwright's JSON reporter).
  Nothing was committed. Fixes: the backstage flow does not need the new-owner signing
  key (it uses the public flow-contract passcode + default test key), so stopped passing
  it; extended the redaction pass to `.json` evidence.
- **Run 3 — PASS, clean.** All four green; `flow-report.json` carries only the public
  `playwright-local-test-key` / `playwright-backstage-knock`; no 48+-hex secret survives
  anywhere in evidence. Verdict idempotent across runs 2 and 3.

**Deviation from plan:** none in sequence; the two fix cycles above are the plan's
"document the deviation and rationale before proceeding" in action. No product runtime
file was touched.
