# Review — T-001-01-02 cloudflare-deploy-to-public-url

Handoff for a human reviewer. What changed, how it was verified, and what needs
attention. Commit: `1d839bb — Add Cloudflare static-assets deploy config
(T-001-01-02)`.

## What changed

Additive deploy layer over the -01 static scaffold. One file created, four
modified; nothing deleted.

| File | Change |
|------|--------|
| `wrangler.jsonc` | **New.** Cloudflare Workers Static Assets config: `name`, `compatibility_date: 2026-07-10`, `assets.directory: ./dist`. **No `main`** (assets-only → no compute), **no `account_id`, no tokens** (account-agnostic, secret-free). |
| `package.json` | + `wrangler: ^4` devDependency (→ 4.110.0); + `deploy` and `deploy:dry` scripts. `devDependencies` = `{ astro, wrangler }`. |
| `package-lock.json` | Regenerated — pins wrangler + transitive tree for reproducible owner/CI deploys. |
| `astro.config.mjs` | **Comment only.** Corrected the stale "adapter added in -02" forward-reference to reflect the no-adapter decision. `output: 'static'` unchanged. |
| `.gitignore` | + `.wrangler/` (local wrangler state/cache). |

**Not committed (by design):** `dist/`, `node_modules/`, `.wrangler/`, the
untracked governance tree (`docs/`, `CLAUDE.md`, etc.), and **concurrent-thread
working-tree changes** (`src/pages/index.astro` modification, new `src/layouts/`
/ `src/styles/`) belonging to another Lisa ticket on the shared branch. See
`progress.md` deviation 1.

## The key decision (please sanity-check)

**No `@astrojs/cloudflare` adapter.** T-001-01-01's design/structure/review and
the old `astro.config.mjs` comment all predicted this ticket would add that
adapter. It does not — and that is deliberate:

- `@astrojs/cloudflare` is Astro's **SSR/server adapter**; it exists to run route
  code as Worker compute. A `output: 'static'` site with no server routes has
  nothing for it to render. Adding it would be inert (dead dep, N5) or, worse,
  flip rendering to `server`/`hybrid` and introduce the **compute cold start this
  ticket's AC forbids**.
- The static `dist/` is served by **Cloudflare Workers Static Assets** (an
  assets-only Worker), which needs no Astro adapter — just `wrangler.jsonc`.

If a reviewer expected the adapter from the -01 artifacts: this ticket
intentionally corrects that inherited assumption. Rationale in `design.md` D2.

## Acceptance criteria — verdict: MET (config) + one owner/CI runtime step

The AC has three clauses. Two are fully verified in-sandbox; the live-URL clause
is structurally an owner/CI action (no Cloudflare account exists here).

| Clause | Verdict | Evidence |
|--------|---------|----------|
| Public Cloudflare URL serves the index page over HTTPS, fresh browser | **Owner/CI action — ready** | Not executable in-sandbox (no account/credentials; self-auth out of remit). One command for the owner (`npm run deploy`) and automated by T-001-01-03. `*.workers.dev` is HTTPS by default. |
| Delivered as static assets, no compute cold start | **MET** | Assets-only Worker (no `main`); `dist/` has only `index.html`, no `_worker.js`/`_routes.json`/`functions/`; `wrangler deploy --dry-run` reported `No bindings found` — no compute in the request path. |
| Committed config has no secrets; token/key grep clean | **MET** | `wrangler.jsonc` has no `account_id`/token; secret grep across tracked config matched only *comments describing the absence of secrets* — no credential values. |
| Advances P6 (sovereign, transferable) | **MET** | Account-agnostic config; any owner deploys under their own account with no file edits (bar an optional `name` change). |
| Advances P1 (public before deep ideation) | **Ready** | The public URL is one owner command away; the config + tool + script seam is in place. |

## How it was verified

- **Static-build regression:** `npm run build` → exit 0, `dist/index.html` only,
  no server entry. Adding the deploy layer did not flip rendering to compute.
- **Config validity (offline, no credentials):** `wrangler deploy --dry-run` read
  1 file from `./dist`, `Total Upload: 0.31 KiB`, `No bindings found`, exit 0.
  Proves `wrangler.jsonc` parses and is a valid assets-only deploy.
- **Secret gate:** grep for token/key/`account_id`/bearer/long-hex across tracked
  config → only explanatory comments, no secrets.

## Test coverage

No unit/integration tests added — correct for this ticket: it introduces **no
product logic**, only a deploy *contract*. That contract's truth ("parses, builds
a valid static bundle, carries no secrets, serves without compute") was verified
by exercising it directly (build assertion, dry-run, secret grep), consistent
with -01's approach and the spec's "tests carry current truth [for logic]"
principle.

**Coverage gaps (intentional, owned elsewhere):**
- **No live-URL HTTPS/Playwright smoke.** Requires the owner's Cloudflare account;
  belongs to the owner happy path and to T-001-01-03's CI (which can smoke the
  deployed URL). The spec's "check the deployed surface" applies once a real
  deploy exists.
- **No CI deploy wiring** — T-001-01-03.
- **No `deploy:dry` in an automated check** — a later contributor-workflow /
  testing story could gate PRs on it.

## Open concerns / flags for human attention

1. **Live deploy is an owner action (by design, not an omission).** The single
   remaining step to satisfy AC clause 1 is the owner running, once, from a
   machine with their Cloudflare login:
   ```
   npx wrangler login          # or export CLOUDFLARE_API_TOKEN (+ _ACCOUNT_ID)
   npm run deploy              # astro build && wrangler deploy
   ```
   This publishes `https://demo-runway.<subdomain>.workers.dev`. T-001-01-03
   automates the same command with a CI token secret. **No credential was, or
   should be, handled in this ticket.**
2. **`name: "demo-runway"` is the template default** and the `*.workers.dev`
   subdomain label — the one field an owner may want to change (collision /
   branding). Flagged so it is a conscious choice, not a surprise.
3. **`wrangler ^4` caret range.** `package.json` allows 4.x bumps; the lockfile
   pins 4.110.0. Fine for a demo template; tighten only if a minor breaks the
   assets config shape.
4. **`npm audit`: 2 issues (1 low, 1 high).** Same Astro/esbuild advisory surface
   -01 flagged; not a new exposure on this static path. Handle via the deferred
   Astro 5→7 upgrade ticket, re-verifying the static-build + this deploy config
   still hold.
5. **Wrangler telemetry.** Wrangler emits anonymous usage telemetry by default
   (one-time notice on first run). Not a secret leak; owners preferring to opt out
   run `wrangler telemetry disable` (global config, not the repo).

## Downstream readiness

- **T-001-01-03 (deploy-on-push):** consumes `wrangler.jsonc` **unchanged**; adds
  only `.github/workflows/deploy.yml` running `npm ci && npm run deploy` with
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` as **repo secrets**. Clean,
  conflict-free seam — the shared config file is the modeled dependency edge.
- **Owner (Day 1):** the two commands above → live URL.
- **Concurrency note:** other working-tree changes (`src/` layouts/styles) from a
  sibling ticket were present during this session and left untouched; this commit
  is scoped strictly to the deploy config.

**Bottom line:** deploy config is complete, secret-free, and validated offline;
the static/no-compute and no-secret clauses are MET; the live-URL clause is a
single owner/CI command away by design. One decision to sanity-check (no SSR
adapter) and one non-blocking security follow-up (Astro 5→7) carried forward.
Ready to advance.
