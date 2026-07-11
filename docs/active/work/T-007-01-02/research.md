# Research — T-007-01-02 flag-author-couplings

## Ticket boundary

The ticket extends the transfer inventory created by T-007-01-01. Its acceptance
criterion is documentary: every one of the seven existing categories must carry an
author-coupling verdict, cited to the file, binding, or config key that proves it.
Where no author/account/zone/central-service dependency exists, the category must be
marked `portable`.

The ticket does not ask to transfer resources, rotate credentials, change runtime
behavior, or edit the ticket frontmatter. The parent story explicitly says this pass
touches no runtime code and extends the same inventory artifact:
`docs/active/work/T-007-01-01/transfer-surface-inventory.md`.

## Existing artifact shape

The inventory has seven numbered sections in story order:

1. Repo
2. Cloudflare resources
3. Domain
4. Data
5. Configuration
6. Secrets
7. Checks

Each section contains a transfer definition, a seam/citation table, and one literal
`Author coupling (T-007-01-02)` placeholder. This gives the current ticket an exact
edit point per category without changing the inventory's category map.

The inventory also establishes two deployables:

- `wrangler.jsonc:name` is the App Worker `demo-runway`, with D1, assets, version
  metadata, and the public hostname.
- `wrangler.sessions.jsonc:name` is `demo-runway-sessions`, with a container, two
  Durable Object classes/bindings, and two private hostnames.

## 1. Repo evidence

The local Git origin is `https://github.com/johnhkchen/boilerplate-demo.git`, under
the author's GitHub namespace. More importantly, the same owner-specific URL is
committed at `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`.

`src/lib/session-lifecycle.ts` validates `SESSION_REPOSITORY_URL` and `buildProvisionCommand`
builds the command
that uses it as the `origin`; `src/session-worker.ts → provisionWorkspace` runs that
command for a session. This is
therefore a runtime author coupling, not merely workstation metadata: a handed-off
session Worker would continue cloning the author's repository unless the config value
were changed.

`.github/workflows/deploy.yml` itself contains no hardcoded GitHub account or repository.
It uses `GITHUB_SHA`, a repository-local push trigger, and standard checkout. The
specific author coupling in this category is the committed clone URL, not GitHub
Actions as a mechanism.

## 2. Cloudflare resource evidence

`wrangler.jsonc:d1_databases[0].database_id` contains the concrete UUID
`c95861d4-2cfe-47c0-8a9b-c5e081779e48`. The config comment states that it is an
account-bound identifier and must be removed before provisioning in another account.

`.github/workflows/deploy.yml` supplies `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` from repository secrets to migrations and promotion. No account
ID value is committed, but the active CI deployment resolves every Wrangler operation
into whichever account the author's repository secret names.

The Worker names, Durable Object classes/migrations, container declaration, assets
binding, and version metadata binding are reproducible definitions. Their deployed
instances are account-scoped, but the most exact committed proof of current account
identity is the D1 UUID; the CI account secret is the uncommitted selection seam.

## 3. Domain evidence

`wrangler.jsonc:routes` declares `demo.b28.dev` with `custom_domain: true`.
`wrangler.sessions.jsonc:routes` declares `demo-session.b28.dev` and
`code-session.b28.dev`, also as custom domains.

`wrangler.sessions.jsonc:vars.SESSION_DOMAIN` is `b28.dev`. The session URL and host
classification functions in `src/lib/session-lifecycle.ts` derive their exact preview
and editor hosts from this value and `SESSION_SLUG`. The zone name therefore affects
both deployment and runtime routing.

The App Worker's `workers_dev` and `preview_urls` settings provide account-hosted,
zone-independent alternatives, but do not remove the three explicit author-zone
routes. The Session Worker disables both alternatives.

## 4. Data evidence

The backstage rows are read and written only through the `BACKSTAGE_DB` D1 binding in
`src/lib/backstage-store.ts`. That binding resolves to the account-bound UUID in
`wrangler.jsonc:d1_databases[0].database_id`. The schema is portable SQL, but existing
row contents remain inside that particular D1 database until exported/imported.

`src/session-worker.ts:SessionCoordinator` stores the desired session record under
`SESSION_STORAGE_KEY` in Durable Object storage. The corresponding
`wrangler.sessions.jsonc:durable_objects.bindings` and migrations instantiate that
state in the selected Cloudflare account. There is no portable data export configured
for that record.

The preservation patch returned by `down` is transient and sent to the caller; the
inventory already notes it is not persisted server-side. It does not add a central
storage coupling.

## 5. Configuration evidence

The committed non-secret session configuration contains two author-specific values:

- `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` is the author's `b28.dev` zone.
- `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` is the author's GitHub repo.

`SESSION_SLUG`, `DEMO_FAULT`, compatibility settings, binding names, type declarations,
and the `secrets.required` name lists are project-local contracts rather than author
services. Configuration as a category is nevertheless coupled because the two values
above must change for a sovereign new-owner deployment.

## 6. Secrets evidence

No secret value is committed. `wrangler.jsonc:secrets.required` declares
`DEMO_SIGNING_KEY` and `DEMO_PASSCODE`; `wrangler.sessions.jsonc:secrets.required`
declares the runtime-secret JSON plus three Cloudflare Access identifiers.

The active values live in author-controlled stores:

- `.github/workflows/deploy.yml` reads `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` from GitHub Actions secrets.
- Wrangler Worker secret bindings supply the App and Session Worker values.
- `.dev.vars` supplies local development values and is gitignored.

All listed values can be replaced. There is no non-rotatable secret in the repository.
The handoff coupling is therefore ownership of the current secret-store values and,
for Access, the account-specific team domain/audience identifiers—not an immutable
secret embedded in code.

## 7. Checks evidence

The unit suite, integration runner, leak check, ops check, and Playwright flows run
locally. `scripts/integration-check.ts` creates a temporary local config and random
signing key. `playwright.config.ts` defaults to `LOCAL_BASE_URL` and accepts
`PLAYWRIGHT_BASE_URL`; `scripts/ops-check.ts` defaults to localhost and accepts
`DEMO_BASE_URL` or `OPS_CHECK_URL`.

No check implementation calls a fleet or author-owned central service. The aggregate
`package.json:scripts.verify` runs before CI deployment credentials are used.

Some tests and documentation contain `b28.dev` fixtures, but the checks do not require
the live author zone to execute. Tests deliberately assert the current config contract;
they will need corresponding fixture changes when a later transfer ticket changes that
config, but that is repository-local maintenance rather than a central-service runtime
dependency. This category meets the ticket's `portable` condition.

## Fleet and central-service scan

The source/configuration scan found no runtime URL or client for portfolio analytics,
fleet orchestration, centralized support, or another author-operated control plane.
The session lifecycle documentation explicitly leaves fleet behavior out of the MVP.
All observed remote dependencies are the project's GitHub source and its own
Cloudflare account/zone resources.

## Constraints carried forward

- Preserve the seven-category order and the existing cited seam tables.
- Replace every `_pending_` coupling placeholder; leave none behind.
- Make each verdict distinguish the exact coupling from adjacent portable machinery.
- Cite committed file/config evidence, even when describing an out-of-band value.
- Mark Checks `portable` explicitly because no qualifying author/central coupling exists.
- State that secrets are rotatable; do not falsely characterize them as non-rotatable.
- Make no runtime, secret-store, Cloudflare, domain, or ticket-frontmatter change.
