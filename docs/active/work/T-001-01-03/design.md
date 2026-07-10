# Design — T-001-01-03 deploy-on-push-to-main

Decisions grounded in `research.md`. This ticket makes every push to `main`
redeploy the static site through the existing `npm run deploy` seam, with deploy
credentials living **only as GitHub repo secrets** — never in the repo or the
browser bundle.

## Decision summary

| # | Question | Decision |
|---|----------|----------|
| D1 | CI mechanism | **Thin GitHub Actions workflow calling the repo's own `npm run deploy`** — not `cloudflare/wrangler-action` |
| D2 | Trigger | `on: push → branches: [main]` **plus** `workflow_dispatch` (manual re-run). No path filtering |
| D3 | Credentials | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as **repo secrets**, passed as step `env`; wrangler reads them automatically |
| D4 | Hardening | `permissions: contents: read`; `concurrency` group with `cancel-in-progress: true`; `npm ci`; pinned Node; action major-tag pins |
| D5 | Install/build | `actions/setup-node` (`cache: npm`) → `npm ci` → `npm run deploy` (single command = the owner seam) |
| D6 | Live run execution | **Owner action.** Author + statically validate here; setting secrets and the first green push are the owner's steps |
| D7 | Secret documentation | Required secrets documented in the workflow **header comment** + Review runbook; no new README file |

---

## D1 — CI mechanism: thin workflow calling `npm run deploy`

**Options.** (a) A thin workflow that runs the repo's existing `npm run deploy`
(`astro build && wrangler deploy`), passing credentials via `env`. (b)
`cloudflare/wrangler-action@v3` with `apiToken`/`accountId` inputs. (c) A custom
inline `npx wrangler deploy` step (bypassing the npm script).

**Chosen: (a) thin workflow over `npm run deploy`.** Grounded in research:

- **One deploy contract, no drift.** `-02` deliberately built `npm run deploy` as
  *the* deploy command — the owner runs it locally; CI runs the identical thing.
  If the deploy ever changes (extra build step, flags), it changes in one place
  (`package.json`) and both owner and CI follow. Options (b)/(c) create a *second*
  deploy path that can silently diverge from `npm run deploy`.
- **P6 sovereignty / portability.** The deploy logic stays in the repo
  (`package.json` + `wrangler.jsonc`), not inside a GitHub-specific Action. Moving
  CI hosts later (or an owner deploying by hand) needs no rewrite — the workflow
  is disposable glue. This directly honors the charter's "Cloudflare-first is
  allowed; mandatory dependence on a centrally maintained platform is not."
- **Smaller trusted surface.** wrangler is already a pinned devDependency
  (lockfile 4.110.0); reusing it needs **no new third-party Action** in the deploy
  path. `cloudflare/wrangler-action` would add a supply-chain dependency that
  installs its own wrangler, decoupled from our lockfile pin.

**Rejected: (b) `cloudflare/wrangler-action`.** Legitimate and lower-YAML, and a
reasonable fallback if we later need its niceties (e.g. `wranglerVersion`,
command batching, PR comment of the preview URL). Rejected now because it forks
the deploy contract away from `npm run deploy`, ignores our lockfile-pinned
wrangler, and welds the deploy to one CI vendor — three small cuts against the
`-02` seam and P6. Documented as the fallback if a demo outgrows the thin shape.

**Rejected: (c) inline `npx wrangler deploy`.** Same drift problem as (b) without
even the Action's ergonomics; also risks pulling an unpinned wrangler unless we
duplicate the build step. No reason to bypass the script that already exists.

## D2 — Trigger: push to main + manual dispatch, no path filter

**Options.** (a) `push` to `main` only. (b) `push` to `main` + `workflow_dispatch`.
(c) Add `paths-ignore` (e.g. skip docs-only pushes). (d) Deploy on PRs too.

**Chosen: (b) `push` to `main` + `workflow_dispatch`.**

- **`push: branches: [main]`** is the literal AC: every push to `main` redeploys.
  `main` is the single source of the live site; other branches never deploy.
- **`workflow_dispatch`** adds a zero-cost manual re-run button (Actions tab) —
  invaluable for re-deploying after rotating a secret or a transient Cloudflare
  hiccup, with no code push. It does not weaken the AC; it strengthens operability.
- **No path filtering (reject c).** The AC says a *trivial visible change*
  triggers a deploy that finishes green and is observable — path filters risk a
  push that legitimately should redeploy being skipped, and `docs/` is untracked
  here anyway (nothing to filter). Simplicity beats a premature optimization; a
  static build+deploy is seconds of CI. Revisit only if deploy minutes ever bite.
- **No PR deploys (reject d).** PR-branch CI (lint/type/Playwright) is a *separate
  story* (research boundaries). Deploying PRs would need preview environments —
  out of scope and a compute/URL-sprawl surface this ticket must not open.

## D3 — Credentials: two repo secrets, passed as env

**Options.** (a) Both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo
**secrets**. (b) Token as secret, `CLOUDFLARE_ACCOUNT_ID` as a repo **variable**
(`vars`). (c) Put `account_id` back in `wrangler.jsonc`.

**Chosen: (a) both as secrets**, surfaced to the deploy step as `env`:

```yaml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- wrangler reads both from the environment **automatically** — no `wrangler.jsonc`
  edit, no CLI flags. The `-02` config stays untouched (the modeled dependency
  edge; no lock contention).
- The AC says "deploy credentials exist **only as CI secrets**." Storing *both*
  under `secrets` gives the cleanest, most literal satisfaction of that clause and
  keeps `github.log` masking on the account id too. `account_id` is not strictly
  secret, but treating it as one costs nothing and keeps the committed tree fully
  account-agnostic (**P6**).
- Scoping the credentials to the **deploy step's** `env` (not job/workflow level)
  is least-exposure: only the one step that needs them can see them.

**Rejected: (b) account id as a `var`.** Defensible (it's not truly secret and a
`var` documents the value in the UI). Rejected only for the tidier "everything
under `secrets`" story against the AC wording; noted as a fine alternative an
owner may prefer. **Rejected: (c)** hardcoding `account_id` in `wrangler.jsonc` —
reintroduces account-binding into the committed repo, reversing `-02`'s P6 work.

## D4 — Hardening

- **`permissions: contents: read`** at workflow level. The job only checks out and
  deploys; it never writes to the repo, comments, or cuts releases. Least
  privilege shrinks the blast radius if a step or dependency misbehaves.
- **`concurrency: { group: deploy-cloudflare-main, cancel-in-progress: true }`.**
  Rapid successive pushes should converge the live site to the **tip of main**,
  not stack N full deploys. `cancel-in-progress: true` supersedes an in-flight
  run with the newer commit; Cloudflare deploys are atomic (a cancelled upload
  never half-publishes), so latest-wins is safe. This makes "observable at the
  public URL" mean *the newest* change, deterministically.
- **`npm ci`** (not `npm install`) — installs exactly the committed lockfile,
  deterministic and fast; fails loudly if `package-lock.json` drifts.
- **Pinned Node** via `actions/setup-node` `node-version: '24'` (active LTS) — a
  stable, reproducible CI runtime rather than the runner default. Owners can bump;
  a shared `.nvmrc` is a possible later refinement (noted, not done — scope).
- **Action pins** at readable major tags (`actions/checkout@v4`,
  `actions/setup-node@v4`). Full-SHA pinning is stricter supply-chain hygiene and
  is documented as an optional hardening for the security-conscious owner, but
  major tags keep the template legible and are the conventional default.

## D5 — Install / build: setup-node cache → `npm ci` → `npm run deploy`

Ordered steps, each doing one thing:

1. `actions/checkout@v4` — get the source.
2. `actions/setup-node@v4` with `node-version: '24'`, `cache: 'npm'` — pinned
   runtime + dependency cache keyed on `package-lock.json` (faster reinstalls).
3. `npm ci` — deterministic install from the lockfile.
4. `npm run deploy` — `astro build && wrangler deploy`, with the two credentials
   in step `env`. **One command = the owner's exact happy path** (D1). Build fails
   → step fails red before any deploy; deploy fails → step fails red. Green means
   the new `dist/` is live.

Rejected splitting build and deploy into two steps: it would fork the single
`npm run deploy` contract for marginally prettier logs. Keeping one command
preserves the "CI runs what the owner runs" invariant.

## D6 — Live run is an owner action; validate statically here

Research is decisive: there are **no Cloudflare credentials** in this environment,
no way to set GitHub repo secrets from here, and triggering a real deploy is an
outward-facing owner action (pushing to `main` without the secrets set would
produce a **red** run). So Implement will:

- author `.github/workflows/deploy.yml`,
- validate it with **`actionlint`** (syntax, expression, action-input checks) and
  a YAML parse,
- re-run `npm run deploy:dry` to confirm the `-02` seam the workflow calls is
  still a valid offline assets deploy,
- grep the repo to prove no credential values are committed,
- document the exact owner runbook (set two secrets → push),

and Review will state plainly that AC clauses 1–3 (**push triggers → green run →
observable URL**) execute once the owner sets the secrets and pushes — with
everything needed for it to be a single, unattended step thereafter. This mirrors
how `-02` honestly framed its live-URL clause: the sandbox structurally cannot own
a Cloudflare account or a GitHub secrets store.

## D7 — Secret documentation: workflow header comment + Review runbook

**Options.** (a) Document the two required secrets in a comment block at the top
of `deploy.yml` + the Review runbook. (b) Add a new top-level `README.md` /
`.github/README.md`. (c) A checked-in `.env.example`.

**Chosen: (a).** The workflow file is where a reader looks to understand the
deploy; a short header comment naming the two secrets and how to set them
(`gh secret set` / repo Settings → Secrets) puts the instructions exactly where
they are needed, with zero secret values. (b) is scope creep for one ticket (no
README exists yet; introducing one is its own doc decision). (c) `.env.example` is
the *agent/teammate local-dev* template from the product-spec — a different story
(local `npm run dev` needs no Cloudflare token); adding it here would be
speculative. The header comment + `review.md` runbook fully cover this ticket.

## Explicitly out of scope (deferred)

- **PR-branch CI** (lint / type-check / Playwright / PR validation) → the
  agent-workflow / testing story.
- **Automated post-deploy smoke test** of the live URL → the Playwright/testing
  story (product-spec "automated smoke path"). This ticket's green run proves the
  *deploy* succeeded, not that the rendered page is asserted-correct.
- **Preview deployments** per PR/branch → not earned; would open compute/URL
  sprawl.
- **Custom domain, any Worker `main`/SSR/binding** → Day 2 / future idea-driven
  ticket.
- **Astro 5→7 security-advisory upgrade** flagged by `-01`/`-02` → its own tooling
  ticket; unchanged by this automation.
