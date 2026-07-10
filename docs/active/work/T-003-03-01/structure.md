# Structure — T-003-03-01 documented-agent-retrieval-seam

The blueprint: files, boundaries, public interfaces, ordering. Not the code.

## File-level change set

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `src/lib/backstage-retrieval.ts` | **create** | Pure retrieval core: gate + `listEntries` → versioned JSON feed `Response`. |
| 2 | `src/pages/api/backstage/feed.ts` | **create** | Thin GET edge at `/api/backstage/feed`; reads env, delegates to the core. |
| 3 | `scripts/backstage-feed.ts` | **create** | Repo-local CLI: fetch the running seam, print entries JSON; `*:check` exit codes. |
| 4 | `test/backstage-retrieval.test.mjs` | **create** | The acceptance **check**: hermetic byte-for-byte round-trip + gate + account-free. |
| 5 | `docs/knowledge/backstage-retrieval-seam.md` | **create** | The **committed seam doc** the acceptance references. |
| 6 | `package.json` | **modify** | Register the new test in `test`; add `backstage:feed` script. |

No files deleted. `passcode.ts`, `backstage-store.ts`, `backstage-entry.ts`, the migration,
`wrangler.jsonc`, and `src/env.d.ts` are consumed **read-only** (env typing already suffices).

## Module boundaries

```
                 ┌─────────────────────────────┐
  Astro edge  →  │ src/pages/api/backstage/feed │  reads locals.runtime.env
  (owns env,     │        .ts  (GET)            │  { DEMO_PASSCODE, BACKSTAGE_DB }
   Response)     └──────────────┬──────────────┘
                                │ readBackstageFeed({ request, configured, db })
                 ┌──────────────▼──────────────┐
  pure core   →  │ src/lib/backstage-retrieval  │  no env, no Astro import
  (gate+list+    │        .ts                   │
   envelope)     └───┬───────────────────┬──────┘
                     │ guardPasscode      │ listEntries
              ┌──────▼──────┐     ┌───────▼────────┐
   existing → │ passcode.ts │     │ backstage-store│  (read-only deps)
              └─────────────┘     │      .ts       │
                                  └───────┬────────┘
                                          │ BackstageEntry
                                  ┌───────▼────────┐
                                  │backstage-entry │
                                  │      .ts       │
                                  └────────────────┘

  CLI (scripts/backstage-feed.ts) ── HTTP ──▶ running /api/backstage/feed
  Check (test/…retrieval.test.mjs) ── in-proc ──▶ readBackstageFeed + node:sqlite store
```

The core sits one layer below the edge and above the two done modules. The CLI and the check
approach the seam from opposite ends (live HTTP vs. in-process core) so between them they cover
"documented read path" and "byte-for-byte assertion."

## 1. `src/lib/backstage-retrieval.ts` — public interface

```ts
// Stable envelope marker + the field names an agent parses.
export const FEED_SCHEMA_VERSION = 1;

// The verbatim feed payload. `entries` is exactly listEntries() output (four public fields),
// oldest-first (id ASC). No transformation of entry values.
export interface BackstageFeed {
  schemaVersion: typeof FEED_SCHEMA_VERSION;   // 1
  gate: typeof GATE_NAME;                       // 'backstage' (re-exported concept)
  count: number;                                // entries.length
  entries: BackstageEntry[];
}

// The dependencies the seam needs, all injected (no env read here).
export interface ReadBackstageFeedInput {
  request: Request;                 // carries the x-demo-passcode header
  configured: string | null | undefined;  // server passcode (DEMO_PASSCODE)
  db: EntryStoreDatabase | null | undefined; // BACKSTAGE_DB handle
}

// The one composition an agent hits. Order of checks:
//   1) guardPasscode(request, configured) — deny (500/401/403) short-circuits here.
//   2) db present? else 500 { gate, error:'store_unavailable', detail } (safe, no leak).
//   3) listEntries(db) → build BackstageFeed → 200 pretty JSON Response.
export async function readBackstageFeed(input: ReadBackstageFeedInput): Promise<Response>;
```

Internal helpers (not exported): a `json(body, status)` mirroring `receipt.ts`; the envelope
builder. Imports: `guardPasscode`, `GATE_NAME` from `./passcode.ts`; `listEntries`,
`EntryStoreDatabase` from `./backstage-store.ts`; `BackstageEntry` from `./backstage-entry.ts`
— all with **explicit `.ts` extensions** so the node:test can import the core under
`--experimental-strip-types`.

