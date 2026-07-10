# Structure — T-001-01-03 deploy-on-push-to-main

The file-level blueprint implementing `design.md`. Not code — the shape of the
code. All paths relative to repo root.

## Files created

```
.github/workflows/deploy.yml   # GitHub Actions: on push to main → build + deploy
                               # via `npm run deploy`; credentials from repo secrets
```

That is the **only** file this ticket creates. Everything else the deploy needs
(`wrangler.jsonc`, `npm run deploy`, the lockfile) already exists from `-02`.

## Files modified

**None.** This ticket is purely additive automation over the `-02` seam:

- `wrangler.jsonc` — consumed **unchanged** (the modeled dependency edge; no lock
  contention with `-02`).
- `package.json` — `npm run deploy` already exists; no script change needed. (If
  a reviewer expected a script edit: none is required — the seam was built for
  exactly this.)
- `astro.config.mjs`, `.gitignore`, `src/` — untouched.

## Files intentionally NOT created / changed

- **No second deploy path** — no `cloudflare/wrangler-action`, no inline
  `npx wrangler deploy`. CI calls `npm run deploy` (design D1).
- **No PR-CI workflow** (`ci.yml` / `pr.yml`) — lint/type/Playwright/PR validation
  is a separate story (design out-of-scope).
- **No smoke-test workflow or step** — automated live-URL assertion is the
  testing story's job; this ticket proves the *deploy*, not page correctness.
- **No `.env` / `.env.example` / secrets file** — credentials are owner-supplied
  repo secrets, never committed (AC clause 4).
- **No new `README.md`** — required secrets are documented in the workflow header
  comment + `review.md` runbook (design D7).
- **No `wrangler.jsonc` / `package.json` edit** — the seam is already correct.

## Public interface / contract this ticket establishes

The automated deploy the team and any owner depend on:

- **Trigger:** any push to `main` (or a manual `workflow_dispatch`) runs the
  `deploy` job. `main` is the single source of the live site.
- **Behavior:** checkout → pinned Node + npm cache → `npm ci` → `npm run deploy`
  (`astro build && wrangler deploy`) with `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` from repo secrets. Green = new build is live at
  `<name>.<subdomain>.workers.dev`.
- **Owner setup contract (one-time):** set the two repo secrets, then push. No
  per-push manual step thereafter.

Keeping the workflow thin (delegating to `npm run deploy`) is the seam that keeps
the project portable: the deploy contract lives in the repo, not the CI vendor.

## File-by-file specification

### `.github/workflows/deploy.yml` (new)

Structure and required keys (exact YAML authored in Implement):

```yaml
# Header comment: what this does + the two required repo secrets and how to set
# them (gh secret set / Settings → Secrets and variables → Actions). No values.

name: Deploy to Cloudflare

on:
  push:
    branches: [main]      # every push to main redeploys (AC clause 1)
  workflow_dispatch: {}   # manual re-run button (design D2)

permissions:
  contents: read          # least privilege (design D4)

concurrency:
  group: deploy-cloudflare-main
  cancel-in-progress: true   # latest push wins; atomic CF deploy (design D4)

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - name: Build and deploy to Cloudflare
        run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Key structural guarantees, tied to the AC:

- **`on.push.branches: [main]`** → push-to-main triggers the workflow (clause 1).
- **`npm run deploy`** → `astro build && wrangler deploy` publishes the new
  `dist/`; green run + no manual step = observable at the URL (clauses 2–3).
- **`secrets.CLOUDFLARE_*` referenced, never literal** → credentials exist only
  as CI secrets, never in the repo or browser bundle (clause 4). Scoped to the
  deploy step's `env` for least exposure.
- **`permissions: contents: read`**, **`concurrency` cancel-in-progress**,
  **`npm ci`**, **pinned `node-version` + action major tags** → the D4 hardening.

### Everything else — unchanged

`wrangler.jsonc`, `package.json`, `package-lock.json`, `astro.config.mjs`,
`.gitignore`, `src/**` are read/consumed as-is. The static build and no-compute /
no-secret guarantees from `-02` carry forward untouched.

## Build / verify contract (drives the Plan phase)

In-sandbox, offline (no Cloudflare account, no GitHub secrets store):

- **`actionlint .github/workflows/deploy.yml`** → 0 issues (syntax, expressions,
  action inputs, `runs-on`, event config all valid).
- **YAML well-formedness** → the file parses as valid YAML with the expected
  top-level keys (`name`, `on`, `permissions`, `concurrency`, `jobs`).
- **Seam still valid:** `npm run deploy:dry` (`astro build && wrangler deploy
  --dry-run`) exits 0 — the exact command CI invokes builds a valid assets-only
  bundle offline (regression guard on the `-02` seam CI depends on).
- **Secret gate:** grep tracked files for credential values / hardcoded tokens →
  only `secrets.CLOUDFLARE_*` **references** and the documenting header comment;
  no literal token/account values (AC clause 4).
- **Static-build regression:** `npm run build` still emits a fully static `dist/`
  (`index.html`, no `_worker.js`/`_routes.json`/`functions/`) — automation did
  not change rendering.

Not verifiable in-sandbox (owner/CI runtime, design D6): the live green Actions
run and the observable-URL assertion.

## Change ordering

1. Create `.github/workflows/deploy.yml` (with header comment).
2. `actionlint` the file → fix until clean.
3. YAML parse sanity check.
4. `npm run build` → confirm static output unchanged (regression).
5. `npm run deploy:dry` → confirm the CI-invoked seam is valid offline.
6. Secret grep across tracked files → clean.
7. Commit (`.github/workflows/deploy.yml` only; not `dist/`, `node_modules/`,
   `.wrangler/`, `.DS_Store`, or the untracked `docs/`/governance tree).

Detailed with per-step verification in `plan.md`.

## Downstream handoff

- **Owner (one-time):** set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as
  repo secrets (`gh secret set ...` or Settings UI), then push to `main`. Every
  subsequent push redeploys with no manual step — closing story `S-001-01`.
- **Testing story (later):** may add PR-branch CI and an automated post-deploy
  smoke test of the live URL; both compose on top of this workflow without
  changing it.
- **Concurrency note:** this ticket touches only `.github/workflows/deploy.yml`,
  a brand-new path no sibling ticket writes — no lock contention on the shared
  branch.
