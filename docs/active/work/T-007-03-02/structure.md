# Structure — T-007-03-02 compile-gap-list-and-mint-followons

The blueprint: exact files created, their shape, and the boundaries between them.
No runtime code changes anywhere (story boundary). All new files are additive.

## Files created

| Path | Kind | Ships with a demo? | Purpose |
| --- | --- | --- | --- |
| `docs/demo-handoff-gaps.md` | Shipped project doc | **Yes** (generated-project docs surface) | The gap-list deliverable: per-category verdict + gap ledger + deferred metered steps. |
| `docs/active/work/T-007-03-02/followons/E-DRAFT-data-migration-tooling.md` | Un-promoted epic draft | No (`docs/active/**` stripped) | Closes the Data DO/D1 migration gap. |
| `docs/active/work/T-007-03-02/followons/E-DRAFT-secret-rotation-tooling.md` | Un-promoted epic draft | No | Closes the Secrets live-install gap. |
| `docs/active/work/T-007-03-02/followons/E-DRAFT-domain-re-delegation.md` | Un-promoted epic draft | No | Closes the Domain re-point/re-delegation + resource-collision gap. |
| `docs/active/work/T-007-03-02/{research,design,structure,plan,progress,review}.md` | RDSPI process artifacts | No | Phase trail (this file is one of them). |

**Files modified: none.** **Files deleted: none.** No edits to `wrangler*.jsonc`,
`test/promote.test.mjs`, `src/**`, or any epic/story/ticket — naming a gap is not
fixing it.

## Boundary contract between the two output surfaces

The single most important structural rule: the **leak membrane** runs between
`docs/demo-handoff-gaps.md` (ships) and `docs/active/work/T-007-03-02/followons/**`
(does not ship).

