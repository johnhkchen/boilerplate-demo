# Research — T-003-01-03 entry-persistence-module

Descriptive map of what exists and constrains this ticket. No solutions here.

## Ticket in one line

Implement the write/list data layer against the chosen binding (D1) so a submitted
`BackstageEntry` is stored and can be read back verbatim. Acceptance: a test writes an
entry through the module and reads it back, asserting every field round-trips
byte-for-byte against the store. Advances charter P4 (collaborative capture) and P6
(sovereign, transferable). Depends on T-003-01-01, which is complete.

## What the dependency already pinned (T-003-01-01)

- `src/lib/backstage-entry.ts` exports the portable contract:
  - `BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const`
  - `type BackstageEntryType = (typeof BACKSTAGE_ENTRY_TYPES)[number]`
  - `interface BackstageEntry { type; url; text; submittedAt }` — all four required,
    all strings, framework- and storage-independent. `submittedAt` is portable JSON
    text (ISO 8601 by convention, but the interface only says `string`).
- `migrations/0001_create_backstage_entries.sql` creates the physical table:
  ```sql
  CREATE TABLE backstage_entries (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('reference', 'feedback')),
    url TEXT NOT NULL,
    text TEXT NOT NULL,
    submitted_at TEXT NOT NULL
  );
  ```
  - `id` is storage-private (an insertion-order tie-breaker). It is **not** part of
    the public contract and must be omitted from returned entries.
  - Physical column `submitted_at` (snake_case) must map to public `submittedAt`
    (camelCase). This mapping is the module's responsibility, called out explicitly
    in the T-003-01-01 review handoff.
  - `CHECK (type IN ('reference','feedback'))` mirrors the public tuple; an
    out-of-contract type is rejected by the engine, not by app code.
- `wrangler.jsonc` declares the binding with **no** database name/ID (Wrangler
  auto-provisions into the deploying account — keeps the template sovereign):
  ```jsonc
  "d1_databases": [ { "binding": "BACKSTAGE_DB", "migrations_dir": "./migrations" } ]
  ```

The T-003-01-01 review's "Downstream handoff" section is an explicit spec for this
ticket. Its instructions: add the runtime binding type; accept/return `BackstageEntry`
from the shared module; insert only `type,url,text,submitted_at`; list explicitly by
`id` in a documented direction; map `submitted_at`→`submittedAt` and omit `id`; use
prepared/bound statements; test byte-for-byte round trips for every field; apply
migrations to isolated local test state.

## Repository idioms the module must match

The `src/lib/*` modules are pure, framework-free, and define their own minimal types
rather than importing platform SDKs:

- `receipt.ts` — pure signing logic; never reads env; the HTTP layer owns env access.
- `passcode.ts` — pure gate; discriminated-union result (`GateDecision`); the core
  takes the configured value as an **argument**, the edge reads env and passes it in.
- `operation-runner.ts` — pure `runOperation`; `OperationResult<T>` discriminated
  union; defines its own `Operation`/`OperationContext` types, no Astro/Workers import.

Consistent pattern to follow: **the library is pure and takes its dependency (here,
the D1 database handle) as an argument; the HTTP edge owns binding access.** This is
exactly how the submit route (T-003-02-01) will compose: read `Astro.locals.runtime.env.BACKSTAGE_DB`
at the edge, pass it into this module.

## Runtime environment typing

`src/env.d.ts` hand-declares `type Env = { DEMO_SIGNING_KEY; DEMO_PASSCODE; DEMO_FAULT? }`
and wires it through `@astrojs/cloudflare`'s `Runtime<Env>` into `App.Locals`. The
T-003-01-01 review explicitly deferred adding `BACKSTAGE_DB: D1Database` to this file
to the present ticket ("`T-003-01-03` must add `BACKSTAGE_DB: D1Database` when it
implements the persistence boundary").

Constraint discovered during research: **`D1Database` does not resolve as a global
type in this repo.** `@cloudflare/workers-types` is not installed, and
`npx tsc --noEmit` on a probe using `D1Database` fails with `TS2552 / Cannot find
name 'D1Database'`. The T-003-01-01 review saw the name only inside a wrangler-generated
file that was written to a temp path *outside* the repo and then deleted. So a verbatim
`BACKSTAGE_DB: D1Database` in `env.d.ts` would introduce a **new** typecheck error.
This shapes the Design decision on how to type the binding.

## Test harness

- `package.json` `test` script: `node --experimental-strip-types --test test/*.test.mjs`
  (an explicit list of files, not a glob). Node **v26.5.0** is installed.
- Tests are plain `node:test` + `node:assert/strict`, importing `../src/lib/*.ts`
  directly (strip-types runs TS without a build). No vitest, no Miniflare, no external
  process. All 52 current tests are hermetic and fast (~150 ms total).
- Any new test file must be **added to the `test` script list** or it will not run.

Available test-store mechanisms (verified during research):

- `node:sqlite` (`DatabaseSync`) is **available** on Node 26. It is real SQLite — the
  same engine D1 runs on — enforces `NOT NULL`/`CHECK`, and preserves Unicode/newlines
  byte-for-byte (`'héllo\n☺'` round-tripped exactly; a `null` into a `NOT NULL` column
  threw `ERR_SQLITE_ERROR`). `prepare(sql).run(...params)` / `.all()` return rows as
  plain objects keyed by column name.
- `wrangler`'s `getPlatformProxy` is **available** and would give a real Miniflare-backed
  D1, but it spins up a proxy, needs `dispose()`, persists to `.wrangler/state` (dev-state
  pollution), and does not auto-apply migrations — heavier and outside the hermetic
  `node:test` idiom the repo uses everywhere else.

## D1 API surface the module will touch

D1's `D1Database` exposes `prepare(sql) → D1PreparedStatement`, and the statement has
`.bind(...values) → D1PreparedStatement`, `.run() → Promise<D1Result>`, and
`.all<T>() → Promise<D1Result<T>>` where `D1Result.results` is `T[]`. The module only
needs `prepare`, `bind`, `run`, and `all`. This narrow surface is structurally
satisfiable by both real D1 and a `node:sqlite`-backed double.

## Constraints and assumptions

- **Sovereignty (P6):** no account ID, database UUID, or secret may be added. Binding
  stays name-only. No remote D1 access during tests.
- **Byte-for-byte:** strings must not be normalized, trimmed, or re-encoded by the
  module. SELECT must name the four public columns explicitly (not `SELECT *`) so `id`
  never leaks and column identity is pinned.
- **Ordering must be documented and deterministic.** `id INTEGER PRIMARY KEY` gives a
  stable insertion-order key; `ORDER BY id` makes list output deterministic even when
  `submitted_at` values tie.
- **No validation scope creep.** Runtime payload validation (malformed JSON, URL
  syntax, empty strings) is owned by T-003-02-01. This module trusts a well-typed
  `BackstageEntry` and lets the DB's `CHECK` be the last-line guard on `type`.
- **Not this ticket:** the HTTP route, the passcode composition, the UI, and agent
  retrieval. This ticket is purely the data layer + its round-trip test.
- **Pre-existing branch state:** `npx tsc --noEmit` currently reports 2 errors in
  `src/lib/passcode.ts` (T-003-01-02's `GateDecision` narrowing). Unrelated to this
  ticket and out of scope; the new module must not add errors of its own.
