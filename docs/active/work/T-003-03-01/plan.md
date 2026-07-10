# Plan — T-003-03-01 documented-agent-retrieval-seam

Ordered, independently-verifiable steps and the testing strategy. Commit after each step.

## Testing strategy (what proves what)

- **Acceptance = the hermetic round-trip test** (`test/backstage-retrieval.test.mjs`, in
  `npm test`). It is the "check" the criterion names: seed via `saveEntry`, read back through
  `readBackstageFeed`, assert byte-for-byte equality, gate behavior, and account-free access.
  Real `node:sqlite` from the committed migration → "byte-for-byte against the store" is literal.
- **Type safety** = `npx tsc --noEmit` must add **no new** errors beyond the two known
  pre-existing `passcode.ts` narrowing errors (baseline noise, not mine).
- **Build** = `npm run build` must still succeed (route compiles, prerender opt-out honored).
- **CLI** = exercised manually against `astro dev` (documented in the seam doc); not in CI
  because it needs a running server + a seeded store. Its logic is thin fetch-and-print.
- **Full suite** = `npm test` stays green and grows by the new file's cases (baseline 60).

Verification criteria per step are listed inline below.

## Step 1 — Pure retrieval core

**Create** `src/lib/backstage-retrieval.ts`:
- `FEED_SCHEMA_VERSION = 1`; `BackstageFeed`, `ReadBackstageFeedInput` interfaces.
- `readBackstageFeed(input)`:
  1. `const denied = guardPasscode(request, configured); if (denied) return denied;`
  2. `if (!db) return json({ gate: GATE_NAME, error: 'store_unavailable', detail: '…' }, 500);`
  3. `const entries = await listEntries(db);`
  4. `return json({ schemaVersion: FEED_SCHEMA_VERSION, gate: GATE_NAME, count: entries.length,
     entries }, 200);`
- Local `json(body, status)` = `JSON.stringify(body, null, 2)` +
  `content-type: application/json; charset=utf-8` (copy `receipt.ts`).
- Import `guardPasscode`, `GATE_NAME` from `./passcode.ts`; `listEntries`, `EntryStoreDatabase`
  from `./backstage-store.ts`; `BackstageEntry` from `./backstage-entry.ts` — **`.ts`
  extensions** so node strip-types can import the core from the test.

**Verify:** `npx tsc --noEmit` shows only the two known `passcode.ts` errors (no new ones from
this file).

**Commit:** `feat(backstage): add pure agent-retrieval seam core (T-003-03-01)`

## Step 2 — Acceptance check + test wiring

**Create** `test/backstage-retrieval.test.mjs`:
- Reuse `createEntryStore()` (real `node:sqlite` from `migrations/0001_…sql`) and the
  `entry()` factory from the store test (copied, keeping the tests self-contained per repo
  idiom — each test file builds its own store helper).
- Helpers: `req(passcode)` builds a `Request` (`new Request('https://x/api/backstage/feed', {
  headers })`); `read(store, passcode)` = `await readBackstageFeed({ request: req(passcode),
  configured: 's3cret', db: store })` then `{ status: res.status, body: await res.json() }`.

**Cases:**
1. Single submitted entry round-trips byte-for-byte through the seam (`deepStrictEqual`
   on `body.entries` vs `[entry]`; explicit `text`/`url` byte asserts).
2. Hard content (newlines, Unicode incl. combining mark + emoji, quotes, percent-encoded query
   string) survives the seam exactly.
3. Multiple entries come back oldest-first (insertion order) — `body.entries` order matches
   save order.
4. Empty store → `200` with `count: 0`, `entries: []`.
5. Envelope shape: `schemaVersion === 1`, `gate === 'backstage'`, `count === entries.length`,
   and `Object.keys(entries[0]).sort()` is exactly the four public fields (no `id`).
