# Structure — T-002-01-02 exemplar-api-boundary

The blueprint: exact files, interfaces, and ordering. No code — the shape of it.

## Change map

```
package.json               MODIFY  add devDependency @astrojs/cloudflare ^14
astro.config.mjs           MODIFY  add cloudflare adapter (platformProxy);
                                   keep output:'static'; rewrite the deferral note
wrangler.jsonc             MODIFY  add "main": "dist/_worker.js"; keep assets
.gitignore                 MODIFY  add .dev.vars (real secret, never committed)
.dev.vars.example          CREATE  committed env template, placeholder only
.dev.vars                  CREATE(local, gitignored)  real dev value for testing
src/lib/receipt.ts         CREATE  pure signing helper (sign + build payload)
src/pages/api/receipt.ts   CREATE  GET handler; prerender=false; env validation
src/pages/index.astro      MODIFY  add .clay-well panel + fetch script; refresh lede
src/env.d.ts               CREATE  type Astro.locals.runtime.env (Cloudflare Runtime)
```

No files deleted. `package-lock.json` updates as a side effect of the install.

## Module boundaries & interfaces

### `src/lib/receipt.ts` — pure boundary logic (no framework, no I/O of env)

Keeps the secret-consuming operation testable in isolation and reusable by the
sibling ops-check/runner without importing Astro.

```ts
export const BOUNDARY_NAME = 'receipt';

export interface Receipt {
  boundary: string;      // BOUNDARY_NAME
  issuedAt: string;      // ISO 8601
  nonce: string;         // hex, 16 bytes
  algorithm: 'HMAC-SHA256';
  signature: string;     // hex HMAC over canonicalMessage()
  keySource: 'server-env';
}

// Canonical, signature-bound message: `${boundary}:${issuedAt}:${nonce}`
export function canonicalMessage(r: Pick<Receipt,'boundary'|'issuedAt'|'nonce'>): string

// Sign an already-built payload with a key → hex signature (Web Crypto).
export async function signReceipt(key: string, msg: string): Promise<string>

// Build a fresh receipt: generates nonce + issuedAt, signs. Caller supplies
// `now`/`nonceBytes` injectors in tests for determinism; defaults use globals.
export async function makeReceipt(
  key: string,
  opts?: { now?: () => number; randomBytes?: (n: number) => Uint8Array }
): Promise<Receipt>

// Verify a receipt against the key (used by tests / ops-check; never on the wire).
export async function verifyReceipt(key: string, r: Receipt): Promise<boolean>
```

Contract details:
- **No key in output.** `makeReceipt` returns only the `Receipt` shape above.
- **Determinism seam.** `opts.now` / `opts.randomBytes` injectors let a unit test
  assert an exact signature without touching wall-clock or CSPRNG.
- **Web Crypto only.** `crypto.subtle.importKey('raw', …, {name:'HMAC',
  hash:'SHA-256'}, false, ['sign'])` then `crypto.subtle.sign`. Works identically
  in the Workers runtime and Node ≥18 (Node 26 here). Hex-encode bytes.

### `src/pages/api/receipt.ts` — the HTTP boundary

```ts
export const prerender = false;            // the ONE on-demand route
import type { APIRoute } from 'astro';
import { BOUNDARY_NAME, makeReceipt } from '../../lib/receipt';

export const GET: APIRoute = async ({ locals }) => { … }
```

Responsibilities (thin; logic lives in the lib):
1. Read `locals.runtime?.env?.DEMO_SIGNING_KEY`.
2. **Validate:** missing or `.trim() === ''` → `500`
   `{ boundary, error:'boundary_misconfigured', detail:'server signing key is not set' }`.
3. Else `makeReceipt(key)` → `200` JSON.
4. `Content-Type: application/json`; JSON body via `Response`/`new Response`.
5. No `GET`-only export means other methods 405 automatically (Astro returns 404/405
   for unexported methods; acceptable — GET is the contract).

The handler never logs or interpolates the key. Errors return the fixed safe shape.

