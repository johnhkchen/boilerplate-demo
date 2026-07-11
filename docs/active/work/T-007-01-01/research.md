# Research — T-007-01-01 map-transfer-surface

_Descriptive pass. What the transfer surface is, where it lives, how it binds to
the author. No solutions proposed — that is Design._

## The task in one line

Story S-007-01 names **seven transfer categories** — repo, Cloudflare resources,
domain, data, configuration, secrets, checks — and asks that each be pinned to a
**concrete seam in THIS repo**, cited by file / binding name / config key, never
asserted in the abstract. E-007 exists to prove P6 sovereignty is real by
dress-rehearsing a handoff; this ticket produces the static map the rehearsal
transfers against. No runtime code is touched (story "Honest boundary").

## Two deployables, not one

The repo ships **two independent Cloudflare Workers**, each with its own wrangler
config. Every category below has to be read across both:

- **App Worker** — `wrangler.jsonc`, `name: "demo-runway"`. Astro static assets +
  `/api/*` routes. Public face at `demo.b28.dev`. Owns the D1 backstage store.
- **Session Worker** — `wrangler.sessions.jsonc`, `name: "demo-runway-sessions"`,
  `main: src/session-worker.ts`. The collaborative sandbox runtime (container +
  two Durable Objects) behind `demo-session.b28.dev` / `code-session.b28.dev`.
  Deliberately separate (see the header comment in `wrangler.sessions.jsonc`).

The split matters for the map: a handoff has to move BOTH, and some couplings
(e.g. Cloudflare Access audiences) exist only on the Session side.

## Category 1 — Repo

The git repository is the root artifact. Seams that name it:

- `git remote -v` → `origin https://github.com/johnhkchen/boilerplate-demo.git`.
- `wrangler.sessions.jsonc` var `SESSION_REPOSITORY_URL` hardcodes that same URL —
  the Session Worker clones it at provision time (`session-worker.ts`
  `provisionWorkspace` passes `config.repositoryUrl` into `buildProvisionCommand`).
- `.github/workflows/deploy.yml` runs on push to `main` and promotes `$GITHUB_SHA`.
- `docs/active/**` carries the template's own planning history (epics, stories,
  tickets, work artifacts). E-007's "template-leak boundary" (T-006-02-02) is the
  constraint that this history must NOT ride along into a generated project.

## Category 2 — Cloudflare resources

Account-scoped resources declared across the two configs:

- **Workers**: `demo-runway` (app), `demo-runway-sessions` (session).
- **D1 database**: `wrangler.jsonc` `d1_databases[0]`, binding `BACKSTAGE_DB`,
  `database_id: c95861d4-2cfe-47c0-8a9b-c5e081779e48`. The header comment flags this
  UUID as account-bound: "Remove `database_id` before deploying to a different
  account so Wrangler can provision a new database."
- **Durable Objects**: `wrangler.sessions.jsonc` `durable_objects.bindings` —
  `Sandbox` (class `Sandbox` from `@cloudflare/sandbox`) and `SESSION_COORDINATOR`
  (class `SessionCoordinator`, exported by `session-worker.ts`). SQLite-backed via
  `migrations` tags `v1`/`v2`.
- **Container**: `wrangler.sessions.jsonc` `containers[0]`, `class_name: "Sandbox"`,
  `image: "./Dockerfile.session"`, `instance_type: "basic"`, `max_instances: 1`.
- **Assets**: `wrangler.jsonc` `assets` binding `ASSETS`, directory `./dist`.
- **Version metadata**: `wrangler.jsonc` `version_metadata` binding
  `CF_VERSION_METADATA`, read by promote/rollback via `/api/receipt` headers.
- **Account itself**: `CLOUDFLARE_ACCOUNT_ID` — never in the repo; supplied as a
  GitHub Actions secret (`deploy.yml`) or local env. No account id is committed.

## Category 3 — Domain

All hostnames live in the author's **b28.dev** zone:

- `wrangler.jsonc` `routes: [{ pattern: "demo.b28.dev", custom_domain: true }]` —
  the branded public host; Cloudflare owns the DNS record + edge cert.
- `wrangler.sessions.jsonc` `routes` — `demo-session.b28.dev` (preview) and
  `code-session.b28.dev` (editor), both `custom_domain: true`.
- `wrangler.sessions.jsonc` var `SESSION_DOMAIN: "b28.dev"` and `SESSION_SLUG:
  "session"`; `session-lifecycle.ts` `sessionUrls`/`classifyProxyHost` derive the
  two session hostnames from these, so the zone name is baked into request routing.
