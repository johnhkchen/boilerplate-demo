# Design — T-002-01-02 exemplar-api-boundary

Grounded in Research. Two decisions to make: (A) how a dynamic route coexists with
static pages, and (B) what the secret-consuming operation is.

---

## Decision A — rendering topology

**Chosen: hybrid via `@astrojs/cloudflare` with `output: 'static'` + one route
opting out of prerender (`export const prerender = false`).**

Astro 5 collapsed the old `hybrid` mode into `output: 'static'`: pages prerender
by default, and any single route can opt into on-demand rendering with
`prerender = false` — *provided an adapter is installed*. Building then emits the
static pages as files plus a `dist/_worker.js/` and a `dist/_routes.json` whose
`exclude` list names every prerendered path. Cloudflare serves excluded paths
(incl. `/`) straight from static assets; only `/api/*` invokes the Worker. This
satisfies clause 4 (page static, no cold start) *and* clause 1 (live route) in one
deploy.

### Options considered

| Option | Route is live? | Page stays static? | Verdict |
|---|---|---|---|
| **A1. Stay fully static** | ✗ | ✓ | Rejected — no way to hold a server secret at all; fails clauses 1–2. |
| **A2. Full SSR (`output: 'server'`)** | ✓ | ✗ (pages become on-demand) | Rejected — reintroduces the cold start the charter forbids for the initial page; over-broad. |
| **A3. Hybrid: static pages + one `prerender=false` route** | ✓ | ✓ | **Chosen.** Exactly the scope the AC describes. |
| **A4. Separate standalone Worker (own wrangler project) for the API** | ✓ | ✓ | Rejected — splits the repo into two deploy units, breaks "one-command" dev, and duplicates config for one route. Revisit only if the API grows its own lifecycle. |

### Why A3 over the astro.config deferral

The config comment deferred the adapter to "a future, idea-driven SSR need."
Research (product-spec L69, L79) shows the adapter and "secret-safe server endpoint
boundaries" are *specced capabilities*, and this ticket is that need. A3 honors the
real invariant — **the initial page is a static asset with no cold start** — which
is page-scoped, not project-scoped. The config comment gets rewritten to state the
reconciled reality rather than deleted.

### Adapter configuration

- `adapter: cloudflare({ platformProxy: { enabled: true } })`. `platformProxy`
  makes `astro dev` load wrangler's `.dev.vars` and expose them at
  `Astro.locals.runtime.env` — so the *same* env-access code path works in dev and
  in the deployed Worker (Research C2). Without it, `locals.runtime` is undefined
  under `astro dev` and the boundary can't read its key locally.
- `output` stays `'static'` (Astro 5 default) — explicit, to keep the intent
  legible and keep every page prerendered unless it says otherwise.

---

## Decision B — the secret-consuming operation

**Chosen: HMAC-SHA256 sign a fresh, per-request payload with a server-only key,
using Web Crypto (`crypto.subtle`). Return the payload + signature; never the key.**

The template bundles no third-party provider to key against (Research C4), so the
exemplar must be self-contained yet *genuinely* prove the server used a secret the
client never sees. HMAC does exactly that: the browser receives a signature it
could not have produced without the key, and the key stays in env. It is the
honest, minimal stand-in for "browser → server → keyed provider," and it is
deterministic and offline (no flaky external dependency in a template).

### Options considered

| Option | Proves key used server-side? | Self-contained? | Verdict |
|---|---|---|---|
| **B1. Echo a transformed constant** (e.g. return `key.length`) | weakly / leak-prone | ✓ | Rejected — invites leaking key-derived info and proves little. |
| **B2. Call a real external keyed API** | ✓ | ✗ | Rejected — a template must not hard-depend on one sponsor API with live credentials (product-spec frames providers as *variable* per project). |
| **B3. HMAC-sign a per-request payload with the key** | ✓ (unforgeable signature) | ✓ | **Chosen.** Real crypto, offline, deterministic given inputs, trace-friendly. |
| **B4. Symmetric-encrypt a payload** | ✓ | ✓ | Rejected — heavier, and a decryptable blob tempts round-tripping the key to the client; HMAC is the lighter honest primitive. |

### Boundary contract (the exemplar's public shape)

