# Rehearsal log — T-006-02-01 clean-copy-rehearsal-run

**The acceptance deliverable.** A verbatim record of executing
`docs/knowledge/assembly-playbook.md` on a fresh clean copy, driven only by the
playbook against the fixture sponsor packet, with every leftover and every step
the playbook could not answer written down for T-006-02-02 to act on.

- **Rehearsed:** the four-beat Day-1 play (Before-event + Steps 1–12 + exit gate).
- **Input:** `test/fixtures/sponsor-packet/` (T-006-01-02), core moment
  "Track my parcel" → `FW-2417-DEMO`'s latest scan, checksum-verified.
- **Session date:** 2026-07-11.
- **Clean copy:** `…/scratchpad/cleancopy` — built from `git archive HEAD`, with
  `docs/active/**` deleted and no `.git` (proofs below).
- **Honest boundary** (per S-006-02 and Design Decision 2): agent-run against
  the fixture, not a live sponsor. Local surfaces stand in for the public
  Cloudflare deploy legs (Step 4 publish, Step 10 live checks), which are
  **deferred with a concrete reason** — a clean copy cannot deploy without
  overwriting the *source* project's production Worker. Whether the demo is
  *convincing* stays a human call (charter N4); this log proves it is *working
  and observable* locally.
- **This repo's `src/**`, `scripts/`, `tests/`, and configs are untouched** —
  `git status --porcelain src/ scripts/ tests/ wrangler.jsonc` is empty. All
  slice code lives in the clean copy.

Raw command output is under `./evidence/`.

---

## Clean-copy creation (acceptance clause 1)

```
git archive --format=tar HEAD | tar -x -C …/cleancopy   # tracked tree only
rm -rf …/cleancopy/docs/active                            # no planning artifacts
git -C …/cleancopy status  → fatal: not a git repository  # no commit history
npm install                → added 306 packages, 0 vulnerabilities (exit 0)
npx playwright install chromium → cache already warm (no-op)
```

Proofs observed: `docs/` in the copy holds only `knowledge/`, `archive/`, and
two loose files — no `active/`. `git status` errors (not a repo). The fixture
packet is present at `test/fixtures/sponsor-packet/`. `.dev.vars` was correctly
**absent** from the archive (gitignored), so only `.dev.vars.example` came
through.

---

## Step-by-step execution (acceptance clause 2)

Verdicts: **answered** (playbook was exact and it worked) · **friction**
(worked, but the playbook was ambiguous/underspecified) · **could-not-answer**
(no runnable clean-copy instruction).

### Before the event — install + board init + deploy bootstrap
- Dependencies: **friction.** `npm install` exits 0, but the machine's npm
  wrapper blocks postinstall scripts (`esbuild`, `sharp`, `workerd`, `fsevents`)
  with an `allow-scripts` warning. Build and `wrangler` still worked here
  (`workerd` resolved), so it was benign this run — but the playbook says
  "dependencies installed" as if turnkey and gives no note about approving
  install scripts, which on a stricter setup would break `wrangler`/`workerd`.
- Board init (`lisa init`, `vend init`): **could-not-answer** for a clean copy.
  The play assumes the owner ran these so `docs/active/demand.md` exists. The
  clean copy has **no `docs/active/`** (we deleted it to satisfy "no planning
  artifacts"), so there is no demand board for Step 12 to write to. On a real
  generated project `vend init` would mint an empty board; a *clean copy* has no
  equivalent step. (Recorded as a leftover; does not block the vertical slice.)
- Deploy bootstrap: see Step 4 — deferred.

### Beat 1 — Intake
- **Step 1 (collect one artifact per class): answered.** All six classes present
  in the fixture — `sponsor-site`, `api-docs`, `code-examples`, `design-brief`,
  `sdk`, `credentials`. `sdk/` is the intentional unusable unknown (packet says
  so). None unnamed.
- **Step 2 (route credentials away from anything shared): friction — high value.**
  Copying `.dev.vars.example` → `.dev.vars` and adding values is exactly what the
  playbook says. But the new sponsor credential, `FERNWAY_PARCEL_TOKEN`, placed
  in `.dev.vars`, **did not reach the boundary via `env`** — `/api/parcel`
  returned `boundary_misconfigured: sponsor token is not set`, while
  `/api/receipt` on the *same* server read `env.DEMO_SIGNING_KEY` fine. Root
  cause: Astro 7 runs dev in workerd and builds the env binding *set* from
  `wrangler.jsonc`'s declared secrets/vars; `.dev.vars` only supplies *values*
  for already-declared bindings. `DEMO_SIGNING_KEY`/`DEMO_PASSCODE` are declared
  in `wrangler.jsonc` `secrets.required`; the new token is not, so it is silently
  dropped. **Fix a rehearser must discover:** declare the new secret in
  `wrangler.jsonc` (and, for prod, `wrangler secret put` + the secrets contract).
  After adding `"FERNWAY_PARCEL_TOKEN"` to `secrets.required`, the token
  surfaced and the slice worked. The playbook's Step 2 never mentions declaring
  a new credential — the single most likely place a first-time rehearser stalls.
- **Step 3 (write the intake statement): answered (minor friction).** The
  fixture's `core-moment.md` *is* the pre-filled intake statement (moment,
  stakeholders, refs, providers, personas, unknowns, acceptance evidence — all
  present). Minor: the playbook doesn't say that a pre-filled packet substitutes
  for authoring one, so a literal reader might re-derive it.

