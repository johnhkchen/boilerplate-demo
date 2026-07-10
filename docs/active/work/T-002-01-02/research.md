# Research — T-002-01-02 exemplar-api-boundary

## Ticket in one line

Give the template its one real API boundary — a server-held secret producing a
page-visible result — while the initial page stays static-served. Advances **P2**
(the demo works observably) and **P3** (room/phone safe; server keys never reach
the browser).

Descriptive only. No solution is chosen here — that is Design's job.

## What the acceptance criterion actually asks (decomposed)

The single AC packs four independently verifiable clauses:

1. **Live JSON over a local API route.** `curl` of the local route returns JSON
   produced at request time (not a prerendered file).
2. **Key held only in server-side env.** The JSON is *produced using* a key that
   lives in server-side environment only — not a client constant.
3. **Key absent from built client assets.** The key string appears nowhere in the
   browser bundle (HTML + client JS in `dist/`).
4. **Initial page stays static, no cold start.** The demo page still renders the
   response but is itself delivered as a static asset — no compute in front of the
   first byte.

Clauses 1+4 together are the load-bearing tension: a *dynamic* route must coexist
with a *static* page in the same deploy. Clause 2+3 is the secret-safety property.

## Current repository state (what this builds on)

Static-first Astro scaffold, five tickets landed (E-001). Relevant surface:

```
astro.config.mjs      # defineConfig({ output: 'static' }); NO adapter (yet)
wrangler.jsonc        # assets-only Worker: { assets: { directory: "./dist" } },
                      #   no `main` → Worker runtime never invoked
package.json          # deps: astro ^5.13 (5.18.2 installed), wrangler ^4
                      #   scripts: dev/build/preview/deploy/deploy:dry
src/pages/index.astro # the one landing page; static; inline claymorphism styles
src/layouts/BaseLayout.astro  # doc shell; imports tokens.css + base.css
src/styles/tokens.css # retheme surface; .clay-* vocabulary lives in base.css
src/styles/base.css   # clay primitives incl. `.clay-well` (inset panel)
.gitignore            # dist/, node_modules/, .astro/, .wrangler/, .DS_Store
```

`npm run build` currently emits exactly `dist/index.html` — no `_worker.js`,
no `_routes.json`. Node v26.4.0 (Web Crypto `crypto.subtle` + `getRandomValues`
available globally). `@astrojs/cloudflare` is NOT installed; registry has v14.1.2.

## The static-first invariant and where it bends

`astro.config.mjs` carries an explicit comment: static-first is "load-bearing"
(no cold start, free idle), and adopting `@astrojs/cloudflare` "would only be for
a future, idea-driven SSR need; adding it now would introduce the compute cold
start this project deliberately avoids."

That comment is a *deferral*, not a prohibition. This ticket is the need it
anticipated. The invariant that must survive is narrower than "no adapter": it is
**the initial page must be a static asset with no cold start** (charter P6; N:
"no ninety-second initial-page cold starts"). A hybrid render — pages prerendered,
one route on-demand — preserves that invariant while adding the boundary. Design
must confirm the mechanics; Research only flags that the invariant is page-scoped,
not project-scoped.

## What the product documents require (this is explicitly specced)

`docs/knowledge/product-spec.md`:

- Line 69 — "Astro foundation with a **Cloudflare deployment adapter**." The
  adapter is an intended capability, not a hazard.
- Line 79 — "**Secret-safe server endpoint boundaries with environment
  validation.**" This ticket is the first instance of that capability. Note
  "environment validation": a missing/blank key should fail cleanly, not leak.
- Line 85 — "Structured tracing … boundary timings, safe summaries, and
  redaction." That is the *runner* (sibling T-002-01-01), not this ticket, but it
  tells us the boundary should be shaped to be trace-friendly (named, timeable).
- Lines 109–110 — "One-command local development after cloning and a **checked-in
  environment-variable template containing no secrets.**" So a committed
  `*.example` env file is a first-class deliverable, and `.env`/`.dev.vars` with
  the real value must be gitignored.

`docs/knowledge/charter.md`:

- **P2 — the demo works observably.** "stalled or broken boundaries become
  explicit evidence quickly instead of an indefinite spinner." The page's fetch of
  the boundary must have visible loading / success / error states.
- **P3 — the room and phone both work safely.** "keeps every server-side key out
  of browser bundles and ordinary feedback." This is clause 3, restated as an
  invariant.

## Sibling tickets in this story (S-002-01 traced-boundary-operations)

- **T-002-01-01 traced-operation-runner** (`agent: codex`, depends T-001-01-02):
  a composable operation seam with time budget + trace record. Independent of this
  ticket's files; runs in parallel.
- **T-002-01-03 exemplar-boundary-ops-check** (depends 01-01 **and** this ticket):
  makes *this* boundary the first directly-invokable traced operation — a green
  check when the demo is healthy, non-zero within budget when the dev server is
  down. Implication: the boundary must be reachable by a simple local fetch, must
  be **named** so the check can print which boundary it hit, and must fail
  visibly rather than hang.
- **T-002-01-04 boundary-fault-modes** (depends 01-03): a fault flag with `broken`
  / `stalled` modes. Implication: it is friendly (not required by *this* AC) to
  leave the boundary's shape amenable to a later injected fault, but this ticket
  owns only the healthy path.

## Constraints and assumptions surfaced

- **C1 — hybrid, not full SSR.** Only the boundary route may be on-demand; every
  page stays prerendered. (Astro 5 folds the old `hybrid` mode into `output:
  'static'` + per-route `export const prerender = false`, which requires an
  adapter to be present.)
- **C2 — env access differs dev vs prod.** Under `@astrojs/cloudflare`, runtime
  secrets arrive at `Astro.locals.runtime.env`. Locally that is fed by wrangler's
  `.dev.vars` (via the adapter's `platformProxy`); in production by a Worker
  secret. The endpoint must read the platform env, not a build-time constant, or
  the value would be inlined (violating clause 3).
- **C3 — "local API route" = the dev server.** The AC says *local* curl. The
  natural local is `npm run dev` (astro dev) on its default port. Verification can
  live there; a real Cloudflare deploy needs credentials this repo intentionally
  does not hold (T-001-01-02), so prod deploy is out of AC scope.
- **C4 — the boundary needs a genuine secret-consuming operation.** The template
  has no bundled third-party provider to key against. Whatever operation is chosen
  must *provably* use the server key to produce output a client cannot forge,
  without depending on an external network call. (Options are Design's to weigh.)
- **C5 — page render is client-side.** Because the page is static, it cannot
  server-render the live value; it must fetch the boundary after load and inject
  the result. That script becomes client JS and must contain no secret (it won't —
  it only fetches a relative path).
- **C6 — token/primitive discipline.** Any new page markup reuses `.clay-well` and
  token vars; no literal colors/radii in `.astro`/CSS (established invariant).
- **C7 — brand voice on visitor copy.** User-global CLAUDE.md: plain kitchen-table
  English, no jargon ("endpoint", "HMAC", "API boundary") in anything a visitor
  reads. Technical terms stay in code and comments.

## Open questions carried into Design

- Which secret-consuming operation is the honest minimal exemplar (C4)?
- Exact env-access path that works in *both* astro dev and the Worker runtime (C2)
  — to be confirmed empirically in Implement, not assumed.
- Does adding the adapter change `wrangler.jsonc` (a `main` entry, `_routes.json`)
  and do the static routes stay excluded from the Worker (clause 4)?
