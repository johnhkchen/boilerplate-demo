# Progress — T-003-01-01 entry schema and storage binding

## Outcome so far

Implementation is complete. The repository now has:

- a portable four-field `BackstageEntry` TypeScript contract;
- a D1 migration for constrained structured entry rows;
- an account-agnostic `BACKSTAGE_DB` binding in `wrangler.jsonc`;
- a durable one-paragraph D1-over-KV rationale beside the binding;
- local Wrangler evidence that the schema applies and rejects invalid types;
- dry-run evidence that the built Worker receives the D1 binding.

Review remains after this ledger is committed.

## Shared working-tree precautions

- The repository was already substantially dirty before this ticket began.
- Existing modifications included package metadata, runtime environment types,
  receipt/fault code, test files, and planning files.
- A parallel ticket added untracked passcode source/tests during this work.
- All ticket commits used explicit path staging.
- No `git add -A`, reset, checkout, clean, or destructive command was used.
- No pre-existing modification was rewritten or staged.
- `src/env.d.ts` was intentionally left unchanged because no ticket code consumes
  the D1 binding yet and that file contains unrelated edits.
- `package.json` and `package-lock.json` were intentionally left unchanged.
- `.wrangler/state` contains local development state and remains ignored/uncommitted.
- The ticket markdown was never edited or staged.
- No remote Cloudflare command was run.

## Research phase — complete

Created `research.md` with:

- ticket boundaries and downstream dependency map;
- product/charter constraints;
- existing Astro, library, type, and Wrangler conventions;
- current dirty-tree constraints;
- Workers KV consistency/listing characteristics;
- D1 schema/query/binding characteristics;
- contract field observations;
- constraints carried into Design.

Current Cloudflare documentation was consulted for KV consistency/listing, D1 SQL,
and Wrangler binding/automatic-provisioning behavior. The installed Wrangler schema
was inspected directly and showed that only `binding` is required for a D1 item.

## Design phase — complete

Created `design.md` comparing:

1. KV with one key per entry;
2. KV with one aggregate feed key;
3. a D1 table;
4. a type/binding-only D1 declaration with schema deferred.

D1 was selected for the concrete fixed-row append/list workload. The decision is
grounded in one-query structured retrieval, deterministic order, database
constraint enforcement, and predictable immediate round-trip tests. KV's cache-like
eventual-consistency/list-plus-get model was not selected. A physical migration was
included now so the storage choice is executable rather than only nominal.

## Research and Design commit

- Commit: `fae4b06`
- Message: `Document entry storage research and design (T-003-01-01)`
- Files:
  - `docs/active/work/T-003-01-01/research.md`
  - `docs/active/work/T-003-01-01/design.md`

## Structure phase — complete

Created `structure.md` defining:

- exact created/modified file inventory;
- module and storage responsibilities;
- public TypeScript exports;
- SQL-to-TypeScript field mapping;
- binding placement and provisioning lifecycle;
- explicit non-change to the dirty runtime-env/package files;
- dependency direction and change ordering.

## Plan phase — complete

Created `plan.md` with nine ordered steps:

1. shared TypeScript contract;
2. executable D1 schema;
3. binding and rationale;
4. local migration/constraint validation;
5. generated binding type inspection;
6. implementation commit;
7. regression/deployment-shape validation;
8. progress ledger;
9. final Review.

It also defines acceptance mapping, test strategy, dirty-tree staging rules, failure
handling, and deferred concerns.

## Structure and Plan commit

- Commit: `c556040`
- Message: `Define entry schema structure and plan (T-003-01-01)`
- Files:
  - `docs/active/work/T-003-01-01/structure.md`
  - `docs/active/work/T-003-01-01/plan.md`

## Implement phase — contract

Created `src/lib/backstage-entry.ts`:

- `BACKSTAGE_ENTRY_TYPES` is the runtime readonly tuple
  `['reference', 'feedback']`.
- `BackstageEntryType` derives from that tuple.
- `BackstageEntry` contains required `type`, `url`, `text`, `submittedAt` fields.
- No public ID, optionality, parser, mutation, I/O, Astro, or Cloudflare dependency
  was added.
- A file comment places runtime validation at untrusted caller boundaries.

Ticket-only type validation:

```sh
npx tsc --noEmit --skipLibCheck --module esnext --target es2022 \
  --moduleResolution bundler src/lib/backstage-entry.ts
```

Result: exit 0.

## Implement phase — D1 migration

Created `migrations/0001_create_backstage_entries.sql`:

- `id INTEGER PRIMARY KEY` is storage-private;
- `type` is non-null text checked against `reference` and `feedback`;
- `url`, `text`, and `submitted_at` are non-null text;
- no public field is unique or defaulted;
- no index/trigger/view/seed/destructive statement was introduced.