### Beat 2 — Prove
- **Step 4 (go public before ideation): could-not-answer — deferred.** The
  playbook says `npm run deploy` "creates the Worker." From a clean copy on the
  same Cloudflare account this is **destructive**: `wrangler.jsonc` hardcodes
  `"name": "demo-runway"`, `routes: [demo.b28.dev custom_domain]`, and
  `d1_databases[0].database_id: c95861d4-…` — all pointing at the *source*
  project's production resources. `npm run deploy` unchanged would overwrite the
  live demo. `npm run deploy:dry` **confirmed** this: it validated a build bound
  to Worker `demo-runway` and D1 `c95861d4-…` (evidence/deploy-dry.txt). A safe
  clean-copy deploy needs a unique worker name + a freshly provisioned D1 +
  interactive `wrangler secret put` — none of which the playbook's bootstrap
  scripts for a clean copy. Publish + share-links deferred to a human-authorized,
  isolated target.
- **Step 5 (rename the labeled surface in one change): friction — rename set is
  incomplete.** Renaming `DEMO_NAME` + `PRIMARY_ACTION_LABEL`
  (`src/pages/index.astro`) + `PRIMARY_ACTION_NAME` (`flow-contract.ts`) is what
  the playbook lists. But `tests/demo-flow.spec.ts` **hardcodes the heading
  literal** `getByRole('heading', { name: 'Demo Runway' })` at **lines 32 and
  101** — not sourced from a contract constant and not in the playbook's rename
  list. Observed: after renaming `DEMO_NAME` to `Fernway Parcel`, the flow failed
  with `waiting for getByRole('heading', { name: 'Demo Runway' })` (timeout).
  So "rename all of them in the same change" is missing a fourth target the
  contract does not centralize. The *label* half of the rule (the
  `PRIMARY_ACTION_NAME` contract) works as advertised; the *heading* is the gap.
