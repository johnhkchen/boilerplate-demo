# Research — T-003-01-01 entry schema and storage binding

## Ticket state and scope

- Ticket: `T-003-01-01`, `entry-schema-and-storage-binding`.
- Current phase in ticket frontmatter: `research`.
- Parent story: `S-003-01`, `backstage-entry-store`.
- Dependency `T-002-02-03` is represented by committed integration-harness work.
- The requested contract has four named fields: `type`, `url`, `text`, and
  `submittedAt`.
- The `type` field has exactly two stated values: `reference` and `feedback`.
- The acceptance criterion requires a committed schema/type and a storage binding
  in Wrangler configuration.
- It also requires a one-paragraph KV-versus-D1 rationale.
- Wrangler must validate the resulting binding.
- The ticket does not request submit/list behavior; that belongs to
  `T-003-01-03`.
- It does not request HTTP validation; that belongs to `T-003-02-01`.
- It does not request the backstage form; that belongs to `T-003-02-02`.
- Ticket `phase` and `status` are Lisa-owned and must not be edited here.

## Product and architecture context

- `docs/knowledge/product-spec.md` defines the stakeholder backstage surface.
- The surface accepts links, API/document references, feature requests, and
  comments.
- The first implementation is passcode-gated and creates no user accounts.
- A one-to-two-minute refresh cycle is sufficient; hard real-time delivery is not
  required.
- New input must be available through a stable machine-readable interface.
- The eventual consumer may be a repo-local CLI, JSON API, or MCP adapter.
- The project must remain sovereign and deploy in the project owner's Cloudflare
  account.
- The backstage channel must refuse secrets; ordinary feedback is not a secure
  credential exchange.
- Editing, threading, moderation, notifications, and file uploads are explicitly
  outside the founding epic.
- `docs/knowledge/charter.md` permits Cloudflare-first infrastructure but rejects a
  mandatory central service.
- Charter P4 values low-setup structured collaboration.
- Charter P6 requires independent ownership, operation, and transfer.
- Guardrail N5 means a database needs a concrete reason rather than being added by
  habit.

## Downstream dependency contract

- `T-003-01-03` depends directly on this ticket.
- It will implement write/list behavior against the chosen binding.
- Its acceptance test must round-trip every entry field byte-for-byte.
- `T-003-02-01` will validate entry shape before persistence.
- It must distinguish malformed payloads from bad passcodes and avoid writes for
  either failure.
- `T-003-02-02` will submit the same entry shape from a phone-friendly form.
- `T-003-03-01` will expose a documented agent read seam.
- That seam must return exact submitted `text` and `url` bytes.
- These consumers need one shared TypeScript contract rather than independent
  route, form, and storage shapes.
- List order is not stated in a ticket, but a submission feed requires stable,
  understandable ordering.
- Multiple submissions can have the same timestamp at millisecond resolution, so
  a storage-only tie-breaker may be needed without changing the public contract.

## Existing source layout and conventions

- The application is Astro 5 with `@astrojs/cloudflare`.
- Most of the site is statically served; on-demand API routes run in the Worker.
- `src/lib/` contains framework-free modules such as `receipt.ts`, `fault.ts`, and
  `operation-runner.ts`.
- Those modules export explicit interfaces and narrow literal unions near the
  logic that consumes them.
- `src/pages/api/receipt.ts` is a thin runtime edge over pure library code.
- This establishes `src/lib/` as the natural home for the shared entry contract.
- The project uses extensionless relative TypeScript imports.
- It uses two-space indentation and semicolons.
- Tests are Node's built-in test runner with TypeScript type stripping.
- `tsconfig.json` extends Astro's base configuration without local overrides.
- `src/env.d.ts` defines the Cloudflare runtime `Env` used by Astro locals.
- That file currently has unrelated uncommitted edits from prerequisite work.
- Binding access is not needed in this ticket's executable code.
- Avoiding `src/env.d.ts` here prevents absorbing unrelated working-tree changes;
  the persistence ticket can add the binding to its runtime interface when used.

## Existing Wrangler configuration

- The project already uses the preferred `wrangler.jsonc` format.
- Its schema points to `node_modules/wrangler/config-schema.json`.
- Worker name: `demo-runway`.
- Compatibility date: `2026-07-10`.
- Main module: the Astro build output at `dist/_worker.js/index.js`.
- Static assets are bound as `ASSETS` from `./dist`.
- No account ID or API credential is committed.
- The configuration explains that ownership is resolved at deploy time.
- No KV namespace or D1 database is currently declared.
- Installed Wrangler is `4.110.0`, satisfying the project skill's v4 requirement.
- The installed config schema accepts a D1 item with `binding` as its only required
  property.
