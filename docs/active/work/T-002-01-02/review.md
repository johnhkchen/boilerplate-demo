# Review — T-002-01-02 exemplar-api-boundary

Handoff for a human reviewer: what changed, how it was verified, and what to watch.

## What shipped

The template's one real API boundary. The static site now has a single on-demand
route, `GET /api/receipt`, that reads a server-only key and returns a freshly
HMAC-signed "receipt"; the home page fetches it after load and renders it. Every
page still ships as a static asset with no cold start — only `/api/*` runs the
Worker.

## Files created / modified

| File | Change | Why |
|---|---|---|
| `package.json` / `package-lock.json` | +devDep `@astrojs/cloudflare@^12` | enable one on-demand route (v12 = the Astro-5-compatible major; v14 needs Astro 7) |
| `astro.config.mjs` | +adapter, `platformProxy`; kept `output:'static'`; rewrote comment | hybrid render: pages prerender, one route opts out |
| `src/env.d.ts` | **new** | type `locals.runtime.env.DEMO_SIGNING_KEY` |
| `src/lib/receipt.ts` | **new** | pure Web-Crypto HMAC signing helper (framework-free) |
| `src/pages/api/receipt.ts` | **new** | `prerender=false` GET boundary + env validation |
| `src/pages/index.astro` | modified | live-boundary card + fetch script; refreshed stale lede |
| `wrangler.jsonc` | modified | `main`, `nodejs_compat`, `ASSETS` binding |
| `public/.assetsignore` | **new** | keep `_worker.js`/`_routes.json` off the public asset CDN |
| `.dev.vars.example` | **new** | committed env template (no secret) |
| `.gitignore` | modified | ignore real `.dev.vars` |

Committed in 6 incremental commits (`1ad2af1`, `453a2bd`, `1e35d34`, `7742e1c`,
`0eb621c`, `b341454`), each a self-contained step.

## Acceptance criterion — evidence

The single AC decomposes into four clauses; all verified against **both** `astro
dev` and a production build served by the **real Worker runtime** (`wrangler dev`):

1. **Live JSON from a local route** — `curl /api/receipt` → 200 signed JSON;
   `nonce`/`issuedAt` change per call (live, not a cached file).
2. **Key held only in server env** — the served signature *validates* against the
   real key and *fails* against a wrong key, proving the route consumed the secret;
   the key is read via `locals.runtime.env`, never a build constant.
3. **Key absent from client assets** — `grep -rIF "$KEY" dist/` is empty; no
   `PUBLIC_` vars; the page + its bundled script contain no key.
4. **Page static, no cold start** — `dist/index.html` is prerendered HTML;
   `dist/_routes.json` excludes `/`; the real Worker serves `GET /` as static
   `text/html`. Page-visible render confirmed in headless Chromium — the card shows
   the live `Made at` / one-time tag / signature (`page-render.png`).

Bonus (design intent, product-spec "environment validation"): a blank/missing key
yields a clean `500 boundary_misconfigured` with no value and no stack trace.

## Design decisions worth a reviewer's eye

- **Static-first invariant reconciled, not broken.** `astro.config.mjs` previously
  deferred the adapter. Product-spec explicitly calls for a Cloudflare adapter and
  "secret-safe server endpoint boundaries," and the real invariant is *page-scoped*
  ("no initial-page cold start"). Hybrid render honors it: `output` stays
  `'static'`; only `api/receipt.ts` sets `prerender=false`. The config comment now
  states this reconciled reality — please sanity-check that framing.
- **HMAC as the exemplar.** The template bundles no third-party provider, so the
  boundary self-signs a per-request payload with the server key — an honest,
  offline, deterministic stand-in for "browser → server → keyed provider." A
  browser can hold the receipt but cannot forge the signature.
- **`public/.assetsignore`** is the framework-native fix for the adapter's
  Pages-style `_worker.js/` output landing in the assets dir; it avoided touching
  the deploy scripts owned by T-001-01-02/03.

## Test coverage — and the gap

- **Verified:** the pure helper (`src/lib/receipt.ts`) was exercised for
  deterministic signing (injected `now`/`randomBytes`), verify round-trip,
  tamper→false, wrong-key→false, and key-absence-in-output; the HTTP boundary and
  page render were verified live (curl, signature validation, headless browser).
- **Gap (flag):** **no committed automated test.** The repo has no test runner
  (`package.json` has no `test` script), so the checks above were run ad hoc and
  are recorded here, not reproducible in CI. This is deliberate: `receipt.ts` was
  built pure and injectable precisely so the story's traced-operation runner
  (T-002-01-01) and ops-check (T-002-01-03) can cover it without a refactor. If a
  reviewer wants coverage landed in this ticket instead, adding a runner (e.g.
  Vitest) + a `receipt.test.ts` is ~30 lines against the existing seams.

## Open concerns / notes for downstream

- **Interfaces to keep stable:** `BOUNDARY_NAME = 'receipt'`, the `GET /api/receipt`
  path, and `makeReceipt`/`verifyReceipt` are the handles T-002-01-03's ops-check
  and T-002-01-01's runner build on. Don't rename without updating them.
- **Production secret is a deploy step, not code:** `wrangler secret put
  DEMO_SIGNING_KEY` must be run once per environment; `.dev.vars.example` documents
  it. A real Cloudflare deploy was out of scope (no account/creds in repo, per
  T-001-01-02); verification used `wrangler dev` + `--dry-run`.
- **`nodejs_compat`** was added to `wrangler.jsonc` for the adapter's runtime; the
  boundary itself uses only Web Crypto globals. Harmless but worth knowing.
- **Concurrency:** a parallel Lisa thread committed T-001-02-02 (`31a214a`,
  `5614cfd`) on this shared branch mid-session. My commits were verified to touch
  only this ticket's files (an early `git add -A` slip was caught and reverted
  before it reached history — see `progress.md`).
- **Fault modes (T-002-01-04)** intentionally NOT built here; this ticket owns only
  the healthy path. The single well-named handler is easy to wrap with a fault flag
  later.

## Bottom line

AC met and verified end to end on the real Worker runtime. The one thing a human
should consciously accept is the **no-committed-test** gap, which is by design
handed to the runner/ops-check tickets in this same story.
