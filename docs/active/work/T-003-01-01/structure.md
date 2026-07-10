# Structure — T-003-01-01 entry schema and storage binding

## Change inventory

Three product files are in scope:

1. create `src/lib/backstage-entry.ts`;
2. create `migrations/0001_create_backstage_entries.sql`;
3. modify `wrangler.jsonc`.

Two phase artifacts follow during execution:

4. create `docs/active/work/T-003-01-01/progress.md`;
5. create `docs/active/work/T-003-01-01/review.md`.

Research, Design, Structure, and Plan artifacts are created in the same work
directory. No source file is deleted. No route, page, CSS, test runner, package
manifest, or ticket frontmatter is changed.

## Created — `src/lib/backstage-entry.ts`

### Responsibility

Own the portable application-facing backstage entry contract. This module contains
only values and types shared by future form, route, persistence, and retrieval
layers. It performs no I/O and imports no Astro or Cloudflare APIs.

### Public interface

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

### Boundary rules

- The tuple is the source of truth for allowed runtime discriminator values.
- The union derives from the tuple; the literals are not duplicated in TypeScript.
- The interface contains exactly the four ticket fields.
- Every field is required.
- The public contract contains no database identifier.
- `submittedAt` is JSON-safe text rather than a `Date` instance.
- The file does not validate arbitrary input.
- The file does not generate timestamps.
- The file does not normalize or trim strings.
- The file does not mention D1 column naming.
- The file does not import Worker binding types.

### Intended consumers

- `T-003-01-03`: persistence module input/output type.
- `T-003-02-01`: route validation result and persistence input.
- `T-003-02-02`: form payload shape.
- `T-003-03-01`: retrieval response item shape.

### Internal organization

- File-level comment states that validation belongs at untrusted boundaries.
- Runtime tuple comes first.
- Derived discriminator type follows.
- Interface follows last.
- No default export.
- No private helpers because there is no behavior.

## Created — `migrations/0001_create_backstage_entries.sql`

### Responsibility

Create the initial D1 physical schema that can store the public contract while
retaining a storage-private insertion-order key.

### SQL shape

```sql
CREATE TABLE backstage_entries (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('reference', 'feedback')),
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
```

### Column mapping

| SQL column | Public field | Notes |
|---|---|---|
| `id` | none | Private ordering/tie-break key; future inserts omit it |
| `type` | `type` | Same bytes; database check narrows values |
| `url` | `url` | Same bytes; no SQL URL parsing |
| `text` | `text` | Same bytes; no normalization |
| `submitted_at` | `submittedAt` | Persistence layer explicitly aliases/maps |

### Schema rules

- `id` is `INTEGER PRIMARY KEY`, using SQLite rowid behavior.
- It is not exposed in `BackstageEntry`.
- `AUTOINCREMENT` is omitted.
- All portable fields are `NOT NULL`.
- `type` has a database `CHECK` matching the TypeScript tuple.
- No uniqueness constraint is imposed on any public field.
- Equal timestamps are allowed.
- Repeated URLs and identical feedback are allowed.
- No default timestamp is generated in SQL; callers supply the contract value.
- No index is added because listing by primary key needs none.
- No trigger, view, seed data, or down migration is added.
- The migration is forward-only under Wrangler's migration model.

### Future query boundary

The next ticket can insert with:

```sql
INSERT INTO backstage_entries (type, url, text, submitted_at)
VALUES (?, ?, ?, ?)
```

It can list with an explicit mapping/order:

```sql
SELECT type, url, text, submitted_at
FROM backstage_entries
ORDER BY id ASC
```

Those statements are architectural examples only; no persistence module or query
constant is introduced by this ticket.

## Modified — `wrangler.jsonc`

### Existing responsibilities retained

- JSONC config remains the Worker deployment source of truth.
- Existing `ASSETS` binding remains unchanged.
- Existing Worker name, main entry, compatibility settings, and comments remain.
- No account ID, token, secret, or resource UUID is committed.

### New responsibility

Declare D1 as the backstage entry store:

```jsonc
"d1_databases": [
  {
    "binding": "BACKSTAGE_DB",
    "migrations_dir": "./migrations"
  }
],
```

### Placement

