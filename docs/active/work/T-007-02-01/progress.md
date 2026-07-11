# Progress — T-007-02-01 fresh-owner-drill-harness

Implement-phase running log: what ran, what it produced, deviations from the plan.

## Status: complete

All plan steps executed. The harness script runs green (exit 0), produces a
proven-clean fresh-owner context, and the two committed deliverables
(`transfer-signal.md`, `fresh-owner-harness.md`) are in place, backed by real run
evidence.

## Step-by-step

**Step 1 — write `scrub-fresh-owner.sh`.** Done. Implements the Structure
interface: archive → strip `docs/active` → scan-before → scrub five couplings
(each with a post-edit assertion) → scan-after → assert forbidden files absent →
list allowed residue → verdict/exit. `bash -n` passes.

**Step 2 — run for real, capture evidence.** Done, exit 0. Full stdout →
`evidence/scrub-run.txt`. Before-scan shows all six active couplings present;
after-scan shows none, and `.git`/`.dev.vars`/`.promote`/`.wrangler` absent.
Derived `evidence/scan-before.txt` and `evidence/scan-after.txt` from the real
run (honest filenames — they hold the actual before/after sections). Captured
`evidence/tree-listing.txt` (top-level of the context + a `find` proving the
forbidden files are absent — no matches).

**Step 3 — idempotence.** Done. Re-ran into the same dest; the second run's
VERDICT block is byte-identical to the first (modulo the dest path). No residual
state, no network.

**Deviation (in scope, story-permitted).** Added a validation the plan implied
but did not enumerate: after the scrub I confirmed both `wrangler.jsonc` and
`wrangler.sessions.jsonc` still parse as valid JSON (comment-stripped
`JSON.parse`). This caught the one real risk of the `database_id` removal — a
dangling trailing comma — and confirmed the multiline `perl` edit removes the
comma cleanly. Worth keeping; noted in `fresh-owner-harness.md`.

**Step 4 — write `transfer-signal.md`.** Done. Seven-category three-state
scorecard (`pass`/`gap`/`deferred`), each row citing an observable command/seam,
a pass condition, the exact seam a gap names, the baseline after scrub, and the
owner ticket per the story DAG. Baselines filled from the actual scrub result:
Repo/Domain/Config/Secrets → `pass`; Resources/Data/Checks → `deferred` (each
naming its metered live step); no `gap` yet.

**Step 5 — write `fresh-owner-harness.md`.** Done. The documented procedure:
honest boundary, definitions, run command + exit codes, the clean-tree property,
the five-seam scrub table, why-placeholders-not-blanks, the proof (quoting real
`evidence/` lines), and the deferred second-account leg spelled out for
T-007-02-02/03/04. Cross-links the signal and the upstream inventory.

**Step 6 — invariant + review.** Repo-untouched invariant holds: `git status
--porcelain -- src scripts wrangler.jsonc wrangler.sessions.jsonc migrations
public Dockerfile.session astro.config.mjs` is empty. Only
`docs/active/work/T-007-02-01/` is new. `review.md` written.

## Observed result (the headline)

- Six active author couplings present before → **zero** after, on the runtime path.
- Author secret/state files (`.git`, `.dev.vars`, `.promote`, `.wrangler`) **absent**
  from the produced context — a guaranteed property of `git archive`, asserted.
- Allowed residue is exactly the shared `--b28-*` brand palette + two comments —
  named, not scrubbed (they are not author-account couplings).
- Scrubbed configs remain valid JSON; run is idempotent.

## Commits

Grouped per the plan's sequence. If this session is configured to commit, the
sequence is: RDSPI thinking artifacts → script + evidence → signal → harness doc
→ progress + review. If not, the artifacts stand as the deliverable and Lisa
advances the phase from their presence. No product runtime file was staged.