- `wrangler.jsonc` `workers_dev: true` + `preview_urls: true` keep the
  zone-independent `*.workers.dev` health hostname and version preview URLs alive.
  (The Session Worker sets both `false` — its surface is Access-gated custom domains
  only.)

## Category 4 — Data

- **D1 content**: table `backstage_entries` (`migrations/0001_create_backstage_entries.sql`)
  — columns `id, type, url, text, submitted_at`, `CHECK (type IN ('reference',
  'feedback'))`. Written/read only through `src/lib/backstage-store.ts`
  (`saveEntry` / `listEntries`). This is the stakeholder feed — real content an owner
  would want to carry or intentionally drop.
- **Durable Object storage**: `SessionCoordinator` persists one `SessionRecord`
  under `SESSION_STORAGE_KEY` (`session-worker.ts` `record`/`storeRecord`). Desired
  session state; ephemeral, per-account DO storage.
- **Session preservation patch**: `inspectPreservation` exports an uncommitted git
  patch (base64, sha256-verified, `SESSION_PATCH_LIMIT_BYTES` cap) on `down` —
  transient, not persisted server-side.

## Category 5 — Configuration

Non-secret settings that shape runtime behavior:

- `wrangler.jsonc` `vars.DEMO_FAULT: "off"`; `compatibility_date`,
  `compatibility_flags: ["nodejs_compat"]`; `observability`.
- `wrangler.sessions.jsonc` `vars` (`SESSION_SLUG`, `SESSION_DOMAIN`,
  `SESSION_REPOSITORY_URL`); container/DO/migration blocks.
- `secrets.required` arrays in BOTH configs — these declare the runtime secret
  **contract** (names only, no values), so they are configuration, not secrets.
- Type surfaces: `src/env.d.ts`, `worker-configuration.d.ts`,
  `worker-configuration.sessions.d.ts`; `astro.config.mjs` (reads
  `DEMO_WRANGLER_CONFIG_PATH` for platformProxy); `.dev.vars.example` (template).

## Category 6 — Secrets

Never committed; set via `wrangler secret put` or CI/GitHub secrets:

- **App Worker** (`wrangler.jsonc` `secrets.required`): `DEMO_SIGNING_KEY`
  (`src/lib/receipt.ts` HMAC key, `keySource: 'server-env'`) and `DEMO_PASSCODE`
  (`src/lib/passcode.ts` `PASSCODE_ENV`, the backstage gate).
- **Session Worker** (`wrangler.sessions.jsonc` `secrets.required`):
  `SESSION_RUNTIME_SECRETS`, `SESSION_ACCESS_TEAM_DOMAIN`,
  `SESSION_ACCESS_PREVIEW_AUD`, `SESSION_ACCESS_EDITOR_AUD` — the last three parsed
  by `src/lib/session-access.ts` (`parseAccessConfig`) and bound to the author's
  Cloudflare Access team + application audiences.
- **CI**: `deploy.yml` requires repo secrets `CLOUDFLARE_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID`.
- **Local**: `.dev.vars` (gitignored); `.dev.vars.example` is the checked-in
  no-secret template.

## Category 7 — Checks

The evidence surface an owner must be able to re-run:

- **The check trio**: `ops:check` (`scripts/ops-check.ts` → `src/lib/ops-check.ts`),
  `leak:check` (`scripts/leak-check.ts` → `src/lib/leak-check.ts`), `integration:check`
  (`scripts/integration-check.ts` → `src/lib/integration-check.ts`, whose
  `INTEGRATION_CHECKS = ['operation','flow','leak']`).
- **Playwright main flow**: `playwright.config.ts` projects `healthy` / `stalled`
  (`tests/demo-flow.spec.ts`) and `backstage` (`tests/backstage-flow.spec.ts`),
  contract in `tests/support/flow-contract.ts`.
- **Aggregate gate**: `package.json` `verify` = `test && typecheck &&
  integration:check && test:flow:backstage && deploy:dry`; `deploy.yml` runs exactly
  `npm run verify` then `promote`. Session-side: `session:validate`,
  `session:image:check`.

## Assumptions & constraints

- Static read only; no Cloudflare API calls, no metered actions (story boundary).
- Coupling *analysis* (which seams bind to the author) is the SIBLING ticket
  T-007-01-02; this ticket only maps the surface. The inventory should leave a slot
  the coupling pass extends (its acceptance adds a cited coupling per category).
- The deliverable is one inventory artifact under `docs/active/work/T-007-01-01/`.
