# Transfer Surface Inventory — demo-runway

Maps each of the **seven transfer categories** (S-007-01 / E-007) to the concrete
seam it lives in inside THIS repo. Every seam is cited by file, binding, or config
key — never asserted in the abstract.

**Two deployables.** The repo ships two independent Cloudflare Workers; every
category spans both:
- **App Worker** — `wrangler.jsonc`, name `demo-runway`. Astro assets + `/api/*`,
  public at `demo.b28.dev`, owns the D1 backstage store.
- **Session Worker** — `wrangler.sessions.jsonc`, name `demo-runway-sessions`,
  `main: src/session-worker.ts`. Collaborative sandbox (container + two Durable
  Objects) behind `demo-session.b28.dev` / `code-session.b28.dev`.

**Citation legend** — `file` (whole file) · `file:key` (config key / JSON path) ·
`file → symbol` (exported binding or const).

**Honest boundary.** This artifact only MAPS the surface. It transfers nothing,
rotates nothing, and makes no Cloudflare API call (S-007-01). T-007-01-02 now flags
the per-category _author coupling_: the exact binding to the author's account, zone,
or central services. A `portable` verdict means the cited seams require none of those;
it does not claim that no configuration will ever change during a handoff.

---

## 1. Repo

_Transferring this means: the new owner clones and owns the source, its CI, and its
history — without the template's own planning history riding along._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| Source remote | `git remote origin` → `github.com/johnhkchen/boilerplate-demo.git` | The repository itself, under the author's GitHub account. |
| Clone target | `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` | Same URL, hardcoded; the Session Worker clones it at provision (`src/session-worker.ts → provisionWorkspace`). |
| CI trigger | `.github/workflows/deploy.yml` | Runs on push to `main`; promotes `$GITHUB_SHA` via `npm run promote`. |
| Template history | `docs/active/**` (epics/stories/tickets/work) | The template's own RDSPI planning trail; must NOT leak into a generated project (boundary proven by T-006-02-02). |

**Author coupling (T-007-01-02) — coupled.**
`wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` hardcodes
`https://github.com/johnhkchen/boilerplate-demo.git`, and
`src/lib/session-lifecycle.ts → buildProvisionCommand` builds the fetch command
that `src/session-worker.ts → provisionWorkspace` runs for every session. A handed-off
Session Worker left unchanged still sources the author's repository. Git and
`.github/workflows/deploy.yml` are portable mechanisms; the committed repository
identity is the coupling.

---

## 2. Cloudflare resources

_Transferring this means: standing up equivalent account-scoped resources (Workers,
D1, Durable Objects, container) under the new owner's account._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| App Worker | `wrangler.jsonc:name` → `demo-runway` | The public Astro+API Worker. |
| Session Worker | `wrangler.sessions.jsonc:name` → `demo-runway-sessions` | The sandbox runtime Worker. |
| D1 database | `wrangler.jsonc:d1_databases[0]` — binding `BACKSTAGE_DB`, `database_id: c95861d4-2cfe-47c0-8a9b-c5e081779e48` | The backstage store; header comment flags the UUID as account-bound (remove before deploying to another account). |
| Durable Objects | `wrangler.sessions.jsonc:durable_objects.bindings` — `Sandbox`, `SESSION_COORDINATOR` (`src/session-worker.ts → SessionCoordinator`) + `migrations` v1/v2 | Session execution runtime + strongly-consistent coordinator. |
| Container | `wrangler.sessions.jsonc:containers[0]` — `image: ./Dockerfile.session`, `instance_type: basic`, `max_instances: 1` | The sandbox image running Astro/Vite + code-server. |
| Static assets | `wrangler.jsonc:assets` — binding `ASSETS`, directory `./dist` | Edge-served build output. |
| Version metadata | `wrangler.jsonc:version_metadata` — binding `CF_VERSION_METADATA` | Feeds `/api/receipt` version headers read by promote/rollback. |
| Account | `CLOUDFLARE_ACCOUNT_ID` (via `.github/workflows/deploy.yml`) | The account the resources live under; supplied as a CI/GitHub secret, never committed. |

**Author coupling (T-007-01-02) — coupled.**
`wrangler.jsonc:d1_databases[0].database_id` pins `BACKSTAGE_DB` to the account-bound
UUID `c95861d4-2cfe-47c0-8a9b-c5e081779e48`; the config comment explicitly requires
removing it before another account provisions its database. In CI,
`.github/workflows/deploy.yml → secrets.CLOUDFLARE_ACCOUNT_ID` selects the account for
remote migrations and promotion. The Worker/DO/container declarations are
reproducible, but their live instances and this D1 identity reside in the selected
author-controlled account.

---

## 3. Domain

