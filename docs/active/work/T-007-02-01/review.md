# Review — T-007-02-01 fresh-owner-drill-harness

Handoff self-assessment. What a reviewer (and T-007-02-02/03/04) needs to trust
the harness without re-running every command.

## What this ticket produced

The **stage and the scorecard** for the owner-transfer drill — the ticket that
"runs alone" in S-007-02:

- **`scrub-fresh-owner.sh`** — a re-runnable harness that builds a fresh-owner
  context from repo HEAD, scrubs the five active author couplings to loud
  new-owner placeholders, and *proves* the result (self-asserting; exits non-zero
  and names any residual). Ran green (exit 0), idempotent.
- **`fresh-owner-harness.md`** — the documented procedure, quoting the real run.
- **`transfer-signal.md`** — the committed per-category three-state
  (`pass`/`gap`/`deferred`) scorecard every downstream attempt reports against.
- **`evidence/`** — the real before/after scans, full run log, and tree listing.
- RDSPI thinking artifacts (`research/design/structure/plan/progress`).

**Nothing in this repo changed except `docs/active/work/T-007-02-01/**`.** The
story's untouched-runtime guarantee holds: `git status --porcelain -- src scripts
wrangler.jsonc wrangler.sessions.jsonc migrations public Dockerfile.session
astro.config.mjs` is empty. All scrubbing happens in a scratch archive, never the
working tree.

## Did it meet acceptance?

The criterion has two clauses; both met.

1. **A documented, re-runnable procedure produces a fresh-owner context with no
   author credentials/secrets on the runtime path** — ✓. `scrub-fresh-owner.sh` +
   `fresh-owner-harness.md`. The context is real (on disk), the procedure reruns
   deterministically (idempotence verified), and "no author secret on the runtime
   path" is *proven*: `git archive` drops `.dev.vars`/`.git`/`.promote`/`.wrangler`
   (asserted absent), and the five committed config couplings scrub to zero
   (before/after scan in `evidence/`).
2. **A per-category checklist with an explicit pass/fail signal is committed under
   `docs/active/work/T-007-02-01/`** — ✓. `transfer-signal.md`: seven categories,
   three explicit states, every state citing a seam or command, gap-names-the-seam
   rule, owner tickets assigned.

## The one honest boundary (not a gap)

The fresh-owner context is a **scrubbed local simulation**. Standing up live
resources under a *real second Cloudflare account* is **deferred and named**, not
done here — there is no second live account assumed available (PE-7; identical to
T-006-02-01's deferred public-URL leg). The signal encodes this as the `deferred`
state for categories 2 (Resources), 4 (Data), and 7 (Checks), each naming the
exact metered step it awaits. This is the story's explicit boundary, not an
oversight.

## Test coverage and gaps

- **Ran for real:** the harness script (exit 0), before/after coupling scans,
  forbidden-file-absence assertions, a second idempotence run (identical
  verdict), and a JSON-validity check of both scrubbed wrangler configs
  (comment-stripped `JSON.parse`) — which confirms the `database_id` removal
  leaves no dangling comma.
- **Not run (correctly out of scope):** any live Cloudflare deploy, secret
  rotation (T-007-02-02), resource/domain/data transfer (T-007-02-03), and the
  demo's checks against a deployment (T-007-02-04). `npm test`/Playwright were not
  re-run — the change is docs-only and the flow suite is unreliable in-session
  (`[[boilerplate-demo-playwright-daemonization]]`).
- **No new unit tests** — the deliverable is a drill script whose own in-run
  assertions are the test; adding a test harness for a work-dir drill script would
  be scope inflation.

## Open concerns for the consumers

For **T-007-02-02** (secrets/config — owns categories 5, 6):
- The fresh-owner tree carries **no secret to inherit** (`.dev.vars` dropped), so
  the job is proving *new* values install and `leak:check`/`ops:check` stay green
  — not removing an author secret. The placeholders for `SESSION_DOMAIN` /
  `SESSION_REPOSITORY_URL` are already set; fill real values and flip rows 5/6 to
  `pass`, or name a non-rotatable seam as `gap`.

For **T-007-02-03** (resources/domain/data — owns 1, 2, 3, 4):
- `database_id` is **removed**, so a real deploy provisions a fresh D1 — good, but
  watch the T-006-02-01 collision finding: deploying under author creds would hit
  the author's production Worker. Use the new account. Rows 2 and 4 start
  `deferred`; the live deploy is what moves them.
- The `NEW-OWNER-ZONE.example` placeholders are RFC 2606 unroutable by design —
  replace with the real zone before attaching routes.

For **T-007-02-04** (checks — owns 7):
- Every check takes a caller-supplied URL (`DEMO_BASE_URL`/`OPS_CHECK_URL`/
  `LEAK_CHECK_URL`/`PLAYWRIGHT_BASE_URL`); point them at the new-owner deployment.
  Run the Playwright flow **outside** an agent session to dodge the daemonization
  hazard, else a green demo can look red.

## Critical issues needing human attention

- **None destructive.** No credential was read, no resource created, no secret
  set. The scrub touches only a scratch archive.
- **One judgment call to confirm:** the harness classifies the shared `--b28-*`
  brand palette and narrative `b28.dev` comments as *allowed residue*, not
  couplings (consistent with T-007-01-02, which separated brand/comment from
  account coupling). If a reviewer wants the handed-off demo re-skinned off the
  b28 brand, that is a separate design decision (brand identity), not a transfer
  gap — and belongs to project generation (E-001), not this drill.
