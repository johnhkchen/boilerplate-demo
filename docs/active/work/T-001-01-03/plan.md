# Plan — T-001-01-03 deploy-on-push-to-main

Ordered, individually verifiable steps implementing `structure.md`. Each step is
small enough to reason about; the commit is a single coherent addition. This
ticket adds **CI automation, no product logic** — verification exercises the
workflow contract (well-formed, calls the valid `-02` seam, carries no secrets)
rather than adding unit tests.

## Testing strategy

- **Workflow validity (primary):** `actionlint .github/workflows/deploy.yml` →
  no findings. actionlint checks YAML syntax, `on`/`jobs` structure, expression
  syntax (`${{ secrets.* }}`), action inputs, and `runs-on`. A YAML parse
  double-checks well-formedness.
- **Seam regression (primary):** `npm run deploy:dry` — the exact `astro build &&
  wrangler deploy` path CI runs, validated offline. Proves the command the
  workflow invokes still produces a valid assets-only bundle without credentials.
- **Secret gate (primary):** grep tracked files → the workflow references
  `secrets.CLOUDFLARE_*` only; no literal token/account values anywhere (AC
  clause 4). Credentials never enter the browser bundle (deploy is build-time).
- **Static-build regression:** `npm run build` still emits a fully static `dist/`
  (no `_worker.js`/`_routes.json`/`functions/`) — automation didn't change
  rendering.
- **Live green run + observable URL:** an **owner/CI action** (design D6) — needs
  the owner to set two repo secrets and push. Documented in `review.md`, not
  skipped; structurally not executable in this sandbox (no account, no secrets
  store, and triggering a real deploy is an outward-facing owner action).

## Steps

### Step 1 — Author `.github/workflows/deploy.yml`

Create the workflow per `structure.md`: header comment naming the two required
repo secrets (no values); `name`; `on.push.branches: [main]` + `workflow_dispatch`;
`permissions: contents: read`; `concurrency` group with `cancel-in-progress: true`;
one `deploy` job on `ubuntu-latest` running checkout → setup-node (`node-version:
'24'`, `cache: npm`) → `npm ci` → `npm run deploy` with `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` from `secrets` as step `env`.

**Verify:** file exists at `.github/workflows/deploy.yml`; contains
`on:`/`push:`/`branches: [main]`, `npm run deploy`, and `secrets.CLOUDFLARE_API_TOKEN`
+ `secrets.CLOUDFLARE_ACCOUNT_ID`; contains **no** literal token/account value.

### Step 2 — Lint the workflow with actionlint

Run `actionlint .github/workflows/deploy.yml`.

**Verify:** exit 0, no findings. Fix any reported issue (expression typos, unknown
action inputs, bad event keys) and re-run until clean. Capture output for
`review.md`.

### Step 3 — YAML well-formedness sanity check

Parse the file as YAML (e.g. a quick loader) to confirm structure independent of
actionlint.

**Verify:** parses without error; top-level keys present: `name`, `on`,
`permissions`, `concurrency`, `jobs`; `jobs.deploy.steps` is a non-empty list.

### Step 4 — Static-build regression

Run `npm run build`.

**Verify:** exit 0; `dist/index.html` present; `dist/` has **no** `_worker.js`,
`_routes.json`, `functions/`, or SSR entry — the automation did not flip rendering
to compute (upstream AC guard). Capture the `dist/` listing.

### Step 5 — Offline seam validation (`deploy:dry`)

Run `npm run deploy:dry` (`astro build && wrangler deploy --dry-run`).

**Verify:** wrangler reads `wrangler.jsonc`, resolves `./dist`, and builds the
upload bundle **without credentials** (assets-only, no `main`). Exit 0. This
proves the command CI invokes is valid offline — the seam is intact. Record the
output. (`--dry-run` needs no `CLOUDFLARE_*`; if a future wrangler demands auth
even for dry-run, capture that and note it — config correctness is independent.)

### Step 6 — Secret gate + hygiene grep

Grep tracked files for credential values and hardcoded secrets:
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `account_id`, bearer/long-hex,
`token`, `api[_-]?key`.

**Verify:** the only matches are the workflow's `${{ secrets.CLOUDFLARE_* }}`
**references** and the documenting header comment — **no literal credential
values** in any tracked file (AC clause 4). `wrangler.jsonc` remains
account-agnostic (unchanged from `-02`).

### Step 7 — Commit

Stage **only** `.github/workflows/deploy.yml`. Do **not** stage `dist/`,
`node_modules/`, `.wrangler/`, `.DS_Store`, or the untracked `docs/`/governance
tree (same scope discipline as `-02` progress deviation 1). Commit on `main` with
a message describing the deploy-on-push workflow and the ticket id.

**Verify:** `git status` shows the commit; only the workflow file is tracked-new;
`dist/`/`node_modules/`/`.wrangler/` remain untracked. **Do not push** — pushing
is an owner action (and would trigger a red run until secrets are set); the local
commit is the deliverable, the push is the owner runbook (`review.md`).

## Consolidated acceptance mapping

| Acceptance clause | Verified by | Where executed |
|---|---|---|
| Push to main triggers the CI workflow | `on.push.branches: [main]`; actionlint-valid (Steps 1–3) | In-sandbox (config) + owner (live trigger) |
| Workflow finishes green | `npm run deploy` is a valid build+deploy; seam proven via `deploy:dry` (Step 5); actionlint clean (Step 2) | In-sandbox (offline proof) + **owner/CI** (live run) |
| Change observable at the public URL, no manual step | `wrangler deploy` publishes fresh `dist/`; no post-push human step in the job | **Owner/CI** (design D6) |
| Credentials only as CI secrets; not in repo or bundle | `secrets.CLOUDFLARE_*` references only; secret grep clean (Step 6); deploy is build-time (never bundled) | In-sandbox ✓ |
| Advances P1 (public before deep ideation) | Live site stays current on every push with zero ceremony | Owner (after secrets set) |

## Rollback / risk notes

- **Additive change** — rollback is deleting `.github/workflows/deploy.yml`. No
  `-02` behavior regresses; the manual `npm run deploy` happy path still works.
- **Risk: first push runs red because secrets aren't set.** Expected, not a bug —
  the owner sets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` **before** the
  first push (runbook in `review.md`). A red run leaks nothing (no secret exists).
- **Risk: API token scope too narrow.** If the token lacks Workers Scripts /
  account edit permission, deploy fails clearly in the log. Runbook names the
  required token template ("Edit Cloudflare Workers").
- **Risk: `cancel-in-progress` cancels an in-flight deploy.** Safe — Cloudflare
  deploys are atomic; a cancelled upload never half-publishes, and the newer
  commit's run publishes the intended latest state.
- **Risk: Node/action version drift.** Mitigated by pinned `node-version: '24'`,
  `npm ci` against the committed lockfile, and major-tag action pins; SHA-pinning
  is the documented stricter option.
- **Out of scope, explicitly:** PR-branch CI, automated live-URL smoke test,
  preview deploys, custom domain, any Worker `main`/binding — deferred per design.
