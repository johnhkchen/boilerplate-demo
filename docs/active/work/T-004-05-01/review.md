# Review — T-004-05-01 operator-and-teammate-docs-and-threat-model

## Outcome

Both deliverables exist, are committed, and satisfy the acceptance criterion.
This was a documentation-only ticket: no source, config, test, or knowledge
runbook was modified.

- `docs/demo-environments.md` (203 lines) — the capability guide:
  architecture, one-time operator setup, owner day-to-day session commands,
  the teammate zero-install path, promotion/rollback, the three PRD
  deviations, evidence status, and template-reuse notes.
- `docs/demo-threat-model.md` (160 lines) — the trust contract: the
  trusted/semi-trusted boundary as the opening section, the credential flow
  as the second (diagram + 8-row table), then surfaces, trust zones,
  implementation-backed invariants, residual risks, non-goals, and status.

These are the first top-level files in `docs/`; they sit above the five
per-subsystem knowledge runbooks and delegate operational detail to them
(one source of truth per fact — see design.md for the altitude decision).

## What changed

| Commit | Change |
|---|---|
| `339ad77` | RDSPI research/design/structure/plan/progress artifacts |
| `9e7ea8e` | `docs/demo-environments.md` created |
| `0c03232` | `docs/demo-threat-model.md` created |
| (final) | completed progress.md + this review |

No files modified or deleted outside `docs/demo-*.md` and this ticket's work
directory. Staging was path-scoped; sibling tickets' uncommitted board files
on the shared branch were not touched. Ticket frontmatter untouched (Lisa
owns phase/status transitions).

## Acceptance criteria assessment

> docs/demo-environments.md covers one-time operator setup, architecture,
> and the teammate zero-install path separately

✅ Three dedicated top-level sections. The teammate section is written *to*
the teammate in plain language and reads standalone — the intended excerpt
when links are handed over. Operator setup is a 7-step ordered checklist
with exact commands, each step linking to the owning runbook.

> docs/demo-threat-model.md states the trusted/semi-trusted boundary and
> credential flow prominently

✅ The boundary is the first section, block-quoted, and states the sharpest
fact plainly: an editor invitee gets a terminal and can read injected
runtime secrets — Access controls entry, nothing sandboxes what happens
inside. Credential flow is the second section: an ASCII lane diagram plus a
table of all eight credential classes (held-by / enters / must-never-appear-in).

> all three PRD deviations are recorded with reasons and
> experience-contract effects

✅ Dedicated "Deviations from the PRD" section: a 3-row table (runtime,
promotion mechanism, hostname/proxy) with Reason and
Effect-on-the-experience-contract columns, semantically matched to the
decision record (`docs/knowledge/demo-environments-decisions.md`), plus
follow-on consequences (instant rollback / origin-side verification).

## Verification performed

- Every `npm run` command in both docs exists in `package.json`.
- All relative links resolve (7 distinct targets).
- Hostnames, `workers_dev`/`preview_urls` flags, the four required secrets,
  and the `SessionCoordinator` binding verified against `wrangler.jsonc` /
  `wrangler.sessions.jsonc`.
- Deviation table diffed against the decision record — editorial changes
  only.
- `git diff --check` clean; no sensitive value (team domain, AUD, account
  ID, secret, personal email) appears in either doc.
- Full evidence in progress.md.

## Test coverage

No automated tests apply: the repo has no docs lint/link-check gate, and no
gate in `npm test` consumes `docs/`. Verification was the manual cross-check
above. **Gap:** link and command references can silently rot as the system
evolves; see follow-ups.

## Facts deliberately stated (worth a human glance)

- Both docs are explicit that the session stack is **locally verified only**
  — no paid Containers placement, no real Access application/login/
  revocation yet — and route go-live through the runbooks' production
  checklists. This mirrors the dependency reviews rather than overclaiming.
- The guide names the two outstanding operator actions that gate production:
  deleting the stale `demo.b28.dev` CNAME (promote currently exits 3) and
  enabling the paid Containers entitlement.
- The threat model records that the App Worker's `workers.dev` origin stays
  deliberately public (health probe), while the Sessions Worker's alternate
  origins are disabled — an asymmetry a reviewer might otherwise flag as an
  inconsistency.
- The teammate section mentions the 12-hour figure as the session-duration
  cap, matching the Access runbook's "no longer than the session's 12-hour
  TTL" guidance; actual TTL enforcement is a PRD default, not implemented
  automation (sessions end when the owner runs `down`). The wording avoids
  promising an automatic expiry.

## Open concerns

1. **Doc rot risk (medium).** These docs restate stable names (hostnames,
   command names, secret names). If a rename happens, three places update
   (config, runbook, capability doc). A cheap `docs:check` script (resolve
   links, grep `npm run` tokens against package.json) would make this
   mechanical — candidate follow-up ticket, not in this ticket's scope.
2. **PRD is out-of-repo.** The deviation section cites PRD §8/§4.6/§14 via
   the decision record; a reader without the PRD cannot check the defaults
   independently. Accepted: the decision record already owns that citation
   problem.
3. **Production evidence still outstanding (inherited, not introduced).**
   When the Containers entitlement and real Access setup land, both docs'
   "Status" sections should be refreshed from "production-pending" — the
   epic's handoff checklist already tracks the underlying evidence.
4. **No sibling docs index.** `docs/` now has top-level files but no README
   routing readers between capability docs, knowledge runbooks, and the
   active board. Fine at two files; revisit if more appear.

## Critical issues needing human attention

None in this ticket's scope. The two operator gates above (CNAME deletion,
Containers entitlement) predate this ticket and are documented, not fixed,
here.

## Handoff

Read order for a reviewer: `docs/demo-environments.md` →
`docs/demo-threat-model.md` → this review. The ticket's phase/status
frontmatter was not modified; Lisa detects this artifact and transitions.