Applied locally:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB --local
```

Result: exit 0; Wrangler `4.110.0`; migration
`0001_create_backstage_entries.sql` reported successful; two commands executed.

Schema inspection through local D1 returned:

| cid | name | type | not-null | primary key |
|---:|---|---|---:|---:|
| 0 | `id` | INTEGER | SQLite PK semantics | 1 |
| 1 | `type` | TEXT | 1 | 0 |
| 2 | `url` | TEXT | 1 | 0 |
| 3 | `text` | TEXT | 1 | 0 |
| 4 | `submitted_at` | TEXT | 1 | 0 |

The `sqlite_master` SQL matched the committed migration and retained the
`CHECK (type IN ('reference', 'feedback'))` clause.

Constraint proof:

```sql
INSERT INTO backstage_entries (type, url, text, submitted_at)
VALUES ('other', 'https://example.com', 'invalid',
        '2026-07-10T00:00:00.000Z');
```

Result: expected exit 1 with `SQLITE_CONSTRAINT_CHECK` and the exact type check.
A follow-up query returned `invalid_rows: 0`.

## Implement phase — Wrangler binding

Modified `wrangler.jsonc`:

- added `d1_databases`;
- binding is `BACKSTAGE_DB`;
- migrations directory is `./migrations`;
- no database UUID, account ID, secret, or remote development flag was added;
- existing Worker name, compatibility config, main path, and `ASSETS` binding are
  unchanged;
- added the required rationale paragraph beside the config.

Generated Wrangler types to a temporary external directory:

```sh
npx wrangler types "$tmp/worker-configuration.d.ts"
```

Result: exit 0. Generated `Env` included:

```ts
BACKSTAGE_DB: D1Database;
ASSETS: Fetcher;
```

The temporary directory was removed and no generated type file was committed.

## Implementation commit

- Commit: `fc6f903`
- Message: `Add backstage entry contract and D1 binding (T-003-01-01)`
- Files:
  - `src/lib/backstage-entry.ts`
  - `migrations/0001_create_backstage_entries.sql`
  - `wrangler.jsonc`
- Commit scope check: exactly those three files.

## Regression and configuration evidence

### Existing tests

Command: `npm test`.

Result: exit 0; **38 passed**, 0 failed, 0 skipped, 0 cancelled. This is regression
coverage for existing operation, fault, leak, and integration-harness behavior.
This ticket adds no persistence behavior test because persistence belongs to
`T-003-01-03`.

### Astro build

Command: `npm run build`.

Result: exit 0. Astro completed the Cloudflare server build, client build, static
prerender, and asset rearrangement.

### Wrangler dry run

Command: `npx wrangler deploy --dry-run`.

Result: exit 0. Wrangler read 29 built asset files and reported:

```text
env.BACKSTAGE_DB  D1 Database
env.ASSETS        Assets
--dry-run: exiting now.
```

No deployment or remote resource creation occurred.

### Hygiene

- `git diff --check`: exit 0 across the shared working tree.
- Ticket-owned pre-commit diff check: exit 0.
- Ticket source isolated TypeScript check: exit 0.
- Commit file inventories: only planned ticket paths.
- Ticket markdown: remains untracked as part of the pre-existing planning tree and
  appears in none of this ticket's commits.

## Full TypeScript check concern

Command: `npx tsc --noEmit`.

Result: exit 2 due exclusively to a concurrent, untracked file outside this ticket:

```text
src/lib/passcode.ts(93,20): Property 'reason' does not exist on type GateDecision
src/lib/passcode.ts(125,22): Property 'status' does not exist on type GateDecision
```

`src/lib/passcode.ts` and `test/passcode.test.mjs` appeared while this ticket was in
progress and belong to `T-003-01-02`. They were not modified. The ticket-specific
contract compiles in isolation, `npm test` passes, and Astro build passes. This is an
open shared-tree concern for Review, not a reason to absorb another ticket's fix.

## Deviations from Plan

1. **Repository-wide TypeScript gate is not green.** The planned full `tsc` check
   was run twice and failed on concurrent passcode code. The ticket source was then
   checked independently with equivalent module/target settings and passed. No
   scope expansion was made.
2. **No valid sample rows were inserted.** The migration application, schema
   inspection, and invalid-row rejection fully cover this ticket's schema/binding
   behavior. Verbatim write/list application behavior remains deliberately assigned
   to the next ticket.
3. **Progress is committed after all executable gates.** This follows the planned
   phase order; no implementation deviation was needed.

## Acceptance status before Review

- Committed schema/type: met by TypeScript contract and D1 migration.
- `reference | feedback`: met by derived union and SQL check.
- `url`, `text`, `submittedAt`: met by interface and non-null SQL columns.
- chosen binding in Wrangler: met by `BACKSTAGE_DB` D1 declaration.
- one-paragraph rationale: met beside binding and expanded in `design.md`.
- Wrangler validates binding: met by local migration, generated types, and deploy
  dry-run.
- Ticket phase/status untouched: met; Lisa retains transition ownership.

## Remaining work

1. Review the committed diffs and acceptance mapping adversarially.
2. Confirm open concerns and downstream boundaries.
3. Write and commit `review.md`.
4. Stop without editing ticket frontmatter.
