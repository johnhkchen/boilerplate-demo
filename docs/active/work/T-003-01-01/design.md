# Design — T-003-01-01 entry schema and storage binding

## Decision summary

Define a framework-free TypeScript contract in `src/lib/backstage-entry.ts`, back
it with a small D1 table created by a Wrangler migration, and declare an
automatically provisioned D1 binding named `BACKSTAGE_DB` in `wrangler.jsonc`.
The public contract remains exactly `{ type, url, text, submittedAt }`; a private
integer database key supplies deterministic insertion order without expanding the
portable entry payload.

## Decision drivers

1. The immediate follow-up must write an entry and list it back verbatim.
2. Submit-to-retrieve should be deterministic in local tests and unsurprising in a
   live collaborative feed.
3. The stored values have a fixed, small, structured shape.
4. The `type` value has a closed two-value domain.
5. Agents need a stable machine-readable list, not cache-style point lookup.
6. The repository must stay account-agnostic and independently deployable.
7. This ticket must establish contracts, not consume future persistence/HTTP scope.
8. Existing dirty files owned by prerequisite work must not be swept into commits.

## Option 1 — KV, one key per entry

### Shape

- Add a KV namespace binding such as `BACKSTAGE_ENTRIES`.
- Generate a lexicographically sortable key from timestamp plus random suffix.
- Store the entire `BackstageEntry` as JSON in each value.
- List keys by prefix and fetch each value to reconstruct the feed.

### Advantages

- Minimal storage model: no SQL or migrations.
- Naturally distributes writes across keys.
- Fits Cloudflare's serverless/account-owned model.
- A unique key makes each write independent.
- The product allows up to a one-to-two-minute refresh delay.

### Costs and risks

- Cross-location visibility is eventually consistent and may lag by roughly a
  minute or more.
- A write followed immediately by list can fail to observe the new key in another
  point of presence.
- `list()` returns keys/metadata rather than full values, producing an N+1 read
  pattern unless the complete entry is duplicated into metadata.
- Key construction becomes an implicit second schema for ordering and uniqueness.
- Timestamp collisions need a suffix, but random suffixes do not communicate
  insertion order for equal timestamps.
- KV cannot enforce the `reference | feedback` domain.
- JSON parsing/malformed-value handling becomes persistence-module work.
- Pagination must be implemented even for a simple structured list.

### Assessment

Viable, especially if the feed were primarily a globally cached read surface and
minute-scale propagation were explicitly acceptable everywhere. It is less direct
for the concrete next acceptance test: write one structured record, immediately
list it, and compare every field.

## Option 2 — KV, one aggregate feed value

### Shape

- Bind one KV namespace.
- Store a JSON array under one known key.
- Read, append, and overwrite that key for every submission.

### Advantages

- One read retrieves the complete feed.
- Ordering is directly represented by array order.
- No SQL schema or migration.

### Costs and risks

- Read-modify-write is not atomic in KV.
- Concurrent stakeholder submissions can overwrite each other.
- KV limits writes to the same key to one per second.
- The entire feed is rewritten for every entry.
- Eventual consistency can make an append begin from a stale array.
- A single malformed value can make the whole feed unreadable.

### Assessment

Rejected. It turns a simple append workload into a lost-update hazard and conflicts
with KV's documented write characteristics.

## Option 3 — D1 table

### Shape

- Declare `BACKSTAGE_DB` as a D1 binding.
- Commit one migration that creates `backstage_entries`.
- Store each field in its own `TEXT NOT NULL` column.
- Add a `CHECK` constraint for `reference` and `feedback`.
- Use a private `INTEGER PRIMARY KEY` as insertion-order tie-breaker.
- Map `submitted_at` in SQL to `submittedAt` in the TypeScript contract.

### Advantages

- One insert writes one complete row.
- One ordered query retrieves complete entries.
- The database constrains nullability and allowed type values.
- Immediate local write/list tests are deterministic.
- A private integer key gives total ordering even when timestamps match.
- The committed migration is executable storage documentation.
- The resource remains per-project and Cloudflare-owned.
- Wrangler supports automatic provisioning and local emulation.

### Costs and risks

- Adds a migration lifecycle for a four-field object.
- Introduces a database where relations and transactions are not yet required.
- The persistence module must map snake_case SQL columns to camelCase JSON.
- D1 binding types must eventually be exposed at the runtime edge.
- Remote creation/application still requires an authenticated owner operation.

### Assessment

Chosen. The justification is not speculative relational complexity; it is the
concrete append-and-ordered-list contract, schema enforcement, and predictable
write-then-read behavior needed by the next tickets.

## Option 4 — type and binding only, defer physical schema

### Shape

- Commit the TypeScript interface.
- Declare D1 in Wrangler.
- Let `T-003-01-03` introduce the migration with persistence logic.

