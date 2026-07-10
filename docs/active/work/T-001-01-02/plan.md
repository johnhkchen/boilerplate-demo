# Plan — T-001-01-02 cloudflare-deploy-to-public-url

Ordered, individually verifiable steps implementing `structure.md`. Each step is
small enough to reason about; the commit is grouped so the tree is coherent.
Verification is explicit per step and consolidated against the AC at the end.

## Testing strategy

This ticket adds **no product logic** — it adds a deploy *contract*. As with
-01, the right verification is exercising that contract, not writing unit tests
(the spec's "tests carry current truth" is about logic; a deploy config's truth
is "it parses, builds a valid static bundle, and carries no secrets"):

- **Static-build regression (primary):** `npm run build` still emits a fully
  static `dist/` (no `_worker.js`/`_routes.json`/`functions/`) — proves adding
  the deploy layer did not flip rendering to compute (AC clause 2, upstream).
- **Config validity (primary):** `npm run deploy:dry` — wrangler parses
  `wrangler.jsonc`, resolves `./dist` assets, and builds the upload bundle
  **offline, without credentials** — proves the config is deploy-ready.
- **Secret gate (primary):** grep tracked files for token/key/secret patterns →
  no matches (AC clause 3).
- **No-adapter/no-compute assertion:** `wrangler.jsonc` has no `main`;
  `astro.config.mjs` has no `adapter`; `dist/` has no server entry.
- **Live-URL deploy:** an **owner/CI action** (design D6) — Playwright/HTTPS smoke
  against the public URL belongs to the owner's happy path and -03's CI, not this
  sandbox. Documented, not skipped.

## Steps

### Step 1 — Author `wrangler.jsonc`

Create `wrangler.jsonc` per structure spec: `$schema`, `name: demo-runway`,
`compatibility_date: 2026-07-10`, `assets.directory: ./dist`. **No** `main`,
`account_id`, routes, vars, or bindings. Include the documenting comments.

**Verify:** file present; valid JSONC; contains none of `main`/`account_id`/
`token`/`secret`. (No wrangler run yet.)

### Step 2 — Add `.wrangler/` to `.gitignore`

Append `.wrangler/` (before any wrangler command creates the dir).

**Verify:** `.gitignore` contains `.wrangler/` alongside `dist/`, `node_modules/`,
`.astro/`, `.DS_Store`.

### Step 3 — Add wrangler dependency + deploy scripts

Edit `package.json`: add `"wrangler": "^4"` to `devDependencies`; add `deploy`
and `deploy:dry` scripts. Leave existing scripts and metadata untouched.

**Verify:** `package.json` still valid JSON; `scripts.deploy` and
`scripts["deploy:dry"]` present; `devDependencies` now `{ astro, wrangler }` —
still no UI/CSS/DB/auth/CMS package.

### Step 4 — Install

Run `npm install`. Adds `node_modules/wrangler` (ignored) and updates
`package-lock.json` (committed).

**Verify:** install exits 0; `node_modules/.bin/wrangler` exists;
`package-lock.json` changed to include wrangler; `node_modules/` not staged.

### Step 5 — Correct the `astro.config.mjs` comment

Replace the stale "Cloudflare adapter added in T-001-01-02" forward-reference
with the truth: deployed via wrangler static assets, **no** adapter, static
preserved. **Comment text only** — no code change.

**Verify:** `defineConfig({ output: 'static' })` unchanged and no `adapter` key;
comment no longer promises an adapter.

### Step 6 — Build; assert static output unchanged

Run `npm run build`.

**Verify (regression evidence):** exit 0; `dist/index.html` present; `dist/`
contains **no** `_worker.js`, `_routes.json`, `functions/`, or SSR entry. Capture
the `dist/` listing for `review.md`.

### Step 7 — Offline deploy validation (`deploy:dry`)

Run `npm run deploy:dry` (`astro build && wrangler deploy --dry-run`).

**Verify:** wrangler reads `wrangler.jsonc` without error, reports the assets-only
(no-`main`) deploy plan, and builds the bundle **without prompting for or
requiring credentials or network upload**. Record the exact output. **Fallback:**
if wrangler still requires auth even for `--dry-run` of an assets-only deploy,
capture that behavior, validate via config parse (`wrangler.jsonc` schema) +
`wrangler deploy --help` confirmation of the flags, and note the deviation in
`progress.md` — the config correctness is still established.

### Step 8 — Secret gate + hygiene grep

Grep tracked files (`wrangler.jsonc`, `package.json`, `astro.config.mjs`, `.git`-
tracked configs) for `CLOUDFLARE_API_TOKEN`, `account_id`, `token`, `secret`,
`api[_-]?key`, and bearer-like strings.

**Verify:** no matches in committed config (AC clause 3). `.wrangler/` and `dist/`
untracked.

### Step 9 — Commit

Stage `wrangler.jsonc`, `package.json`, `package-lock.json`, `astro.config.mjs`,
`.gitignore` — **not** `dist/`, `node_modules/`, `.wrangler/`, `.DS_Store`, and
**not** the untracked `docs/`/governance tree (same scope discipline as -01's
progress deviation 1). Commit on `main` with a message describing the Cloudflare
static deploy config.

**Verify:** `git status` clean except intended tracked files; commit present;
`dist/`/`node_modules/`/`.wrangler/` untracked.

## Consolidated acceptance mapping

| Acceptance clause | Verified by | Where executed |
|---|---|---|
| Public Cloudflare URL serves the index page over HTTPS, fresh browser | `npm run deploy` (build + `wrangler deploy`) with owner/CI credentials | **Owner / T-001-01-03 CI** (design D6) |
| Delivered as static assets, no compute cold start | Assets-only Worker (no `main`); `dist/` has no server entry (Step 6); config validated (Step 7) | In-sandbox (config) + owner (runtime) |
| Committed config has no secrets; token/key grep clean | Step 8 grep; `wrangler.jsonc` account-agnostic (no `account_id`/token) | In-sandbox ✓ |
| Advances P1 | The public URL becomes reachable in one command | Owner |
| Advances P6 | Account-agnostic config; any owner deploys under their own account; clean handoff | In-sandbox (config) ✓ |

## Rollback / risk notes

- **Additive change** — rollback is deleting `wrangler.jsonc`, reverting the
  `package.json`/`.gitignore`/comment edits, and `npm install`. No -01 behavior
  regresses (the static build is unchanged).
- **Risk: `--dry-run` still wants auth.** Mitigated by the Step 7 fallback
  (config-parse validation) and honest recording; config correctness does not
  depend on a live account.
- **Risk: wrangler major (`^4`) changes assets config shape.** Mitigated by the
  committed lockfile pinning the resolved version; `compatibility_date` fixes
  runtime semantics.
- **Risk: name collision on `*.workers.dev`.** `demo-runway` is the template
  default; a real owner renames `name` in `wrangler.jsonc` at deploy — documented
  in `review.md` as the one owner-editable field.
- **Out of scope, explicitly:** live deploy credentials, CI, custom domain, any
  Worker `main`/binding — deferred per design.
