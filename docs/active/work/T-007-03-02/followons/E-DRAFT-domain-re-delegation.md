---
id: E-DRAFT-domain-re-delegation
title: sovereign-domain-re-delegation
status: draft
kind: permanent
advances: [P6, P5]
serves: >
  A re-pointed demo deploys collision-free under a new owner's Cloudflare account and
  resolves on their zone — routes, SESSION_DOMAIN, Worker identity, and DNS all move
  off the author, and the tree still passes its own tests afterward.
---

```
sovereign-domain-re-delegation   {3}{W}
permanent — white   (rarity: rare)
```

_Draft minted by T-007-03-02 from the S-007-02 owner-transfer drill gaps.
Un-promoted: promotion into `docs/active/epic/` (and a canonical id — suggested
E-010, non-binding) is Vend's `propose-epic` / a human's pull-decision._

## Intent — the bigger-picture play

The drill re-pointed the config cleanly — one zone value drives all three hosts, and
old-host classification correctly returns `null` — but two seams block a real
re-delegation. First, the tree fails its **own** test suite after re-pointing, because
a unit test asserts the literal old domain. Second, the live legs (attaching routes to
a real new-owner zone, observing DNS resolution) plus a safe deploy identity (the
Worker name and account-bound D1 id collide with the author's production Worker) were
all deferred for want of a second account. This play makes domain re-delegation a
guided, collision-safe operation: re-point routes + `SESSION_DOMAIN`, take a
deploy identity that cannot collide with the author's, delegate the zone, and confirm
the re-pointed tree is green. Intent only; DecomposeEpic breaks this into the re-point
transform, the collision-safe deploy identity, and live zone attachment.

## Value to the design

Closes the last coupling between a handed-off demo and the author's `b28.dev` zone,
and removes the sharp edge where a re-pointed tree fails its own checks — so a new
owner's first `npm test`/deploy after re-pointing is green, not red. Advances P6
(sovereign hosting) and P5 (a proven demo transfers without a rewrite of its routing).

## Done looks like

A guided re-point moves all three hosts and `SESSION_DOMAIN` off `b28.dev` to a
new-owner zone, assigns a Worker name + D1 database that cannot collide with the
author's production `demo-runway`, deploys under the new account, and resolves live on
the new zone — and the re-pointed tree passes `npm test` because the domain expectation
is derived from config, not pinned to a literal. Any leg that still needs a live
account (real DNS delegation) is named as the metered step, not skipped.

## Context & constraints

Cloudflare zone + Workers routing surface only (N2 — not a general DNS/CDN
abstraction). No mandatory central re-delegation service (N3/P7): a portable transform
+ deploy the new owner runs. Right-sized (PE-7) to this template's three custom-domain
routes and single zone var. Must keep the honest boundary that live DNS delegation
needs a real new-owner zone.

## Seeds — the drill gaps this closes

- **G1 (Domain test literal).** `test/promote.test.mjs` (`extractCustomDomain reads
  the real wrangler.jsonc`) asserts `'demo.b28.dev'`; a re-pointed tree fails its own
  `npm test` (19 pass / 1 fail observed,
  `docs/active/work/T-007-02-03/transfer-log.md` §3). Deriving the expectation from
  config removes the sharpest small gap and rides along with this epic.
- **Domain live re-point (deferred-live).** Attaching routes to a real new-owner zone
  and observing DNS resolution was the metered leg
  (`transfer-log.md` §3); the config-side re-point is proven, the live delegation is
  not.
- **Harness finding F-1.** The uppercase scrub placeholder is rejected by the
  lowercase-only `DNS_NAME` rule (`src/lib/session-lifecycle.ts:94`,
  `SESSION_DOMAIN must be a lowercase DNS name`) — a re-point tool must emit a
  lowercase zone.
- **G4 (deploy identity collision).** `wrangler.jsonc:name` `demo-runway` +
  `d1_databases[0].database_id` `c95861d4-…` collide with the author's production
  resources on deploy (T-006-02-01 finding); `Dockerfile.session` image build was not
  exercised. The re-delegation must take a fresh Worker name + D1 id.
