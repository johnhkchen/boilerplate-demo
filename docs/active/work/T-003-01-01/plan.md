# Plan — T-003-01-01 entry schema and storage binding

## Execution policy

- Follow these steps in order without pausing between RDSPI phases.
- Stage explicit paths because the shared working tree is already dirty.
- Never stage the ticket file or unrelated prerequisite changes.
- Record deviations in `progress.md` before proceeding with a changed approach.
- Do not authenticate, provision, deploy, or mutate a remote Cloudflare resource.
- Commit after each meaningful unit of work.

## Step 1 — establish the shared TypeScript contract

### Do

Create `src/lib/backstage-entry.ts` with:

- `BACKSTAGE_ENTRY_TYPES` as a readonly `['reference', 'feedback']` tuple;
- `BackstageEntryType` derived from that tuple;
- `BackstageEntry` with required `type`, `url`, `text`, and `submittedAt` fields;
- a short boundary comment explaining that runtime validation belongs to callers.

Do not add an ID, optional fields, parsing, normalization, timestamp generation,
framework imports, or storage imports.

### Verify

- Read the file and compare field names/casing to the ticket.
- Run `npx tsc --noEmit`.
- Confirm TypeScript emits no error.
- Confirm `rg` finds exactly the two discriminator literals in the tuple (plus
  docs/migration where duplication is intentional).

### Atomic result

The application has a portable contract that future layers can import without
depending on Astro or Cloudflare.

## Step 2 — create the executable D1 schema

### Do

Create `migrations/0001_create_backstage_entries.sql` with one table:

- private `id INTEGER PRIMARY KEY`;
- `type TEXT NOT NULL` with `reference`/`feedback` check;
- `url TEXT NOT NULL`;
- `text TEXT NOT NULL`;
- `submitted_at TEXT NOT NULL`.

Do not add seed rows, indexes, triggers, views, uniqueness, defaults, or destructive
statements.

### Verify before binding

- Inspect SQL syntax manually.
- Confirm the migration number/name is stable and descriptive.
- Confirm SQL public columns map one-for-one to the TypeScript fields.
- Confirm only the private `id` lacks a public counterpart.

### Atomic result

The selected relational store has a version-controlled physical schema.

## Step 3 — declare the binding and durable rationale

### Do

Modify only `wrangler.jsonc`:

- insert a one-paragraph KV-versus-D1 rationale in the existing comment preamble;
- add `d1_databases` with binding `BACKSTAGE_DB`;
- point `migrations_dir` at `./migrations`;
- omit account-specific database name and ID for Wrangler provisioning;
- preserve every existing Worker/static-assets setting.

### Verify

- Parse/validate through Wrangler rather than a plain JSON parser because the file
  is JSONC.
- Confirm the installed schema requires only `binding` for D1 items.
- Confirm no token, account ID, database ID, or secret appears in the diff.
- Confirm the `ASSETS` binding remains unchanged.

### Atomic result

The Worker declares a project-owned, automatically provisionable D1 resource with
its migration location and local rationale.

## Step 4 — apply and inspect the migration locally

### Do