_Transferring this means: re-pointing the branded hostnames to the new owner's zone
(or accepting new ones); today they live in the author's `b28.dev` zone._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| Public host | `wrangler.jsonc:routes` → `{ pattern: "demo.b28.dev", custom_domain: true }` | Branded public face; Cloudflare owns the DNS record + edge cert. |
| Session hosts | `wrangler.sessions.jsonc:routes` → `demo-session.b28.dev`, `code-session.b28.dev` (both `custom_domain: true`) | Access-gated preview + editor surfaces. |
| Zone name | `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` → `b28.dev` (+ `SESSION_SLUG: session`) | Baked into request routing via `src/lib/session-lifecycle.ts → sessionUrls` / `classifyProxyHost`. |
| Fallback hosts | `wrangler.jsonc:workers_dev` / `preview_urls` (both `true`) | Zone-independent `*.workers.dev` health host + version preview URLs. (Session Worker sets both `false`.) |

**Author coupling (T-007-01-02) — coupled.** `wrangler.jsonc:routes` binds the App
Worker to `demo.b28.dev`; `wrangler.sessions.jsonc:routes` binds the Session Worker to
`demo-session.b28.dev` and `code-session.b28.dev`, all with `custom_domain: true`.
`wrangler.sessions.jsonc:vars.SESSION_DOMAIN` also commits `b28.dev`, consumed by
`src/lib/session-lifecycle.ts → sessionUrls` / `classifyProxyHost`. A new owner without
control of the author's zone cannot attach those routes, and unchanged runtime host
classification still expects them.

---

## 4. Data

_Transferring this means: carrying (or intentionally dropping) the content the demo
has accumulated — chiefly the stakeholder backstage feed._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| Backstage schema | `migrations/0001_create_backstage_entries.sql` — table `backstage_entries` (`id, type, url, text, submitted_at`) | The D1 table shape; `CHECK (type IN ('reference','feedback'))`. |
| Backstage access path | `src/lib/backstage-store.ts → saveEntry` / `listEntries` | The only read/write path to the feed content. |
| Session state | `src/session-worker.ts → SessionCoordinator` (`SESSION_STORAGE_KEY`) | One `SessionRecord` in Durable Object storage — desired session state. |
| Preservation patch | `src/session-worker.ts → inspectPreservation` (`SESSION_PATCH_LIMIT_BYTES`) | Transient base64/sha256-verified git patch exported on `down`; not persisted server-side. |

**Author coupling (T-007-01-02) — coupled.**
`src/lib/backstage-store.ts → saveEntry` / `listEntries` reach existing rows only
through `BACKSTAGE_DB`, whose account-scoped identity is
`wrangler.jsonc:d1_databases[0].database_id`. Session desired state lives through
`wrangler.sessions.jsonc:durable_objects.bindings → SESSION_COORDINATOR` in
`src/session-worker.ts → SessionCoordinator`. The SQL schema, storage code, and DO
class can be redeployed, but a fresh account does not thereby receive the author's D1
rows or Durable Object state. The returned preservation patch is transient and adds no
central storage dependency.

---

## 5. Configuration

_Transferring this means: reproducing the non-secret settings that shape runtime
behavior; these are committed and carry no credential._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| App vars | `wrangler.jsonc:vars.DEMO_FAULT` (`off`), `compatibility_date`, `compatibility_flags: [nodejs_compat]` | Health toggle + runtime compat. |
| Session vars | `wrangler.sessions.jsonc:vars` — `SESSION_SLUG`, `SESSION_DOMAIN`, `SESSION_REPOSITORY_URL` | Session identity, zone, and clone source. |
| Secret contract | `wrangler.jsonc:secrets.required` + `wrangler.sessions.jsonc:secrets.required` | Declares required secret NAMES only (no values) — configuration, not secrets. |
| Type/env surfaces | `.dev.vars.example`, `src/env.d.ts`, `worker-configuration.d.ts`, `worker-configuration.sessions.d.ts`, `astro.config.mjs` (`DEMO_WRANGLER_CONFIG_PATH`) | The no-secret env template + typed binding surfaces. |

**Author coupling (T-007-01-02) — coupled.**
`wrangler.sessions.jsonc:vars.SESSION_DOMAIN` commits the author's `b28.dev` zone and
`wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` commits the author's GitHub
repository. Both must change for a sovereign new-owner deployment. `DEMO_FAULT`,
compatibility settings, binding names, generated types, and the required-secret name
contracts remain reproducible project-local configuration.

---

## 6. Secrets

