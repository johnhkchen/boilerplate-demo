# Research — T-003-03-01 documented-agent-retrieval-seam

Descriptive map of what already exists and how it connects. No solutions here.

## What this ticket must deliver (read of the ticket)

> Deliver the one documented read path through which a coding agent retrieves stored
> entries verbatim, closing the epic's two-way loop.

Acceptance: _following the committed seam doc_, an agent retrieves entries and the exact
`text`/`url` of a previously submitted entry comes back **byte-for-byte**; a **check**
asserts the retrieved payload equals what was submitted, with **no account** created on
either side.

So there are four coupled things to account for in the codebase as it stands:
1. a **read path** (an HTTP route / callable seam) that returns stored entries verbatim;
2. a **committed doc** describing how an agent uses that path;
3. an executable **check** asserting a submitted entry round-trips byte-for-byte; and
4. an **account-free** posture (shared passcode only — no per-user record either side).

This is the read half of story S-003-02/03's backstage door. `depends_on` is
`[T-003-01-02, T-003-01-03]` — the passcode gate and the persistence module — and NOT
T-003-02-01 (the submit route). That dependency edge is deliberate and it shapes the work:
the retrieval seam must stand on its own without the submit route existing yet.

## The pieces already on the shelf

### Persistence module — `src/lib/backstage-store.ts` (T-003-01-03, done)

Pure, framework-free data layer. Two functions, both taking the D1 handle as an argument:
- `saveEntry(db, entry): Promise<void>` — INSERT of the four public columns.
- `listEntries(db): Promise<BackstageEntry[]>` — `SELECT type,url,text,submitted_at …
  ORDER BY id ASC`, mapped through the single `rowToEntry` site (snake→camel, drops `id`).

Key properties the retrieval seam inherits for free:
- **Canonical order is oldest-first** (`id ASC`), stable even when `submitted_at` ties.
  The store comment explicitly leaves *presentation* order to "the retrieval seam."
- **Only the four public fields leave the module.** `id` is storage-private and never
  selected. `SELECT *` is avoided so nothing can leak.
- **Empty store → `[]`**, never null/undefined.
- The store's own tests already prove byte-for-byte fidelity (Unicode, newlines, quotes,
  percent-encoded query strings) against real SQLite built from the committed migration.

The store depends on a minimal structural D1 surface (`EntryStoreDatabase` /
`EntryStoreStatement`: `prepare → bind → run/all`) — not the global `D1Database`, which is
unresolvable here (`@cloudflare/workers-types` is not installed).

### Entry contract — `src/lib/backstage-entry.ts` (T-003-01-01, done)

```ts
BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const
interface BackstageEntry { type: BackstageEntryType; url: string; text: string; submittedAt: string }
```
The portable contract shared by "the backstage form, HTTP edges, persistence, and **agent
retrieval seam**" — the module comment already names this ticket as a consumer.

### Passcode gate — `src/lib/passcode.ts` (T-003-01-02, done)

Pure gate + a thin route adapter. Relevant exports:
- `PASSCODE_ENV = 'DEMO_PASSCODE'`, `PASSCODE_HEADER = 'x-demo-passcode'`,
  `GATE_NAME = 'backstage'`.
- `checkPasscode(configured, presented): GateDecision` — discriminated result:
  `{allowed:true}` | `misconfigured/500` | `missing/401` | `mismatch/403`. Misconfigured
  is checked before the visitor's input; constant-time-ish compare; never echoes the value.
- `guardPasscode(request, configured): Response | null` — reads the header, returns `null`
  to let the route proceed or a finished JSON denial `Response`. The one line submit and
  retrieve share.
- `describeDecision(decision)` — plain-English denial copy + stable machine slug.

The module comment is explicit: the header "lets one gate cover a POST submit and a **GET
retrieve**." So a GET retrieval route composing `guardPasscode` is the intended shape.

### The binding + env typing — `wrangler.jsonc`, `src/env.d.ts`

- `wrangler.jsonc` declares the `BACKSTAGE_DB` D1 binding (name-only, no account/UUID) with
  `migrations_dir: ./migrations`. Rationale comment: D1 chosen over KV because entries are a
  "fixed, structured append-and-retrieve feed … returns every field in one deterministically
  ordered query."
