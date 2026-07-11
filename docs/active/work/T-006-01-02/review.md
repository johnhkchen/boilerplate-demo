# T-006-01-02 — sample-sponsor-packet-fixture — Review

Handoff for the human pass. Four implementation commits on `main`:
aa85290 (RDSP artifacts), 8489731 (packet), 6926de6 (playbook pointers),
25061df (test + enumeration).

## What changed

### Created — the packet (8 files, ~355 lines)

`test/fixtures/sponsor-packet/` — a fully fictional sponsor handoff
("Fernway Parcel", parcel tracking, domain `fernway-parcel.example` on the
reserved RFC 2606 TLD so nothing can ever resolve):

- `README.md` — what the packet is, the fiction disclaimer, the class map,
  how the test keeps it honest.
- `core-moment.md` — the chosen demo moment ("Track my parcel" →
  bounded wait → checksum-verified scan event) plus every playbook Step 3
  intake-statement field, pre-filled.
- `sponsor-site/homepage.md`, `api-docs/parcel-status-api.md`,
  `code-examples/track-parcel.mjs`, `design-brief/design-brief.md`,
  `sdk/sdk-pointer.md`, `credentials/temporary-credentials.md` — one
  artifact per intake class. The api-doc is the load-bearing one: one
  endpoint, error shapes, latency expectations, a checksum rule, and
  deterministic sample data, enough to implement the local stub the
  rehearsal builds against. The `sdk/` class is deliberately
  present-but-unusable (realistic event condition, routed to Step 3 as an
  unknown); `credentials/` contains routing prose and **no value of any
  shape**.

### Created — verification

- `test/sponsor-packet.test.mjs` (4 tests): (1) packet directories mirror
  the class names parsed live from the playbook's Step 1 table, each
  non-empty; (2) `core-moment.md` present; (3) `runLeakCheck` over every
  packet file passes for each committed `.dev.vars.example` placeholder
  value, with `checked.assetFiles` pinned to an independent recursive file
  count (proves full scan coverage); (4) the playbook contains the literal
  packet path.

### Modified

- `docs/knowledge/assembly-playbook.md` — two sentence edits restoring the
  literal `test/fixtures/sponsor-packet/` path (Step 1 coupling sentence;
  the "Not yet rehearsed live" rehearsal note). This exercises the deferral
  T-006-01-01's review explicitly granted.
- `package.json` — new test file appended to the enumerated `scripts.test`
  list. No other changes.

## Acceptance criteria — status

| AC | Evidence |
|---|---|
| one artifact per input class the intake step names | mirror test derives the six names from the doc itself; 152/152 suite green |
| leak-check passes over the fixture | leak test via `runLeakCheck` (the script's engine) with stubbed response; negative probe observed red when a placeholder value was planted |
| rehearsal note points at the packet | playbook grep count 2; pinned by test 4 |

## Test coverage and gaps

- Covered continuously (`npm test`): class-mirror sync with the playbook,
  packet leak-cleanliness against the repo's committed placeholder values,
  full-scan coverage, pointer integrity. Negative behavior of both
  load-bearing tests was observed red during implementation (see
  progress.md), not assumed.
- **Gap**: the leak test scans for *known markers* (the two
  `.dev.vars.example` values), matching the leak-check's own semantics. It
  cannot catch an arbitrary real credential pasted into the packet —
  no tool in the repo pattern-matches credential shapes. Human review of
  fixture diffs remains the guard, as it is for the rest of the repo.
- **Gap**: packet *content semantics* (checksum rule self-consistency,
  sample-data realism, whether the api-doc is actually sufficient to build
  a stub) are untested by design — that proof is S-006-02's dry run.
  `code-examples/track-parcel.mjs` is likewise never executed by any test;
  it is sponsor-handout fiction, not tooling.

## Judgment calls for the human pass

1. **"No new scripts or tooling" vs. the committed test.** Story S-006-01
   scopes out new scripts/tooling; I read that as `scripts/` CLIs and
   `src/**`, not test files — the ticket's motivation ("re-rehearsed after
   every template change") needs a repeatable home, and the enumerated test
   suite is the repo's only one. If you read the scope stricter, the test
   is one commit (25061df) to drop; the AC would then rest on manual runs.
2. **Leak-check "script" satisfied via its engine.** The literal
   `scripts/leak-check.ts` edge always fetches a response URL, so a
   standalone run needs a live server. The test uses `runLeakCheck` (the
   same code path the script wraps) with the established stubbed-`fetchImpl`
   seam from `test/leak-check.test.mjs`. A belt-and-braces manual
   `LEAK_CHECK_DIR=test/fixtures/sponsor-packet npm run leak:check` during a
   dev-server session would also pass; not run here.
3. **Core moment as a top-level file, not a seventh directory.** Keeps the
   one-directory-per-class mirror exact while satisfying the AC's "chosen
   core moment" artifact; guarded by its own micro-test.
4. **Skipped `npm run verify`** (Playwright, build, dry-run deploy): the
   change surface is docs + fixture + one unit test; no `src/**`,
   Playwright, or wrangler surface was touched. `npm test` (152 green) and
   `npm run typecheck` (clean) were run.

## Open concerns

- The mirror test's table regex (`^\| \`[a-z-]+\` \|`) matches any future
  playbook table whose first cell is a backticked kebab name; the failure
  mode is a loud red demanding a phantom directory, not silence — but doc
  authors should know the coupling exists (the playbook's own "same breath"
  sentence now has teeth).
- The fixture names concrete visual/brand details (palette, tone) that a
  rehearsal could over-fit; the design brief carries an explicit
  "constraints, not pixel law" note to counter it.
- S-006-02 should treat any insufficiency it finds in the api-doc/stub
  specification as playbook-revision input, per that story's revision loop
  — not as retroactive scope here.
