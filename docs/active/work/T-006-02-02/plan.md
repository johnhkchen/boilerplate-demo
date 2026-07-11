# Plan — T-006-02-02 deferral-signals-and-playbook-revision

Ordered, independently verifiable steps. Docs-only ticket: "tests" are
deterministic shell checks + reviewer-walkable diffs, recorded as evidence.

## Step 1 — Mint the rehearsal project's demand board

**Do:** Write `<cleancopy>/docs/active/demand.md` (creating `docs/active/`),
per the structure spec: source board's header doctrine, a provenance line
(minted by T-006-02-02 from the S-006-02 rehearsal, session date 2026-07-11),
then the 11 leftovers as numbered one-line signals (**what** — why it might
matter), same order as the rehearsal log.

**Verify:**
- `test -f <cleancopy>/docs/active/demand.md`
- `grep -c '^[0-9]*\.' …/demand.md` → 11
- `ls <cleancopy>/docs/active` → exactly `demand.md`
- Spot-check: no line copied from this repo's board signals 1–4 (no template
  history leaked *into* the board either).

**Commit:** none (file lives outside this repo); durability handled in Step 2.

## Step 2 — Capture clean-copy evidence

**Do:**
- `evidence/cleancopy-docs-listing.txt`: the exact command + output of a
  recursive listing of `<cleancopy>/docs` (e.g. `find docs -type f | sort` run
  from the copy root, plus `ls docs/active`), with a two-line header naming
  the copy's absolute path and the date.
- `evidence/cleancopy-demand.md`: verbatim `cp` of the minted board.

**Verify (clause c, mechanically):** in the listing —
- `docs/knowledge/assembly-playbook.md` present;
- under `docs/active/`: only `demand.md`;
- absent: any `docs/active/epic|stories|tickets|work|pm` path.

## Step 3 — Revise the assembly playbook

**Do:** Apply the nine anchored edits from `structure.md` to
`docs/knowledge/assembly-playbook.md` (Before-event ×3, Step 2, Step 3,
Step 5, Beat-3 preamble, Step 7/8 seam warning, final-section staleness fix).
Additive sentences only; no step renumbering; board deferrals name the signal
in plain words ("on the demand board") not by number (board numbers shift as
signals clear).

**Verify:**
- Walk the friction table in `design.md` Decision 2 against
  `git diff docs/knowledge/assembly-playbook.md`: each of #1–#7 + Step-3 minor
  + staleness maps to a hunk that resolves or explicitly defers it — this walk
  is written out in `review.md`.
- Step 1's class table untouched (`git diff` shows no hunk in the table) ⇒
  fixture contract intact.
- Doc still reads as one sequence: step count unchanged (Before + 12 + exit
  gate), net growth ≤ ~40 lines.

**Commit 1:** `docs(knowledge): fold rehearsal frictions into assembly playbook (T-006-02-02)`

## Step 4 — Land template signals on this repo's board

**Do:** Append signals 5–8 (boundary-agnostic harness; collision-free
go-public; agent-proof checks; seam status carry-through) to
`docs/active/demand.md`, matching the existing lines' typographic shape.

**Verify:**
- `git diff docs/active/demand.md` = 4 added lines, no other hunks.
- Each added line traces to a rehearsal-log leftover (#4+#3c+#8, #2, #5, #9)
  and each playbook deferral written in Step 3 has its carrier signal here.

**Commit 2:** `docs(board): land rehearsal harness and deploy signals (T-006-02-02)`

## Step 5 — Progress artifact + final hygiene check

**Do:** Write `progress.md`: steps completed, deviations (if any), acceptance
tally. Run hygiene checks.

**Verify:**
- `git status --porcelain src scripts tests wrangler.jsonc` → empty.
- `git log --oneline -3` shows commits 1–2 scoped to the intended paths
  (`git show --stat`).
- Nothing staged from `.lisa/`, ticket files, or `T-006-02-01/`.

**Commit 3:** `docs(demo): T-006-02-02 signals, evidence, and progress` —
adds `docs/active/work/T-006-02-02/` (RDSPI artifacts so far + evidence).

## Step 6 — Review artifact

**Do:** Write `review.md`: changed-file summary, the friction→hunk
verification walk, acceptance-clause tally, coverage/gaps (what was checked
mechanically vs. by reading), open concerns for the human (e.g. the clean
copy's ephemerality, the still-deferred public-deploy leg, board growth for
vend to steer).

**Commit 4:** `docs(demo): T-006-02-02 review handoff` — then stop; Lisa
detects artifacts and advances phases.

## Testing strategy (what "green" means for a docs ticket)

| Check | Kind | Criterion |
|---|---|---|
| Board line count | shell | 11 numbered signals in clean-copy board |
| Clean-copy leak boundary | shell + committed listing | playbook present; `docs/active` == `{demand.md}`; no epic/stories/tickets/work/pm paths |
| Friction coverage | reviewer walk (written in review.md) | 9/9 frictions → resolve or named deferral hunk |
| Deferral carriers | cross-check | every "on the demand board" phrase in the diff has a matching new signal line |
| Fixture contract | diff inspection | Step 1 class table hunk-free |
| Repo hygiene | shell | src/scripts/tests/configs untouched; commits path-scoped |

No unit/integration tests run: no runtime surface changes, and re-running the
harness inside this agent session is precisely the false-signal hazard the
playbook revision documents (finding #5).

## Risks & fallbacks

- **Clean copy vanished between research and implement** (tmp storage):
  re-create per the rehearsal log's recorded recipe (`git archive HEAD | tar
  -x`, `rm -rf docs/active`) — the recipe is deterministic and the log is the
  authority; note the re-creation in progress.md. (Verified present at
  research time; low risk.)
- **Concurrent Lisa loop commits between my commits:** commits are path-scoped
  and serialized by Lisa's file locking (rdspi-workflow.md, Concurrency); no
  shared files with other open tickets except `docs/active/demand.md`, which
  only this ticket edits in E-006's wave.
- **Playbook growth budget:** if edits push past ~40 net lines, tighten
  wording rather than cutting a deferral — every friction must stay answered.
