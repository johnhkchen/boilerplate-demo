# Review — T-001-01-03 deploy-on-push-to-main

Handoff for a human reviewer. What changed, how it was verified, and what needs
attention. Commit: `5aaf408 — Add deploy-on-push-to-main CI workflow
(T-001-01-03)`.

## What changed

One file created, nothing modified, nothing deleted. Purely additive CI
automation over the `-02` deploy seam.

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | **New.** GitHub Actions workflow: on push to `main` (and manual `workflow_dispatch`), runs `npm ci` then `npm run deploy` (`astro build && wrangler deploy`) with `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` from **repo secrets**. `permissions: contents: read`; concurrency group `cancel-in-progress: true`; pinned Node 24 + npm cache; header comment documents the two required secrets (no values). |

**Zero files modified.** `wrangler.jsonc`, `package.json`, `package-lock.json`,
`astro.config.mjs`, `.gitignore`, `src/**` are all consumed unchanged — the
`-02` seam was built for exactly this, so CI reuses `npm run deploy` verbatim.

**Not committed (by design):** `dist/`, `node_modules/`, `.wrangler/`, `.DS_Store`,
the untracked `docs/`/governance tree, and **concurrent-thread working-tree
changes** (`src/layouts/BaseLayout.astro`, `src/pages/index.astro`,
`src/styles/*.css`) belonging to a sibling Lisa ticket on the shared branch. This
commit is scoped strictly to the workflow file. See `progress.md` deviation 1.

## The key decision (please sanity-check)

**Thin workflow calling `npm run deploy`, not `cloudflare/wrangler-action`.** CI
runs the repo's own deploy command — the identical thing an owner runs locally —
so the deploy contract lives in `package.json` + `wrangler.jsonc`, not inside a
GitHub-specific Action. Rationale (design D1):

- **One deploy path, no drift.** A change to how the site deploys happens in one
  place and both owner and CI follow. A first-party Action would create a second,
  divergable deploy path that ignores our lockfile-pinned wrangler (4.110.0).
- **P6 sovereignty.** No new third-party Action in the deploy path; moving CI
  hosts or deploying by hand needs no rewrite. The workflow is disposable glue.

If a reviewer expected `wrangler-action`: it is the documented fallback (design
D1) if a demo later needs its ergonomics (e.g. PR preview-URL comments). Not
needed for a static push-to-deploy.

## Acceptance criteria — verdict: MET (config) + one owner runtime step

The AC has four clauses. The credential-safety clause is fully verified
in-sandbox; the live trigger/green-run/observable-URL clauses are structurally an
**owner action** — no Cloudflare account and no GitHub secrets store exist here,
and triggering a real deploy is outward-facing.

| Clause | Verdict | Evidence |
|--------|---------|----------|
| Push to main triggers the CI workflow | **MET (config) — Ready** | `on.push.branches: [main]`; `actionlint` exit 0; the live trigger fires once the workflow is on `origin/main` and the owner pushes. |
| Workflow finishes green | **Ready — owner/CI runtime** | `npm run deploy` is a valid build+deploy; the exact command proven offline via `deploy:dry` (assets-only, `No bindings found`, exit 0); actionlint clean. A live green run needs the owner's two secrets. |
| Change observable at the public URL, no manual step | **Ready — owner/CI runtime** | `wrangler deploy` publishes fresh `dist/`; the job has no post-push human step. Live observation needs a real account (design D6). |
| Credentials only as CI secrets; not in repo or bundle | **MET** | Workflow references `${{ secrets.CLOUDFLARE_API_TOKEN }}` / `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` only; grep found **no literal token/account value** in any tracked file; deploy is build-time so nothing reaches the browser bundle. |
| Advances P1 (public before deep ideation) | **Ready** | Once secrets are set, every push keeps the live site current with zero ceremony. |

## How it was verified (in-sandbox, offline)

- **Workflow validity:** `actionlint .github/workflows/deploy.yml` → **exit 0, no
  findings** (syntax, `${{ secrets.* }}` expressions, action inputs, event config).
  actionlint's full parse also confirms YAML well-formedness; a key-presence check
  confirmed every expected top-level key.
- **Static-build regression:** `npm run build` → exit 0, `dist/index.html` only,
  **no** `_worker.js`/`_routes.json`/`functions/`. Automation did not flip
  rendering to compute.
