# Research — T-001-01-02 cloudflare-deploy-to-public-url

## Ticket in one line

Make the public URL exist on Cloudflare static-first hosting — zero idle cost, no
compute cold start, independently ownable and transferable. Advances **P1**
(public before deep ideation) and **P6** (every project sovereign).

Descriptive only — no solution is chosen here (that is Design's job).

## Current repository state (what this ticket builds on)

T-001-01-01 landed a minimal, fully static Astro scaffold (commit `02beaff`).
The relevant surface:

```
package.json         # type:module, private; scripts dev/build/preview/astro;
                     # devDependencies: { astro: ^5.13.0 } — the ONLY dependency
astro.config.mjs     # defineConfig({ output: 'static' }); NO adapter
tsconfig.json        # extends astro/tsconfigs/base
.gitignore           # node_modules/, dist/, .astro/, .DS_Store
src/pages/index.astro# the one on-brand landing page (inline claymorphism)
package-lock.json    # committed; pins astro for reproducible builds
```

`npm run build` already emits a fully static `dist/` — verified present now:
`dist/index.html` is the only route, **no** `_worker.js`, `_routes.json`, or
`functions/`. That is the artifact this ticket must get onto a public URL.

## What the ticket requires (acceptance decomposed)

The single AC has three verifiable clauses:

1. **A public Cloudflare URL serves the built index page over HTTPS** from a
   fresh browser session.
2. **Delivered as static assets with no compute cold start** on first load — i.e.
   no Worker/SSR invocation sits in front of the first byte.
3. **Committed config carries no account secrets**, and a repo grep for
   tokens/keys is clean.

## What the product documents require

From `docs/knowledge/product-spec.md`:

- *Public demo* surface: "Astro foundation with a **Cloudflare deployment
  adapter**" and "**Static-first initial page** with effectively free idle
  hosting and no long compute cold start." The word "adapter" is used loosely —
  the binding requirement is *static-first, no cold start*. An Astro SSR adapter
  produces compute, so it is in tension with the static-first clause and must be
  read carefully in Design (see boundaries below).
- *Lifecycle → Day 1, step 1:* "Create the repository and **deploy the already
  functioning generic site through Cloudflare's happy path using the user's
  account.**" The deploy is explicitly an **owner action on the owner's account**.
- *Preserve or hand off:* each project is **sovereign** — "must continue to
  function without [any central] service"; handoff "transfers or recreates the
  repository, Cloudflare resources, domain, data, configuration."

From `docs/knowledge/charter.md`:

- **P6 — every project is sovereign.** "Idle hosting is effectively free; the
  project remains independently ownable, operable, and transferable **without the
  author's central services.**" This ticket's stated advance — so the Cloudflare
  config must not hardcode the template author's account or bind the repo to a
  non-transferable identity.
- **P1 — public before deep ideation.** Get a functioning public site into the
  team's hands first.
- Guardrails: "**Secrets never enter browser bundles, repositories,** stakeholder
  comments, or ordinary chat." "Cloudflare-first is allowed; **mandatory
  dependence on a centrally maintained platform is not.**" "New projects
  initialize Vend and Lisa fresh; the template provides compatible seams only."
- **N5 — not framework-by-inertia.** An SSR adapter, KV, or any compute binding
  enters only for a concrete idea-driven reason — not because a deploy tool's
  default template suggests it.

## The story and ticket chain (boundaries)

Story `S-001-01` — *public-url-ships-on-push* — three ordered tickets:

1. **T-001-01-01** — static scaffold. `phase: done`.
2. **T-001-01-02 (this)** — *cloudflare-deploy-to-public-url*. `depends_on:
   [T-001-01-01]`. Make the public Cloudflare URL exist; page delivered as
   **static assets, no compute cold start**; committed config carries **no
   secrets**.
3. **T-001-01-03** — *deploy-on-push-to-main*. `depends_on: [T-001-01-02]`. CI
   redeploys on every push to main; "deploy credentials exist **only as CI
   secrets** — never in the repository or the browser bundle."

Where the line sits:

- **In scope here:** the committed Cloudflare deploy configuration (whatever file
  wrangler/Pages reads), any deploy-tool dependency + npm script, and getting/
  validating the public URL as far as credentials allow. The config this ticket
  writes is the **same file T-001-01-03's CI will invoke** (`wrangler deploy` or
  equivalent) — so it must be a clean, credential-free seam.
- **Out of scope (T-001-01-03):** the GitHub Actions workflow, storing the API
  token as a CI secret, and deploy-on-push automation.
- **Explicitly not this ticket:** SSR/on-demand rendering, KV/D1/R2/Durable
  Objects, custom domains (Day 2 per spec), or any compute binding.

Per rdspi "Concurrency": -03 depends on -02 precisely because they share the
deploy config file — a correct dependency edge, so no lock contention expected.

## A correction the chain inherited from T-001-01-01

