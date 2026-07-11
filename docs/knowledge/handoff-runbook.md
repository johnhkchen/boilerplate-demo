# Handing this demo to a new owner

This runbook walks a new owner through taking full control of this demo:
repo, configuration, secrets, Cloudflare resources, domain, data, and the
demo's own checks. "Transferred" means all seven are yours — the previous
owner's accounts, zone, and credentials are off the runtime path entirely —
and the demo still passes its own checks. Follow the sections in order; the
later steps assume the earlier ones.

**One standing rule.** If a step fails, write down the exact file, key, or
command that failed (a dated note under `docs/` works) and carry on where you
can. A named failure can be fixed; a silently skipped step surfaces later as
a mystery outage.

## Before you start

You need:

- your own Cloudflare account, authenticated: `npx wrangler whoami` must show
  *your* account before anything below runs;
- authority over your own GitHub repository: `gh auth status`;
- Node and npm (`npm install` from the repo root), and Docker only if you
  intend to rebuild the session container image.

**Clean-tree rule.** Only build or deploy from a tree that contains no
previous owner's `.dev.vars`. Astro packages that file into
`dist/server/.dev.vars`, and `npm run leak:check` will (correctly) flag it.
A fresh clone is clean by construction — `.dev.vars` is gitignored and never
committed.

## 1. Repo

Make the code yours. Clone it, point it at a repository you control, push:

```sh
git clone <URL-you-received> demo && cd demo
git remote set-url origin https://github.com/YOUR-OWNER/YOUR-REPO.git
git push -u origin main
```

Verify:

- `git remote -v` lists only your remote — nothing under the previous owner;
- `git log --all --oneline -- .dev.vars` prints nothing (no secret file ever
  entered history).

## 2. Configuration

Five committed values still point at the previous owner. Edit them in one
pass, before touching Cloudflare:

