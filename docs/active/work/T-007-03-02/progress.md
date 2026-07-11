# Progress — T-007-03-02 compile-gap-list-and-mint-followons

Docs-only ticket. Execution followed `plan.md` steps 1–8.

## Completed

- **Steps 1–3 — three follow-on epic drafts minted** under
  `followons/`, each mirroring `docs/active/epic/E-007.md`'s frontmatter + card shape
  with `status: draft` and provisional `E-DRAFT-<slug>` ids:
  - `E-DRAFT-data-migration-tooling.md` (suggested E-008) — closes G2 (DO export) +
    the remote-D1 import leg + G3 (dump scoping).
  - `E-DRAFT-secret-rotation-tooling.md` (suggested E-009) — closes the Secrets
    deferred-live install; seeds the eight named seams + G5.
  - `E-DRAFT-domain-re-delegation.md` (suggested E-010) — closes G1 (test literal) +
    the live re-point leg + G4 (deploy-identity collision) + F-1.
- **Step 4 — shipped gap list** `docs/demo-handoff-gaps.md` written on the
  generated-project docs surface (beside `docs/demo-environments.md`): 7-category
  verdict table, `G1..G5` known-gap ledger, deferred metered-live section, and a
  "see also" pointer to the sibling runbook.
- **Step 5 — this file.**
- **Step 6 — all three gates passed** (see below).

## Gate results (step 6)

- **Seam-real** — every cited seam resolves live:
  `test/promote.test.mjs` asserts `demo.b28.dev`; `src/lib/session-lifecycle.ts:94`
  `DNS_NAME` lowercase rule; `wrangler.sessions.jsonc:47` `SESSION_COORDINATOR`;
  `wrangler.jsonc` `BACKSTAGE_DB` + `database_id c95861d4-…`; all eight secret names
  present across `wrangler.jsonc` / `wrangler.sessions.jsonc` / `deploy.yml`.
- **Leak-clean** — `grep -niE 'vend|lisa|fleet|propose-epic|decompose-epic|E-00[0-9]|
  E-DRAFT|epic draft|demand board|johnhkchen|template-development' docs/demo-handoff-
  gaps.md` returns nothing; the only `b28.dev` hit is the G1 seam literal (allowed —
  it is the value a new owner changes). Follow-on drafts referenced only as opaque
  "tracked as follow-on work" pointers.
- **Fidelity** — each category verdict matches `../T-007-02-01/transfer-signal.md`'s
  settled state (lines 120–132): Repo clean, Resources deferred-live, Domain **gap**,
  Data **gap**, Config clean, Secrets clean, Checks pass/deferred-live. No
  `deferred-live` leg was relabelled as a pass.

## Deviations from plan

- **None material.** The `promote.test.mjs` assertion is cited by test name rather
  than a pinned line number (the file has the domain literal in two places — a
  fixture at line 202 and the real-config assertion lower down); citing the test name
  keeps the reference stable against line drift. This is a strengthening, not a
  deviation.

## Boundary held

- No runtime code, wrangler config, test, or epic/story/ticket file modified — the
  ticket names gaps, it does not close them (story boundary).
- Epic drafts quarantined to `docs/active/work/**` (stripped from a generated
  project); the shipped gap list carries no template demand.
- Ticket frontmatter left untouched — Lisa advances the phase from the artifacts.
