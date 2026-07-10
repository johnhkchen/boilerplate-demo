# Progress — T-001-01-02 cloudflare-deploy-to-public-url

Execution log for the Implement phase. Steps map to `plan.md`.
Commit: `1d839bb — Add Cloudflare static-assets deploy config (T-001-01-02)`.

## Completed

- **Step 1 — `wrangler.jsonc`.** Created with `$schema`, `name: demo-runway`,
  `compatibility_date: "2026-07-10"`, `assets.directory: "./dist"`. **No** `main`,
  `account_id`, routes, vars, or bindings. Documenting comments explain the
  no-compute / no-secret / P6 rationale. ✓
- **Step 2 — `.gitignore`.** Appended `.wrangler/` (local wrangler state/cache),
  alongside the existing `dist/`, `node_modules/`, `.astro/`, `.DS_Store`. ✓
- **Step 3 — `package.json`.** Added `"wrangler": "^4"` to `devDependencies`
  (resolved to 4.110.0) and two scripts: `deploy` (`astro build && wrangler
  deploy`) and `deploy:dry` (`astro build && wrangler deploy --dry-run`).
  Existing scripts/metadata untouched. `devDependencies` = `{ astro, wrangler }`
  — still no UI/CSS/DB/auth/CMS package. ✓
- **Step 4 — install.** `npm install` exited 0; added 28 packages;
  `node_modules/.bin/wrangler` present (4.110.0); `package-lock.json` updated and
  committed. `node_modules/` stayed untracked. ✓
- **Step 5 — `astro.config.mjs` comment.** Replaced the stale "Cloudflare adapter
  added in T-001-01-02" forward-reference with the truth: deployed via wrangler
  static assets, **no** SSR adapter, `output: 'static'` preserved. Comment text
  only — no code change; `defineConfig({ output: 'static' })` unchanged, no
  `adapter` key. ✓
- **Step 6 — build + static assertion.** `npm run build` exited 0; produced
  `dist/index.html` **only**. Server-entry check found **no** `_worker.js`,
  `_routes.json`, or `functions/` — fully static, no adapter compute, no
  regression from -01. ✓
- **Step 7 — offline deploy validation.** `wrangler deploy --dry-run` (run with
  `CI=1`) succeeded **without any credentials**: it read 1 file from the assets
  directory `./dist`, reported `Total Upload: 0.31 KiB`, `No bindings found`, and
  `--dry-run: exiting now`, exit 0. This proves `wrangler.jsonc` parses, resolves
  `./dist`, and is a valid assets-only (no-compute) deploy — no fallback needed. ✓
- **Step 8 — secret gate.** Grep across tracked config (`wrangler.jsonc`,
  `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`) for
  `CLOUDFLARE_API_TOKEN|account_id|*secret|api[_-]?key|bearer|[a-f0-9]{32,}`. The
  only hits are the **explanatory comments** in `wrangler.jsonc` that describe the
  *absence* of secrets — no credential values, no hardcoded `account_id`. Clean. ✓
- **Step 9 — commit.** Staged only `wrangler.jsonc`, `package.json`,
  `package-lock.json`, `astro.config.mjs`, `.gitignore`. Committed on `main`. ✓

## Deviations from plan

1. **Commit scope narrowed (same discipline as -01).** Only this ticket's five
   files were staged. Deliberately excluded: `dist/`, `node_modules/`,
   `.wrangler/` (gitignored/build output), the untracked governance tree
   (`docs/`, `CLAUDE.md`, `AGENTS.md`, `SEED.md`, `.lisa*`, `.vend/`, `.codex/`),
   and — importantly — **concurrent-thread changes** that appeared in the working
   tree during this session: an unstaged modification to `src/pages/index.astro`
   and new untracked `src/layouts/` and `src/styles/`. Those belong to another
   Lisa ticket sharing the branch (rdspi Concurrency); staging them would cross a
   ticket boundary. My commit touches none of them.
2. **`deploy:dry` invoked directly (`wrangler deploy --dry-run`) for the log**
   rather than via `npm run deploy:dry`, to capture wrangler's output cleanly.
   The npm script wraps the identical command plus a fresh `astro build`; `dist/`
   was already current from Step 6, so the result is equivalent.
3. **No `--dry-run` auth fallback needed.** The plan hedged that wrangler might
   demand credentials even for a dry run; it did not — the assets-only dry run is
   fully offline. The Step 7 fallback path was therefore not exercised.

## Notes carried to Review

- **AC clause 1 (live public HTTPS URL from a fresh browser) is an owner/CI
  action, not executed in-sandbox** (design D6): no Cloudflare account/credentials
  exist here, and self-authenticating to the user's account is out of remit. Every
  in-sandbox-verifiable clause passed; the live deploy is one command
  (`npm run deploy`) for the owner and is automated by T-001-01-03.
- **Wrangler telemetry.** The first wrangler run printed a one-time anonymous-
  telemetry notice. Not a secret leak; owners who prefer can run
  `wrangler telemetry disable` (writes to global wrangler config, not the repo).
- **`npm audit`** reports 2 issues (1 low, 1 high) — the same Astro/esbuild
  advisory surface -01 already flagged (not introduced by wrangler in a way that
  affects this static path). Deferred to the Astro 5→7 upgrade ticket.
- **`name: "demo-runway"`** is the template default `*.workers.dev` label; a real
  owner may rename it — the one owner-editable field.
