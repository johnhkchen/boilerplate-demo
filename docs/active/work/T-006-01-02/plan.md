# T-006-01-02 — sample-sponsor-packet-fixture — Plan

Ordered, independently verifiable steps. Each commit leaves `npm test`
green. Stage only this ticket's paths — the working tree carries unrelated
dirty state from other threads (`.lisa/provenance.jsonl`, T-006-01-01
files) that must not ride along.

## Step 0 — Commit the phase artifacts

- `git add docs/active/work/T-006-01-02/{research,design,structure,plan}.md`
- Commit: `docs(demo): T-006-01-02 research/design/structure/plan artifacts`
  (mirrors T-006-01-01's artifact commit 1039d28).
- Verify: `git show --stat HEAD` lists exactly the four artifact files.

## Step 1 — Author the packet (8 new files)

Create, per structure.md:

1. `test/fixtures/sponsor-packet/README.md`
2. `test/fixtures/sponsor-packet/core-moment.md`
3. `test/fixtures/sponsor-packet/sponsor-site/homepage.md`
4. `test/fixtures/sponsor-packet/api-docs/parcel-status-api.md`
5. `test/fixtures/sponsor-packet/code-examples/track-parcel.mjs`
6. `test/fixtures/sponsor-packet/design-brief/design-brief.md`
7. `test/fixtures/sponsor-packet/sdk/sdk-pointer.md`
8. `test/fixtures/sponsor-packet/credentials/temporary-credentials.md`

Authoring gates (checked while writing, asserted later by the test):

- directory names exactly match the playbook table's six class names;
- every URL/domain in the packet uses `.example`;
- no token-shaped committed value anywhere; `credentials/` holds routing
  prose only; the code example reads its token from `process.env`;
- sample data deterministic (fixed IDs `FW-2417-DEMO` / `FW-0000-VOID`,
  fixed timestamps);
- neither `.dev.vars.example` placeholder value appears in any packet file
  (the leak-check test will scan for them, and `credentials/` must not
  quote them either — point at the file, don't paste it).

Verify: `find test/fixtures/sponsor-packet -type f` shows 8 files, one+ per
class directory. Commit:
`docs(demo): add sample sponsor packet fixture (T-006-01-02)`.

## Step 2 — Point the playbook at the packet (2 edits)

- Step 1 coupling sentence → names `test/fixtures/sponsor-packet/`.
- "Not yet rehearsed live" bullet → names the packet path.

Verify: `grep -c 'test/fixtures/sponsor-packet' docs/knowledge/assembly-playbook.md`
≥ 2; the path resolves (`ls`). Commit:
`docs(knowledge): point assembly playbook at the sponsor packet (T-006-01-02)`.

## Step 3 — Add the packet test and enumerate it

- Write `test/sponsor-packet.test.mjs` per structure.md: three tests
  (class mirror derived from the playbook table; leak check over every
  packet file for each `.dev.vars.example` placeholder value with stubbed
  clean `fetchImpl` and a coverage-count assertion; rehearsal-note
  substring).
- Append `test/sponsor-packet.test.mjs` to `package.json` `scripts.test`.

Verify (targeted, then full):

```sh
node --experimental-strip-types --test test/sponsor-packet.test.mjs
npm test
```

Both green. Negative probes (run, observe red, revert — not committed):
temporarily plant a placeholder value in a packet file → leak test fails
naming the file; temporarily rename a class dir → mirror test fails.

Commit: `test(demo): assert sponsor packet mirrors intake contract and stays leak-clean (T-006-01-02)`.

## Step 4 — Whole-suite safety pass

The change surface is docs + fixture + one test, so the full `npm run verify`
gate (build, Playwright, dry-run deploy) is disproportionate; the affected
gates are:

```sh
npm test          # includes the new file via the Step 3 enumeration
```

Playwright flows, typecheck, and the integration check do not read
`test/fixtures/**` or `package.json`'s test list — skipping them is a
scoping judgment, recorded in review.md. (`npm run typecheck` would also
pass untouched: the `.mjs` example is outside every tsconfig include set —
`astro check` scans `src/`, `tsconfig.json` covers the repo but the file is
plain ESM with no types; if the run is cheap, do it anyway as belt and
braces.)

## Step 5 — Review artifact

Write `docs/active/work/T-006-01-02/review.md`: files changed, test
coverage and gaps, the two named judgment calls (test-as-tooling reading of
the story scope; skipped full verify), open concerns for S-006-02. Commit
progress.md + review.md together:
`docs(demo): T-006-01-02 progress and review handoff`.

## Testing strategy summary

| Surface | Mechanism | When |
|---|---|---|
| class mirror (doc ↔ dirs) | test 1, parses playbook table | every `npm test` |
| packet leak-cleanliness | test 2, `runLeakCheck` over packet | every `npm test` |
| full-scan coverage | test 2, `assetFiles` = independent walk | every `npm test` |
| rehearsal-note pointer | test 3, substring | every `npm test` |
| packet content quality | human review + S-006-02 dry run | once / per rehearsal |

No unit tests for the packet's *content semantics* (checksum rule
correctness, sample-data realism) — those are rehearsal concerns; encoding
them here would build the stub this ticket deliberately does not ship.

## Risks and fallbacks

- **Playbook table regex over-matches** if a future table also uses
  backticked first cells → the mirror test starts demanding phantom
  directories. Mitigation: regex anchored to the class-name shape
  (`[a-z-]+`), and the failure mode is loud (red test naming the phantom),
  not silent.
- **`.dev.vars.example` placeholder values change** → test 2's marker set
  changes with them automatically (values are parsed, not pasted).
- **Empty-directory hazard**: git cannot commit empty dirs, so "one
  artifact per class" is also structurally forced — a class dir that lost
  its file disappears from the checkout and the mirror test goes red.
- **progress.md deviations**: any drift from this plan gets a dated note in
  progress.md before proceeding, per the workflow.
