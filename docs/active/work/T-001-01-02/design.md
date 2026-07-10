# Design — T-001-01-02 cloudflare-deploy-to-public-url

Decisions grounded in `research.md`. This ticket makes the static `dist/` from
T-001-01-01 reachable at a public Cloudflare URL over HTTPS, delivered as edge
static assets with **no compute cold start**, from a **credential-free committed
config**.

## Decision summary

| # | Question | Decision |
|---|----------|----------|
| D1 | Deploy target | **Cloudflare Workers Static Assets** (`wrangler deploy`, assets-only Worker, `*.workers.dev`) |
| D2 | Astro adapter | **None.** No `@astrojs/cloudflare`; keep `output: 'static'`. Correct the inherited assumption. |
| D3 | Deploy tool | Add **`wrangler`** as the only new devDependency (tooling, not a framework) |
| D4 | Config file | **`wrangler.jsonc`** — `name`, `compatibility_date`, `assets.directory: ./dist`; **no `main`**, **no `account_id`**, no secrets |
| D5 | npm scripts | `deploy` (build + deploy) and `deploy:dry` (offline validation); keep -01's four scripts |
| D6 | Live deploy execution | **Owner/CI action.** Configure + validate offline here; the credentialed deploy is the owner's happy path (and -03's CI) |
| D7 | Housekeeping | Gitignore `.wrangler/`; fix the stale adapter comment in `astro.config.mjs` |

---

## D1 — Deploy target: Workers Static Assets

**Options.** (a) **Workers Static Assets** — a `wrangler.jsonc` with an `assets`
block and no `main`; `wrangler deploy` serves `dist/` from the edge on
`<name>.<subdomain>.workers.dev`. (b) **Cloudflare Pages** — `wrangler pages
deploy dist` on `<project>.pages.dev`. (c) A **third-party static host** (Netlify/
Vercel/GitHub Pages).

**Chosen: (a) Workers Static Assets.** Grounded in research:

- **No compute cold start (AC clause 2).** An assets-only Worker (no `main`)
  serves static files directly from Cloudflare's asset edge — the Worker runtime
  is never invoked for those requests. This satisfies "static assets with no
  compute cold start" by construction, not by configuration discipline.
- **Cleanest seam for -03 (rdspi Concurrency).** T-001-01-03's CI redeploys with
  a credential and one command. `wrangler deploy` reading this exact
  `wrangler.jsonc` is that command — -03 adds only the GitHub Actions wrapper and
  the API-token secret. No config rewrite between tickets; the shared file is the
  dependency edge the DAG already models.
- **Cloudflare's current recommended direction.** New static/SPA projects are
  steered to Workers Static Assets; Pages is maintenance-oriented. Building on
  the actively-recommended primitive ages better for a template meant to be
  reused across many demos.
- **P6 sovereignty.** The config is a plain, account-agnostic file any owner can
  `wrangler deploy` under their own account — clean transfer/handoff.

**Rejected: (b) Pages.** Also fully static and zero-cold-start, and a legitimate
choice. Rejected because its deploy verb (`wrangler pages deploy dist`) and Git-
integration model diverge from the `wrangler deploy` path Cloudflare now
centers, and it would hand -03 a slightly different seam than the recommended one.
Not wrong — just not the forward-looking default for a reused template. (Kept as
the documented fallback if a demo ever needs Pages-specific features.)

**Rejected: (c) third-party host.** Violates "Cloudflare-first" intent and the
spec's Cloudflare happy path, and fragments the eventual Day-2 story (Workers
bindings for auth/data). No reason to leave the platform.

## D2 — Astro adapter: none