- Wrangler automatic provisioning can create a bound resource when its ID/name is
  omitted, then write identifiers back during an interactive deploy.
- Default local development uses a persistent local resource rather than the
  production database.
- A binding-only declaration preserves the repository's account-agnostic setup.

## Current repository state

- The working tree already contains many modified and untracked prerequisite
  files.
- `wrangler.jsonc` itself is clean at the start of this ticket.
- No `migrations/` directory exists.
- No backstage entry module exists.
- No work-artifact directory for this ticket existed before Research.
- Ticket-specific commits must stage explicit paths only.
- The ticket file itself must remain byte-for-byte unchanged.

## Workers KV characteristics relevant to the ticket

- Workers KV is an edge key-value store aimed at read-heavy, highly cacheable
  workloads.
- Values are addressed by key; structured filtering and sorting must be encoded in
  key design or implemented after listing.
- `list()` returns key metadata, uses cursors, and caps a page at 1,000 keys.
- Keys are returned in lexicographic UTF-8 byte order.
- Fetching full values generally requires additional `get()` operations unless
  data is duplicated into metadata.
- KV is eventually consistent.
- A newly created key can take up to roughly 60 seconds or more to become visible
  in another location, including after a cached negative lookup.
- That delay overlaps the product's tolerated one-to-two-minute refresh cycle.
- It nevertheless complicates the next ticket's immediate write-then-list
  round-trip assertion.
- Separate unique keys avoid KV's one-write-per-second-per-key limitation.
- KV has no native schema or constraint for the two allowed entry types.
- It has no native atomic SQL-style ordered insert/list contract.
- Relevant current docs:
  - <https://developers.cloudflare.com/kv/concepts/how-kv-works/>
  - <https://developers.cloudflare.com/kv/api/list-keys/>
  - <https://developers.cloudflare.com/kv/api/write-key-value-pairs/>

## D1 characteristics relevant to the ticket

- D1 is Cloudflare's managed serverless database with SQLite semantics.
- Workers access it through an environment binding.
- The data can have a committed SQL schema and database-level constraints.
- SQL can list all entry columns in a deterministic order in one query.
- An internal integer primary key can break ties without entering the portable
  public entry shape.
- D1 can preserve submitted strings as `TEXT` values without JSON re-shaping.
- Migrations are managed by Wrangler and default to `./migrations`.
- Local D1 storage is created automatically for ordinary local development.
- D1 is a project-owned Cloudflare resource, consistent with P6.
- It adds schema/migration lifecycle overhead that KV would not require.
- The application does not yet need relations, joins, full-text search, or complex
  transactions.
- Those unused capabilities are not themselves justification for D1.
- Relevant current docs:
  - <https://developers.cloudflare.com/d1/>
  - <https://developers.cloudflare.com/d1/best-practices/query-d1/>
  - <https://developers.cloudflare.com/workers/wrangler/configuration/#d1-databases>

## Contract observations

- TypeScript can pin the application-facing field names and literal union.
- TypeScript types disappear at runtime and do not validate HTTP JSON by
  themselves.
- Runtime request validation remains assigned to `T-003-02-01`.
- A SQL schema can independently constrain the stored `type` values.
- SQL column names conventionally use snake case while the JSON/TypeScript contract
  uses camel case.
- The future persistence module will own that explicit mapping.
- `submittedAt` is best represented in the portable contract as a string; neither
  the ticket nor product spec defines a JavaScript `Date` object protocol.
- The producer will later need to define/validate its timestamp format.
- `url` and `text` are named fields with no optionality stated in the ticket.
- Empty-string policy and URL syntax are runtime-validation concerns, not type-only
  concerns.
- No public entry identifier is requested.
- Adding one to the TypeScript interface would expand the specified contract.

## Constraints carried into Design

- Keep the public contract to exactly the four requested fields.
- Make `type` a closed literal union.
- Keep storage-owned ordering data private to persistence.
- Choose one Cloudflare-native store and declare a valid account-agnostic binding.
- Preserve the existing static-first deployment model.
- Do not implement persistence or HTTP routes early.
- Do not modify the dirty runtime-env file unless executable use requires it.
- Validate configuration with installed Wrangler, without deploying or creating a
  remote account resource.
- Validate any committed D1 migration locally if D1 is selected.
- Record exact commands and results in `progress.md` during Implement.
