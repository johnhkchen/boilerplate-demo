# Research — T-001-01-03 deploy-on-push-to-main

## Ticket in one line

Remove deploy friction permanently: every push to `main` redeploys the site with
no manual step, so integration and deploy errors surface against the live URL
from day zero. Advances **P1** (public before deep ideation).

Descriptive only — no solution is chosen here (that is Design's job).

## Current repository state (what this ticket builds on)

Three tickets have landed on `main` (all static-first, no compute):

```
02beaff  T-001-01-01  minimal static Astro scaffold
1d839bb  T-001-01-02  Cloudflare Workers Static Assets deploy config
805b0c9  T-001-02-01  design-token + primitive layer
```

The deploy-relevant surface, verified this session:

```
package.json      # scripts: dev/build/preview/astro, deploy, deploy:dry
                  # devDependencies: { astro ^5.13.0, wrangler ^4 } — ONLY these
package-lock.json # committed; pins wrangler 4.110.0 + astro for reproducible CI
wrangler.jsonc    # name: demo-runway; compatibility_date 2026-07-10;
                  # assets.directory ./dist; NO main, NO account_id, NO secrets
astro.config.mjs  # defineConfig({ output: 'static' }); NO adapter
.gitignore        # dist/, node_modules/, .astro/, .wrangler/, .DS_Store
src/pages/index.astro  # the one static landing route
```

Key facts:

- `npm run deploy` = `astro build && wrangler deploy`. This is the **owner happy-
  path command** T-001-01-02 established and the exact seam this ticket wires into
  CI. `npm run deploy:dry` = same with `--dry-run` (offline, no credentials).
- `wrangler deploy` reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from
  the **environment** — never from `wrangler.jsonc`. That is precisely the seam a
  CI secret plugs into.
- `dist/` is git-ignored; CI must build fresh (`npm run deploy` already does).
- **No `.github/` directory exists yet** — this ticket creates the first workflow.

## What the ticket requires (acceptance decomposed)

The single AC has these verifiable clauses:

1. **Pushing a trivial visible change to main triggers the CI workflow** — a
   `push`-to-`main` event starts an automated job.
2. **It finishes green** — the job builds and deploys successfully end to end.
3. **The change is observable at the public URL with no manual step in between** —
   the deploy publishes the new build; no human runs a command after the push.
4. **Deploy credentials exist only as CI secrets** — never in the repository, and
   never in the browser bundle.

## What the product documents require

From `docs/knowledge/charter.md`:

- **P1 — public before deep ideation.** This ticket's stated advance: keep the
  public site continuously current so broken boundaries show up against the live
  URL early, not after manual redeploys are forgotten.
- Guardrails: "**Secrets never enter browser bundles, repositories,** stakeholder
  comments, or ordinary chat." — the load-bearing constraint for clause 4.
- "**Cloudflare-first is allowed; mandatory dependence on a centrally maintained
  platform is not.**" GitHub Actions is the CI host, but the *deploy contract*
  (`npm run deploy` → wrangler) must stay portable so the project remains
  sovereign (**P6**) — a CI move must not lock deploy logic inside one CI vendor.
- "New projects initialize Vend and Lisa fresh; the template provides compatible
  seams only." The workflow ships in the template and must work for any owner's
  fork/clone without editing hardcoded identity.

From `docs/knowledge/product-spec.md`:

- *Lifecycle → Day 1, step 1:* deploy "through Cloudflare's happy path using the
  user's account." Step 3: "Share the live site... early." A push-to-deploy loop
  is what keeps that shared URL live without ceremony.
- *Day 1 complete when* the app has, among other things, "an automated smoke
  path." Note: an automated **smoke test** of the deployed surface is a distinct
  capability (Playwright/testing story), not the deploy trigger itself — see
  boundaries below.
- *Agent and teammate workflow:* "Formatting, linting, type checks, Playwright,
  and **PR validation** on a feature branch." That is **PR CI**, a sibling of but
  separate from **deploy-on-push-to-main** — this ticket is only the latter.
- *Preserve or hand off:* handoff "transfers or recreates the repository,
  Cloudflare resources... configuration." "**Secret values are rotated and
  re-entered by the recipient** rather than copied through ordinary collaboration
  channels." → CI secrets must be settable by the owner, not baked into the repo.

## The story and ticket chain (boundaries)

Story `S-001-01` — *public-url-ships-on-push* — three ordered tickets:

1. **T-001-01-01** — static scaffold. `done`.
2. **T-001-01-02** — Cloudflare deploy config + `npm run deploy` seam. `done`.
   Its `review.md` explicitly hands this ticket the plan: *"adds only
   `.github/workflows/deploy.yml` running `npm ci && npm run deploy` with
   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` as repo secrets. Clean,
   conflict-free seam — the shared config file is the modeled dependency edge."*
3. **T-001-01-03 (this)** — *deploy-on-push-to-main*. `depends_on: [T-001-01-02]`.
   The dependency edge is correct: this ticket consumes the `npm run deploy` seam
   `-02` produced and does **not** modify `wrangler.jsonc` — no lock contention.

Where the line sits:

- **In scope here:** the GitHub Actions workflow that triggers on push to `main`,
  builds, and deploys via the existing seam; documenting the two required repo
  secrets; verifying the workflow is well-formed. Story name literally is
  "public-url-**ships-on-push**" — this ticket closes that story.
- **Out of scope (other stories):** PR-branch CI (lint/type/Playwright gating);
  an automated post-deploy **smoke test** of the live surface; custom domains;
  any Worker `main`/SSR/binding. These belong to the integration-harness /
  testing / Day-2 stories, not the deploy trigger.

## CI landscape (facts, not a decision)

Two shapes for "deploy on push to Cloudflare" via GitHub Actions:

- **Thin workflow invoking the repo's own `npm run deploy`.** `actions/checkout`
  → `actions/setup-node` (with npm cache) → `npm ci` → `npm run deploy`, passing
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` from `secrets` as step `env`.
  wrangler picks the credentials up from the environment automatically. The deploy
  logic stays in `package.json` (portable to any CI); the workflow is glue.
- **`cloudflare/wrangler-action`.** Cloudflare's first-party Action wraps
  wrangler install + `wrangler deploy`, taking `apiToken`/`accountId` inputs. Less
  YAML, but pins a third-party Action and forks the deploy contract away from the
  repo's `npm run deploy` command (two ways to deploy that can drift).

Auth model is identical to `-02`: credentials are **environment-supplied**.
`CLOUDFLARE_API_TOKEN` is a genuine secret; `CLOUDFLARE_ACCOUNT_ID` is not secret
but is account-identifying — storing it as a secret (or repo variable) keeps the
committed tree account-agnostic (P6) and satisfies "credentials only as CI
secrets" cleanly.

Relevant Actions primitives: `on.push.branches`, `workflow_dispatch` (manual
re-run), `permissions` (least privilege), `concurrency` (supersede stale
deploys), `actions/setup-node` (`cache: npm`, `node-version`).

## Toolchain / environment facts (verified this session)

- Node **v26.4.0**, npm **11.17.0** locally; `wrangler` **4.110.0** installed via
  `-02`'s lockfile. `package-lock.json` present → CI can use `npm ci`.
- **`actionlint` is available** (`/opt/homebrew/bin/actionlint`) — real workflow
  validation is possible in-sandbox (syntax, expressions, action inputs).
- **`gh` 2.96.0** is available; remote is `github.com/johnhkchen/boilerplate-demo`.
- **No `CLOUDFLARE_*` secrets/credentials** in this environment; no way to set
  GitHub repo secrets or observe a live Actions run from here.

Consequence for Implement (same shape as `-02`): the workflow can be **authored
and statically validated** (actionlint, YAML parse, logic review, secret grep),
but a **live green run + observable-URL** is structurally an **owner action** —
it needs the owner to (a) set the two repo secrets and (b) push to `main`. Setting
secrets and triggering a real deploy are outward-facing owner actions this agent
should not perform autonomously (no credentials exist; pushing would trigger a
red run absent secrets). Review must report this boundary honestly.

## Constraints and assumptions surfaced

- **Secrets only as CI secrets** is an acceptance gate, not a preference: the
  workflow references `secrets.CLOUDFLARE_*` and hardcodes no token/account. A
  repo grep for credential values must stay clean (they never touch the browser
  bundle either — the deploy is a build-time server action).
- **Static-first is preserved:** CI runs `npm run deploy` (`astro build &&
  wrangler deploy`) — the same no-compute assets deploy `-02` validated. This
  ticket adds automation, not a rendering change.
- **Portability (P6):** deploy logic stays in `npm run deploy`; the workflow is
  thin glue so the project isn't welded to one CI vendor.
- **Reproducibility:** `npm ci` against the committed lockfile — deterministic CI
  installs, consistent with the lockfile discipline of `-01`/`-02`.
- **Template neutrality:** the workflow must run for any fork without editing
  identity; secrets are owner-supplied, `name` stays `demo-runway` unless changed.
- **Honesty in Review:** the live green-run/observable-URL clauses are owner/CI
  runtime steps, exactly as `-02` framed its live-URL clause.

## Open questions for Design

1. **CI mechanism:** thin workflow calling `npm run deploy`, or
   `cloudflare/wrangler-action`? Which best preserves the `-02` seam and P6
   portability?
2. **Trigger surface:** `push` to `main` only? Add `workflow_dispatch` for manual
   re-runs? Any path filtering, or deploy on every push (per the AC wording)?
3. **Credential storage:** `CLOUDFLARE_ACCOUNT_ID` as a secret or a repo variable?
   How are both surfaced to wrangler (step `env`)?
4. **Hardening:** `permissions: contents: read`? `concurrency` to supersede stale
   deploys? Pin actions to major tags or full SHAs? Node version pin?
5. **Verification depth:** how far can Implement validate offline (actionlint,
   parse, dry-run, grep), and how should Review frame the owner-run live deploy?
6. **Secret documentation:** where does the owner learn which two secrets to set
   (workflow header comment vs. a README)?
