# Review — T-003-01-01 entry schema and storage binding

## Outcome

The ticket acceptance criterion is met. A backstage entry now has a committed,
portable TypeScript contract with exactly the requested fields and discriminator,
and the project declares a locally validated, automatically provisionable D1
binding backed by a committed migration. The D1-over-KV rationale lives beside the
binding in `wrangler.jsonc`, where a future operator or maintainer will encounter
the decision.

No ticket phase or status field was changed. No remote resource was created or
modified.

## Acceptance mapping

| Acceptance clause | Implementation | Evidence | Status |
|---|---|---|---|
| committed schema/type | `BackstageEntry` plus D1 migration | commits + isolated TypeScript compile + local migration | met |
| `type` is `reference` or `feedback` | derived literal union and SQL `CHECK` | generated type source + rejected invalid insert | met |
| `url`, `text`, `submittedAt` pinned | required interface fields and non-null SQL columns | source/schema inspection | met |
| chosen binding in Wrangler config | `BACKSTAGE_DB` under `d1_databases` | Wrangler generated types and dry run | met |
| one-paragraph KV/D1 rationale | config preamble and expanded Design | committed text | met |
| Wrangler validates binding | local migration, type generation, deploy dry run | all exit 0 | met |

## Storage decision

D1 was chosen for this concrete backstage workload because it is an append-and-list
feed of fixed structured records. It can enforce the two allowed entry types, read
all public fields in one ordered SQL query, and support a predictable immediate
write/list test. KV would require a sortable unique-key protocol, paginated key
listing, additional value reads or metadata duplication, and accommodation for
eventual cross-location visibility of new entries.

This decision does not establish D1 as a template-wide default. It is scoped to the
entry feed and its downstream round-trip/retrieval requirements.

## Public application contract

`src/lib/backstage-entry.ts` exports:

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

Review findings:

- The literal union derives from a runtime tuple, avoiding duplicate TypeScript
  sources of truth.
- All four requested fields are present and required.
- No unspecified public ID was added.
- The contract is framework-free and storage-independent.
- `submittedAt` remains portable JSON text.
- Runtime payload validation is correctly not claimed by an erased interface.
- No mutation, normalization, I/O, or timestamp generation slipped into scope.

## Physical D1 contract

`migrations/0001_create_backstage_entries.sql` creates:

```sql
CREATE TABLE backstage_entries (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('reference', 'feedback')),
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
```

Review findings:

- `id` is storage-private and supplies a total insertion-order tie-breaker.
- `AUTOINCREMENT` is not used because permanent row-ID non-reuse is not required.
- Every public field is non-null.
- Equal timestamps, repeated URLs, and identical feedback are allowed.
- The type constraint mirrors the public tuple.
- There is no unnecessary index; primary-key ordering is available directly.
- No seed, trigger, update/delete behavior, retention rule, or speculative relation
  was added.
- The future persistence module must explicitly map `submitted_at` to
  `submittedAt` and omit `id` from public output.

## Wrangler configuration

`wrangler.jsonc` now declares:

```jsonc
"d1_databases": [
  {
    "binding": "BACKSTAGE_DB",
    "migrations_dir": "./migrations"
  }
]
```

Review findings:

- `BACKSTAGE_DB` is descriptive and a valid environment property name.
- `migrations_dir` points at the committed schema.
- Binding-only configuration is valid under installed Wrangler `4.110.0` and its
  config schema.
- Omitting resource name/ID enables Wrangler automatic provisioning and prevents
  the template from pinning another owner's Cloudflare resource.
- No `remote: true` flag risks accidental production mutation in local work.
- No account ID, database UUID, API token, passcode, or signing key was introduced.
- Existing Worker/static-assets settings are unchanged.
- The static-first application architecture is unaffected; D1 is only a binding
  available to future on-demand routes.

## Files created

| File | Purpose |
|---|---|
| `src/lib/backstage-entry.ts` | Portable entry literal values and TypeScript shape |
| `migrations/0001_create_backstage_entries.sql` | Initial constrained D1 table |
| `docs/active/work/T-003-01-01/research.md` | Codebase/platform map and constraints |
| `docs/active/work/T-003-01-01/design.md` | KV/D1 options, decision, and rationale |
| `docs/active/work/T-003-01-01/structure.md` | File/interface/storage blueprint |
| `docs/active/work/T-003-01-01/plan.md` | Ordered implementation and verification plan |
| `docs/active/work/T-003-01-01/progress.md` | Execution ledger and exact evidence |
| `docs/active/work/T-003-01-01/review.md` | This handoff |

## Files modified

| File | Change |
|---|---|
| `wrangler.jsonc` | Added the D1 rationale and `BACKSTAGE_DB` binding |

No file was deleted. `src/env.d.ts`, package metadata, routes, pages, tests, and the
ticket file were not changed by this ticket.

## Commit inventory

1. `fae4b06` — Research and Design artifacts.
2. `c556040` — Structure and Plan artifacts.
3. `fc6f903` — entry contract, migration, D1 binding, and rationale.
4. `a8de13a` — implementation progress/evidence ledger.

This Review artifact is committed separately after creation. `git show --check`
reported no whitespace errors in the four pre-review commits. Explicit-path staging
kept concurrent work out of every ticket commit.

## D1 migration coverage

