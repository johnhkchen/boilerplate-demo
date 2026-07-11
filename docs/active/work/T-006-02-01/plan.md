# Plan — T-006-02-01 clean-copy-rehearsal-run

Ordered, independently verifiable steps for the Implement phase. Each step names
its command(s), its pass criterion, and what gets logged. The rehearsal *is* the
implementation, so "commit incrementally" maps to "append to `progress.md` and
`rehearsal-log.md` after each step."

## Testing / verification strategy

- **Real execution over assertion.** Every local step runs its actual command;
  stdout is captured and the pass line is quoted in the log. No step is marked
  passed from reasoning alone.
- **Budgets are read, not assumed.** `integration:check`'s 45 s budget and the
  flow budgets are quoted from `test-results/integration-report.json` and
  `flow-contract.ts`; elapsed time is compared to budget in the log.
- **The clean copy is the unit under test**, not this repo. After the run, this
  repo's `git status` must show only `docs/active/work/T-006-02-01/**` (evidence)
  and the pre-existing unrelated modifications — never `src/**`.
- **Deferred legs are named, not skipped.** Deploy-dependent steps run to their
  safe boundary; the log records the exact blocked command and reason.

## Step 0 — Stand up the clean copy (satisfies acceptance clause 1)

1. `git archive --format=tar HEAD | (mkdir -p <dst> && tar -x -C <dst>)` into the
   scratchpad — tracked tree only, no `node_modules`/`dist`/`.git`.
2. `rm -rf <dst>/docs/active` — no planning artifacts.
3. Confirm no history: `git -C <dst> status` must error / not-a-repo.
4. `cd <dst> && npm install` (playbook "Before the event"). Then `npx playwright
   install chromium` is a no-op if the cache is warm — note that.
- **Pass:** clean copy exists, `docs/active/**` gone, not a git repo, install
  exits 0.
- **Log:** commands + proof lines.

## Step 1 — Intake: collect one artifact per input class (Beat 1)

- Point at `test/fixtures/sponsor-packet/`; list the six class dirs and confirm
  each maps to a playbook class. Note `sdk/` is the intentional unusable unknown.
- **Pass:** all six classes present, none unnamed.
- **Log:** the mapping table; verdict.

## Step 2 — Route credentials away from anything shared

- `cp .dev.vars.example .dev.vars`; put the fixture's temp token + a local
  `DEMO_SIGNING_KEY`/`DEMO_PASSCODE` there. Confirm `.dev.vars` is gitignored.
- **Pass:** `.dev.vars` present and ignored; no secret in tracked files.
- **Log:** confirm gitignore; note the backstage-door refuses-secrets policy.

## Step 3 — Write the intake statement

- The fixture's `core-moment.md` *is* the intake statement (pre-filled). Confirm
  it carries all required fields (moment, stakeholders, refs, providers,
  personas, unknowns, acceptance evidence).
- **Pass:** all fields present.
- **Log:** verdict; note friction if the playbook is unclear that a pre-filled
  packet substitutes for authoring one.

## Step 4 — Go public before ideation (Beat 2) — DEPLOY LEG

- Run the safe boundary: `npx wrangler whoami` (auth confirmed), `npm run
  deploy:dry` later at Step 9. The **publish** (`npm run deploy`) is the
  destructive-collision leg (Design Decision 2): record the exact command, the
  `wrangler.jsonc` name/route/d1 collision, and defer with reason. Share-links
  step is recorded as blocked on the deferred publish.
- **Pass (this pass):** auth confirmed; publish leg recorded as deferred with a
  concrete reason and the commands that would run.
- **Log:** `could not answer` verdict for clean-copy publish; the specific gap.

## Step 5 — Rename the labeled surface in one change

- Edit clean copy `src/pages/index.astro` (`DEMO_NAME`, `PRIMARY_ACTION_LABEL` →
  `'Track my parcel'`) and `tests/support/flow-contract.ts`
  (`PRIMARY_ACTION_NAME`).
- **Demonstrate the contract:** first rename only `index.astro`, run `npm run
  test:flow`, capture the named-activation failure; then rename
  `flow-contract.ts`, re-run green.