- **Step 6 (prove failure legibility before real credentials): answered — after
  clearing an environment hazard.** `DEMO_FAULT=broken npm run integration:check`
  → red, named `receipt [operation]`; `DEMO_FAULT=stalled …` → red, named
  `receipt [timeout]` (the flow check's bounded wait fires at ~5.9 s); both green
  with the fault off. **Friction (environment, not playbook wording):** these
  results were only trustworthy after `npx astro dev stop` + stripping the
  coding-agent env (`CLAUDECODE`, `AI_AGENT`, …). Astro 7 daemonizes `astro dev`
  when it detects a coding agent, and `integration-check.ts` neutralizes only
  `CODEX_THREAD_ID`; under a live agent session the harness's spawned server
  "exited before readiness" and a stale daemon with a per-run random signing key
  answered the probes, producing spurious `[operation]` failures under *every*
  mode (including healthy). See `[[boilerplate-demo-playwright-daemonization]]`.
  The playbook — whose premise is followability *under session pressure* — never
  warns that running its checks inside a coding-agent session is unreliable.

### Beat 2 — the vertical slice
- **Step 7 (build the one vertical slice by replacement): answered.** Created
  `src/lib/parcel.ts` (deterministic Fernway stub + SHA-256 checksum + verify)
  and `src/pages/api/parcel.ts` (the boundary, **behind the unchanged
  `runOperation` seam**, fault-aware, token from `env`). `operation-runner.ts`
  untouched; no extra pages/providers (charter N5). `astro check` clean (0
  errors); build exit 0. **Core moment observed working** at
  `http://127.0.0.1:4394/api/parcel`:

  ```json
  { "boundary": "parcel-status", "parcelId": "FW-2417-DEMO",
    "status": "in_transit",
    "lastScan": { "location": "Rotterdam sort hub",
      "scannedAt": "2026-03-14T09:12:40Z", "event": "line_haul_departed" },
    "checksum": "e5545be0bac824fca3a42fbb65ca84e0f68be76d969324dd4f0c28a8e8b5e477" }
  ```

  Checksum recomputes client-side per the api-doc rule → **VERIFIED: true**.
  Two honest slice-side notes (not playbook findings): the unknown-parcel path
  returns HTTP 502 rather than the api-doc's 404 because the route collapses the
  stub's typed errors through the runner's `operation|timeout` kinds; and
  `DEMO_FAULT=broken/stalled` for the parcel route must be injected via the
  wrangler config `vars` (as the harness does), not a shell env var, so a plain
  `DEMO_FAULT=broken npm run dev` did not corrupt — fault legibility itself was
  verified on the receipt exemplar (Step 6).

### Beat 3 — Check
- **Step 8 (local gate): answered for the exemplar; could-not-answer for the
  replacement — the headline.** `npm run integration:check` on the shipped
  exemplar: **PASSED in 3.9 s (budget 45.0 s)** — operation ✓, flow ✓, leak ✓
  (evidence/healthy-clean.txt; report at evidence/integration-report-healthy.json).
  That satisfies "integration and ops checks green under their time budgets"
  (clause 4). **But the replaced boundary cannot pass Step 8**, because the
  harness is bound to the receipt boundary, not the seam:
  - `src/lib/ops-check.ts` `assertReceiptShape` requires `boundary === 'receipt'`
    plus `issuedAt/nonce/signature`. Pointed at `/api/parcel`, the shipped
    `ops:check` failed: `✗ receipt — failed [operation] — unexpected response
    shape from the boundary`.
  - `scripts/integration-check.ts` **hardcodes** `/api/receipt` for both the
    operation and leak probes (lines **319, 330**), so the check cannot even be
    redirected at the new boundary without editing the harness.
  - `leak:check` scans for `DEMO_SIGNING_KEY`; the parcel slice's real secret is
    the Fernway bearer token, which the shipped leak check does not guard.

  So Step 7 ("replace the receipt call behind the same seam") and Step 8 ("run
  the checks") are in tension: the *seam* is reusable, but the *checks around it*
  are receipt-specific, and the playbook says nothing about rewiring them.
- **Step 9 (full gate): partially answered.** In the clean copy: `npm test`
  (unit) exit 0; `astro check` clean; `integration:check` green (above);
  `npm run deploy:dry` exit 0. The backstage phone flow
  (`test:flow:backstage`) and standalone `test:flow` were flaky **for the
  environment reason in Step 6** (agent-session daemonization of the Playwright
  webServer), not a code fault. Full uninterrupted `npm run verify` was not run
  end to end this pass; its sub-gates were exercised individually.
- **Step 10 (check the deployed surface): local stand-in; live legs deferred.**
  Tied to Step 4's deferred publish. Local equivalents ran: the boundary is
  reachable and correct at a local URL (Step 7); `ops:check` exercises it. The
  live legs (`curl --fail https://<host>/`, `OPS_CHECK_URL=<live> ops:check`, a
  live backstage round trip) require the human-authorized isolated deploy and are
  deferred.

### Beat 4 — Defer
- **Step 11 (sweep leftovers): answered** — full list below.
- **Step 12 (convert to one-line signals): answered as far as this ticket goes.**
  Per the S-006-02 split, **T-006-02-02** writes these onto the demand board and
  revises the playbook; this ticket produces the board-ready lines and does not
  edit `demand.md` or the playbook. (And note the Before-event finding: a clean
  copy has no `demand.md` to write to.)

---

## Vertical slice at its URL (acceptance clause 3)

Observed working at `http://127.0.0.1:4394/api/parcel` (local surface; public
URL deferred, Step 4). The labeled action's boundary returns `FW-2417-DEMO`'s
latest scan with a checksum that recomputes (VERIFIED: true). Named-failure
paths are legible, not hangs (unknown parcel → 5xx with a named body; stalled →
bounded `[timeout]` on the exemplar). The full browser page (index card
repointed to `/api/parcel`) was not driven end-to-end because the Playwright
webServer is unreliable under the agent session (Step 6); the boundary itself is
proven via direct HTTP + checksum verification.

## Checks green under budget (acceptance clause 4)

`npm run integration:check` (shipped exemplar, clean env): **PASSED in 3.9 s,
budget 45.0 s** — operation 153.8 ms, flow 1090.8 ms, leak 143.9 ms. Flow
per-test budget 20 s (`flow-contract.ts`); all steps well inside. `ops:check`
verified the receipt signature against the out-of-band key in ~34 ms.

---

## Verbatim leftovers + steps the playbook could not answer (acceptance clause 5)

Board-ready lines (`what + why it might matter`) for T-006-02-02 to lift. Items
tagged `[playbook]` are playbook-revision candidates; `[E-00x]` are foundation/
harness signals per the story's "gaps return to the board" rule.

1. **[playbook] Step 2 omits declaring a new credential** — putting a new
   sponsor secret in `.dev.vars` is not enough; workerd/dev drops any
   `.dev.vars` key not declared in `wrangler.jsonc`, so a first-time rehearser
   hits a silent `boundary_misconfigured`. Add "declare the new secret in
   `wrangler.jsonc` (+ `wrangler secret put` for prod)" to Step 2.
2. **[playbook] Step 4 has no collision-free clean-copy deploy** — `npm run
   deploy` from a copy overwrites the source project's `demo-runway` Worker /
   `demo.b28.dev` / production D1. The play needs an explicit "generate or rename
   the Worker + provision a fresh D1 + claim a `*.workers.dev` name" step before
   go-public, or to state that a *clean copy* cannot go public (only a *generated*
   project can). Why it matters: it blocks invariant P1 for a rehearsal and risks
   production.
3. **[playbook] Step 5 rename list is incomplete** — `tests/demo-flow.spec.ts`
   hardcodes `heading { name: 'Demo Runway' }` (lines 32, 101), outside the
   `DEMO_NAME`/`PRIMARY_ACTION_LABEL`/`PRIMARY_ACTION_NAME` set the playbook
   names. Either add it to the rename list or centralize the heading behind a
   flow-contract constant so "rename in one change" is true.
4. **[playbook] Steps 7↔8 tension: the harness is receipt-bound** — `ops:check`/
   `integration:check`/`leak:check` hardcode `/api/receipt`, the `boundary:
   'receipt'` shape, and the `DEMO_SIGNING_KEY` secret. "Replace the slice behind
   the seam" then breaks Step 8. The play should either tell the builder to
   rewire the checks to the new boundary, or the harness should read the boundary
   path/name/secret from config. Why it matters: it is the core Day-1 move, and
   today it silently invalidates the safety checks.
5. **[playbook] Session-pressure hazard not warned** — running the checks inside
   a coding-agent session gives false results (Astro daemonizes `astro dev`;
   stale daemons with random keys answer probes). The play, whose whole premise
   is *under session pressure*, should note `astro dev stop` + agent-env stripping
   (or the harness should neutralize all agent markers, not just `CODEX_THREAD_ID`).
6. **[playbook] Before-event/board init undefined for a clean copy** — a clean
   copy has no `docs/active/demand.md`, so Step 12 has nowhere to write signals.
   The play should say `vend init` (or an equivalent) mints the board, and that a
   raw clean copy must create one.
7. **[playbook] install-scripts caveat** — the play treats `npm install` as
   turnkey; on setups that block postinstall scripts, `workerd`/`sharp`/`esbuild`
   need approving or `wrangler` may not run. One sentence would save a stall.
8. **[E-002 harness] `ops:check` on a stalled boundary reports `[operation]`,
   not `[timeout]`, under `astro dev`** — the never-resolving promise makes the
   fetch error fast in the dev runtime; the `[timeout]` evidence appears only via
   the flow check. Minor: the exit-gate wording ("receipt [timeout]") is
   technically produced by the flow, not the ops probe.
9. **[slice] error-status granularity** — a replacement boundary loses the
   api-doc's 401/404/503 distinctions because `operation-runner` collapses errors
   to `operation|timeout`. If demos want faithful upstream status codes, the seam
   needs a way to carry a status through a failure.
10. **[deferred] webhook push updates** — sponsor site mentions them, undocumented
    (packet's honest unknown). Not built; carry as a signal.
11. **[deferred] `sdk/` class unusable by design** — the packet's intake unknown;
    no SDK path exercised. Carry as noted, not a gap.

## Exit-gate tally (charter N4: observed, not self-certified convincing)

| Exit-gate condition | This pass |
|---|---|
| `integration:check` exits 0 in 45 s budget, faults off | ✓ observed (3.9 s) |
| healthy + stalled flows pass within budget | ✓ exemplar (broken→[operation], stalled→[timeout]); replacement blocked by finding #4 |
| core moment works at the **public** URL + live `ops:check` | ~ local only; public deferred (finding #2) |
| one backstage entry submitted **live** returns via feed | ✗ deferred (tied to deploy) |
| every leftover is a one-line signal | ✓ list above (T-006-02-02 lands them) |