- **Seam regression (the command CI runs):** `npm run deploy:dry` → wrangler
  4.110.0 read 1 file from `./dist`, `Total Upload: 0.31 KiB`, `No bindings
  found`, `--dry-run: exiting now`, exit 0 — a valid assets-only deploy offline.
- **Secret gate:** grep of tracked files + the workflow for credential values →
  only `secrets.*` **references** and documenting comments; no literal secrets.

## Test coverage

No unit/integration tests added — correct for this ticket: it introduces **no
product logic**, only a CI *deploy contract*. That contract's truth ("well-formed,
calls the valid deploy seam, carries no secrets") was verified by exercising it
directly (actionlint, dry-run, build assertion, secret grep), consistent with
`-01`/`-02` and the spec's "tests carry current truth [for logic]" principle.

**Coverage gaps (intentional, owned elsewhere):**

- **No live green-run evidence.** Requires the owner's Cloudflare account + GitHub
  secrets; it is the owner's one-time setup + push (runbook below) and every
  automated push thereafter.
- **No automated post-deploy smoke test** of the live URL. The green run proves
  the *deploy* succeeded, not that the rendered page is asserted-correct. The
  product-spec's "automated smoke path" / "check the deployed surface" is the
  Playwright/testing story — it composes on top of this workflow.
- **No PR-branch CI** (lint/type/Playwright/PR validation) — a separate
  agent-workflow story.

## Open concerns / flags for human attention

1. **Owner setup is required before the first push (by design, not an omission).**
   The remaining steps to satisfy AC clauses 1–3 at runtime:
   ```
   gh secret set CLOUDFLARE_API_TOKEN     # Edit Cloudflare Workers token template
   gh secret set CLOUDFLARE_ACCOUNT_ID    # target account id
   git push origin main                   # first push → first green deploy
   ```
   Set the secrets **before** pushing the workflow, or the first run fails red
   (harmless — no secret exists to leak). Thereafter every push redeploys with no
   manual step. This publishes `https://demo-runway.<subdomain>.workers.dev`.
2. **This commit is local; it was not pushed.** Pushing is the owner action above
   (outward-facing, and premature before secrets are set). The deliverable is the
   committed workflow + the runbook.
3. **`CLOUDFLARE_ACCOUNT_ID` stored as a secret, not a `var`.** It is not strictly
   secret; storing it under `secrets` gives the cleanest "credentials only as CI
   secrets" story and log-masking. An owner who prefers a repo *variable* can move
   it to `vars.CLOUDFLARE_ACCOUNT_ID` (design D3) — a one-line change.
4. **API-token scope.** The token needs Workers Scripts edit permission for the
   account (the "Edit Cloudflare Workers" template). Too-narrow scope fails the
   deploy step with a clear log message.
5. **Action pinning at major tags.** `actions/checkout@v4` / `actions/setup-node@v4`
   are readable major-tag pins. Full-SHA pinning is stricter supply-chain hygiene
   and is the documented optional hardening (design D4); major tags are the
   conventional template default.
6. **Node 24 pin vs. local Node 26.** CI pins active-LTS Node 24 for a stable
   runtime; local dev used 26. A shared `.nvmrc` to align both is a possible later
   refinement, not required here.
7. **Astro 5→7 security advisory** (carried from `-01`/`-02`) is unchanged by this
   automation; handle in its own tooling ticket. `npm ci` in CI will pull whatever
   the lockfile pins, so that upgrade flows through here automatically once done.

## Downstream readiness

- **Owner (closes story S-001-01):** set two secrets → push → live site stays
  current on every push. The "public-url-ships-on-push" story is complete.
- **Testing story (later):** an automated live-URL smoke test and PR-branch CI
  both layer on top of this workflow without modifying it.
- **Concurrency note:** this ticket touches only `.github/workflows/deploy.yml`, a
  brand-new path no sibling ticket writes — no lock contention. Sibling `src/`
  changes present in the working tree were left untouched.

**Bottom line:** the deploy-on-push workflow is complete, actionlint-clean,
secret-free, and validated offline against the exact `npm run deploy` command it
runs; the credentials-only-as-secrets clause is MET; the live trigger / green-run
/ observable-URL clauses are one owner setup-and-push away by design. One decision
to sanity-check (thin workflow over `wrangler-action`) and the same non-blocking
Astro 5→7 follow-up carried forward. Ready to advance.