T-001-01-01's `design.md` (D-table), `structure.md`, `review.md`, and the comment
in `astro.config.mjs` all **predict that this ticket adds `@astrojs/cloudflare`**
(the SSR adapter) beside `output: 'static'`. That prediction is worth
re-examining rather than following by inertia:

- `@astrojs/cloudflare` is Astro's **server (SSR/on-demand) adapter**. It exists
  to run route code as Cloudflare Worker compute. A site built with
  `output: 'static'` and no server routes has **nothing for the adapter to do**.
- Adding it would either be inert (dead dependency — N5 violation) or, if it
  flips `output` to `server`/`hybrid`, introduce the exact compute cold-start
  this ticket's AC forbids.

So Design must decide the deploy **target** (how `dist/` reaches Cloudflare)
independently of the adapter assumption. The static `dist/` needs a static host,
not a server adapter. This is a constraint to resolve explicitly, not a settled
choice.

## Cloudflare static-hosting landscape (facts, not a decision)

Two first-party ways to serve a static `dist/` on Cloudflare, both HTTPS-by-
default on a free `*.workers.dev` / `*.pages.dev` subdomain:

- **Workers Static Assets** — `wrangler.jsonc`/`wrangler.toml` with an `assets`
  block pointing at a build directory and **no `main`** Worker entry. `wrangler
  deploy` uploads the directory; static files are served from Cloudflare's edge
  **without invoking a Worker** (no compute for asset requests). This is
  Cloudflare's currently recommended direction for new static/SPA projects, and
  it is the target `wrangler deploy` (which -03's CI would call) drives.
- **Cloudflare Pages** — `wrangler pages deploy dist` (or Git integration).
  Classic static host on `*.pages.dev`. Fully static, no cold start. Pages is now
  in maintenance-oriented status; Cloudflare steers new projects to Workers
  Static Assets.

Auth for a real deploy is out-of-band: `wrangler` uses interactive OAuth
(`wrangler login`) or a `CLOUDFLARE_API_TOKEN` (+ optional
`CLOUDFLARE_ACCOUNT_ID`) environment variable — **never a value committed to the
repo.** `account_id` is not strictly a secret, but hardcoding it binds the repo
to one account, cutting against P6 sovereignty/transferability.

## Toolchain / environment facts (verified this session)

- Node **v26.4.0**, npm **11.17.0** — comfortably above wrangler's minimum.
- **No wrangler** installed (global or local) — a deploy tool must be added.
- **No Cloudflare credentials** in this environment: no `CLOUDFLARE_*` env vars,
  no `wrangler` OAuth/account state on disk (only an unrelated skills cache).
- `dist/index.html` is present (built by -01).

Consequence for Implement: an actual authenticated `wrangler deploy` to a live
URL **cannot be performed in this sandbox** — there is no account to deploy to,
and self-authenticating to the user's Cloudflare account autonomously is an
outward-facing action that is not this agent's to take. Per spec Day-1 step 1,
the credentialed deploy is the **owner's** happy-path action (and -03 automates
it with a CI secret). What *can* be done and verified here: add the deploy tool,
author the credential-free config, and validate it offline (config parse +
`wrangler deploy --dry-run`, which builds the upload bundle without auth).

## Constraints and assumptions surfaced

- **Static-first is load-bearing**, re-asserted by this AC. The deploy path must
  serve `dist/` as edge assets with no Worker in the request path for the first
  byte.
- **No secrets in the repo** is an acceptance gate, not a preference. The
  committed config holds `name`/`compatibility_date`/`assets` only; tokens live
  in the environment (owner) or CI secrets (-03).
- **Sovereignty (P6):** prefer config that any owner can `wrangler deploy` under
  their own account without editing hardcoded IDs — supports clean handoff.
- **Deploy tool is "tooling," not a framework.** Adding `wrangler` does not
  violate N1/N5 (it is not a UI/CSS/DB/auth/CMS product); it is the deploy CLI.
- **Reproducibility:** any new dependency updates `package-lock.json` (committed),
  consistent with -01's practice.
- **Live-URL evidence** depends on owner credentials; the ticket must be honest
  in Review about which clauses are verifiable in-sandbox vs. owner/CI actions.

## Open questions for Design

1. **Deploy target:** Workers Static Assets (`wrangler deploy`, `*.workers.dev`)
   vs. Cloudflare Pages (`wrangler pages deploy`, `*.pages.dev`)? Which best fits
   P6 sovereignty and hands the cleanest seam to -03's CI?
2. **Adapter:** confirm **no** `@astrojs/cloudflare` adapter (static needs no
   server adapter), and correct the inherited assumption + the stale comment in
   `astro.config.mjs`?
3. **Config format & fields:** `wrangler.jsonc` vs `wrangler.toml`; include
   `account_id` or keep it out for portability; what `compatibility_date`?
4. **Scripts:** what npm scripts (`deploy`, dry-run) give owner + -03 CI a stable
   one-command seam?
5. **Verification depth:** how far can Implement validate without credentials, and
   how should Review frame the owner/CI live-deploy step?
