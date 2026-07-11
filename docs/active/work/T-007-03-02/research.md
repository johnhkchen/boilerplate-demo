# Research — T-007-03-02 compile-gap-list-and-mint-followons

**Ticket.** Name every uncleanly-transferable category as an explicit known gap
and mint a follow-on epic draft for each *large automation* gap (data migration,
secret-rotation tooling, domain re-delegation) rather than inflating this card.

**Nature.** Docs-only. This ticket READS the settled S-007-02 drill record and
WRITES two disjoint things: a shipped gap-list artifact and a set of un-promoted
follow-on epic drafts. It touches no runtime code (story boundary: "captures and
names; it does not CLOSE any gap"). Descriptive here — no solutions proposed yet.

## Where the drill's outcomes are recorded (the inputs)

The drill fixed a per-category scorecard and moved rows as each category was
attempted. The authoritative records, all under `docs/active/work/`:

| Record | Owns | Final signal |
| --- | --- | --- |
| `T-007-02-01/transfer-signal.md` | The scorecard: 7 categories × {pass, gap, deferred}, each with a named seam. | The single source of truth; §"Baseline summary" + the two post-drill deltas at the bottom. |
| `T-007-02-01/transfer-surface-inventory.md` (from T-007-01-01) | Each category → its concrete repo seam (file/binding/config key). | Citation backbone for every gap. |
| `T-007-02-03/transfer-log.md` | Rows 1–4 (Repo, Resources, Domain, Data) attempt record. | Domain **gap**, Data DO **gap**; Repo/Resources clean-local. |
| `T-007-02-02/rotation-run.md` | Rows 5–6 (Config, Secrets) rotation. | Both clean; **no non-rotatable secret**; live install deferred. |
| `T-007-02-04/checks-run.md` | Row 7 (Checks). | **pass** (served-local); deployed-URL re-run deferred. |

The `T-007-01-02/` coupling verdicts (referenced from the inventory) classify each
category `coupled` vs `portable`; Checks is the only `portable` one.

## The seven categories and their settled verdict

From `transfer-signal.md`'s post-drill state (lines 120–132), corroborated by the
three run logs. Each verdict is one of: **clean** (transferred in the local drill),
**gap** (a seam failed clean transfer — named), **deferred-live** (a metered step
needing a real second Cloudflare/GitHub account, not run, not faked).

1. **Repo** — clean (local). New-owner remote round trip verified; `.dev.vars` kept
   out of history. Live leg: real GitHub repo + `SESSION_REPOSITORY_URL`
   (`wrangler.sessions.jsonc:vars`). A local `file://` stand-in is barred by
   `parseSessionConfig`'s HTTPS-only rule (a runtime fact, not a gap).
2. **Cloudflare resources** — clean local legs (`deploy:dry` + `session:validate`
   green *without* `database_id`); **deferred-live** deploy under a second account.
   Two latent hazards named: a name/route collision with the author's production
   `demo-runway` Worker (T-006-02-01 finding), and the container image build
   (`Dockerfile.session`) not exercised (scope cut).
3. **Domain** — **GAP.** `test/promote.test.mjs` asserts the literal `demo.b28.dev`
   against the real `wrangler.jsonc`, so a re-pointed tree fails its own `npm test`
   (observed 19 pass / 1 fail). Harness finding F-1: the uppercase scrub placeholder
   `NEW-OWNER-ZONE.example` is rejected by the lowercase-only `DNS_NAME` rule
   (`src/lib/session-lifecycle.ts:94`). Config side clean; live zone delegation
   deferred-live.
4. **Data** — **GAP** (Durable Object half). `SESSION_COORDINATOR` DO storage
   (`wrangler.sessions.jsonc:47`, `SESSION_STORAGE_KEY`) has **no export/import
   seam** — wrangler has no DO-storage subcommand; only read path is the live
   Worker's control API. D1 half clean locally (rows exported/imported/served) with
   a scoping caveat (`--table backstage_entries`; the unscoped dump collides with
   migration bookkeeping). Remote D1 import deferred-live.
5. **Configuration** — clean. Exactly two committed author values
   (`SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`) scrubbed to placeholders; owner
   fills real values. No gap.
6. **Secrets** — clean. All eight seams rotatable; **no non-rotatable secret found**
   (production parsers accepted generated replacements). Live install into new-owner
   Cloudflare/GitHub is deferred-live. Operator rule surfaced: never build/deploy
   from a tree carrying the prior owner's `.dev.vars` (it packages into
   `dist/server/.dev.vars` and the leak check flags it).