Route: **`GET /api/receipt`** — a "signed receipt" from the server. ("receipt" is
plain, grab-able, and reads on the page without jargon; the URL is not
visitor-facing copy.)

Success `200` JSON:
```jsonc
{
  "boundary": "receipt",           // stable name — sibling ops-check prints this
  "issuedAt": "2026-07-10T12:00:00.000Z",
  "nonce": "<hex>",                // fresh per request → proves live, not cached
  "algorithm": "HMAC-SHA256",
  "signature": "<hex>",            // HMAC(key, `${boundary}:${issuedAt}:${nonce}`)
  "keySource": "server-env"        // names the source; never the value
}
```

Misconfigured (missing/blank key) `500` JSON — environment validation, product-spec
L79:
```jsonc
{ "boundary": "receipt", "error": "boundary_misconfigured",
  "detail": "server signing key is not set" }   // safe message; no key value
```

Method other than GET → `405`. Content-Type always `application/json`.

Design notes on the contract:

- **Freshness.** `nonce` (from `crypto.getRandomValues`) and `issuedAt`
  (`Date.now()`) change every call, so a curl visibly differs run-to-run — evidence
  the route is live, not a prerendered file (clause 1).
- **Canonical message.** Signing `boundary:issuedAt:nonce` binds the signature to
  the exact response, so the trio + signature is internally verifiable by anyone
  holding the key (useful to the ops-check/tests without exposing the key on the
  wire).
- **Trace-friendly.** A stable `boundary` name and a bounded, non-blocking
  operation let T-002-01-01's runner name and time it later without reshaping this.
- **Fault-ready (not built here).** A single well-named handler is trivially
  wrapped by T-002-01-04's later fault flag; this ticket ships only the healthy
  path.

---

## Env & secret handling

- **Var name:** `DEMO_SIGNING_KEY`. Not `PUBLIC_`-prefixed → Astro never inlines it
  into client output. Read **only** via `locals.runtime.env` at request time.
- **Local dev:** `.dev.vars` (gitignored) holds a real-ish dev value; wrangler +
  `platformProxy` load it. A committed **`.dev.vars.example`** documents the var
  with a placeholder — the "checked-in env template containing no secrets"
  (product-spec L109–110).
- **Production:** `wrangler secret put DEMO_SIGNING_KEY` (documented, not run here —
  no creds in repo). `.gitignore` gains `.dev.vars`.
- **Validation:** treat missing or whitespace-only key as misconfigured → `500`
  with a safe message. Never interpolate the key into any response, log, or error.

## Page rendering (clause 4 + P2 observability)

`index.astro` stays prerendered. Add a `.clay-well` panel with three states driven
by a small bundled `<script>` that `fetch`es `/api/receipt` on load:

- **loading** — a calm "Asking the server…" line (no indefinite spinner; P2).
- **success** — plain-English framing + the returned `issuedAt`/`nonce`/`signature`
  in a monospace block. Copy stays kitchen-table: e.g. *"A signed note the server
  just made with a key your browser never sees."* No "API/endpoint/HMAC" in visible
  copy.
- **error** — "The server couldn't answer just now." (covers the `500`/offline
  path so a broken boundary is explicit, not a hang; P2).

The script contains only a relative fetch + DOM writes → no secret in client JS
(clause 3). The now-stale lede ("the public URL and deploy-on-push arrive next" —
both landed) gets a light refresh to point at the live boundary.

## Deploy config impact

`wrangler.jsonc` gains `"main": "dist/_worker.js"` so wrangler runs the emitted
Worker for non-asset routes while still serving `dist/` assets; `_routes.json`
(adapter-generated) keeps `/` excluded from the Worker. Verified in Implement via
`astro build` + `wrangler deploy --dry-run` and by inspecting `dist/_routes.json`.

## What could go wrong (carried into Plan as checks)

1. `locals.runtime.env` undefined under `astro dev` → confirm `platformProxy`
   populates it; curl must return `200` with a signature. **Empirical gate.**
2. Key leaking into `dist/` → `grep -r "<test-key>" dist/` must be empty after a
   build done with the key present in env.
3. `/` accidentally routed through the Worker → inspect `dist/_routes.json`
   `exclude` for `/` (or `/index.html`).
4. Build breaks because adapter expects `output` change → keep `'static'`; only a
   route-level `prerender = false` is needed.