### Advantages

- Smallest literal interpretation of this ticket.
- Avoids deciding SQL names before query implementation.

### Costs and risks

- A D1 binding without a table is not a complete storage contract.
- The database cannot yet demonstrate the requested structured schema.
- The persistence ticket must make a schema decision that this ticket is intended
  to pin.
- Wrangler config validation alone would not verify migration syntax.

### Assessment

Rejected. Committing the migration here gives the chosen storage a concrete schema
and leaves the next ticket focused on write/list behavior.

## Public TypeScript contract

```ts
export const BACKSTAGE_ENTRY_TYPES = ['reference', 'feedback'] as const;

export type BackstageEntryType = (typeof BACKSTAGE_ENTRY_TYPES)[number];

export interface BackstageEntry {
  type: BackstageEntryType;
  url: string;
  text: string;
  submittedAt: string;
}
```

### Contract choices

- The exported tuple gives future runtime validators one canonical value list.
- The type is derived from the tuple so runtime values and compile-time union
  cannot drift.
- All four fields are required because the ticket names no optional fields.
- `url` stays a string; syntax and empty-value policy belong to request validation.
- `text` stays byte-preserving string data.
- `submittedAt` stays a string for portable JSON and SQL representation.
- Timestamp generation/ISO validation belongs to the submit route or persistence
  boundary in later tickets.
- No `id` is added to the public interface.
- No runtime parser is added in this ticket.

## SQL schema

```sql
CREATE TABLE backstage_entries (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('reference', 'feedback')),
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
```

### Schema choices

- The table is plural because it is the stored collection.
- `id` is storage-private and omitted by future public select mapping.
- `INTEGER PRIMARY KEY` provides an increasing row identifier when inserts omit it.
- `AUTOINCREMENT` is unnecessary because v1 has no deletion/reuse requirement and
  SQLite's stronger no-reuse guarantee adds overhead without product value.
- The two allowed type values are checked in storage as defense in depth.
- All public fields are non-null.
- Strings are stored directly as `TEXT`; no JSON serialization layer is needed.
- `submitted_at` uses SQL naming conventions; mapping is explicit in persistence.
- No uniqueness constraint is imposed on timestamps, URLs, or text.
- No index is required for an initial `ORDER BY id` list because the primary key
  already supplies the ordering path.
- No update/delete triggers exist because editing and moderation are out of scope.

## Binding design

```jsonc
"d1_databases": [
  {
    "binding": "BACKSTAGE_DB",
    "migrations_dir": "./migrations"
  }
]
```

- The uppercase binding is descriptive and valid as a JavaScript identifier.
- `migrations_dir` makes the executable schema location explicit.
- `database_name` and `database_id` are intentionally absent initially.
- Current Wrangler supports automatic provisioning for D1 resources.
- On deploy, the project owner authorizes creation and Wrangler records concrete
  resource identity without this template hard-coding another account's ID.
- Local commands use local persistent D1 state by default.
- No `remote: true` is set; ordinary development must not mutate production data.

## Required rationale paragraph

D1 is selected over Workers KV because this backstage workload is an append-and-
retrieve feed of fixed structured rows, not a cache or independent key lookup: D1
can enforce the two entry types, return every field in one deterministically
ordered query, and make the next ticket's immediate write-then-list round trip
predictable, whereas KV listing requires key design plus extra value reads and may
not expose a fresh write in another location for roughly a minute. The small SQL
migration is acceptable overhead for that concrete behavior, and an automatically
provisioned `BACKSTAGE_DB` binding keeps the database local to the project's own
Cloudflare account, preserving sovereignty and transferability.

This paragraph will live beside the binding in `wrangler.jsonc`, where operators
encounter the decision, as well as in this Design artifact.

## Validation design

- Run `npx wrangler deploy --dry-run` after a build to validate the effective
  Worker configuration and binding without remote mutation.
- Run `npx wrangler d1 migrations apply BACKSTAGE_DB --local` to parse/apply the
  migration against local D1.
- Query local `sqlite_master`/`PRAGMA table_info` through Wrangler to confirm the
  table exists with expected columns.
- Execute a local invalid-type insert and require its `CHECK` constraint to fail.
- Run `npx tsc --noEmit` to compile the public TypeScript contract.
- Run the full existing `npm test` suite and `npm run build` for regressions.
- Run `git diff --check` and verify no diff to the ticket frontmatter.

## Explicit non-decisions

- No HTTP payload parser or size limits.
- No definition of whether `url` may be empty for feedback.
- No passcode behavior.
- No persistence module or query API.
- No public entry identifier.
- No remote database creation or migration application.
- No named staging/production environments.
- No retention, deletion, or moderation policy.
- No claim that D1 is a universal default for demo data.
