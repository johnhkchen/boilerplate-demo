# Structure — T-007-02-01 fresh-owner-drill-harness

The blueprint: what files are created, their interfaces, and the boundary
between this repo (evidence only) and the scratch fresh-owner context (the
produced artifact). No code — the shape of it.

## Two trees, one guarantee

```
this repo (boilerplate-demo/)                    scratch (scratchpad/fresh-owner/)
├── docs/active/work/T-007-02-01/   <── all       (produced by the scrub script)
│   ├── research.md                  evidence     ├── src/**            (kept, unchanged)
│   ├── design.md                    lands         ├── scripts/**        (kept, unchanged)
│   ├── structure.md                 HERE          ├── migrations/**     (kept)
│   ├── plan.md                                    ├── wrangler.jsonc         ◄ SCRUBBED
│   ├── scrub-fresh-owner.sh  ◄ the harness        ├── wrangler.sessions.jsonc◄ SCRUBBED
│   ├── fresh-owner-harness.md ◄ deliverable       ├── .dev.vars          (ABSENT — dropped)
│   ├── transfer-signal.md    ◄ deliverable        ├── .git/              (ABSENT — dropped)
│   ├── evidence/*.txt        (scan captures)      ├── .promote/.wrangler/(ABSENT — dropped)
│   ├── progress.md                                └── docs/active/**     (DELETED — no planning)
│   └── review.md
└── src/**, wrangler*.jsonc ← UNTOUCHED (story guarantee)
```

**Invariant:** nothing under this repo changes except
`docs/active/work/T-007-02-01/**`. The scrub runs against a scratch archive, never
against the working tree. `git status --porcelain` scoped to `src/ scripts/
wrangler.jsonc wrangler.sessions.jsonc` must be empty at Review.

## Files created (this repo)

Under `docs/active/work/T-007-02-01/`:

- `research.md`, `design.md`, `structure.md`, `plan.md` — RDSPI (first three done).
- **`scrub-fresh-owner.sh`** — the re-runnable harness. Drill artifact; lives in
  the work dir, not in product `scripts/`, so product code stays untouched.
- **`fresh-owner-harness.md`** — the documented procedure (the criterion's
  "documented, re-runnable procedure"), wrapping the script with rationale, the
  scan proof, and the honest boundary.
- **`transfer-signal.md`** — the per-category three-state checklist (the
  criterion's "per-category checklist with an explicit pass/fail signal").
- `evidence/scan-before.txt`, `evidence/scan-after.txt`, `evidence/tree-listing.txt`,
  `evidence/scrub-run.txt` — captured proof of one real run.
- `progress.md`, `review.md` — Implement log + handoff.

## `scrub-fresh-owner.sh` — interface

**Purpose:** produce and prove a scrubbed fresh-owner context from the current
repo HEAD. Deterministic, idempotent, no network, no author credential read.

**Invocation:**

```
docs/active/work/T-007-02-01/scrub-fresh-owner.sh [DEST_DIR]
```

- `DEST_DIR` — where to build the context. Default: the session scratchpad
  `fresh-owner/` dir. Recreated fresh each run (removed if it exists first).

**Steps (each echoed with a `==>` banner so stdout is the evidence):**

1. `git archive HEAD | tar -x -C "$DEST_DIR"` — clean tree from committed content
   only (drops `.git`, `.dev.vars`, `.promote/`, `.wrangler/`, `dist/`,
   `node_modules/` by construction).
2. `rm -rf "$DEST_DIR/docs/active"` — strip the template planning trail (E-007
   leak guardrail). Keep `docs/knowledge/**` as read-only reference.
3. **Scan BEFORE** — grep the runtime path for author markers, print hits. This is
   the baseline (proves the couplings were really there to scrub).
4. **Scrub** the five active config couplings (Design Decision 2 table), editing
   only `wrangler.jsonc` and `wrangler.sessions.jsonc` in `$DEST_DIR`:
   - delete the `database_id` line,
   - `demo.b28.dev` → `demo.NEW-OWNER-ZONE.example`,
   - session routes → `*.NEW-OWNER-ZONE.example`,
   - `SESSION_DOMAIN` value → `NEW-OWNER-ZONE.example`,
   - `SESSION_REPOSITORY_URL` value → `https://github.com/NEW-OWNER/REPO.git`.
5. **Scan AFTER** — re-grep. Partition hits into: active-config (must be zero),
   comment/brand residue (allowed, listed). Assert absence of `.dev.vars`,
   `.git`, `.promote`, `.wrangler` in `$DEST_DIR`.
6. Print a **verdict block**: PASS if active-config author markers == 0 and no
   dropped-secret file present; else FAIL naming the residual seam.

**Exit codes:** `0` scrubbed context produced and proven clean · `1` a residual
active-config coupling or author-secret file remained (named) · `2` misinvoked
(not run from repo root / `git archive` failed).

**Editing approach:** line-oriented `sed`/`perl` on the two JSONC files by exact
string (the values are unique), not a JSON parser — JSONC comments would break a
strict JSON round-trip, and the goal is a minimal, reviewable diff, not a
reformat. The script asserts each expected substring is gone after its edit, so a
silent no-op (upstream string drift) fails loudly rather than passing a
half-scrubbed tree.

## `fresh-owner-harness.md` — section shape

Written to satisfy the "documented, re-runnable procedure … no author
credentials/secrets on the runtime path" clause:

1. **What this is / honest boundary** — a scrubbed local simulation; the
   live second-account deploy is the named deferred leg (Design Decision 1).
2. **Definitions** — the runtime path (on/off), active config coupling vs.
   comment/brand residue.
3. **Run it** — the one command, expected stdout, exit codes.
4. **What the scrub removes for free** (clean-tree property) and **what it edits**
   (the five seams table) and **why placeholders not blanks**.
5. **The proof** — quoted before/after scan lines from `evidence/`, and the
   verdict.
6. **Re-running under a real second account** — the deferred manual leg spelled
   out (what T-007-02-03 does with the placeholders), metered and named.

## `transfer-signal.md` — section shape

The committed scorecard:

1. **How to read a row** — the three states (`pass`/`gap`/`deferred`), the rule
   that every state cites a seam or command, gap names the exact failing seam.
2. **The seven-category table** — columns: Category · Observable (command/file) ·
   Pass condition · Gap looks like (seam) · Baseline after scrub · Owner ticket.
3. **Per-category detail** — one short block each expanding the observable and the
   exact seam a gap would name, seeded from the inventory citations.
4. **Baseline verdicts after the harness** — the starting state each category is
   in on the scrubbed tree, so downstream tickets know where they begin.

## Ordering that matters

1. Script written and **run once for real** before the two deliverable docs — the
   docs quote its actual output, not an imagined run (PE-7: observe, don't assert).
2. `evidence/` captured from that run.
3. `fresh-owner-harness.md` and `transfer-signal.md` reference the captured
   evidence and the settled seams.
4. `progress.md` updated per commit; `review.md` last.

## What is explicitly NOT created

- No live Cloudflare deploy, no second account/zone claim, no set secret, no
  provisioned D1 (Decision 1 — deferred, named).
- No change to product `src/**`, `wrangler*.jsonc`, or `scripts/**` in this repo.
- No secret rotation (T-007-02-02), no resource/domain/data transfer
  (T-007-02-03), no check run against a deployment (T-007-02-04).
- No ticket-frontmatter edit.
