# T-004-02-02 — versioned-promote-and-rollback — Research

Descriptive map of what exists. No solutions proposed here.

## The ticket in one line

Make promotion of the stable demo an atomic pointer-move to an immutable Workers
version (exact commit, verify-gated, recorded, hostname-verified) with instant
no-rebuild rollback — per the version-alias decision in
`docs/knowledge/demo-environments-decisions.md`.

## How the demo deploys today

- `npm run deploy` = `astro build && wrangler deploy` (package.json:26). One
  command builds `dist/` and does an implicit version-create + full deploy.
  `npm run deploy:dry` is the same with `--dry-run` and is part of the verify
  gate.
- CI (`.github/workflows/deploy.yml`) on every push to `main`: locked install →
  Playwright chromium install → `npm run verify` → `wrangler d1 migrations
  apply BACKSTAGE_DB --remote` → `npm run deploy`. Concurrency group
  `deploy-cloudflare-main` with `cancel-in-progress: true` ("latest push
  wins"). The workflow is deliberately thin glue: the deploy contract lives in
  npm scripts, not the CI vendor (charter P6, stated in the file header).
- Credentials: CI holds `CLOUDFLARE_API_TOKEN` (Workers Scripts + D1 edit — no
  DNS scope, deliberately) + `CLOUDFLARE_ACCOUNT_ID`. Locally wrangler is
  OAuth-authenticated with broad scopes (`wrangler whoami` verified).

## The verify gate

`npm run verify` = `npm test` (9 node:test suites) + `npm run typecheck`
(astro check, tsc, worker-types check) + `integration:check` +
`test:flow:backstage` (Playwright, needs installed chromium) + `deploy:dry`.
It runs against the **current working tree**, requires `node_modules` and a
Playwright browser, and takes minutes. Memory note: Playwright flows can "exit
early" locally under Claude Code agent env; CI is the reliable runner.

## Worker & domain state (verified live during research)

- Worker `demo-runway` exists; `wrangler deployments status` shows one active
  deployment at 100% on version `cd890d0f…`, **untagged, no message**.
  `wrangler versions list --json` returns id / number / metadata /
  annotations (`workers/triggered_by`: upload, secret, …) — no commit
  linkage anywhere today.
- `wrangler.jsonc` binds `demo.b28.dev` as a Workers **custom domain**
  (`routes: [{pattern, custom_domain: true}]`). The binding belongs to the
  Worker, not a version — promotion/rollback never touches DNS/certs
  (deployment.md §"Custom domain"). `workers_dev: true` and
  `preview_urls: true` are pinned explicitly — the T-004-02-01 review notes
  preview URLs were kept *for this ticket's* pre-promotion smoke tests.
- **Live blocker inherited from T-004-02-01:** `https://demo.b28.dev/`
  currently returns **530** — the one-time operator step (delete the stale
  dashboard-managed CNAME, then deploy to attach the domain) has not been
  done. Until then no end-to-end hostname verification can succeed;
  `workers.dev` remains the Worker-health probe.

## Wrangler 4.110 primitives (help output verified locally)

- `wrangler versions upload` — uploads code+config as a new version without
  deploying. Supports `--tag` (e.g. a commit sha) and `--message`; has
  `--dry-run`. Prints the new Version ID and (with `preview_urls: true`) a
  version preview URL on workers.dev.
- `wrangler versions deploy [<version-id>@<percentage>…]` — the atomic
  pointer-move. Supports `--version-id`, `--version-tag` (resolved against
  deployable versions), `--message`, `--yes` (non-interactive), `--dry-run`.
- `wrangler versions list --json`, `wrangler deployments list|status --json` —
  machine-readable history (10 most recent per invocation).
- `wrangler rollback [version-id]` — convenience wrapper that redeploys a
  prior version (interactive by default; `--message`, `--yes`).
- Wrangler can also emit machine-readable ND-JSON output entries (version id,
  preview URL) via the `WRANGLER_OUTPUT_FILE_PATH` env var — worth verifying
  during implementation as the robust alternative to scraping stdout.

## Platform facts (Cloudflare docs, fetched 2026-07-10)

- Rollback targets: "the 100 most recently published versions"; no time limit
  stated. Rollback "immediately creates a new deployment with the version
  specified" — **no rebuild**. Versions are immutable once uploaded.
- Rollback is *refused* when bindings diverge: a Durable Object migration
  between versions, or a binding to an R2/KV/queue that no longer exists.
  Resources connected to the Worker (secrets values, D1 data) are not changed
  by rollback — and **D1 schema migrations are forward-only and sit outside
  versioning entirely** ("state changes for KV, R2, DO, D1 are not tracked
  with versions"). A version rollback does not roll back the database.
- The version in the active deployment is by definition retained/served; the
  practical GC concern for the acceptance criterion is the 100-version
  rollback window and keeping the active/prior versions identifiable.
- Runtime identity: the `version_metadata` binding (wrangler.jsonc
  `"version_metadata": {"binding": "CF_VERSION_METADATA"}`) exposes
  `{id, tag, timestamp}` of the *running* version via
  `env.CF_VERSION_METADATA` — the only first-class way for a request to prove
  which version served it.

## Codebase conventions relevant to new tooling

- **Pure core + thin edge:** logic lives framework-free in `src/lib/*.ts`
  (e.g. `ops-check.ts`, `leak-check.ts`), unit-tested by
  `test/*.test.mjs` (node:test, run via `node --experimental-strip-types`);
  `scripts/*.ts` are thin edges that own env, subprocesses, stdout, and exit
  codes (pattern documented at the top of `scripts/ops-check.ts`). Exit-code
  contract there: 0 healthy · 1 failed · 2 misconfigured.
- npm scripts are the command surface (`ops:check`, `leak:check`,
  `integration:check`, …); the justfile wraps only dev/build/preview.
- `scripts/ops-check.ts` + `src/lib/ops-check.ts` already implement a traced
  boundary check against any URL (`OPS_CHECK_URL=https://demo.b28.dev/api/receipt
  npm run ops:check`) — deployment.md names this as the release check.
- The one dynamic route is `/api/receipt` (`prerender = false`); it reads
  `env.DEMO_SIGNING_KEY` via `cloudflare:workers`, supports operator-triggered
  faults, and returns a signed JSON receipt. The signature canonically covers
  `boundary:issuedAt:nonce` only (src/lib/receipt.ts). Static assets are
  served by the edge without invoking the Worker — only `/api/*` responses
  can carry runtime (version) information.
- `worker-configuration.d.ts` is generated (`npm run worker:types`); any
  wrangler.jsonc binding change must regenerate it or `worker:types:check`
  (part of typecheck/verify) fails.
- deployment.md documents the public surface as static assets + exactly three
  API routes; T-004-02-01 verified no WebSocket usage anywhere.

## Git / commit-resolution context

- Single branch `main`; Lisa agents commit incrementally to it (RDSPI
  workflow: commit serialization via file locking). Recent deploy-related
  commits `4822ec2`, `e7653de`, `4b27f28` are local and unpushed; the working
  tree also carries uncommitted E-004 board files.
- Promoting "an exact commit" (later: a session's commit, PRD `promote
  <slug>`) implies resolving a commit-ish with git and ensuring the uploaded
  artifact was built from precisely that tree — nothing in the repo does
  anything like this today. `astro build` output (`dist/`) is untracked and
  reflects whatever tree was last built.

## Constraints & assumptions surfaced

1. **Two release paths must not diverge.** CI's `wrangler deploy` creates and
   deploys untagged versions on every main push; any promotion story has to
   define its relationship to that path or a main push silently supersedes a
   promoted commit and pollutes the "prior version" record.
2. **The verify gate is heavyweight** (full install + browser). Where and when
   it runs during promote shapes the whole command.
3. **D1 migrations are outside versions.** Promoting an old commit under a
   newer schema, or rolling back the Worker without rolling back D1, are
   schema-compatibility questions the design must at least document.
4. **Hostname verification is currently impossible live** (530) until the
   T-004-02-01 operator step lands; implementation-time end-to-end proof will
   be limited to dry runs, workers.dev, and preview URLs.
5. **Secrets ride along:** versions carry config; uploaded versions inherit
   existing Worker secrets unless changed — consistent with today's deploys
   preserving `DEMO_SIGNING_KEY` / `DEMO_PASSCODE`.
6. **Template posture:** wrangler.jsonc header promises adopters a file free
   of account-specific secrets; any new binding/tooling must keep that.

## Pointers

- Decision record: docs/knowledge/demo-environments-decisions.md (Decision 3 +
  deviations table — "promotion = versions upload + versions deploy").
- Prior ticket handoff: docs/active/work/T-004-02-01/review.md (CRITICAL
  operator step; concern #4 anticipates this ticket).
- Operator guide to extend: docs/knowledge/deployment.md.
- CI to reconcile: .github/workflows/deploy.yml.