Command:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB --local
```

Result: pass. Wrangler applied `0001_create_backstage_entries.sql` to local D1.

The follow-up schema query verified:

- table `backstage_entries` exists;
- exact column order is `id`, `type`, `url`, `text`, `submitted_at`;
- `id` is the primary key;
- all four public columns are non-null;
- the committed two-value type check is present.

An attempted row with `type = 'other'` failed with
`SQLITE_CONSTRAINT_CHECK`. A follow-up count confirmed zero out-of-contract rows.

## Binding coverage

`npx wrangler types` was run to a temporary path outside the repository. It passed
and generated both:

```ts
BACKSTAGE_DB: D1Database;
ASSETS: Fetcher;
```

The temporary file was removed because no ticket code consumes the database yet
and the project already maintains its Astro runtime environment type by hand.

Final configuration/build validation:

```sh
npm run build
npx wrangler deploy --dry-run
```

Both passed. Wrangler read the built assets, reported `env.BACKSTAGE_DB` as a D1
Database and `env.ASSETS` as Assets, then exited in dry-run mode. No authenticated
deploy or remote provisioning occurred.

## Automated regression coverage

Final `npm test`: **52/52 passed**, zero failed/skipped/cancelled.

The suite includes the existing operation, fault, disclosure, integration, and
concurrent passcode tests. It provides broad regression confidence but does not
directly exercise this ticket's interface because TypeScript interfaces erase at
runtime and no persistence behavior was added.

Ticket-specific static compile:

```sh
npx tsc --noEmit --skipLibCheck --module esnext --target es2022 \
  --moduleResolution bundler src/lib/backstage-entry.ts
```

Result: pass.

This combination is proportionate for a value/type declaration plus SQL migration:
the contract compiles, the actual local D1 engine accepts the schema, the constraint
is exercised negatively, and the built Worker validates the binding.

## Coverage gaps

### Application write/list round trip

There is no application module or test that inserts a `BackstageEntry` and maps a
D1 row back yet. That is the explicit acceptance criterion of dependent ticket
`T-003-01-03`. It must assert every field round-trips byte-for-byte and should
include Unicode/newline/query-string content plus equal-timestamp ordering.

### Runtime input validation

The interface does not validate JSON, URL syntax, string lengths, empty values, or
timestamp format. `T-003-02-01` owns malformed-payload rejection. Its validator
should consume `BACKSTAGE_ENTRY_TYPES` rather than duplicate the discriminator
list.

### Remote resource lifecycle

No remote D1 database was provisioned and no remote migration was applied. The
project owner must perform the authenticated first deployment/provisioning and run
the Wrangler remote migration workflow before live submit/retrieve routes depend on
the table. This preserves the ticket's no-external-mutation boundary but remains an
operator step.

### Runtime environment typing

The hand-authored Astro `Env` in `src/env.d.ts` does not yet declare
`BACKSTAGE_DB`. This is intentional because this ticket adds no executable binding
consumer and that file had concurrent edits. `T-003-01-03` must add
`BACKSTAGE_DB: D1Database` when it implements the persistence boundary.

## Open concerns

### Branch-wide TypeScript check — human attention required

`npx tsc --noEmit` currently exits 2 in concurrently committed
`src/lib/passcode.ts` (`T-003-01-02`): TypeScript does not accept access to
`decision.reason` and `decision.status` on the current `GateDecision` narrowing.
Those errors are unrelated to this ticket and existed while its implementation was
being validated, so this ticket did not absorb the fix. The full branch should not
be considered type-check green until that ticket corrects the narrowing. This
ticket's source compiles independently, all 52 tests pass, and Astro build passes.

### Automatic provisioning nuance

CLI-driven Wrangler deployment can write provisioned resource identity back into
the source config. Dashboard/Git-based creation may not update the repository with
that identity automatically. Operators should treat `wrangler.jsonc` as source of
truth and confirm the generated database identity during the first real deploy.

### Existing adapter session warning

Astro build prints an existing Cloudflare adapter message about a `SESSION` KV
binding. This ticket neither introduced sessions nor changed that behavior. It did
not block build or D1 dry-run validation, but the project should resolve it before
using Astro sessions.

## Security and sovereignty review

- No secret value is accepted, stored, logged, or committed by this change.
- The public entry contract can carry arbitrary strings; the later UI/API must
  prominently refuse secrets as required by the product specification.
- D1 remains in the deploying project's Cloudflare account.
- The template contains no dependency on an author's central service.
- Account-specific resource identity is not pre-baked.
- Local D1 is the default development target.
- No remote data was accessed during verification.

## Downstream handoff

`T-003-01-03` can proceed against these pinned contracts. Its implementation should:

1. add `BACKSTAGE_DB: D1Database` at the runtime binding boundary;
2. accept/return `BackstageEntry` from the shared module;
3. insert only `type`, `url`, `text`, and `submitted_at`;
4. list explicitly by `id` in a documented direction;
5. map `submitted_at` to `submittedAt` and omit private `id`;
6. use prepared/bound statements;
7. test byte-for-byte round trips for every field;
8. apply migrations to isolated local test state.

Later route/form work must validate untrusted values and compose over the shared
passcode gate without moving the D1 binding or passcode into browser code.

## Final assessment

The ticket's requested schema/type, storage choice, binding, rationale, and Wrangler
validation are complete and committed. The implementation is deliberately limited
to the contract and infrastructure seam, leaving persistence behavior, runtime
validation, passcode composition, UI, and agent retrieval to their dependency-
ordered tickets. The only critical shared-branch concern is the unrelated passcode
TypeScript error documented above.