**Options.** (a) Add `@astrojs/cloudflare` (as -01's artifacts predicted).
(b) Add no adapter; keep `output: 'static'`.

**Chosen: (b) no adapter.** Research established that `@astrojs/cloudflare` is
Astro's **server (SSR/on-demand) adapter** — it exists to run route code as
Worker compute. With `output: 'static'` and zero server routes there is nothing
for it to render. Adding it would be either:

- **inert** — a dependency that does nothing (a small N5 "framework-by-inertia"
  violation and reviewer confusion), or
- **harmful** — if it flips `output` to `server`/`hybrid`, it introduces the
  compute cold start this ticket's AC explicitly forbids.

The static `dist/` needs a **static host** (D1), not a server adapter. This ticket
therefore *corrects* the assumption threaded through T-001-01-01's design/
structure/review and the `astro.config.mjs` comment (see D7). The spec's phrase
"Cloudflare deployment adapter" is honored by the deploy *configuration*
(`wrangler.jsonc`), not by an Astro SSR adapter. When a future demo genuinely
needs SSR, adopting `@astrojs/cloudflare` + a `main` Worker is a deliberate,
idea-driven ticket — exactly the N5 bar.

**Rejected: (a).** Adds compute surface for no static-site benefit and risks the
cold-start regression the AC guards against.

## D3 — Deploy tool: `wrangler` (only new dependency)

**Options.** (a) `wrangler` as a devDependency, invoked via npm script. (b)
Rely on `npx wrangler` with no pinned dependency. (c) A global/CI-only install.

**Chosen: (a).** Pinning `wrangler` in `devDependencies` (updating the committed
`package-lock.json`) gives owner and CI a **reproducible** deploy tool version —
consistent with -01's lockfile discipline and the spec's "reproducible builds"
intent. `wrangler` is *tooling* (a deploy CLI), **not** a UI/CSS/DB/auth/CMS
product, so it does not trip the N1/N5 dependency gate — the same reasoning that
admits `astro` itself. The `$schema` reference in `wrangler.jsonc` also resolves
from the installed package for editor validation.

**Rejected: (b)** unpinned `npx` pulls a floating version — non-reproducible and
a supply-chain surprise in CI. **(c)** a global install isn't captured by the
repo, breaking the "clone → one command" contributor promise.

## D4 — Config: credential-free `wrangler.jsonc`

**Options.** (a) `wrangler.jsonc` (JSONC, comments allowed — Cloudflare's current
recommendation). (b) `wrangler.toml` (older default).

**Chosen: (a) `wrangler.jsonc`**, with exactly:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "demo-runway",
  "compatibility_date": "2026-07-10",
  "assets": { "directory": "./dist" }
}
```

Rationale, tied to the AC:

- **No `main`** → assets-only Worker → no compute in the request path (AC clause
  2).
- **No `account_id`, no tokens** → the committed config carries **no secrets**
  (AC clause 3) and stays **account-agnostic** for P6 transferability. The
  account is supplied at deploy time via `CLOUDFLARE_ACCOUNT_ID` (env) or
  interactive `wrangler login`, and the API token via env/CI secret (-03). A repo
  grep for tokens/keys stays clean by construction.
- **`assets.directory: ./dist`** points at Astro's build output — the exact
  artifact -01 produces.
- `compatibility_date` is fixed (`2026-07-10`, today) rather than computed;
  bumping it is a deliberate future edit.
- `$schema` gives editors validation without adding a runtime dependency.

**Rejected: (b) `wrangler.toml`.** Functionally equivalent, but JSONC is
Cloudflare's recommended format, allows the documenting comments this template
benefits from, and matches what -01's `structure.md` already anticipated
(`wrangler.jsonc`).

## D5 — npm scripts

Add two scripts; keep -01's `dev`/`build`/`preview`/`astro` untouched:

- `"deploy": "astro build && wrangler deploy"` — the owner/CI one-command happy
  path: build fresh, then upload `dist/`. -03's CI calls this (or `wrangler
  deploy` directly after a build step).
- `"deploy:dry": "astro build && wrangler deploy --dry-run"` — validates config +
  builds the upload bundle **without credentials or network upload**. This is the
  in-sandbox verification seam (D6) and a fast local pre-flight for contributors.

Rejected adding a `wrangler dev` script now: local static preview is already
covered by `astro preview`; a Workers dev script isn't earned until there's a
Worker.

## D6 — Live deploy is an owner/CI action; validate offline here

Research is decisive: there are **no Cloudflare credentials** in this environment
and self-authenticating to the user's account autonomously is an outward-facing
action outside this agent's remit. The spec agrees — Day-1 step 1 is the **owner**
deploying "through Cloudflare's happy path using the user's account," and -03
automates it with a **CI secret**.

So Implement will:

- add the tool + config + scripts,
- run `deploy:dry` (offline) to prove the config parses and the bundle builds,
- grep the repo to prove no secrets,
- document the exact owner happy-path command,

and Review will state plainly that **AC clause 1 (a live HTTPS URL from a fresh
browser)** is executed by the owner/CI, not in-sandbox — with everything needed
for it to be a single command. This is honest reporting, not a skipped step: the
sandbox structurally cannot own a Cloudflare account.

## D7 — Housekeeping

- **Gitignore `.wrangler/`** — wrangler's local state/cache dir; must never be
  committed (keeps deploy-ticket diffs clean, same spirit as ignoring `dist/`).
- **Fix the stale comment** in `astro.config.mjs`. It currently says "the
  Cloudflare adapter added in T-001-01-02 sits beside it" — now inaccurate per
  D2. Update it to state the deploy is via wrangler static assets with **no**
  adapter, so the file stays truthful (charter: tests/prose carry current truth;
  no misleading forward-references).

## Explicitly out of scope (deferred)

- GitHub Actions, API-token CI secret, deploy-on-push → **T-001-01-03**.
- Custom domain, `*.workers.dev` → branded host → **Day 2** (spec).
- Any Worker `main`, SSR, or binding (KV/D1/R2/DO) → a future idea-driven ticket.
- The Astro 5→7 security-advisory upgrade flagged by -01 → its own tooling ticket.
