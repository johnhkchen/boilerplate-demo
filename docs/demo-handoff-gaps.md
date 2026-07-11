# Handoff — known gaps

If you are taking over this demo, this page is the honest list of what does **not**
move cleanly when the project changes hands, and what to do about each. It is the
companion to the step-by-step [handoff runbook](./demo-handoff-runbook.md): the
runbook walks you through a transfer in order; this page names where the seams are
still rough so nothing bites you by surprise.

Every gap below cites a real file or setting you can open and check for yourself.
None of them are silently absorbed — a rough edge named here is a rough edge you can
plan around.

## How to read a row

Each transfer category is in one of three states:

- **clean** — it moves with an ordinary clone + a config change; nothing special.
- **gap** — a specific seam does not move cleanly. The row names the exact file or
  setting and gives you the workaround to use today.
- **deferred-live** — a step that can only be done from a shell signed in to your own
  Cloudflare / GitHub account (a real deploy, a real DNS change). It is not broken; it
  just cannot be rehearsed without your live account, so it is named as a real step
  you still owe, not marked "done."

## The seven categories

| # | Category | Transfers cleanly? | Seam to check | What you do |
|---|----------|--------------------|---------------|-------------|
| 1 | **Repo** | clean | `wrangler.sessions.jsonc` → `vars.SESSION_REPOSITORY_URL` | Clone into your own repo; set this to your repo's HTTPS URL (an HTTPS URL is required — a `file://` path is rejected). |
| 2 | **Cloudflare resources** | deferred-live | `wrangler.jsonc` → `name`, `d1_databases[0].database_id` | Deploy under your account. See **G4** — rename the Worker and drop the pinned `database_id` first, or you collide with the original owner's Worker. |
| 3 | **Domain** | **gap** | `wrangler.jsonc` / `wrangler.sessions.jsonc` → `routes`, `SESSION_DOMAIN` | Re-point all three hosts + `SESSION_DOMAIN` to your own zone (one zone value drives all three). See **G1** — a test still expects the old domain. |
| 4 | **Data** | **gap** | `wrangler.jsonc` → `BACKSTAGE_DB`; `wrangler.sessions.jsonc:47` → `SESSION_COORDINATOR` | Move D1 rows with a scoped export (**G3**). Session state has no export command yet (**G2**) — re-create it live. |
| 5 | **Configuration** | clean | `wrangler.sessions.jsonc` → `vars` | Exactly two committed values are owner-specific (`SESSION_DOMAIN`, `SESSION_REPOSITORY_URL`); replace both. Everything else is portable. |
| 6 | **Secrets** | clean | `wrangler.jsonc` + `wrangler.sessions.jsonc` → `secrets.required`; `.github/workflows/deploy.yml` | Install fresh values for all eight named secrets under your own account. None is committed and none is stuck — see the runbook for the exact commands. Watch **G5**. |
| 7 | **Checks** | clean / deferred-live | `npm run integration:check`, `ops:check`, `leak:check`, `test:flow:backstage` | All four pass locally against a fresh-owner build. Re-run them against your **deployed** URL once step 2 is live. |

The demo's own checks pass end-to-end under a fresh owner with the original owner's
accounts removed from the path — so the code genuinely runs in your hands. The rough
edges are all in *moving* the project (rows 2–4), not in whether it works afterward.

## Known gaps

### G1 — a test still expects the old domain (Domain)

- **Seam:** `test/promote.test.mjs`, the test `extractCustomDomain reads the real
  wrangler.jsonc`, asserts the literal `demo.b28.dev` against `wrangler.jsonc`.
- **Why it fails clean transfer:** once you re-point the routes to your own zone, this
  assertion no longer matches your config, so a re-pointed tree **fails its own
  `npm test`** (one test of the suite).
- **Workaround today:** update that assertion to your new domain when you re-point.
- **Closing it:** this is a one-line fix — derive the expected domain from the config
  instead of hard-coding it. Tracked as a small follow-on cleanup, not a manual step
  you must repeat.

