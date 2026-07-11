# Plan — T-008-02-01 feed exposes id and completion

## Goal

Evolve the existing gated backstage feed from four-field insert-ready entries to the complete
six-field persisted `BackstageEntry` contract. Prove exact store equivalence after completion and
deletion, preserve gate-before-read ordering, and verify the existing `npm run backstage:feed`
command prints the evolved entries without reshaping them.

## Scope controls

- Modify only the retrieval core, its named test, seam documentation, and workflow artifacts.
- Do not change ticket phase or status.
- Do not change entry/store contracts settled upstream.
- Do not change migrations.
- Do not change submission behavior.
- Do not implement management HTTP mutations owned by `T-008-02-02`.
- Do not add dashboard UI.
- Do not require live Cloudflare services.
- Preserve unrelated Lisa and sibling-ticket worktree changes.

## Step 1 — capture baseline and ownership

Inspect the current status and relevant diff before implementation. Confirm that the only existing
changes are workflow/Lisa state and parallel ticket work. Record owned paths explicitly.

Owned implementation paths:

- `src/lib/backstage-retrieval.ts`
- `test/backstage-retrieval.test.mjs`
- `docs/knowledge/backstage-retrieval-seam.md`
- `docs/active/work/T-008-02-01/*`

Verification:

- `git status --short`
- `git diff -- <owned pre-existing source paths>` should be empty before edits.

Atomic commit boundary: none; preparatory inspection only.

## Step 2 — checkpoint pre-implementation artifacts

Stage only `research.md`, `design.md`, `structure.md`, and `plan.md`. Check whitespace and inspect
the staged diff. Commit the RDSPI reasoning as the implementation blueprint.

Verification:

- all four artifacts exist in the ticket work directory;
- `git diff --cached --check` passes;
- staged paths contain no ticket-frontmatter or provenance changes.

Atomic commit boundary: documentation plan commit.

## Step 3 — publish canonical entries

In `src/lib/backstage-retrieval.ts`:

1. Remove the `NewBackstageEntry` type import.
2. Keep the `BackstageEntry` import.
3. Change `BackstageFeed.entries` to `BackstageEntry[]`.
4. Delete `toCurrentFeedEntry`.
5. Assign `await listEntries(input.db)` directly to `entries`.
6. Update comments that still describe the staged four-field feed.
7. Retain schema version 1.
8. Retain gate, store-presence, response, count, and error behavior.

Verification:

- source contains no `toCurrentFeedEntry`;
- source contains no `NewBackstageEntry`;
- entries come directly from `listEntries`;
- `git diff --check` passes.

Atomic commit boundary: combine with Steps 4–7 so runtime and acceptance evidence remain coherent.

## Step 4 — update basic feed expectations

In `test/backstage-retrieval.test.mjs`:

1. Update single-entry expected output with `id: 1` and `completedAt: null`.
2. Preserve explicit URL/text byte assertions.
3. Update hard-content expected output the same way.
4. Update the multi-entry test for ids 1, 2, 3 and null completion.
5. Rename the envelope test to describe the complete persisted contract.
6. Assert exact six-field key presence.
7. Retain schema version, gate, count, empty-state, and account-free assertions.

Verification:

- focused test should no longer assert id/completion absence;
- every normal feed fixture pins both fields;
- hard-content fields remain unchanged.

## Step 5 — add completion/delete lifecycle proof

Extend the store imports with `listEntries`, `setEntryCompletion`, and `deleteEntry`. Add one test
that saves three rows, resolves their ids from the store, completes one, deletes another, and then
retrieves the feed.

Assertions:

- both mutation calls report success;
- current store state contains two rows;
- feed entries deeply equal the current store state;
- the completed row carries the fixed timestamp exactly;
- the deleted id does not occur;
- surviving ids remain ascending and stable;
- count equals two;
- existing type, URL, text, and submittedAt values are preserved.

Verification:

- run the focused test after this step;
- a deliberately removed direct publication should make this test fail.

## Step 6 — prove gate precedes reads

Introduce a trap database with a counting `prepare()` method. Add a table-driven denial test for:

- absent request passcode → 401;
- mismatched request passcode → 403;
- blank configured server passcode → 500.

For each case assert the expected status, no entries, and zero prepare calls. Existing individual
gate tests may be retained for readable response coverage; avoid redundant real-store setup where
the trap gives stronger evidence.

Verification:

- focused test passes with zero reads;
- moving `listEntries` above `guardPasscode` would trigger the trap and fail.

## Step 7 — prove the repo-local CLI is transparent

Add a local loopback HTTP server and execute the actual package command in a child process. Return
an envelope with two complete six-field fixtures. Configure the child through environment variables.

Assertions:

- command exits successfully;
- parsed stdout exactly equals the envelope's `entries` array;
- both `id` and `completedAt` survive;
- hard URL/text content survives;
- entry ordering survives;
- the server receives the expected passcode header;
- stderr contains no failure.

Implementation safety:

- invoke the process without a shell;
- use an ephemeral loopback port;
- close the server in `finally`;
- set a bounded timeout value;
- do not depend on `.dev.vars`.

Verification:

- focused test includes and passes the package-command scenario;
- production CLI source remains unchanged.

## Step 8 — update public seam documentation

Revise `docs/knowledge/backstage-retrieval-seam.md`:

1. Add id and completion to the JSON example.
2. Describe six public fields.
3. Explain stable numeric id semantics.
4. Explain null/string completion semantics.
5. State that completes and deletes appear on subsequent reads.
6. Remove all obsolete no-id/storage-private claims.
7. Retain content fidelity, ordering, gate, status, CLI, and low-stakes warnings.
8. Update verification prose for two migrations, lifecycle coverage, and CLI proof.

Verification:

- `rg -n "No id leak|never exposes|exactly four|storage-private"` finds no obsolete claim in the
  document;
- example JSON is valid in shape;
- public behavior matches tests.

## Step 9 — focused verification

Run:

```sh
node --experimental-strip-types --test test/backstage-retrieval.test.mjs
```

Acceptance criteria for the focused run:

- zero failures;
- lifecycle test passes;
- gate-read trap passes for all denial states;
- CLI package-command test passes;
- no open handles remain after the HTTP-server test.

If the child-process test hangs, inspect server closing and subprocess environment before changing
production code. Document any plan deviation in `progress.md` before proceeding.

## Step 10 — static and repository regression gates

Run:

```sh
npm run typecheck
npm test
```

Type acceptance:

- `BackstageFeed.entries` accepts the canonical store result;
- no obsolete import or mapper remains;
- Astro and Worker types remain current.

Regression acceptance:

- all existing Node tests pass;
- submission remains four-field at its response boundary;
- store mutation and retrieval tests stay coherent;
- no unrelated runtime test regresses.

The focused test may already run inside `npm test`; rerunning is intentional because it separates
ticket diagnosis from whole-repository evidence.

## Step 11 — inspect diff and write progress

Review the complete owned diff. Confirm:

- only intended source/test/documentation files changed;
- ticket frontmatter is untouched by this work;
- the feed envelope changed only by added entry fields;
- CLI production code did not need alteration;
- tests compare feed directly with canonical store state;
- no secret-like fixture or account identifier was added.

Run:

```sh
git diff --check
git diff --stat -- <owned paths>
```

Write `progress.md` with completed steps, exact commands/results, deviations, and remaining work.

Atomic commit boundary: implementation, tests, seam documentation, and progress evidence.

## Step 12 — implementation commit

Stage only:

- `src/lib/backstage-retrieval.ts`
- `test/backstage-retrieval.test.mjs`
- `docs/knowledge/backstage-retrieval-seam.md`
- `docs/active/work/T-008-02-01/progress.md`

Inspect staged names and staged diff. Run `git diff --cached --check`. Commit with a ticket-scoped
message. Do not stage Lisa provenance, ticket files, or sibling work.

## Step 13 — review phase

Write `review.md` as the human handoff. Include:

- verdict against every acceptance clause;
- files modified/created/deleted;
- runtime contract change;
- test commands and exact pass counts;
- focused lifecycle, gate, and CLI coverage;
- type coverage;
- intentional gaps and non-goals;
- open concerns or operational prerequisites;
- commit hashes;
- critical human-attention callout, even if none.

Run `git diff --check` for the review artifact and commit it separately if repository workflow
allows. Stop after `review.md` exists; Lisa owns phase/status transitions.

## Failure and rollback strategy

- If direct store publication fails types, fix the feed interface rather than casting.
- If legacy tests expect four fields outside the named test, inspect whether they consume the feed
  or the unchanged POST response before updating them.
- If CLI execution fails only on command lookup, use `process.env.npm_execpath` with Node as a
  portable package-manager invocation; document the deviation.
- If a test exposes an actual CLI projection, update the CLI minimally and include it in owned
  paths; current research indicates this should not be needed.
- Do not revert or overwrite concurrent sibling changes.
- Do not weaken gate-read or deep-equivalence assertions to obtain green tests.

## Definition of done

- Feed entries are exactly canonical `BackstageEntry` values.
- Numeric id and nullable completion are present.
- Old content fields remain verbatim.
- Oldest-first ordering remains store-defined.
- Completed state is visible.
- Deleted state is absent.
- Gate denial performs zero store reads.
- The actual `npm run backstage:feed` command prints the six-field entries unchanged.
- Focused, full unit, and type gates pass.
- Public documentation is accurate.
- `progress.md` and `review.md` exist.
- Ticket frontmatter remains Lisa-owned and unstaged.