6. Gate — **missing** passcode → `401` and `body` has **no `entries`** key (denial body is the
   gate's, entries never listed).
7. Gate — **wrong** passcode → `403`, no `entries`, store never read.
8. Gate — **blank server** passcode (`configured: ''`) → `500 misconfigured`, no `entries`.
9. `store_unavailable`: correct passcode but `db: undefined` → `500` with
   `error: 'store_unavailable'` and no `entries` (gate passes, store missing).
10. Account-free: a correct **shared** passcode is the only credential; assert success needs no
    other header/cookie and the response sets no `set-cookie`/session artifact.

**Modify** `package.json`: append `test/backstage-retrieval.test.mjs` to the `test` script.

**Verify:** `npm test` → green, count rises from 60 by the new cases.

**Commit:** `test(backstage): prove byte-for-byte retrieval round-trip through the seam (T-003-03-01)`

## Step 3 — Thin GET route

**Create** `src/pages/api/backstage/feed.ts`:
- `export const prerender = false;`
- `import type { APIRoute } from 'astro';`
- `import { readBackstageFeed } from '../../../lib/backstage-retrieval';` (extensionless; Vite).
- `export const GET: APIRoute = ({ locals, request }) => readBackstageFeed({ request,
  configured: locals.runtime?.env?.DEMO_PASSCODE, db: locals.runtime?.env?.BACKSTAGE_DB });`

**Verify:** `npm run build` succeeds and emits the worker route for `/api/backstage/feed`
(check `dist/_routes.json` / worker output includes it, like `/api/receipt`).

**Commit:** `feat(backstage): expose GET /api/backstage/feed retrieval route (T-003-03-01)`

## Step 4 — Repo-local CLI + script wiring

**Create** `scripts/backstage-feed.ts` (mirror `scripts/leak-check.ts` structure):
- `resolveConfig()` → `{ url: `${base}/api/backstage/feed`, passcode, timeBudgetMs }`, base
  from `DEMO_BASE_URL` (default `http://localhost:4321`), passcode from `DEMO_PASSCODE` env or a
  `.dev.vars` reader keyed on `DEMO_PASSCODE`.
- `main()` → `fetch(url, { headers: { 'x-demo-passcode': passcode }, signal })` under an
  `AbortController` timeout; 200 → `console.log(JSON.stringify(body.entries, null, 2))`, return
  0; 401/403/500 → print body, return 1; thrown/network/misconfig → return 2.
- `process.exit(await main());`

**Modify** `package.json`: add
`"backstage:feed": "node --experimental-strip-types scripts/backstage-feed.ts"`.

**Verify:** `node --experimental-strip-types scripts/backstage-feed.ts` runs (with no server it
returns 2 with a clear message — proves it loads and handles the no-server path). Optional live
check against `astro dev` documented in the seam doc.

**Commit:** `feat(backstage): add repo-local backstage:feed retrieval CLI (T-003-03-01)`

## Step 5 — The committed seam doc

**Create** `docs/knowledge/backstage-retrieval-seam.md` per structure.md's section list:
what it is (account-free, low-stakes, write-half pointer) · the endpoint + header + versioned
envelope with a worked example · status codes · retrieve-it (CLI + `curl`) · guarantees ·
verifying the loop (points at the check).

**Verify:** doc references match the shipped code (path, header, envelope keys, exit codes,
test filename). Re-run `npm test` and `npm run build` as a final gate.

**Commit:** `docs(backstage): document the agent retrieval seam (T-003-03-01)`

## Final verification (before Review)

- `npm test` → all green (60 + new).
- `npx tsc --noEmit` → only the two pre-existing `passcode.ts` errors.
- `npm run build` → succeeds; `/api/backstage/feed` present in worker routes.
- `git status` → only the six intended files (5 new + `package.json`) plus the RDSPI artifacts.

## Risks & mitigations

- **`Request`/`Response` in node:test** — web globals, present in the Node version this repo
  targets (`receipt.ts`/`leak-check.ts` already use `fetch`/`Response`). If absent, the test
  would fail loudly at import; no silent skip.
- **Extensionless import in the route** — Vite/Astro resolves it (as `receipt.ts` does); the
  **core** uses `.ts` extensions precisely so the *test* path works under node.
- **Accidental collision with T-003-02-01** — avoided by a distinct file/path
  (`api/backstage/feed.ts`); `package.json` is the only shared file, appended to (low conflict,
  and the lock serializes writes).
- **`tsc` false alarm** — the two `passcode.ts` errors are pre-existing; Review must state the
  before/after so the branch is not mistaken for newly broken.