### G2 — session state has no export command (Data)

- **Seam:** `wrangler.sessions.jsonc:47` → `SESSION_COORDINATOR` (the session's
  desired-state record, `SESSION_STORAGE_KEY` in `src/session-worker.ts`).
- **Why it fails clean transfer:** there is no `wrangler` subcommand that exports
  Durable Object storage, so a clone does not carry a running session's state.
- **Workaround today:** the state is one small, re-creatable document — read it from
  the live Worker's status API on the old deployment and re-create it on yours. If no
  session is live at handoff, there is nothing to move.
- **Closing it:** durable export/import tooling for this storage half is tracked as
  larger follow-on work; until it lands, the manual re-create above is the path.

### G3 — the D1 export needs to be scoped (Data)

- **Seam:** `wrangler d1 export` run without a table scope also dumps
  `d1_migrations` / `sqlite_sequence` bookkeeping rows.
- **Why it fails clean transfer:** those bookkeeping rows collide with the migrations
  your fresh store has already applied, so an unscoped import errors.
- **Workaround today:** always scope the export:
  `wrangler d1 export --table backstage_entries --no-schema`.
- **Closing it:** small — the scoped form belongs in the migration tooling so you
  don't have to remember it.

### G4 — deploy identity collides with the original owner (Cloudflare resources)

- **Seam:** `wrangler.jsonc` → `name` (`demo-runway`) and
  `d1_databases[0].database_id` (a UUID bound to the original account); the session
  image `Dockerfile.session`.
- **Why it fails clean transfer:** deploying an unmodified tree reuses the original
  Worker name and a database id that lives in the original owner's account — a
  collision. (The session container image build has not been exercised in a transfer,
  so budget time for it.)
- **Workaround today:** before your first deploy, rename the Worker, remove the pinned
  `database_id` (a fresh one is provisioned for your account), and use your own
  `*.workers.dev` host. The config comment on `database_id` already flags this.
- **Closing it:** a collision-safe re-point + deploy is tracked as larger follow-on
  work; until then, the rename-and-clear steps above are manual.

### G5 — don't build from a tree carrying the previous owner's local secrets (Secrets)

- **Seam:** a `.dev.vars` file left in the tree gets packaged into
  `dist/server/.dev.vars` at build time, and `leak:check` correctly flags it.
- **Why it matters:** building or deploying from a tree that still holds the previous
  owner's `.dev.vars` would ship their local secret into your bundle.
- **Workaround today:** build from a clean checkout with no inherited `.dev.vars`;
  supply your own secrets to the runtime, not to the build. `.dev.vars` is gitignored,
  so a fresh clone is already clean — the trap is only if one is copied in by hand.
- **Closing it:** small — a build-time guard could refuse to package a `.dev.vars`.

## Metered live steps still deferred

These are the parts of a handoff that can only be done from a shell signed in to your
own accounts. A rehearsal proved the local and config-side work; these live legs are
real steps you still owe, named here so they are not mistaken for finished:

- **Deploy the Workers + provision D1 / Durable Objects / container** under your
  Cloudflare account (row 2).
- **Import the D1 rows** into your provisioned database (`wrangler d1 execute
  --remote`), and re-create the session state (row 4 / G2).
- **Install all eight secrets** into your Workers and your GitHub Actions (row 6).
- **Attach the routes to your zone and confirm DNS resolves** on your domain (row 3).
- **Re-run all four checks against your deployed URL** (`DEMO_BASE_URL` /
  `PLAYWRIGHT_BASE_URL` pointed at your Worker), not just the local build (row 7).

None of these is blocked by the code; each simply needs your live account. The
[handoff runbook](./demo-handoff-runbook.md) gives the exact command for each in the
order that works.

## See also

- [Handoff runbook](./demo-handoff-runbook.md) — the category-by-category transfer,
  in order.
- [Demo environments](./demo-environments.md) — sessions, operator setup, threat
  model context.