- Add the rationale comment after the existing deploy/configuration preamble.
- Place `d1_databases` after `main` and before `assets`.
- Preserve valid comma placement for JSONC.
- Keep each binding expanded over multiple lines for later generated name/ID
  fields.

### Rationale comment

One paragraph beside the binding records:

- D1 is chosen for a fixed structured append/list feed.
- D1 enforces the discriminator and performs one deterministic ordered query.
- KV would require key/list/value composition and has delayed cross-location
  visibility.
- Automatic provisioning keeps the config account-agnostic and per-project.

### Provisioning lifecycle

- Before first deploy, the declaration contains binding plus migration directory.
- Wrangler validates and locally simulates this declaration.
- An authenticated first deploy can create the D1 database automatically.
- Wrangler can then write resource name/ID into this same source-of-truth config.
- The owner applies committed migrations through Wrangler as an operational step.
- This ticket does not create or mutate a remote resource.

## Explicitly unchanged — `src/env.d.ts`

### Reason

- No executable code reads `BACKSTAGE_DB` in this ticket.
- The file already contains unrelated uncommitted prerequisite changes.
- Adding a binding field now would create an unused declaration and risk including
  someone else's changes in this ticket commit.
- `T-003-01-03` will need `BACKSTAGE_DB: D1Database` when it implements access and
  can add the runtime type at the actual consumption boundary.

### Generated-type verification

- `wrangler types` will still be run to a temporary path after the config change.
- The generated output must include `BACKSTAGE_DB: D1Database`.
- The temporary file is verification evidence, not a committed duplicate of the
  project's hand-authored Astro runtime interface.

## Explicitly unchanged — package and test configuration

- No dependency is needed for a TypeScript interface or D1 migration.
- `package.json` and `package-lock.json` already contain unrelated dirty work.
- No new npm script is required; Wrangler commands are invoked directly.
- The existing `npm test` suite remains the regression gate.
- SQL behavior is verified through Wrangler's local D1 runtime.
- TypeScript behavior is verified by `npx tsc --noEmit`.

## Artifact structure

### `progress.md`

- Restates planned units.
- Records each commit hash and exact file set.
- Records Wrangler version.
- Records local migration and constraint evidence.
- Records type, test, build, dry-run, diff, and ticket-integrity results.
- Documents deviations before altered implementation work, if any.

### `review.md`

- Summarizes product/config files and artifacts.
- Maps implementation to acceptance criteria.
- Evaluates type, migration, binding, and regression coverage.
- Calls out remote provisioning/migration as an operator concern.
- Calls out runtime payload validation and binding consumption as downstream work.

## Dependency direction

```text
future form / submission route / retrieval seam
                    |
                    v
       src/lib/backstage-entry.ts
                    |
                    v
      future persistence mapping module
                    |
                    v
  BACKSTAGE_DB binding -> backstage_entries table
```

- The portable contract does not depend on storage.
- Future persistence depends on both the portable contract and D1 binding.
- HTTP/UI layers depend on the contract and persistence interface, not raw SQL.
- The migration depends on no application module.
- Wrangler configuration binds infrastructure but contains no domain code.

## Change ordering

1. Create Structure and Plan artifacts and commit them.
2. Create the TypeScript contract and compile it.
3. Create the SQL migration and apply it locally.
4. Add the D1 binding/rationale to Wrangler config.
5. Regenerate binding types to a temporary path and inspect them.
6. Run dry-run/build/regression/hygiene gates.
7. Update and commit `progress.md` with exact evidence.
8. Self-review diffs, fix ticket-scoped issues, then create `review.md`.

The source contract and migration can be understood independently. The migration
and binding land together as the meaningful storage unit so no commit leaves a
declared remote resource without its schema or a schema without its binding.

## Out-of-scope file shapes

The following are deliberately not created:

- `src/lib/backstage-entry-store.ts` — belongs to `T-003-01-03`.
- `src/pages/api/backstage/*.ts` — belongs to later submit/retrieve tickets.
- `src/pages/backstage.astro` — belongs to the phone-friendly surface ticket.
- runtime validation schema — belongs at the submission boundary.
- generated remote resource IDs — require the owner's authenticated account.
- KV namespace configuration — D1 is the chosen store.
