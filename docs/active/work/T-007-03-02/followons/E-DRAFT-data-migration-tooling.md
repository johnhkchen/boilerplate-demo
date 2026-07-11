---
id: E-DRAFT-data-migration-tooling
title: portable-data-migration
status: draft
kind: permanent
advances: [P6]
serves: >
  A demo's accumulated data — D1 rows and Durable Object desired-state — moves to a
  new owner's account with one reproducible, verified export/import, so a handoff
  carries the content, not just the code.
---

```
portable-data-migration   {3}{U}
permanent — blue   (rarity: rare)
```

_Draft minted by T-007-03-02 from the S-007-02 owner-transfer drill gaps.
Un-promoted: promotion into `docs/active/epic/` (and a canonical id — suggested
E-008, non-binding) is Vend's `propose-epic` / a human's pull-decision._

## Intent — the bigger-picture play

The transfer drill proved the schema and access code are portable but the *content*
is not: a clone gives a new owner an empty store. The D1 half has a working manual
path (scoped export → import → re-serve); the Durable Object half has **no seam at
all** — no wrangler subcommand reads or writes `SESSION_COORDINATOR` storage, so the
only way to move session desired-state today is to hand-re-create it through the live
Worker's control API. This play builds the missing durable tooling: a single
reproducible command that exports both storage halves from an old account and imports
them into a freshly-provisioned new-owner account, then proves the moved data serves.
Intent only; DecomposeEpic breaks this into the export path, the import path, and the
round-trip verification.

## Value to the design

Converts "the data does not travel with a clone" from a named gap into a one-command,
verifiable move — the last piece that makes P6 sovereignty include *state*, not only
source. Reused across every future demo that accumulates a backstage feed or session
record, so no handoff re-invents data migration by hand.

## Done looks like

From a shell authenticated to the new owner's account, one command exports the
`backstage_entries` rows and the `SESSION_COORDINATOR` desired-state document from the
old account, imports both into the new-owner D1 + Durable Object, and a verification
step re-serves the moved rows through `GET /api/backstage/feed` and the moved session
state through the Worker's status API — all with the old account removed from the path
once export completes. Where a store genuinely cannot be exported, the tool says so
explicitly rather than silently dropping content.

## Context & constraints

Cloudflare-first per N2 — this is D1 + Durable Objects tooling for *this* storage
surface, not an all-provider data-migration abstraction. No mandatory central service
(N3/P7): a portable script the new owner runs, not a hosted migration service.
Right-sized per PE-7 to the two real stores this template has; new stores earn tooling
when they exist, not speculatively. Builds ON the drill's proven D1 path; the novel
work is the DO-storage seam.

## Seeds — the drill gaps this closes

- **G2 (Data, Durable Object half).** `SESSION_COORDINATOR`
  (`wrangler.sessions.jsonc:47`; `SESSION_STORAGE_KEY` in
  `src/session-worker.ts → SessionCoordinator`) has no export/import seam — wrangler
  exposes no DO-storage subcommand (`docs/active/work/T-007-02-03/transfer-log.md`
  §4). This is the gap with no workaround; it is the epic's core.
- **Remote D1 import leg (deferred-live).** The scoped export piped to
  `wrangler d1 execute --remote` against the new account's freshly-provisioned D1 was
  the metered step no drill could run without a second account
  (`docs/active/work/T-007-02-03/transfer-log.md` §4).
- **G3 (D1 dump scoping).** The unscoped `wrangler d1 export` carries
  `d1_migrations`/`sqlite_sequence` bookkeeping that collides with the new store's
  applied migrations; `--table backstage_entries --no-schema` is required. The tool
  should encode this, not leave it to operator memory.
