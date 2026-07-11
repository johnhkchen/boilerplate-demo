# Review — T-006-02-02 deferral-signals-and-playbook-revision

Handoff self-assessment. Docs-only ticket: no code, no runtime surface
changed, in either repo.

## What changed

**This repo (three scoped commits):**

- `8970834` — `docs/knowledge/assembly-playbook.md`: +63/−16 (net +47,
  239→286 lines). Nine anchored, additive edits; no step renumbering; Step 1
  class table (the fixture contract) untouched.
- `8a00142` — `docs/active/demand.md`: +4 signals (5–8), no other hunks.
- `1de08c0` — `docs/active/work/T-006-02-02/**`: RDSPI artifacts + evidence.
- This file lands in a fourth commit (review handoff).

**Rehearsal project (the clean copy, outside this repo, tmp storage):**

- Created `docs/active/demand.md` — the minted demand board, 11 one-line
  signals mirroring the rehearsal log's leftover list, no template history.
  Durable record: `evidence/cleancopy-demand.md`.
- Nothing else in the copy touched; its `assembly-playbook.md` remains the
  exact version the rehearsal executed (deliberately un-synced — it is part
  of the rehearsal record; the revision lives in the template source).

## Acceptance verification

**Clause 1 — board holds each logged leftover.** 11/11 leftovers from the
rehearsal log's "Verbatim leftovers" section are on the clean copy's board,
same order and numbering, each in board shape (what — why it might matter).
Mechanical check: `grep -c '^[0-9]*\.'` → 11. See
`evidence/cleancopy-demand.md`.

**Clause 2 — diff resolves or explicitly defers every logged friction.**
The walk, friction → diff hunk:

| Logged friction | Treatment | Where in the diff |
|---|---|---|
| #1 new credential not declared | resolved | Step 2: declare in `wrangler.jsonc` `secrets.required`; workerd drops undeclared keys; `boundary_misconfigured` symptom named |
| #2 clean-copy deploy collision | hazard resolved, tooling deferred | Bootstrap bullet + Step 4: deploy identity is per-project; rename Worker + own D1 + `*.workers.dev` or don't deploy; tooling → board signal 6 |
| #3 rename list incomplete | resolved (wording), centralization deferred | Step 5: `tests/demo-flow.spec.ts` heading named as fourth rename target; centralizing → board signal 5 |
| #4 receipt-bound checks | explicitly deferred with interim instruction | End of Step 7: the three bindings named (`integration-check.ts` path, `ops-check.ts` shape, `leak:check` secret); "rewire or Step 8 validates the exemplar you removed"; config-driven harness → board signal 5 |
| #5 session-pressure hazard | warning resolved, harness fix deferred | Beat 3 preamble caveat (+ pointer in Step 6, the first dev-server command); neutralization → board signal 7 |
| #6 board init on a clean copy | resolved | Before-event board bullet: a copy must create `docs/active/demand.md` itself |
| #7 install scripts | resolved | Before-event dependencies bullet: approve `workerd`/`sharp`/`esbuild` |
| Step-3 minor (pre-filled intake) | resolved | Step 3: packet-shipped statement substitutes; verify, don't re-derive |
| Stale "Not yet rehearsed live" | resolved | Final section: rehearsed against fixture 2026-07-11; live-sponsor/public-deploy run still open |

Leftovers #8–#11 are not playbook frictions (per the log's own tagging) and
correctly get no playbook edit: #8, #9 carry as this repo's board signals
(folded into 5, and 8 respectively), #10, #11 are sponsor-demo-specific and
live only on the rehearsal project's board.

Cross-check on deferral carriers: the diff says "demand-board signal" five
times (bootstrap/#2, Step 5/#3, Step 7/#4, Beat 3/#5 — plus the generic
final-section line); each maps to a landed signal (6, 5, 5, 7).

**Clause 3 — clean-copy listing.** `evidence/cleancopy-docs-listing.txt`:
`docs/knowledge/assembly-playbook.md` present; `docs/active/` contains
exactly `demand.md` (freshly minted, rehearsal signals only — not a leak
from this repo); `epic/`, `stories/`, `tickets/`, `work/`, `pm/` all absent;
still not a git repository. Re-runnable while the copy exists.

## Test coverage and gaps

- **Checked mechanically:** signal count (11), listing negatives (5 paths
  absent), diff scope (`--stat` per commit: one file each), repo hygiene
  (`git status --porcelain src scripts tests wrangler.jsonc` empty; `.lisa/`,
  ticket frontmatter, and `T-006-02-01/` left unstaged for Lisa).
- **Checked by reading:** the friction walk above; board-shape conformance;
  playbook still reads as one sequence (Before + Steps 1–12 + exit gate).
- **Not run:** the integration/flow harness — nothing it exercises changed,
  and running it inside this agent session is precisely the false-evidence
  hazard the revision documents (finding #5). This is a deliberate gap, not
  an oversight.

## Open concerns for the human

1. **The clean copy is ephemeral** (`/private/tmp/...3299e229.../scratchpad/
   cleancopy`) — gone on reboot. The committed evidence is the durable proof;
   if you want to eyeball the board in place, do it soon.
2. **Playbook grew +47 net lines** against structure.md's ~25–35 estimate and
   plan.md's ≤~40 budget. Every addition answers a logged friction; if you
   want it tighter, the Step 2 declaration rule and Beat-3 caveat are the
   two candidates to compress — but they are also the rehearsal's two
   highest-value findings.
3. **Board grew 4→8 signals.** Deliberately thin one-liners per the story's
   right-size rule, but `vend steer` may want to rank them; signals 5 and 6
   are the two that block a future clean rehearsal (they gate the still-
   deferred public-deploy leg of S-006-02's story acceptance).
4. **Story-level residue, not this ticket's scope:** the public-URL leg of
   S-006-02's acceptance ("slice live at a public URL") remains deferred from
   T-006-02-01 — it needs a human-authorized isolated Cloudflare target
   (board signal 6 is the carrier). E-006's sweep should weigh whether the
   epic closes on the fixture rehearsal + folded frictions (this ticket) with
   the live leg carried by the board, or stays open pending it.
5. **Board signal numbering** is positional; the playbook's deferrals
   intentionally say "a demand-board signal" without numbers so board churn
   can't stale the doc.

## Critical issues

None. No destructive action was taken or needed; no secrets touched; the
one dangerous operation the rehearsal identified (deploying a copy) is now
warned against in the playbook and was never run.