- `src/env.d.ts` already types **both** things the retrieval seam needs on
  `Astro.locals.runtime.env`: `DEMO_PASSCODE: string` and
  `BACKSTAGE_DB: EntryStoreDatabase`. **No env.d.ts change is required for this ticket.**

### Migration — `migrations/0001_create_backstage_entries.sql`

`backstage_entries(id INTEGER PRIMARY KEY, type TEXT CHECK(reference|feedback), url, text,
submitted_at)`. The committed schema the check should build its store from.

## The route idiom to copy — `src/pages/api/receipt.ts`

The template's one existing on-demand route is the pattern:
- `export const prerender = false;` opts the single route out of static prerender
  (`astro.config.mjs` is `output:'static'`; only `/api/*` invokes the Worker).
- `const env = locals.runtime?.env;` then read the server-only var (`env?.DEMO_SIGNING_KEY`).
- **Misconfiguration is a 500 with a safe message**, checked first, never a leaked value.
- Delegates the real work to a pure lib (`makeReceipt`) and serializes with a small
  `json(body, status)` helper: `JSON.stringify(body, null, 2)`, `content-type:
  application/json; charset=utf-8`.

The repo's structural rule, visible across `receipt.ts`, `passcode.ts`, `backstage-store.ts`,
`operation-runner.ts`: **pure framework-free core + a thin edge that owns env/`Response`.**

## The check idioms available

Two shapes of "check" exist in the repo:
1. **Hermetic node:test** (`test/*.test.mjs`, run by `npm test` via
   `node --experimental-strip-types`). `test/backstage-store.test.mjs` is the closest
   template: it builds a **real** `node:sqlite` store from the **committed** migration and
   asserts `deepStrictEqual` round-trips including gnarly Unicode/newline/quote content. Tests
   import `.ts` libs with **explicit `.ts` extensions** (Node ESM needs them under
   strip-types); the Astro route uses extensionless imports (Vite resolves those).
2. **Executable `*:check` scripts** (`scripts/leak-check.ts`, `integration-check.ts`) with a
   pure `src/lib/*-check.ts` core, wired as `npm run leak:check` etc. These probe a *running*
   boundary over HTTP for operational faults. `leak-check.ts` reads `.dev.vars` and hits
   `http://localhost:4321/api/receipt`.

For a byte-for-byte round-trip assertion, idiom (1) is the natural home: hermetic,
in-process, fast, and it can seed via `saveEntry` and read back through the seam without a
running server or provisioned D1.

## Product-spec / charter constraints that bear on the seam

Stakeholder backstage section of `docs/knowledge/product-spec.md`:
- "Make new input available through **stable machine-readable interfaces** suitable for a
  **repo-local CLI, JSON API, or later MCP adapter**." → the seam should be JSON, stable,
  CLI-consumable.
- "**No account registration** for initial collaboration." → shared passcode only.
- "Support a **one-to-two-minute refresh** cycle; hard real-time is unnecessary." → an
  agent polls; a stable append-ordered feed suits this.
- "Clearly label its **known security level**. Refuse secrets." → low-stakes gate, doc must
  say so.
- Charter P3: no server secret in the client bundle (passcode is server-only, not
  `PUBLIC_`-prefixed). P6: sovereign/transferable (binding stays name-only).

## Constraints, assumptions, and open questions surfaced

- **The submit route does not exist yet** (T-003-02-01 is at `research`). "Previously
  submitted" must therefore be demonstrated by writing through the committed persistence
  module (`saveEntry`) — the storage side of a submission — then reading back through the
  seam. The seam is agnostic to how rows arrived.
- **File-conflict avoidance.** T-003-02-01 will own the submit route/file. This ticket must
  not touch the same file (concurrency rule: shared files = a missing dep edge). A distinct
  route path/file is required.
- **Pre-existing `tsc` noise.** `npx tsc --noEmit` fails only on two `passcode.ts`
  `GateDecision` narrowing errors from T-003-01-02 (documented in its review). New code must
  add **no** new errors; `passcode.ts` must not be touched here.
- **Baseline:** `npm test` → 60/60 green; `npm run build` succeeds.
- **Assumption:** presentation order for the seam is a decision for Design (canonical store
  order is oldest-first; the seam may keep or reverse it).
- **Assumption:** the "committed seam doc" belongs alongside the other durable protocol
  references in `docs/knowledge/` (charter, product-spec, workflows), not in `docs/active`.