Run:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB --local
```

Then query the local database through Wrangler for the table definition and column
metadata.

### Verify happy schema

- Migration command exits 0.
- `backstage_entries` exists.
- Columns are `id`, `type`, `url`, `text`, `submitted_at` in that order.
- Public fields are `NOT NULL`.
- `id` is the primary key.
- The stored SQL contains the discriminator `CHECK`.

### Verify constraint

Execute a local insert with an invalid type and require non-zero/constraint-failure
evidence. Then query the table and verify the invalid row was not stored.

Optionally insert valid reference and feedback rows only if needed to prove the
constraint path; local state is uncommitted and disposable. This ticket does not
add persistence application code.

### Atomic result

Wrangler's actual local D1 runtime accepts the migration and enforces the key domain
constraint.

## Step 5 — generate and inspect Wrangler binding types

### Do

Run `npx wrangler types` with an output path under a temporary directory outside the
repository.

### Verify

- Command exits 0.
- Generated environment contains `BACKSTAGE_DB: D1Database`.
- Existing `ASSETS: Fetcher` binding remains represented.
- No generated file is left in the repository.

### Rationale

The Wrangler skill requires type generation after config changes. A temporary file
is appropriate because the project already has a hand-authored Astro runtime
interface containing server secrets, and no code consumes D1 in this ticket.

## Step 6 — commit the implementation unit

### Pre-commit checks

- `git diff --check` on ticket-owned paths.
- `git diff -- docs/active/tickets/T-003-01-01.md` is empty.
- `git status --short` shows only expected ticket-owned additions/changes plus
  known unrelated dirty files.
- Review the full `wrangler.jsonc` diff for accidental edits.

### Commit paths

Stage only:

- `src/lib/backstage-entry.ts`;
- `migrations/0001_create_backstage_entries.sql`;
- `wrangler.jsonc`.

### Commit message

`Add backstage entry contract and D1 binding (T-003-01-01)`

### Atomic result

The schema/type, physical migration, binding, and rationale land together.

## Step 7 — full regression and deployment-shape validation

### Commands

Run, in this order:

1. `npx tsc --noEmit`;
2. `npm test`;
3. `npm run build`;
4. `npx wrangler deploy --dry-run`;
5. `git diff --check`.

### Verification criteria

- TypeScript exits 0.
- Every registered unit test passes with none skipped/failing.
- Astro build succeeds and emits the Worker/static assets.
- Wrangler dry-run exits 0 and reports the `BACKSTAGE_DB` D1 binding.
- Dry-run performs no deploy and creates no remote database.
- Whitespace check is clean.

### Failure handling

- If dry-run rejects binding-only automatic provisioning, verify current docs and
  installed schema before changing config.
- Do not invent or commit placeholder UUIDs.
- If local migration commands require a different selector, use the documented
  binding form and record the exact deviation.
- If an unrelated existing test fails, isolate whether the ticket caused it and
  record evidence; do not edit unrelated code speculatively.

## Step 8 — write `progress.md`

### Contents

- Scope and dirty-tree precautions.
- Completed Research/Design and Structure/Plan commit hashes.
- Implementation commit hash.
- Exact Wrangler/type/migration/constraint/build/test outputs.
- Any deviations and rationale.
- Remaining Review work.

### Commit

Stage only `docs/active/work/T-003-01-01/progress.md` and commit with:

`Record entry schema implementation evidence (T-003-01-01)`

## Step 9 — Review phase

### Inspect

- `git show` each ticket commit.
- Compare final files against ticket acceptance criteria.
- Confirm no future persistence/route behavior slipped into scope.
- Confirm comments accurately describe automatic provisioning.
- Confirm D1 rationale is a single readable paragraph beside configuration.
- Confirm the ticket frontmatter remains unchanged.
- Confirm no `.wrangler/` local state is staged.

### Review artifact

Create `docs/active/work/T-003-01-01/review.md` containing:

- outcome and acceptance mapping;
- exact files created/modified/deleted;
- design rationale and public/storage contracts;
- local migration and Wrangler validation evidence;
- regression coverage and gaps;
- deployment/operator concerns;
- downstream responsibilities and open limitations.

### Final commit

Stage only `review.md` and commit with:

`Add review artifact for entry schema and binding (T-003-01-01)`

After this artifact is written, stop. Lisa owns phase/status transitions.

## Testing strategy summary

### Static contract coverage

- `npx tsc --noEmit` compiles the shared tuple, derived union, and interface.
- Code review verifies exact field set because TypeScript has no runtime reflection
  for erased interface fields.

### Storage schema coverage

- Wrangler local migration application validates D1/SQLite syntax.
- Schema query verifies columns and constraints.
- Invalid insert verifies the discriminator `CHECK` rejects out-of-contract data.

### Configuration coverage

- `wrangler types` proves binding type resolution.
- `wrangler deploy --dry-run` validates the built Worker and reports the binding.

### Regression coverage

- Existing Node test suite checks prerequisite integration harness behavior.
- Astro build checks adapter/runtime bundling.
- No new application unit test is warranted because this ticket adds no behavior;
  persistence behavior is explicitly the next ticket's test-driven scope.

## Acceptance mapping

| Acceptance clause | Planned evidence |
|---|---|
| committed schema/type | `backstage-entry.ts` plus D1 migration |
| type is reference or feedback | derived TypeScript union plus SQL `CHECK` |
| url/text/submittedAt pinned | required interface fields plus non-null columns |
| chosen binding in Wrangler | `BACKSTAGE_DB` under `d1_databases` |
| rationale for KV or D1 | one paragraph adjacent to binding and in Design |
| Wrangler validates binding | type generation, local migration, deploy dry-run |

## Known deferred concerns

- Runtime JSON validation and string length limits.
- URL optionality/syntax rules for feedback versus references.
- Timestamp production and format validation.
- Binding addition to Astro's runtime `Env` type.
- Prepared write/list statements and row mapping.
- Remote database provisioning and migration application.
- Feed pagination/limits once real usage establishes requirements.
- Retention, deletion, moderation, and access control.