### `src/env.d.ts` — runtime env typing

Types `App.Locals.runtime.env` so `locals.runtime.env.DEMO_SIGNING_KEY` is typed,
not `any`. Uses the adapter's `Runtime` helper:

```ts
/// <reference types="astro/client" />
type Env = { DEMO_SIGNING_KEY: string };
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;
declare namespace App {
  interface Locals extends Runtime {}
}
```

### `astro.config.mjs` — adapter wiring

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',                                   // pages prerender by default
  adapter: cloudflare({ platformProxy: { enabled: true } }),
});
```
The existing static-first comment is rewritten to explain the reconciled reality:
pages stay static (no cold start); the adapter exists solely so the one
`prerender=false` boundary route can run — it does not make the site SSR.

### `wrangler.jsonc` — deploy wiring

Add `"main": "dist/_worker.js"`. Keep `assets: { directory: "./dist" }`, `name`,
`compatibility_date`, `$schema`. Update the header comment: no longer assets-only —
static assets are served from the edge, and only `_routes.json`-matched paths
(`/api/*`) invoke the Worker; the account stays secret-free (secret via
`wrangler secret put`, not committed).

### `.dev.vars.example` (committed) & `.dev.vars` (gitignored)

```
# .dev.vars.example — copy to .dev.vars (gitignored) and set a real value.
# Server-only signing key for the /api/receipt boundary. NEVER commit the real key.
DEMO_SIGNING_KEY="replace-with-a-long-random-string"
```
`.dev.vars` mirrors it with an actual dev value for local verification.

### `src/pages/index.astro` — page render (static)

- Add a second `<section>`/panel using `.clay-well`, with element ids the script
  targets (e.g. `#receipt-status`, `#receipt-body`) and an initial "loading" state
  in the server-rendered HTML (so it's legible before/without JS — progressive).
- Add a `<script>` (module) that on load `fetch('/api/receipt')`, then renders
  success or error into the panel. Only a relative fetch + DOM writes — no secret.
- Page-scoped `<style>` for the panel: token vars only, no literals (existing
  invariant). Reuse `--space-*`, `--text-*`, `--radius-*`, `--color-*`.
- Refresh the stale lede sentence ("the public URL and deploy-on-push arrive next"
  — both shipped) to point at the live signed answer. Brand voice: plain, warm.

## Ordering (why this sequence)

1. **Install adapter** — nothing else compiles/type-checks against it until present.
2. **Config + env typing + env files** — establish the runtime env contract.
3. **lib/receipt.ts** — pure logic first; independently reasoned about.
4. **api/receipt.ts** — wire logic to HTTP + validation.
5. **index.astro** — consume the boundary from the page.
6. **wrangler.jsonc** — deploy wiring (only matters once `_worker.js` is emitted).
7. **Verify** — build, curl dev, grep dist, inspect `_routes.json`.

Steps 3–5 are the atomic-commit units; 1–2 land together as the enabling commit;
6 rides with the verification commit.

## Interface contracts that downstream tickets depend on

- **`BOUNDARY_NAME = 'receipt'`** and the `GET /api/receipt` path are the stable
  handle T-002-01-03's ops-check names and fetches. Keep both stable.
- **`makeReceipt` / `verifyReceipt`** are the reusable seam so the ops-check/runner
  can exercise the boundary (or verify a receipt) without duplicating crypto.

## Invariants preserved (checklist for Review)

- [ ] `output: 'static'`; only `api/receipt.ts` sets `prerender = false`.
- [ ] `dist/index.html` still emitted; `/` excluded in `dist/_routes.json`.
- [ ] `DEMO_SIGNING_KEY` never `PUBLIC_`-prefixed; never in `dist/`.
- [ ] No literal colors/radii/shadows in new `.astro`/CSS — token vars only.
- [ ] Visitor-facing copy passes the kitchen-table test (no API/HMAC jargon).
- [ ] Committed `.dev.vars.example` has no real secret; `.dev.vars` gitignored.
