# Review — T-007-01-01 map-transfer-surface

_Handoff document. What a reviewer needs to accept this ticket without re-reading
every diff._

## What this ticket delivered

One inventory artifact —
`docs/active/work/T-007-01-01/transfer-surface-inventory.md` — that maps each of the
seven transfer categories (repo, Cloudflare resources, domain, data, configuration,
secrets, checks) to the concrete seam it occupies in this repo, every seam cited by
file, binding, or config key. This is the static "surface map" E-007's handoff
rehearsal transfers against.

## Files changed

**Created (docs only — no runtime code):**
- `docs/active/work/T-007-01-01/transfer-surface-inventory.md` — **the deliverable.**
- `docs/active/work/T-007-01-01/research.md` · `design.md` · `structure.md` ·
  `plan.md` · `progress.md` · this `review.md` — RDSPI phase artifacts.

**Modified / deleted:** none. The story's "touches no runtime code" boundary held —
no `src/**`, config, migration, or test edits.

## Acceptance check

> An inventory artifact under `docs/active/work/T-007-01-01/` lists all seven
> categories, each mapped to a real file/binding/config key in this repo.

Met. Verified by the Plan's citation audit (recorded in `progress.md`):
- **C1** — all 26 cited paths exist (`wrangler.jsonc`, `wrangler.sessions.jsonc`,
  the check trio scripts+libs, `passcode.ts`, `receipt.ts`, `session-access.ts`,
  the migration, `deploy.yml`, the Playwright specs, etc.).
- **C2** — every cited key/binding/symbol grep-resolves at its cited location
  (e.g. `BACKSTAGE_DB` + `database_id` in `wrangler.jsonc`, the four
  `SESSION_ACCESS_*`/`SESSION_RUNTIME_SECRETS` in `wrangler.sessions.jsonc`,
  `PASSCODE_ENV` in `passcode.ts`, `INTEGRATION_CHECKS` in `integration-check.ts`).
- **C3** — 7 category headings in story order, each with a cited seam table and one
  `_pending_` author-coupling line.

The story's examples are all present: the `b28.dev` `custom_domain` routes, the
`DEMO_PASSCODE` secret, `session-worker.ts`, `backstage-store.ts`, `passcode.ts`,
the check trio, the `wrangler.jsonc` routes.

## Test coverage

No automated tests — the deliverable is Markdown and the story forbids touching
runtime code, so there is no runtime behavior to exercise. Verification is the
static citation audit above (files/keys resolve; structure intact), which is the
appropriate and sufficient check for a mapping artifact.

## Design notes worth a reviewer's attention

- **Two-Worker span.** The map covers both deployables (`demo-runway` and
  `demo-runway-sessions`); several categories (Access audiences, session domains,
  the container) exist only on the Session Worker. A one-Worker reading would have
  missed them.
- **Reserved coupling slot.** Each category carries a literal `_pending_` line for
  T-007-01-02 (flag-author-couplings), which S-007-01 says *extends this same
  artifact*. This was a deliberate structural choice so the sibling ticket extends
  rather than restructures, and can target sections by fixed number/name.

## Open concerns / limitations

1. **Coupling verdicts are intentionally absent.** This ticket maps seams and notes
   *that* bindings exist; it does not judge *which* break on handoff or why. That is
   T-007-01-02's acceptance (routed `agent: codex`). Reviewers should not expect
   coupling analysis here — the `_pending_` lines are correct, not gaps.
2. **`database_id` is a live value in the repo.** The inventory cites the actual UUID
   `c95861d4-…` from `wrangler.jsonc`. It is a non-secret resource identifier (the
   config's own header comment says so), so citing it is fine; noted for awareness.
3. **Citations are a point-in-time snapshot.** If deploy config later changes (a new
   route, a renamed binding), the inventory would drift. The audit greps live files,
   so re-running Plan Step 10 re-validates cheaply. No auto-sync exists — acceptable
   for a work-artifact map.
4. **Nothing was committed by this pass.** Per the Lisa loop contract, commits and
   phase/status transitions are left to Lisa. A human reviewer looking at git will
   find the artifacts in the working tree, uncommitted, by design.

## Recommendation

Accept. The acceptance criterion is met and independently audited; the artifact is
cited throughout, spans both Workers, and cleanly seeds the coupling pass.