_Transferring this means: the new owner sets — and rotates out of the author's
control — every runtime credential. None are committed._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| App signing key | `wrangler.jsonc:secrets.required → DEMO_SIGNING_KEY` (`src/lib/receipt.ts`, `keySource: 'server-env'`) | HMAC key behind `/api/receipt`. |
| Backstage passcode | `wrangler.jsonc:secrets.required → DEMO_PASSCODE` (`src/lib/passcode.ts → PASSCODE_ENV`) | Low-stakes shared gate for the backstage. |
| Session runtime + Access | `wrangler.sessions.jsonc:secrets.required` → `SESSION_RUNTIME_SECRETS`, `SESSION_ACCESS_TEAM_DOMAIN`, `SESSION_ACCESS_PREVIEW_AUD`, `SESSION_ACCESS_EDITOR_AUD` (`src/lib/session-access.ts → parseAccessConfig`) | Container runtime secrets + Cloudflare Access team/audience identifiers. |
| CI credentials | `.github/workflows/deploy.yml` → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub repo secrets used by wrangler in CI. |
| Local dev | `.dev.vars` (gitignored; template `.dev.vars.example`) | Local values for `DEMO_SIGNING_KEY` / `DEMO_PASSCODE`. |

**Author coupling (T-007-01-02) — coupled, fully rotatable.**
`.github/workflows/deploy.yml → secrets.CLOUDFLARE_API_TOKEN` /
`secrets.CLOUDFLARE_ACCOUNT_ID` reads the current deployment authority from the
author-controlled GitHub secret store. `wrangler.jsonc:secrets.required` and
`wrangler.sessions.jsonc:secrets.required` name the Worker-held app, runtime, and
account-specific Access values; `.dev.vars.example` shows the local replacement seam
while real `.dev.vars` is gitignored. Cloning transfers none of the current values.
No committed or non-rotatable secret was found: a new owner can and must install new
values rather than inherit the author's.

---

## 7. Checks

_Transferring this means: the new owner can re-run the demo's own evidence gate and
see it pass under their account._

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| ops check | `scripts/ops-check.ts` → `src/lib/ops-check.ts` | Runs the exemplar `/api/receipt` boundary through the operation runner. |
| leak check | `scripts/leak-check.ts` → `src/lib/leak-check.ts` | Asserts `DEMO_SIGNING_KEY` never reaches client assets or a response body. |
| integration check | `scripts/integration-check.ts` → `src/lib/integration-check.ts → INTEGRATION_CHECKS` (`operation`, `flow`, `leak`) | Combined bounded gate over the three sub-checks. |
| Main flow (Playwright) | `playwright.config.ts` projects `healthy`/`stalled` (`tests/demo-flow.spec.ts`) + `backstage` (`tests/backstage-flow.spec.ts`); contract `tests/support/flow-contract.ts` | Browser-driven receipt + backstage flows. |
| Aggregate gate | `package.json:scripts.verify` = `test && typecheck && integration:check && test:flow:backstage && deploy:dry` (run verbatim by `deploy.yml`) | The one command CI runs before promoting. |
| Session gate | `package.json:scripts` → `session:validate`, `session:image:check` (`scripts/session-image-check.ts`) | Type/deploy dry-run + container image check for the Session Worker. |

**Author coupling (T-007-01-02) — portable.**
`scripts/integration-check.ts → resolveConfig` creates a local target and disposable
signing key; `playwright.config.ts → PLAYWRIGHT_BASE_URL` and
`scripts/ops-check.ts → DEMO_BASE_URL` / `OPS_CHECK_URL` make deployed targets
caller-supplied; `package.json:scripts.verify` is repo-local. No default check path
requires the author's account, `b28.dev` zone, or a fleet/central service. Tests that
spell `b28.dev` assert the current config contract and will evolve with that config;
they do not call the author's live zone.

---

## Coverage checklist

All seven categories mapped to a real file / binding / config key:

- [x] **1. Repo** — `git origin`, `SESSION_REPOSITORY_URL`, `deploy.yml`, `docs/active/**`
- [x] **2. Cloudflare resources** — `demo-runway`, `BACKSTAGE_DB`+`database_id`, DO bindings, container, `ASSETS`, `CF_VERSION_METADATA`
- [x] **3. Domain** — `demo.b28.dev`, `demo-session.b28.dev`, `code-session.b28.dev`, `SESSION_DOMAIN`
- [x] **4. Data** — `backstage_entries` migration, `backstage-store.ts`, `SessionCoordinator` storage
- [x] **5. Configuration** — `DEMO_FAULT`, session `vars`, `secrets.required` contract, env/type surfaces
- [x] **6. Secrets** — `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`, 4 session secrets, CI `CLOUDFLARE_*`, `.dev.vars`
- [x] **7. Checks** — ops/leak/integration trio, Playwright flow, `verify` aggregate, session gate

All seven coupling slots are resolved: Repo, Cloudflare resources, Domain, Data,
Configuration, and Secrets are currently coupled through the cited replaceable seams;
Checks is portable. No fleet or author-operated central-service call appears in an
individual project's runtime or evidence gate.