- `docs/demo-handoff-gaps.md` MUST NOT contain: template-development demand, epic
  ids/titles, fleet/Vend/Lisa references, `johnhkchen`, or any "the template will
  build X" language. It MAY contain `b28.dev` / the author repo URL only where a
  seam literally is the thing a new owner changes (e.g. "`SESSION_DOMAIN` still
  `b28.dev`").
- The follow-on drafts MAY contain full template demand (that is what they are) and
  cite the drill's `docs/active/work/**` records freely — they never ship.
- The gap list references the follow-on work only as an opaque pointer
  ("closing this is tracked as template follow-on work"), not by epic id/title.

A grep gate enforces this in Plan/Review (see `plan.md` step 6).

## `docs/demo-handoff-gaps.md` — internal shape

Title + one-paragraph "who this is for" (a second owner taking over a generated
demo). Then, in order:

1. **`## Reading a row`** — the three states (clean / gap / deferred-live) defined,
   matching the drill scorecard vocabulary.
2. **`## The seven categories`** — a table:
   `# | Category | Clean-transfer verdict | Seam (file:line / binding) | New-owner action`.
   Seven rows: Repo(clean), Cloudflare resources(deferred-live + latent), Domain
   (**gap**), Data(**gap**), Configuration(clean), Secrets(clean), Checks(clean/
   deferred-live).
3. **`## Known gaps`** — a numbered ledger, one entry per named gap
   (`G1..G5`), each: **Seam** · **Why it fails clean transfer** · **Workaround
   today** · **Closing it** (large-automation follow-on pointer, or small fix). This
   is the "no failure silently absorbed" section.
4. **`## Metered live steps still deferred`** — the gold-master handoff legs no drill
   could run without a second live Cloudflare/GitHub account, named as deferred
   (resource deploy, remote D1 import, secret install, deployed-URL checks, live zone
   delegation). Each is a `deferred-live` state, never a pass.
5. **`## See also`** — pointer to the sibling runbook `docs/demo-handoff-runbook.md`
   (authored by T-007-03-01) and to the demo's own docs. No `docs/active/**` links.

Target ~120–160 lines. Grep-verifiable seam citations throughout.

## Gap ledger `G1..G5` (fixes the row set from `design.md` Decision 4)

- **G1 — Domain test literal.** Seam: `test/promote.test.mjs` (`extractCustomDomain
  reads the real wrangler.jsonc` asserts `'demo.b28.dev'`). Fails: a re-pointed tree
  fails its own `npm test`. Workaround: update the assertion when you re-point.
  Closing: small fix (derive expectation from config) — candidate ticket, NOT an
  epic.
- **G2 — Data / Durable Object export.** Seam: `wrangler.sessions.jsonc:47`
  `SESSION_COORDINATOR` (`SESSION_STORAGE_KEY` in `src/session-worker.ts →
  SessionCoordinator`). Fails: no wrangler subcommand exports DO storage. Workaround:
  re-create the small desired-state JSON via the live Worker control API. Closing:
  **large automation** → data-migration-tooling draft.
- **G3 — D1 dump scoping.** Seam: `wrangler d1 export` unscoped dump carries
  `d1_migrations`/`sqlite_sequence`. Fails: collides with the new store's applied
  migrations. Workaround: `--table backstage_entries --no-schema`. Closing: small
  (runbook note / guard).
- **G4 — Resource collision + container build.** Seam: `wrangler.jsonc:name`
  `demo-runway` + `d1_databases[0].database_id`; `Dockerfile.session` image build.
  Fails: deploying from an unmodified tree collides with the author's production
  Worker; image build unexercised. Workaround: rename Worker + remove `database_id`
  + own `*.workers.dev` before deploy. Closing: **large automation** → part of
  domain-re-delegation draft (deploy identity).
- **G5 — `.dev.vars` build leak.** Seam: building from a tree with the prior owner's
  `.dev.vars` packages `dist/server/.dev.vars`; `leak:check` flags it. Fails:
  operator error, not a code gap. Workaround: build from the clean archive/new-owner
  context. Closing: small (candidate build guard) — operator rule, not an epic.

Plus the harness placeholder case (F-1, lowercase `DNS_NAME` at
`src/lib/session-lifecycle.ts:94`) is noted under G1/Domain as a drill-harness
revision, since it is a drill artifact, not a new-owner-facing seam. (Kept in the
ledger's prose so it is "not silently absorbed," but flagged as harness-internal.)

## Follow-on epic draft — common internal shape

Each `E-DRAFT-<slug>.md` mirrors `docs/active/epic/E-007.md` so promotion is a
lift-and-renumber:

```
---
id: E-DRAFT-<slug>          # provisional; suggested E-008/09/10 noted, non-binding
title: <kebab-title>
status: draft               # NOT open — un-promoted
kind: permanent
advances: [P6, ...]
serves: > ... one-sentence sovereignty promise ...
---

<mtg-card flourish, echoing E-007's cost/color/rarity block>

_Draft minted by T-007-03-02 from the S-007-02 drill gaps. Un-promoted:
promotion into docs/active/epic/ is Vend's / a human's pull-decision._

## Intent — the bigger-picture play        (intent-only; no ticket decomposition)
## Value to the design
## Done looks like
## Context & constraints                    (respect N2/N3/P7, PE-7 right-sizing)
## Seeds — the drill gaps this closes       (cite exact seams + drill record paths)
```

### The three drafts, one line each

- **data-migration-tooling** — advances P6; closes G2 + the remote-D1 import leg +
  G3. Done: a reproducible export/import of D1 rows AND `SESSION_COORDINATOR` DO
  state across accounts, verified by re-serving the moved data.
- **secret-rotation-tooling** — advances P6, P3; closes the Secrets deferred-live
  install. Done: generate + install all eight named secrets into new-owner
  Cloudflare Workers + GitHub Actions with name/functional verification, no value
  echo, no author value reused.
- **domain-re-delegation** — advances P6, P5; closes the Domain live re-point leg +
  G4 deploy identity. Done: a re-pointed tree deploys collision-free under a new
  account and resolves on a new-owner zone, with `promote.test.mjs` no longer pinned
  to a domain literal (G1 rides along).

## Ordering

1. Write the three follow-on drafts first (they crystallise the gap→epic mapping the
   gap list will point at).
2. Write `docs/demo-handoff-gaps.md` (references the follow-on work as opaque
   pointers).
3. Grep gate (leak-clean + seam-real) before finishing Implement.
Steps are independent enough to commit in one or two atomic commits.
