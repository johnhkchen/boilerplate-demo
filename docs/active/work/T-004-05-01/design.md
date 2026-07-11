# T-004-05-01 — operator-and-teammate-docs-and-threat-model — Design

Decision: what kind of documents these are, how they divide the material, and
what was rejected.

## The core design question

Five knowledge docs (`deployment.md`, `session-image.md`,
`session-lifecycle.md`, `session-access.md`, `demo-environments-decisions.md`)
already hold every operational detail, and each ends in its own production
checklist. The deliverables must add value without forking that content into
a second place that drifts. So the question is: **what altitude do the two new
docs fly at?**

## Options considered

### A — Comprehensive standalone manuals

Merge the knowledge docs into one big operator manual plus a full formal
threat model (STRIDE tables, attack trees).

- Rejected. Duplicates ~1,400 lines of runbook content that would drift the
  first time a command changes; the knowledge docs are already the durable
  per-subsystem contracts, each maintained by the ticket that owns the
  subsystem. Also violates the ~200-line artifact discipline the repo runs
  on. A formal STRIDE treatment overshoots a one-session MVP whose stated
  trust model is "trusted/semi-trusted teammates."

### B — Thin pointer pages

Two short index files: "see these five docs."

- Rejected. Fails the acceptance criteria: AC 1 demands the operator path,
  architecture, and teammate path be *covered*, separately — a pointer covers
  nothing; a teammate handed `code-session.b28.dev` should not need to read
  a Wrangler runbook. AC 2 demands the boundary be stated *prominently*, not
  discoverable via links. And nothing today assembles the end-to-end story:
  each knowledge doc covers its subsystem; none walks owner→teammate→promote.

### C — Audience-shaped capability docs over subsystem runbooks (chosen)

`demo-environments.md` = the **capability guide**: what the system is, the
three separate journeys through it (operator one-time setup · architecture ·
teammate zero-install), with exact commands *named* and sequenced but each
step delegating its detailed procedure to the owning knowledge doc.
`demo-threat-model.md` = the **trust contract**: boundary statement first,
credential flow second, then assets/surfaces, invariants, residual risks.

- Chosen because it matches how the repo already layers documentation
  (decision record → subsystem contracts → this capability layer), keeps one
  source of truth per fact, satisfies "separately" and "prominently" by
  construction, and stays reviewable at ~200 lines each.

## Decisions within Option C

### D1 — Where the three PRD deviations live

In `demo-environments.md`, as a dedicated top-level "Deviations from the PRD"
section with the reason and experience-contract effect per deviation
(satisfying AC 3 verbatim), *after* the architecture section that gives them
meaning. The threat model references deviation consequences only where they
change trust (e.g. Access-on-Worker-route exists because of deviation 3).
Rejected: putting the table only in the threat model (deviations are
architecture provenance, not risks) or only in the decision record (the AC
requires the deliverable docs to record them; the decision record predates
implementation and stays the *why*-record — the new table cites it).

### D2 — Ordering inside demo-environments.md

Architecture first, then operator setup, then teammate path, then promotion
day-to-day, then deviations, then production-evidence status. Rationale: the
operator steps are meaningless without the two-Worker picture; the teammate
section must be readable standalone (it will be excerpted/linked when links
are handed over), so it comes after the system exists. AC 1's three items
each get a top-level `##` — that is the checkable "separately".

### D3 — Threat-model shape

Plain-language trust contract, not a formal methodology. Order: (1) the
boundary statement in the first screenful — who may be invited, what an
editor invitee can actually do (terminal, runtime-secret env), what this is
*not* (isolation from session code, untrusted-stranger hosting); (2) the
credential flow — one diagram + one table enumerating every credential, where
it lives, where it travels, where it must never appear; (3) surfaces and
their protections (public demo vs preview vs editor vs control API);
(4) enforced invariants (what code/config guarantees, citing tests);
(5) residual risks and operator obligations (from the dependency reviews:
replacement-before-down, 2 MiB cap, redaction limits, multi-step revocation,
concurrent promotes); (6) out-of-scope/non-goals. AC 2's "prominently" is
satisfied by (1) and (2) being the first two sections.

### D4 — Reusable-permanent framing

Write for "this template, deployed in a project's own Cloudflare account,"
using the real `b28.dev` hostnames as the worked example throughout (concrete
beats abstract; the fixed `session` slug is real config). One short
"reusing this in another generated demo" note lists what an adopter changes:
zone, hostnames in both wrangler configs, repository URL, Access org. No
placeholder-variable rewrite of every command — that would diverge from the
runbooks the docs delegate to.

### D5 — Honesty about production status

Both docs carry an explicit evidence-status note: promote/rollback exercised
live (hostname verification pending the stale-CNAME operator step); the
session stack is implementation-complete and locally verified but no paid
Containers placement, real Access login, or revocation has been executed.
Production checklists stay in the knowledge docs; the capability guide links
to them as the go-live gates. Rejected: writing as if production-proven
(overclaims, contradicts the reviews) or gating the docs on production
evidence (docs are exactly what the human needs *to* execute those gates).

### D6 — Voice

Plain kitchen-table English per the brand instruction, especially in the
teammate section (its reader may be non-technical: "you need a browser and
the email address the owner invited — nothing to install"). Operator and
threat-model sections stay precise and imperative like the existing knowledge
docs; no marketing tone in a threat model.

## Consequences

- Two new files only; no knowledge doc is modified (their content is current
  as of the dependency reviews — verified in Research). If drift is found
  while writing, fix-forward in the new docs' links, don't rewrite runbooks
  under a docs ticket.
- Maintenance rule embedded in each doc's header comment: facts live in the
  linked runbooks; these docs hold the journeys and the trust contract.
- Risk accepted: some inevitable restatement (hostnames, command names,
  boundary sentences). Mitigated by restating only stable facts (names,
  shapes) and delegating volatile detail (flags, dashboards, budgets).