7. **Checks** — pass (attempted, served-local): `integration:check`, `ops:check`,
   `leak:check`, `test:flow:backstage` all green with author accounts + fleet off
   the path (`env -i`). Same checks vs a real deployed URL: deferred-live. No
   check-level gap.

**Summary:** two categories carry a true **gap** (Domain, Data); one carries latent
gaps behind a deferred live deploy (Resources); the rest are clean or clean-pending
a metered live account. Every non-clean state names its exact seam already.

## The two output surfaces (and the leak boundary between them)

T-006-02-02 proved the generated-project boundary empirically: a clean copy ships
`docs/knowledge/**` and a freshly-minted `docs/active/demand.md`, but
`docs/active/{epic,stories,tickets,work,pm}/**` are **absent** — template planning
history must not leak into a demo.

- **Shipping "generated-project docs surface"** = top-level `docs/*.md`
  (`docs/demo-environments.md`, `docs/demo-threat-model.md`, both README-linked) +
  `docs/knowledge/**`. This is where S-007-03 says the gap list + runbook are
  authored — "they travel with a demo."
- **Template planning surface** = `docs/active/**`. Epics live in
  `docs/active/epic/` (E-001..E-007 today, MTG-card frontmatter, "Proposed by
  Vend's `propose-epic` play"). The PM desk `docs/active/pm/staged/` is the explicit
  *un-promoted* draft space; pull-discipline: only a cleared/promoted signal writes
  `epic/`, `stories/`, `tickets/`.

This split is the ticket's central constraint: the **gap list is a shipped project
artifact** (must contain no template-development demand), while the **follow-on epic
drafts are template-development demand** (must not ship with a demo, and per
pull-discipline must not be promoted into `epic/` by this work ticket).

## What "large automation gap" means here

E-007's card (`docs/active/epic/E-007.md`, Context & constraints) is explicit:
"fully automating clean transfer of every category (data migration, secret rotation
tooling, domain re-delegation) is plausibly SEVERAL follow-on epics and should be
minted separately from the gaps this drill surfaces, not inflated into this card."
S-007-02's honest boundary repeats the same three. So the three named large
automation gaps are pre-blessed epic candidates; the drill's small repo-hygiene
gaps (test literal, harness placeholder case, D1 dump scoping, container build,
`.dev.vars` build rule) are *not* epic-sized and must stay named-but-not-inflated.

## Constraints & assumptions carried into Design

- **No second live Cloudflare/GitHub account** exists on this machine
  (`wrangler whoami` → author only). Every "live" leg is metered/deferred, named,
  never faked. The gap list must preserve that honesty, not paper over it.
- **Leak guardrail** (charter + T-006-02-02): zero template history/demand in the
  shipped gap list; grep-clean of `johnhkchen`, fleet/Vend/Lisa demand text.
- **Pull-discipline**: this ticket mints *drafts*, it does not promote epics.
- **Grep-verifiable seams** (mirrors the sibling runbook AC T-007-03-01): every gap
  cites a real file:line/binding a reader can `grep`. All seams named above were
  re-verified live this session (promote.test.mjs literal, DNS_NAME:94,
  SESSION_COORDINATOR:47, the `b28.dev` route/var literals, the 8 secret names).
- **Disjoint from the sibling runbook** (T-007-03-01): separate files, no shared
  edit surface. This ticket references the runbook by name; it does not write it.