| File : key | Replace |
|---|---|
| `wrangler.jsonc` : `routes[].pattern` | `demo.b28.dev` → `demo.<your-zone>` |
| `wrangler.jsonc` : `d1_databases[0].database_id` | **delete the line** — a fresh database is provisioned under your account at first deploy (the config's own comment says to remove it) |
| `wrangler.sessions.jsonc` : `routes[].pattern` (×2) | `demo-session.b28.dev`, `code-session.b28.dev` → the same names under `<your-zone>` |
| `wrangler.sessions.jsonc` : `vars.SESSION_DOMAIN` | `b28.dev` → `<your-zone>` |
| `wrangler.sessions.jsonc` : `vars.SESSION_REPOSITORY_URL` | the previous owner's GitHub URL → your repo's HTTPS URL |

Two rules the code enforces:

- **Lowercase zone.** `src/lib/session-lifecycle.ts` validates
  `SESSION_DOMAIN` as a lowercase DNS name and refuses anything else.
- **HTTPS repo URL.** `SESSION_REPOSITORY_URL` must be a credential-free
  `https://` URL; `file://` and token-embedded URLs are rejected at config
  parse time.

Keep the three hostnames one label under your zone apex (as shipped), so one
universal SSL certificate covers them. The session hostnames are *derived*
from `SESSION_DOMAIN` at runtime — the two session route patterns must match
`demo-session.<your-zone>` / `code-session.<your-zone>` exactly, or the
Worker will refuse to proxy.

Verify:

```sh
grep -rn "b28.dev\|johnhkchen" wrangler.jsonc wrangler.sessions.jsonc
```

Any remaining hit must be a narrative comment, never a `pattern`, `vars`
value, or id. Then commit the edits and preflight without deploying:

```sh
npm run deploy:dry && npm run session:validate
```

Both pass with the `database_id` line removed.

## 3. Secrets

Eight secrets across three stores. Generate fresh values in your own secret
manager — never reuse anything from the previous owner: not their
`.dev.vars`, not examples, not values seen in chat or documents.

App Worker (interactive, non-echoing prompts):

```sh
npx wrangler secret put DEMO_SIGNING_KEY --config wrangler.jsonc
npx wrangler secret put DEMO_PASSCODE --config wrangler.jsonc
```

Sessions Worker:

```sh
npx wrangler secret put SESSION_RUNTIME_SECRETS --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_TEAM_DOMAIN --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_PREVIEW_AUD --config wrangler.sessions.jsonc
npx wrangler secret put SESSION_ACCESS_EDITOR_AUD --config wrangler.sessions.jsonc
```

- `SESSION_RUNTIME_SECRETS` is a JSON object; rotate every API key inside it
  (`{}` is valid only if sessions truly need no runtime credential).
- The Access team domain and the two audience tags come from Access
  applications in *your* Zero Trust organization — create them under your
  account; do not copy the previous owner's.

GitHub Actions (deploy credentials for CI):

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo YOUR-OWNER/YOUR-REPO
gh secret set CLOUDFLARE_ACCOUNT_ID --repo YOUR-OWNER/YOUR-REPO
```

Use a token you created, scoped to this project's Workers/D1 release path;
the account id must match `npx wrangler whoami`.

For non-interactive automation, redirect a mode-0600 file into each command
(`npx wrangler secret put NAME --config wrangler.jsonc < /secure/file`).
Never pass values as arguments or via `echo`.

Verify names only — never retrieve values:

```sh
npx wrangler secret list --config wrangler.jsonc
npx wrangler secret list --config wrangler.sessions.jsonc
gh secret list --repo YOUR-OWNER/YOUR-REPO --app actions
```

Expect exactly the eight names above, in those three stores.

## 4. Cloudflare resources

Deploy both Workers under your account, from your clean tree:

```sh
npm run deploy
npx wrangler deploy --config wrangler.sessions.jsonc
```

The first deploy creates the App Worker, provisions a fresh `BACKSTAGE_DB`
D1 database (filling the `database_id` you removed), uploads assets, and
attaches the custom domain. Then apply the schema:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB --remote
```

(the committed migration is `migrations/0001_create_backstage_entries.sql`).

Verify: the deploy output names *your* account and *your* hostnames; the
Cloudflare dashboard shows both Workers, the D1 database, and the session
container/Durable Objects under your account.

## 5. Domain

Deploying attached the three custom domains you configured in step 2 to your
zone. Two things to know:

- If a hostname already carries a DNS record managed by another Cloudflare
  product, the attach refuses (API error 100117). Delete the stale record in
  your zone's DNS table and redeploy.
- One `SESSION_DOMAIN` value drives all three hosts consistently — the demo
  at `demo.<your-zone>`, the session preview and editor at the two derived
  names. There is no second place to update.

Verify: `https://demo.<your-zone>` serves the demo over TLS, and the old
hostnames under the previous owner's zone no longer point at anything you
run.

**Known gap.** `test/promote.test.mjs` asserts the shipped hostname literal
`demo.b28.dev` against the real `wrangler.jsonc`, so after re-pointing,
`npm test` fails that one test (the rest stay green). This is a stale
assertion, not a broken transfer: fix it by updating that expectation to
your hostname (or deriving it from the config) — and record it if you leave
it red.

## 6. Data

**Backstage entries (D1).** Rows do not travel with a clone. Ask the
previous owner for a scoped export, or run it with their cooperation:

```sh
npx wrangler d1 export BACKSTAGE_DB --remote \
  --table backstage_entries --no-schema --output backstage.sql
```

The `--table backstage_entries --no-schema` scoping matters: an unscoped
dump also carries `d1_migrations` bookkeeping that collides with the
migrations your own database already applied. Import into yours:

```sh
npx wrangler d1 execute BACKSTAGE_DB --remote --file backstage.sql
```

Verify: `GET https://demo.<your-zone>/api/backstage/feed` (with your
`DEMO_PASSCODE`) returns the moved rows. The access code lives in
`src/lib/backstage-store.ts` if you need to inspect what "moved" means.

**Known gap.** Live session state (the `SESSION_COORDINATOR` Durable Object
in `wrangler.sessions.jsonc`) has **no export/import path** — no wrangler
command reads Durable Object storage. It is small, desired state: start a
fresh session under your deployment instead of migrating the old record, and
note the gap if that ever stops being acceptable.

## 7. Checks

The demo judges its own transfer. From your clean tree:

```sh
npm run integration:check
```

builds and serves locally and runs the operation, healthy-flow, and leak
gates — proof the code you now own runs on its own. Then point the live
checks at your deployment:

```sh
export DEMO_SIGNING_KEY="$(</secure/path/signing-key)"
DEMO_BASE_URL=https://demo.<your-zone> npm run ops:check
DEMO_BASE_URL=https://demo.<your-zone> npm run leak:check
unset DEMO_SIGNING_KEY
PLAYWRIGHT_BASE_URL=https://demo.<your-zone> npm run test:flow:backstage
```

The signing key is read from your secret store into a short-lived
environment variable and unset immediately; nothing prints it.

All green: the transfer is complete — the demo runs entirely under your
accounts. Any red: record the failing check and the seam it names (the
standing rule above), because that is the exact edge where ownership has not
yet transferred.