Boundary rules: reads no env, holds no secret, never echoes the passcode, never returns `id`
(inherited from `listEntries`). The gate is the outer wall — store state is only revealed
*after* the gate allows.

## 2. `src/pages/api/backstage/feed.ts` — thin edge

```ts
export const prerender = false;              // opt this route out of static prerender
import type { APIRoute } from 'astro';
import { readBackstageFeed } from '../../../lib/backstage-retrieval';  // extensionless: Vite resolves

export const GET: APIRoute = ({ locals, request }) => {
  const env = locals.runtime?.env;
  return readBackstageFeed({
    request,
    configured: env?.DEMO_PASSCODE,
    db: env?.BACKSTAGE_DB,
  });
};
```

No logic beyond wiring env → core. Same `prerender = false` opt-out as `receipt.ts`; the route
depth is three levels (`../../../lib`).

## 3. `scripts/backstage-feed.ts` — repo-local CLI

Structure mirrors `scripts/leak-check.ts`:
- `resolveConfig()` — `DEMO_BASE_URL` (default `http://localhost:4321`) → `…/api/backstage/feed`;
  passcode from `DEMO_PASSCODE` env or `.dev.vars` (reuse the `readDevVar` shape from
  `leak-check.ts`, keyed on `DEMO_PASSCODE`); optional timeout.
- `main()` — `fetch` the seam with the `x-demo-passcode` header under an `AbortSignal` time
  budget; on 200 print the parsed `entries` as JSON and return 0; on gate denial (401/403/500)
  print the denial body and return 1; on misconfiguration/network return 2.
- `process.exit(await main())`.

This is the agent's actual retrieval command and the thing the seam doc's "try it" section
invokes. Not registered in `npm test` (needs a running server).

## 4. `test/backstage-retrieval.test.mjs` — the acceptance check

Reuses `backstage-store.test.mjs`'s `createEntryStore()` verbatim in spirit (real
`node:sqlite` from the **committed** migration) plus the `entry()` factory. Imports
`readBackstageFeed` from `../src/lib/backstage-retrieval.ts` and `saveEntry` from
`../src/lib/backstage-store.ts`.

Helpers:
- `request(passcode?)` → a `Request` with (or without) the `x-demo-passcode` header.
- `feed(store, passcode)` → `await readBackstageFeed(...)`, returning `{ status, body }`.

Test cases (see plan.md for the ordered list) cover: byte-for-byte single & multi round-trip;
gnarly-content fidelity; oldest-first order; empty store → `[]`; envelope shape/version; gate
missing→401 / wrong→403 / blank-server→500 with **no entries in the denial body**;
`store_unavailable`→500 when db missing but passcode correct; and the account-free property
(only the shared header gates; no user/session artifact anywhere).

## 5. `docs/knowledge/backstage-retrieval-seam.md` — the committed seam doc

Durable protocol reference, sibling to `product-spec.md` / `charter.md`. Sections:
- **What this is** — the one read path; account-free; low-stakes shared passcode; the write
  half is T-003-02-01.
- **The endpoint** — `GET /api/backstage/feed`, the `x-demo-passcode` header, the versioned
  envelope with a worked JSON example, oldest-first ordering, `count`, verbatim fields.
- **Status codes** — 200 / 401 / 403 / 500 (misconfigured vs store_unavailable), each with its
  safe body.
- **Retrieve it (agent / CLI)** — `npm run backstage:feed`; a raw `curl` with the header; a
  note on `DEMO_BASE_URL` / `.dev.vars`.
- **Guarantees** — byte-for-byte fidelity, no `id`, stable append order, no account, no secret
  in the client bundle; MCP-adapter-ready shape.
- **Verifying the loop** — points at `test/backstage-retrieval.test.mjs` as the executable
  proof.

## 6. `package.json` — wiring

- Append `test/backstage-retrieval.test.mjs` to the `test` script's file list (after
  `test/backstage-store.test.mjs`).
- Add `"backstage:feed": "node --experimental-strip-types scripts/backstage-feed.ts"` beside
  the other `*:check` scripts.

## Ordering of changes (why this sequence)

1. **Core lib first** — nothing else compiles/tests without it.
2. **Test + `package.json` test wiring** — lock the acceptance behavior against the core (TDD-
   ish; the store ticket did test+wiring together).
3. **Route** — the thin edge over the now-proven core.
4. **CLI + `package.json` script** — the agent affordance over the route.
5. **Seam doc** — documents the finished, verified surface.

Each of 1–2, 3, 4, 5 is an independently committable unit (see plan.md).
