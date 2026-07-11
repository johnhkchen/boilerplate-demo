# Design — T-007-02-01 fresh-owner-drill-harness

Three decisions, each grounded in Research: (1) how the fresh-owner context is
produced, (2) what the scrub actually does and how "no author secret on the
runtime path" is *proven*, (3) the shape of the per-category pass/fail signal.
Rejected options recorded with why.

## Decision 1 — how to stand up the fresh-owner context

**Options.**

- **A. Real second Cloudflare account + second GitHub account.** Maximum fidelity:
  actually deploy under a new owner. But Research + the story flag that a real
  second account is not assumed available, and a live deploy here would either
  need author credentials (defeating the drill) or a real second identity (out of
  scope for this alone-running harness ticket). It also risks the T-006-02-01
  finding: a clean copy deployed carelessly collides with the author's production
  Worker/D1.
- **B. Scrubbed local simulation via `git archive HEAD`.** Reconstruct a clean
  tree from committed content, which *for free* drops `.git`, `.dev.vars`,
  `.promote/`, `.wrangler/`, `dist/`, `node_modules/` (Research: confirmed).
  Remove `docs/active/**`. Scrub the five active config couplings to obvious
  new-owner placeholders. Prove the result with a scan. No live infra.
- **C. Manual checklist only (no produced artifact).** Cheapest, but fails the
  criterion's "produces a fresh-owner context" and "re-runnable" — a prose
  checklist neither produces nor proves anything.

**Decision: B, with the live-deploy leg named as a deferred manual step.** This
is the PE-7 honest cut and the exact shape T-006-02-01 used (Design Decision 2).
B satisfies "re-runnable" (a script reruns it deterministically), "produces a
fresh-owner context" (a real scrubbed tree on disk), and "no author
credentials/secrets on the runtime path" (provable by scan, and true-by-clean-
tree for secrets). A is deferred — the harness *names* the second-account deploy
as the metered manual leg T-007-02-03/04 will attempt, not something this ticket
executes. C is rejected outright: it produces nothing to score.

**Why `git archive` over `cp -r` or `rsync`:** archive is defined by *committed*
content, so the secret-scrub is a guarantee of the tool, not of my carefulness. A
recursive copy would drag `.dev.vars`, `.wrangler/`, `.promote/`, and `.git/`
along unless I remember to exclude each — exactly the author-secret leakage the
drill exists to prevent. Let the tool enforce the invariant.

## Decision 2 — what the scrub does, and how "no author secret" is proven

The clean tree still carries the five committed **active config couplings**
(Research table). The scrub replaces each with a self-evidently-not-real
new-owner placeholder, so a later transfer ticket must consciously fill it:

| Seam | From | To (placeholder) |
| ---- | ---- | ---------------- |
| `wrangler.jsonc:d1_databases[0].database_id` | `c95861d4-…` | **removed** (comment already says remove before another account provisions) |
| `wrangler.jsonc:routes` | `demo.b28.dev` | `demo.NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:routes` | `demo-session.b28.dev`, `code-session.b28.dev` | `demo-session.NEW-OWNER-ZONE.example`, `code-session.NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` | `b28.dev` | `NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` | author repo | `https://github.com/NEW-OWNER/REPO.git` |

**Why placeholders, not blanks:** a blank `SESSION_DOMAIN` would silently pass a
naive "no `b28.dev`" grep while leaving the field *unset* and the seam invisible.
`NEW-OWNER-ZONE.example` (an RFC 2606 reserved TLD, guaranteed unroutable) is
loud, greppable, and forces T-007-02-03 to make a real choice. Removing
`database_id` is the one exception: the config's own comment says to remove it so
Wrangler provisions fresh — following the repo's stated contract beats inventing
a fake UUID.

**Proof obligation — the scan.** After scrub, re-run the Research scan over the
runtime path. The pass condition is precise, and deliberately *not* "zero marker
hits":

- **Zero** author markers in the **active config** of `wrangler.jsonc` /
  `wrangler.sessions.jsonc` (routes, `database_id`, `SESSION_DOMAIN`,
  `SESSION_REPOSITORY_URL`).
- **Zero** committed secret *values* anywhere (already true; re-asserted — the
  archive dropped `.dev.vars`).
- **Comment/brand residue is allowed and named**: `--b28-*` palette tokens and
  narrative comments mentioning `b28.dev` remain, and the signal records them as
  *portable* (shared brand identity per the global claymorphism kit), not gaps.
  Blanket "grep returns nonzero → fail" would wrongly condemn the brand palette.

**Rejected:** scrubbing comments and brand tokens too. That would corrupt shared
design identity and misrepresent what an author *coupling* is — T-007-01-02 was
careful to separate the two, and the harness must not undo that.

## Decision 3 — shape of the per-category pass/fail signal

The signal is the scorecard T-007-02-02/03/04 report against. Options for its
vocabulary:

- **Binary pass/fail.** Too blunt: the story explicitly wants any category that
  "could NOT transfer cleanly … recorded with the exact failing seam," and PE-7
  wants deferred-but-not-failed distinguished from genuinely broken.
- **Three-state: `pass` / `gap` / `deferred`.** `pass` = the category transferred
  and its observable holds; `gap` = a seam failed, named exactly; `deferred` = a
  metered live step (second-account deploy) not run here but named. This matches
  the story's clean/gap language *and* PE-7's honest-boundary requirement.
- **Rubric per category with numeric score.** Over-engineered for a one-block
  drill; invites false precision.

**Decision: three-state (`pass` / `gap` / `deferred`)**, each category carrying:
(a) a one-line **observable** — the concrete thing you run or look at, (b) the
**pass condition**, (c) what a **gap** looks like (name the seam), (d) which
downstream ticket owns the attempt. Every state must cite a seam or command; no
bare verdicts. `deferred` must name the exact metered step and why it is deferred
(no second live account), never used to hide a real failure.

**Signal owners (from the story DAG):**

- Categories **5 Configuration**, **6 Secrets** → **T-007-02-02**.
- Categories **1 Repo**, **2 Cloudflare resources**, **3 Domain**, **4 Data** →
  **T-007-02-03**.
- Category **7 Checks** → **T-007-02-04**.

The harness sets the *baseline* verdict each category starts at after scrub (e.g.
Config/Domain move from `coupled` to `pass` on the scrubbed tree because the
placeholder is now new-owner-controlled; Resources/Data stay `deferred` pending a
real second-account deploy). Downstream tickets update their owned rows.

## What the harness deliberately does NOT decide

- It does not choose the new owner's real zone, repo, or account — those are
  placeholders for T-007-02-03 to fill.
- It does not rotate secrets — that is T-007-02-02 (the clean tree simply has
  none to inherit; rotation is proving *new* values install).
- It does not run the checks against a deployment — that is T-007-02-04. The
  harness only records that the checks are *target-agnostic* and how to point
  them.

## Artifacts this design implies (for Structure)

1. A **scrub script** (drill artifact, lives in the work dir) that produces and
   proves the context — makes "re-runnable" literal.
2. **`fresh-owner-harness.md`** — the documented procedure + the scrub result +
   the honest boundary.
3. **`transfer-signal.md`** — the per-category three-state checklist, the
   committed scorecard the criterion names.
4. Captured **`evidence/`** — the pre/post scan output proving the scrub.
