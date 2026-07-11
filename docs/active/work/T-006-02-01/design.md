# Design — T-006-02-01 clean-copy-rehearsal-run

Decisions for how the rehearsal is run, grounded in Research. The overriding
design principle: the deliverable is *honest evidence of followability*, so
every choice optimizes for a faithful, reproducible run whose friction is
recorded verbatim — not for a green checkmark on every step.

## Decision 1 — Where the clean copy lives

**Options**

- **A. Sibling temp dir outside the repo** (e.g. the session scratchpad, or
  `../boilerplate-demo-cleancopy`). Cloned from this repo, history stripped,
  `docs/active/**` removed.
- **B. A subdirectory inside this repo** (e.g. `./.rehearsal/`). Simpler paths,
  but risks the clean copy's files being picked up by this repo's tooling, git,
  and the "src untouched" audit; nested git is error-prone.
- **C. A brand-new GitHub repo via `gh repo create`.** Closest to "generation,"
  but the story explicitly says generation is *approximated* by a clean copy and
  that no template automation exists yet — a new remote is scope the story
  pushed out.

**Choice: A — sibling temp dir in the session scratchpad.** It gives a genuinely
separate working tree (own or absent `.git`, no `docs/active/**`), keeps this
repo's tree clean so the "src untouched" guarantee is trivially auditable, and
avoids nested-git hazards. Rejected B for the tooling-bleed and audit risk;
rejected C because standing up a real remote exceeds the story's clean-copy
approximation and adds irreversible outward state for no rehearsal value.

The clean copy is created by copying the tracked tree (via `git archive` of
`HEAD` so `node_modules`, `dist`, `.wrangler`, and untracked cruft are excluded)
and then **deleting `docs/active/**`** to satisfy "no planning artifacts", and
**not initializing git** (or `rm -rf .git`) to satisfy "no commit history".
Dependencies are installed with `npm install` per the playbook's "Before the
event", not copied, so the rehearsal exercises the real install step.

## Decision 2 — How far the live-deploy legs actually run

This is the load-bearing decision. Research established that `npm run deploy`
from an unmodified clean copy would **overwrite the source project's production
`demo-runway` Worker** (same account, same name), claim its `demo.b28.dev`
custom domain, and point at its real D1 database.

**Options**

- **A. Deploy verbatim.** Rejected outright — destructive to the user's live
  demo. The playbook says run steps verbatim, but "verbatim" cannot mean
  "clobber the source project." This *divergence itself is the finding.*
- **B. Rename the Worker + provision a fresh D1 + set secrets + deploy to a
  scratch `*.workers.dev` URL, then tear it down.** Produces a real public URL
  and satisfies the letter of "reachable at its public URL." But: it is not what
  the playbook tells you to do (the playbook's bootstrap has no rename step); it
  requires interactive `wrangler secret put`, remote D1 provisioning, and
  reliable teardown of real infra by an autonomous agent; and it risks leaving
  orphaned resources on the user's account if any step half-completes. High
  outward-facing, hard-to-reverse cost.
- **C. Run every local and dry-run leg for real, and take the live-deploy legs
  right up to the boundary — running the safe, reversible parts (`wrangler
  whoami`, `astro build`, `wrangler deploy --dry-run`) and recording the
  publish/secret/D1/custom-domain steps as blocked-on-a-human-authorized-target,
  with the exact reason and the exact commands that would run.**

**Choice: C.** Rationale:

1. **Safety.** Publishing a new public Worker + D1 + secrets to the user's real
   Cloudflare account and reliably tearing it down is a hard-to-reverse,
   outward-facing action. In an unattended RDSPI loop with no human confirming
   the target, the correct default is to not provision real public infra —
   especially when the naive command is destructive to production.
2. **Fidelity of the finding.** The ticket's whole purpose is to surface "steps
   the playbook could not answer." The deploy legs are precisely where the
   clean-copy playbook is underspecified. Option B would *paper over* that gap by
   hand-authoring the missing rename/provision steps — the opposite of recording
   them as friction. Option C records the gap faithfully and hands T-006-02-02 a
   concrete, high-value playbook revision.
3. **Coverage of the rest.** Everything that does *not* require publishing is run
   for real: intake, credential routing, the rename change, both fault-mode
   integration checks, the full vertical slice build, `integration:check`,
   `verify` (which includes `deploy:dry`), the healthy/stalled/backstage
   Playwright flows, `leak:check`, and `ops:check` **against the owned local
   server**. That exercises the substance of Beats 1–3 and most of the exit gate
   on real code with real command output.

**Consequence, stated honestly:** two exit-gate conditions — "core moment works
at the *public* URL in a fresh browser" and "one backstage entry submitted
*live* comes back through the feed" — are met at the **local** surface, not a
public one, in this pass. The rehearsal log records them as observed locally and
names the public-surface confirmation as the single deferred leg, with the
reason (destructive-deploy hazard + missing clean-copy rename/provision steps).
This is the honest boundary S-006-02 already anticipated ("the real event-day
step is named here, not built here").

## Decision 3 — What "ops:check green under budget" is checked against

The playbook Step 10 points `OPS_CHECK_URL` at the live hostname; Step 8's
`integration:check` runs `ops:check` against its owned local server. Since
Decision 2 keeps us local, the ops probe runs against the integration harness's
own server (the Step 8 path) and, additionally, against a hand-started local
`wrangler dev` / preview of the built slice so the parcel boundary is exercised
end-to-end through the actual server route, not only through the Astro dev
server. Budgets are read from the report JSON and `flow-contract.ts`, and quoted
verbatim in the log.

## Decision 4 — Building the slice: replacement, not addition

Per Step 7 and the fixture's core-moment ("replacement behind the same seam"):

- Add `src/lib/parcel.ts` (stub client + checksum verify) mirroring
  `src/lib/receipt.ts`.
- Replace `src/pages/api/receipt.ts`'s body with the parcel boundary **or** add
  `src/pages/api/parcel.ts` and repoint the index card. The fixture says
  "replacement," and the flow contract keys on the *labeled action's accessible
  name*, not the route path — so the cleaner faithful move is to keep the single
  boundary route shape and swap what it returns, then rename the action. Final
  route choice is fixed in Structure.
- Keep `operation-runner.ts` **unchanged** — the slice calls it, it is the seam.
- Reproduce the API doc's slow case so the stalled path stays demonstrable.

All of this happens **in the clean copy only**.

## Decision 5 — How friction is recorded

Every step gets a line in `rehearsal-log.md` with an explicit verdict:
`answered` (playbook told me exactly what to do and it worked), `answered with
friction` (worked, but the playbook was ambiguous/underspecified — note what),
or `could not answer` (playbook gave no runnable instruction for a clean copy —
note the gap). The verbatim leftover list at the end is the union of every
`friction`/`could not answer` note plus anything swept in Step 11. This maps
directly onto what T-006-02-02 consumes. No friction is smoothed over in prose;
each is a quotable line.

## Rejected global alternative

**Rehearse entirely inside this repo** (no clean copy), arguing the fixture and
harness already live here. Rejected: it violates the story's clean-copy
requirement and its "no `docs/active/**`, no history" conditions, and it would
make the destructive-deploy finding invisible (the real project's config would
look correct because it *is* the real project). The clean copy is what makes the
`wrangler.jsonc` collision legible.
