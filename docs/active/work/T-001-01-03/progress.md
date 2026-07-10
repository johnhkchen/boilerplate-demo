# Progress — T-001-01-03 deploy-on-push-to-main

Tracks execution of `plan.md`. All steps complete; committed on `main`.

## Completed

| Step | Action | Result |
|------|--------|--------|
| 1 | Author `.github/workflows/deploy.yml` | Created — push-to-main + `workflow_dispatch` trigger, `contents: read`, concurrency (cancel-in-progress), checkout → setup-node(24, npm cache) → `npm ci` → `npm run deploy` with `secrets.CLOUDFLARE_*` as step `env`. Header comment documents the two required repo secrets. |
| 2 | `actionlint` | **Exit 0, no findings.** Workflow YAML, expressions, action inputs, and event config all valid. |
| 3 | YAML/key sanity check | All expected top-level keys present (`name`, `on`, `permissions`, `concurrency`, `jobs`, `push.branches: [main]`, `workflow_dispatch`, `npm run deploy`, both `secrets.CLOUDFLARE_*`, `cancel-in-progress: true`). actionlint's full parse also confirms well-formedness. |
| 4 | `npm run build` (static regression) | Exit 0; `dist/index.html` only; **no** `_worker.js`/`_routes.json`/`functions/`. Automation did not change rendering. |
| 5 | `npm run deploy:dry` (offline seam) | Exit 0; wrangler 4.110.0 read 1 file from `./dist`, `Total Upload: 0.31 KiB`, **`No bindings found`**, `--dry-run: exiting now`. The command CI invokes is a valid assets-only deploy offline. |
| 6 | Secret gate grep | Only matches in tracked files are `wrangler.jsonc` **comments describing the absence** of secrets. The workflow references credentials solely as `${{ secrets.CLOUDFLARE_API_TOKEN }}` / `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` — **no literal token/account value** anywhere (AC clause 4). |
| 7 | Commit | Staged **only** `.github/workflows/deploy.yml`; committed on `main`. `dist/`, `node_modules/`, `.wrangler/`, and the untracked `docs/`/governance tree left unstaged. |

## Deviations from plan

1. **Scope discipline on the shared branch (same as `-02` deviation 1).** The
   working tree contains untracked governance/tooling files (`docs/`, `CLAUDE.md`,
   `AGENTS.md`, `SEED.md`, `.codex/`, `.lisa*`, `.vend/`) and build artifacts
   (`dist/`, `.wrangler/`). The commit is scoped strictly to the one workflow
   file this ticket owns; nothing else was staged.

2. **No push (intentional).** The commit stays local. Pushing to `origin/main` is
   an **owner action**: it is outward-facing and, before the two repo secrets are
   set, the first run would fail red. The push + secret setup is the owner runbook
   in `review.md`. No credentials were handled in this session.

3. **No `package.json` edit needed.** `plan.md`/`structure.md` anticipated this:
   `npm run deploy` already existed from `-02`, so CI reuses it verbatim. Zero
   files modified — the ticket is purely the one new workflow.

## What remains (owner/CI, by design — not this agent's to execute)

- **Set two repo secrets:** `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers
  template) and `CLOUDFLARE_ACCOUNT_ID`.
- **Push to `main`** (or run the workflow manually via `workflow_dispatch`) to
  produce the first green run and the observable-URL result (AC clauses 1–3 at
  runtime). Runbook in `review.md`.
