# Structure — T-007-03-01 write-handoff-runbook

File-level blueprint. Two files created, nothing modified, nothing deleted.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `docs/knowledge/handoff-runbook.md` | **create** | The deliverable: the portable handoff runbook (the acceptance artifact) |
| `docs/active/work/T-007-03-01/verify-runbook.sh` | **create** | Grep verifier: seams cited by the runbook exist; leak vocabulary absent |
| `docs/active/work/T-007-03-01/{research,design,structure,plan,progress,review}.md` | create | RDSPI phase artifacts (this trail; non-portable by design) |

Not modified: `README.md`, `docs/demo-environments.md` (shared surfaces with
the parallel sibling ticket), any runtime code, tests, or configs — the story
scopes this ticket to reading the drill record and writing docs.

## `docs/knowledge/handoff-runbook.md` — internal organization (~200 lines)

House style: `deployment.md` — plain `#` title, no frontmatter, imperative
voice, numbered steps, fenced `sh` blocks, one bolded rule per hazard.

```
# Handoff runbook: transferring this demo to a new owner
  ├── Intro (≈10 lines)
  │     what "transferred" means: repo, resources, domain, data, config,
  │     secrets all owner-controlled; demo passes its own checks with the
  │     previous owner's accounts off the runtime path. One standing rule:
  │     if a step fails, record the exact file/key/command — don't hide it.
  ├── Before you start (≈12 lines)
  │     prerequisites: own Cloudflare account (wrangler whoami), own GitHub
  │     repo authority (gh auth status), Node toolchain; the clean-tree rule
  │     (never build/deploy from a tree carrying the prior owner's .dev.vars)
  ├── 1. Repo (≈15 lines)
  │     clone from committed content → push to owner-controlled remote;
  │     verify: git remote -v shows only your remote; .dev.vars not in history
  ├── 2. Configuration (≈30 lines)
  │     all committed prior-owner couplings, edited in one pass:
  │       wrangler.jsonc: routes[].pattern, d1_databases[0].database_id (remove)
  │       wrangler.sessions.jsonc: routes[].pattern ×2, vars.SESSION_DOMAIN,
  │         vars.SESSION_REPOSITORY_URL
  │     rules: lowercase zone (DNS_NAME validation), HTTPS repo URL;
  │     verify: grep for old zone/repo values returns only narrative comments
  ├── 3. Secrets (≈40 lines)
  │     eight seams in three stores (App ×2, Sessions ×4, GitHub Actions ×2);
  │     non-echoing installs; 0600-file redirection for automation; generate
  │     fresh values (never reuse prior owner's anything);
  │     verify: name-only secret list commands, three expected name sets
  ├── 4. Cloudflare resources (≈20 lines)
  │     npm run deploy:dry + session:validate first (works with database_id
  │     removed), then npm run deploy + session deploy under your account;
  │     fresh D1 auto-provisioned; apply migration --remote;
  │     verify: wrangler whoami account owns the Worker; deploy output
  ├── 5. Domain (≈20 lines)
  │     deploy attaches the custom domains edited in step 2; one
  │     SESSION_DOMAIN value must derive all three hosts consistently
  │     (src/lib/session-lifecycle.ts); DNS/cert notes (records managed by
  │     another product refuse the attach);
  │     KNOWN GAP callout: test/promote.test.mjs asserts the shipped
  │     demo.b28.dev literal — npm test fails 1 test after re-pointing;
  │     expected, not a broken transfer
  ├── 6. Data (≈25 lines)
  │     D1: scoped export/import (--table backstage_entries --no-schema; why
  │     unscoped dumps collide with applied migrations); import via
  │     d1 execute --remote;
  │     KNOWN GAP callout: SESSION_COORDINATOR Durable Object state has no
  │     export path — re-create session state, don't migrate it
  ├── 7. Checks (≈25 lines)
  │     the demo judges its own transfer: integration:check, ops:check,
  │     leak:check, test:flow:backstage against the deployed URL via
  │     DEMO_BASE_URL / PLAYWRIGHT_BASE_URL; short-lived signing-key env;
  │     all green = transfer complete; any red = record check + seam
  └── Record what didn't transfer (≈8 lines)
        the standing failure-recording rule restated; where to write it
        (a dated note in the project's docs), so no gap is silently absorbed
```

Line budget: ~205 total. Each category section carries exactly three beats —
**edit/run** (commands), **verify** (observable), and, where the drill
recorded one, a **known-gap** callout.

## Seam citations the runbook must contain (the grep contract)

The verifier asserts each of these strings (or a tight pattern) appears in
the runbook AND resolves against the real tree:

- files: `wrangler.jsonc`, `wrangler.sessions.jsonc`,
  `test/promote.test.mjs`, `migrations/0001_create_backstage_entries.sql`,
  `src/lib/session-lifecycle.ts`, `src/lib/backstage-store.ts`, `.dev.vars`
- keys: `routes`, `database_id`, `SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`,
  `SESSION_COORDINATOR`, `BACKSTAGE_DB`
- secrets (all eight): `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`,
  `SESSION_RUNTIME_SECRETS`, `SESSION_ACCESS_TEAM_DOMAIN`,
  `SESSION_ACCESS_PREVIEW_AUD`, `SESSION_ACCESS_EDITOR_AUD`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- npm scripts: `deploy`, `deploy:dry`, `session:validate`,
  `integration:check`, `ops:check`, `leak:check`, `test:flow:backstage`
- check target vars: `DEMO_BASE_URL`, `PLAYWRIGHT_BASE_URL`

## `verify-runbook.sh` — shape

Small bash script, exit 0/1, three passes over the runbook:

1. **Leak scan (must be empty):** case-sensitive grep for
   `RDSPI|Lisa|Vend|docs/active|T-00|S-00|E-00` and drill-narration terms
   (`drill`, `rehearsal`, `scorecard`, `ticket`, `story`, `epic`).
2. **Seam-presence scan:** every string in the grep contract above appears
   in the runbook.
3. **Seam-reality scan:** every cited file exists in the tree; every cited
   config key greps in its cited file; every cited npm script greps in
   `package.json`.

Lives in the work dir (template-side, scrubbed from generated projects — the
runbook itself must not depend on it).

## Ordering of changes

1. `verify-runbook.sh` first (the checklist exists before the artifact, so
   authoring finishes against a running check).
2. `docs/knowledge/handoff-runbook.md`.
3. Run verifier + capture evidence; then `progress.md`, commits, `review.md`.

## Boundaries

- **Public interface:** the runbook file itself; it must stand alone (no
  dependence on `docs/active/**`, scripts, or any service — N3/P7).
- **Internal to this ticket:** the verifier and evidence; they are
  development-trail insurance, not part of the deliverable.
- **Explicitly out:** editing shared docs for discoverability links
  (collision with the parallel gap-list ticket — review.md follow-up);
  closing either known gap; porting drill scripts to the runtime surface.