- **Pass:** red-then-green captured; final `test:flow` passes.
- **Log:** both runs quoted; verdict `answered`.

## Step 6 — Prove failure legibility before real credentials

- `DEMO_FAULT=broken npm run integration:check` → red with `receipt`/`parcel
  [operation]` evidence; `DEMO_FAULT=stalled npm run integration:check` → red
  with `[timeout]`; both green with fault off.
- Runs against the receipt exemplar first (still present pre-Step-7) or the
  parcel route if Step 7 lands first — order per playbook is fault-before-wiring,
  so run against the exemplar.
- **Pass:** each fault mode goes red with named evidence, green when off.
- **Log:** quoted red + green lines; verdict.

## Step 7 — Build the one vertical slice by replacement

- Create `src/lib/parcel.ts` (stub + checksum + verify) and
  `src/pages/api/parcel.ts` (boundary behind `runOperation`, fault-aware);
  repoint `index.astro`'s card to `/api/parcel` rendering location/time/event.
- Keep `operation-runner.ts` untouched; no extra pages/providers (charter N5).
- **Pass:** `astro build` succeeds; `astro check`/`tsc` clean; the card renders
  the parcel scan locally.
- **Log:** files created; build result; verdict.

## Step 8 — Local gate (Beat 3)

- `npm run integration:check`.
- **Pass:** exits 0 within the 45 s budget; `test-results/integration-report.json`
  written; copy it to `evidence/`.
- **Log:** elapsed vs 45 s; quoted summary; verdict. Satisfies clause 4 (local).

## Step 9 — Full gate

- `npm run verify` (unit tests + typecheck + integration:check +
  test:flow:backstage + deploy:dry).
- **Pass:** all sub-gates green; `deploy:dry` builds without publishing.
- **Log:** each sub-gate result; note `deploy:dry` is the safe deploy proof;
  verdict.

## Step 10 — Check the deployed surface — DEPLOY LEG

- Live legs (`curl --fail https://<host>/`, `OPS_CHECK_URL=<live> ops:check`,
  live backstage round trip) depend on the deferred Step 4 publish. Run the
  **local equivalents**: start the built server (`wrangler dev` or preview),
  `OPS_CHECK_URL=http://127.0.0.1:<port>/api/parcel npm run ops:check`, and one
  local backstage submit → `npm run backstage:feed` round trip.
- **Pass (this pass):** local ops:check green; local backstage round trip
  observed; live legs recorded as deferred (tied to Step 4).
- **Log:** local results quoted; the live-surface confirmation named as the one
  deferred exit-gate leg, with reason.

## Step 11 — Sweep the session for leftovers (Beat 4)

- List every unresolved item: the deploy-collision gap, the interactive-secret
  gap, any slice TODOs, the `sdk/` unusable unknown, webhook-push deferral, and
  `npm run backstage:feed` output.
- **Pass:** nothing unresolved left unlisted.
- **Log:** the raw list.

## Step 12 — Convert leftovers to one-line signals

- Per the story split, T-006-02-02 writes the signals onto the demand board and
  revises the playbook. **This ticket does not edit `demand.md` or the
  playbook.** Step 12 here = produce the verbatim, board-shaped one-line list in
  the rehearsal log ("what + why it might matter") so T-006-02-02 can lift it
  directly.
- **Pass:** every Step 11 item has exactly one board-ready line.
- **Log:** the one-line signal list (acceptance clause 5).

## Exit-gate check (record, don't self-certify convincing — charter N4)

Tabulate each exit-gate condition with observed / deferred and the evidence
pointer. Expected: integration:check green in budget ✓; healthy+stalled flows ✓;
core moment at **local** URL ✓ + public URL deferred; local backstage round trip
✓ + live deferred; every leftover a one-line signal ✓.

## Then: Review

Write `review.md` — files changed (clean copy only; this repo's `src/` proven
untouched), test coverage + gaps, the friction list, and the open concerns
T-006-02-02 must act on. Stop after Review; Lisa advances phases.
