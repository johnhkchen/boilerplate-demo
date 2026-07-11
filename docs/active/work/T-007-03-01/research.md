# Research — T-007-03-01 write-handoff-runbook

Descriptive map of what exists for distilling the owner-transfer drill into a
category-ordered handoff runbook authored on the generated-project docs
surface. No solution proposed here.

## The ticket in one line

Distill the S-007-02 drill (T-007-02-01..04) into a runbook a second owner can
follow through **all seven categories in the drill-proven order**, living on the
**generated-project docs surface** (travels with a demo), with
**grep-verifiable references to real seams** and **no template-development
history/demand leaked** into it.

## Source material: the drill's settled record

All four drill tickets are `phase: done`; their artifacts are the settled
record this ticket reads (S-007-03: "reads the drill's recorded outcomes;
touches no runtime code").

### The seven categories and the scorecard

`docs/active/work/T-007-02-01/transfer-signal.md` fixes the seven categories,
each with an observable, a pass condition, and a gap seam:

| # | Category | Final state after the drill |
|---|----------|------------------------------|
| 1 | Repo | pass (local drill; real GitHub repo = metered fill-in) |
| 2 | Cloudflare resources | deferred-live (local legs clean: `deploy:dry`, `session:validate`, served via `wrangler dev`) |
| 3 | Domain | **gap** — `test/promote.test.mjs:246` asserts literal `demo.b28.dev`; config side clean |
| 4 | Data | **gap** (DO) — `SESSION_COORDINATOR` storage has no export/import seam; D1 half clean |
| 5 | Configuration | pass (two committed vars scrubbed → owner fills real values) |
| 6 | Secrets | pass (no secret to inherit; 8 rotation seams proven with generated values) |
| 7 | Checks | pass (all four checks green vs. served-local new-owner context under `env -i`) |

### The drill-proven order

Two independent sources fix the order a second owner follows:

1. **The harness's own deferred-leg sequence**
   (`fresh-owner-harness.md` § "Re-running under a real second account"):
   (a) new owner authenticates + creates repo → (b) rotate config + secrets
   (T-007-02-02) → (c) provision resources, domain, data (T-007-02-03) →
   (d) verify checks (T-007-02-04).
2. **The story DAG** (S-007-02): harness → {02-02 ∥ 02-03} → 02-04 — checks
   run last because they can only judge a fully transferred deployment.

Mapped onto categories, the proven order is:
**1 Repo → 5 Configuration → 6 Secrets → 2 Resources → 3 Domain → 4 Data → 7 Checks.**
Supporting dependency evidence recorded in the drill:
- rotation-run.md's live-install section requires repo authority
  (`gh secret set --repo`) and config fill-ins before secret installation;
- transfer-log.md needed fresh secrets as a *boot requirement* before the
  Worker would serve (fill-in 2);
- checks-run.md is explicitly the "headline pass/fail" run last.

### Operational facts the drill said belong in the runbook

- **Clean-tree rule** (rotation-run.md § "Operational concern discovered"):
  never build/deploy from a tree containing the prior owner's `.dev.vars` —
  Astro packages it into `dist/server/.dev.vars` and `leak:check` flags it.
  Start from a clean clone/archive of committed content.
- **D1 export scoping** (transfer-log.md, "worth a line in the eventual
  runbook"): `wrangler d1 export --table backstage_entries --no-schema` — an
  unscoped dump carries `d1_migrations`/`sqlite_sequence` rows that collide
  with the destination's own applied migrations.
- **DO state does not travel**: no wrangler subcommand exports Durable Object
  storage; `SESSION_COORDINATOR` state is one small re-creatable JSON document
  (desired state), so the transfer move is re-create, not migrate. Named gap.
- **Domain-literal test failure is expected**: after re-pointing off the
  author zone, `npm test` fails 1/20 at `test/promote.test.mjs:246`
  (`extractCustomDomain reads the real wrangler.jsonc` expects
  `demo.b28.dev`). Known gap owned by the gap list; the runbook follower must
  not read it as a broken transfer.
- **Lowercase zone requirement**: `src/lib/session-lifecycle.ts` validates
  `SESSION_DOMAIN` with a lowercase-only `DNS_NAME` rule (drill finding F-1).
- **HTTPS-only repo URL**: `parseSessionConfig` rejects non-HTTPS
  `SESSION_REPOSITORY_URL` (no `file://` stand-ins, credential-free URL).
- **`database_id` removal contract**: `wrangler.jsonc` comment instructs
  removing the D1 `database_id` before deploying under another account;
  `deploy:dry` and local runs stay green without it; a fresh id is
  provisioned at real deploy (auto-provision contract held at validation
  level in the drill).
- **Secret hygiene mechanics**: interactive non-echoing `wrangler secret put`
  / `gh secret set`; mode-0600 file redirection for automation; verify names
  only via `secret list` (never retrieve values); short-lived env var for
  `ops:check`/`leak:check` signing-key input, unset after.
- **Check invocation seams**: every check resolves a caller-supplied target —
  `DEMO_BASE_URL`, `OPS_CHECK_URL`, `LEAK_CHECK_URL`, `PLAYWRIGHT_BASE_URL`;
  no check calls an author/central service.

## The seams the runbook must cite (verified present today)

- `wrangler.jsonc:27` — `"pattern": "demo.b28.dev"` route;
  `wrangler.jsonc:49` — D1 `database_id`; `wrangler.jsonc:41` — `secrets`
  block (`DEMO_SIGNING_KEY`, `DEMO_PASSCODE`).
- `wrangler.sessions.jsonc:15-16` — two session route patterns; `:20-21` —
  `SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`; `:26` — `secrets` block (4
  session secrets); `:47` — `SESSION_COORDINATOR` DO binding.
- `test/promote.test.mjs:246` — the domain-literal assertion (verified: still
  asserts `demo.b28.dev`).
- `migrations/0001_create_backstage_entries.sql` — the only migration.
- `src/lib/backstage-store.ts` (D1 access), `src/lib/session-lifecycle.ts`
  (host derivation, DNS rule).
- npm scripts (package.json): `deploy`, `deploy:dry`, `session:validate`,
  `integration:check`, `ops:check`, `leak:check`, `test:flow:backstage`,
  `test`, `verify`.
- Eight secret seams: App (`DEMO_SIGNING_KEY`, `DEMO_PASSCODE`), Sessions
  (`SESSION_RUNTIME_SECRETS`, `SESSION_ACCESS_TEAM_DOMAIN`,
  `SESSION_ACCESS_PREVIEW_AUD`, `SESSION_ACCESS_EDITOR_AUD`), GitHub Actions
  (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).

## The generated-project docs surface

What survives into a generated project is defined operationally by the drill
harness (`scrub-fresh-owner.sh`): it deletes `docs/active/**` (the RDSPI
planning trail — the E-007 leak guardrail) and keeps everything else,
explicitly retaining `docs/knowledge/**` "as read-only reference". So the
portable docs surface today is:

- `docs/*.md` top level: `demo-environments.md` (the capability guide) and
  `demo-threat-model.md`.
- `docs/knowledge/*.md`: operational runbooks + reference. The capability
  guide's header comment states the convention: *"Operational facts (flags,
  budgets, dashboards, checklists) live in the linked docs/knowledge
  runbooks."* Precedent: `deployment.md` is the deployment runbook, written
  imperative, command-first, with numbered bootstrap steps.
- `docs/archive/**` and `docs/knowledge/{rdspi,vend}-workflow.md`,
  `charter.md`, `vision.md` also ride along — existing template internals in
  the knowledge dir; the harness names board tooling dirs as an E-001
  generation-scope cut, not this ticket's problem.

## Constraints and guardrails

- **Leak guardrail** (E-007, S-007-03): the runbook is a *project artifact,
  not template internals* — no ticket/story/epic IDs, no RDSPI/Lisa/Vend
  vocabulary, no `docs/active/**` paths, no author-history narration.
  Cautionary precedent: `deployment.md` itself says "or RDSPI artifacts" —
  an existing mild leak on the portable surface; do not repeat the pattern.
- **Disjoint-artifact rule** (S-007-03 wave rationale): T-007-03-02 (gap
  list) runs in parallel — "separate files, no shared edit surface". Editing
  shared files (`README.md`, `demo-environments.md`) to link the runbook
  would create a collision surface with the sibling ticket.
- **No runtime code** (S-007-03 scope): docs only.
- **N3/P7**: portable runbook, no central handoff service.
- **Honest boundary** (S-007-03): the runbook captures; it does not close
  gaps. The live gold-master handoff by a real second human is metered and
  deferred — the runbook must name its live legs as such, consistent with
  how the drill recorded them (`deferred`, never faked).
- **Acceptance is grep-verifiable**: seam references must match real files/
  keys so `grep` confirms them; leaked template vocabulary must grep to zero.

## Assumptions surfaced

- "Second owner" audience = someone with their own Cloudflare account +
  GitHub authority, comfortable with wrangler/gh CLIs — same audience as
  `deployment.md`.
- The runbook documents the transfer of *this* demo as shipped (Cloudflare-
  first surface per N2); it does not generalize to other providers.
- The two known gaps (domain test literal, DO export seam) are stated inline
  where a follower hits them, but *closing* them and minting follow-ons is
  T-007-03-02's scope.
