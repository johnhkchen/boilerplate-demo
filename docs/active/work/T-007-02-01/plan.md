# Plan — T-007-02-01 fresh-owner-drill-harness

Ordered, independently verifiable steps. Each step names its check and is small
enough to commit atomically. The build order is: script → real run → evidence →
deliverable docs, so the docs quote observed output (PE-7).

## Testing strategy

This ticket ships a drill script and two documents, not product code — so the
"tests" are the script's own self-checks plus a repo-untouched invariant, not new
unit tests.

- **Script self-verification.** `scrub-fresh-owner.sh` asserts, in-run: each
  scrubbed substring is actually gone; the dropped-secret files (`.git`,
  `.dev.vars`, `.promote`, `.wrangler`) are absent from the context; active-config
  author markers count to zero. It exits non-zero and names the seam otherwise.
  Running it *is* the test.
- **Idempotence / determinism.** Run the script twice into the same dest; the
  second run's verdict block must match the first (no residual state, no network).
- **Repo-untouched invariant.** `git status --porcelain -- src scripts
  wrangler.jsonc wrangler.sessions.jsonc migrations` must be empty at every commit
  — the story guarantee. Checked in Review.
- **No product-test regression.** The change touches only `docs/active/work/**`,
  so `npm test` behavior is unchanged; not re-run for a docs-only tree (and the
  Playwright flow is unreliable in-session per
  `[[boilerplate-demo-playwright-daemonization]]` — out of scope here).
- **Verification criterion for the whole ticket:** the script exits 0 producing a
  scrubbed context, `evidence/` shows zero active-config author markers after
  scrub, and both deliverable docs are committed under the work dir.

## Steps

### Step 1 — write `scrub-fresh-owner.sh`

Implement the interface from Structure: archive → strip `docs/active` → scan
before → scrub five seams (with per-edit assertions) → scan after → verdict +
exit code. `set -euo pipefail`; `#!/usr/bin/env bash`; `chmod +x`.

**Check:** `bash -n scrub-fresh-owner.sh` (syntax) passes.

### Step 2 — run it for real, capture evidence

Run against the scratchpad. Tee the full stdout to `evidence/scrub-run.txt`.
Separately capture `evidence/scan-before.txt`, `evidence/scan-after.txt`, and
`evidence/tree-listing.txt` (the produced context's top-level + a `find` for any
dot-file that should be absent).

**Check:** exit code 0; `scan-after.txt` shows zero active-config markers; the
absent-file assertions pass. If exit 1, fix Step 1 and re-run (the point of
building the script first).

### Step 3 — run it a second time (idempotence)

Re-run into the same dest; confirm the verdict block is identical. Note the result
in `progress.md` (no separate evidence file needed).

**Check:** second-run verdict == first-run verdict, exit 0.

### Step 4 — write `transfer-signal.md`

The seven-category three-state scorecard. Seed each row's Observable/Pass/Gap from
the inventory citations and the check-target resolution (Research). Fill the
"baseline after scrub" column from the actual scrub result (Config/Domain →
`pass` on placeholders; Resources/Data → `deferred`; Secrets → `pass` on clean
tree, rotation is T-007-02-02's proof; Checks → `deferred` pending a deployment;
Repo → `deferred`). Assign owner tickets per the story DAG.

**Check:** every category has all four of {observable, pass condition, gap seam,
owner}; no bare verdict; three states used correctly (deferred names the metered
step, never hides a failure).

### Step 5 — write `fresh-owner-harness.md`

The documented procedure. Quote real lines from `evidence/`. Include the
clean-tree property, the five-seam scrub table, why-placeholders-not-blanks, the
proof, and the deferred second-account leg. Cross-link `transfer-signal.md` and
the upstream inventory.

**Check:** a reader can reproduce the context from this doc alone; the honest
boundary (deferred live deploy) is explicit; quoted lines match `evidence/`.

### Step 6 — progress + review, final invariant check

Finish `progress.md`; run the repo-untouched invariant; write `review.md`
summarizing changes, coverage, and open concerns.

**Check:** `git status --porcelain -- src scripts wrangler.jsonc
wrangler.sessions.jsonc` empty; all planned artifacts present.

## Commit sequence (atomic)

1. `docs(demo): T-007-02-01 research, design, structure, plan` — the four RDSPI
   thinking artifacts.
2. `docs(demo): T-007-02-01 scrub harness script + run evidence` — Steps 1–3.
3. `docs(demo): T-007-02-01 transfer signal checklist` — Step 4.
4. `docs(demo): T-007-02-01 fresh-owner harness procedure` — Step 5.
5. `docs(demo): T-007-02-01 progress and review handoff` — Step 6.

(Commit only if the session is set to commit; otherwise leave staged — the
artifacts are the deliverable, Lisa advances phases from their presence.)

## Risks & mitigations

- **Upstream string drift** — a future edit renames `SESSION_DOMAIN` etc. Mitigated
  by per-edit "assert the old substring is gone" checks: the script fails loudly
  rather than producing a half-scrubbed tree that scans clean by accident.
- **Over-scrubbing brand tokens** — mitigated by scrubbing only the five active
  config seams by exact string, never `--b28-*` tokens or comments (Design 2).
- **Mistaking a deferred leg for a pass** — mitigated by the explicit `deferred`
  state that must name the metered step; the signal's read-rules forbid using it
  to hide a red.
- **`git archive` unavailable / not at repo root** — exit 2 with a clear message;
  the harness doc states the run precondition (run from repo root, clean-ish tree).
