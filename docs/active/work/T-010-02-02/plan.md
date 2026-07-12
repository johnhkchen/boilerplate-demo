# Plan — T-010-02-02

## Goal

Make every runnable Node check edge derive its default boundary route and signing-key
environment name from the selected boundary declaration, while preserving all overrides,
check behavior, lifecycle behavior, and current receipt acceptance evidence.

## Preconditions

- Confirm the ticket remains in the Research-start assignment and do not edit frontmatter.
- Preserve all pre-existing working-tree changes.
- Keep phase artifacts in the attempt-private work directory.
- Use only `lisa commit-ticket` with exact include paths for source changes.

## Step 1 — rewire the operation edge

Edit `scripts/ops-check.ts`.

1. Make `.dev.vars` lookup accept the desired key name.
2. Compare parsed variable names to that argument.
3. Build the default URL from a normalized base and `receiptBoundary.path`.
4. Read the process key through `process.env[receiptBoundary.keyEnv]`.
5. Pass `receiptBoundary.keyEnv` to the file fallback.
6. Make touched comments describe declared-key behavior rather than a receipt literal.

Independent verification:

- Inspect the file for direct `/api/receipt` and `DEMO_SIGNING_KEY` lookup literals.
- Confirm `OPS_CHECK_URL` still has first precedence.
- Confirm the core still receives `receiptBoundary`.

## Step 2 — rewire the disclosure edge

Edit `scripts/leak-check.ts`.

1. Import `receiptBoundary`.
2. Parameterize `.dev.vars` lookup with `keyEnv`.
3. Build `responseUrl` from normalized base plus `receiptBoundary.path`.
4. Read the secret from the declared process property and declared file entry.
5. Preserve bundle, timeout, and explicit URL override resolution.

Independent verification:

- Inspect the file for route/key literals.
- Run the leak core unit suite.
- Confirm missing-secret behavior remains owned by `runLeakCheck`.

## Step 3 — thread the declaration through integration configuration

Edit `scripts/integration-check.ts`.

1. Import `BoundaryContract` as a type.
2. Define a local `RuntimeBoundary` pick for `path` and `keyEnv`.
3. Require it in `resolveConfig`.
4. Use it for the optional environment key lookup.
5. Require it in `createTemporaryConfig`.
6. Use a computed key property in temporary Wrangler `vars`.
7. Pass `receiptBoundary` at both call sites in `main`.

Independent verification:

- Typecheck the module through the repository TypeScript command.
- Inspect temporary config construction to ensure fault vars still compose.
- Confirm random key generation and redaction inputs are unchanged.

## Step 4 — derive integration child URLs in `commandFor`

Continue in `scripts/integration-check.ts`.

1. Require `RuntimeBoundary` as the third `commandFor` argument.
2. Build one `boundaryUrl` from `config.baseUrl` and `contract.path`.
3. Set the child signing key at `[contract.keyEnv]`.
4. Assign the derived URL to `OPS_CHECK_URL` for the operation branch.
5. Leave flow child configuration base-only.
6. Assign the same derived URL to `LEAK_CHECK_URL` for the leak branch.
7. Pass `receiptBoundary` from the integration runner callback.

Independent verification:

- Inspect all three branches.
- Confirm both named URL variables use the same `boundaryUrl`.
- Confirm `commandFor` contains `contract.path` directly.
- Run integration core unit tests before the executable lifecycle.

## Step 5 — close the recursive scripts grep

Edit `scripts/release-shared.ts`.

1. Replace the local smoke-check suffix with `receiptBoundary.path`.
2. Replace the deployed version-host suffix with `receiptBoundary.path`.
3. Do not alter release polling, headers, retry behavior, or check configuration.

Independent verification:

- Run `rg -n '/api/receipt' scripts` and require no output.
- Inspect both release URL expressions for the canonical property.

## Step 6 — focused static validation

Run:

```sh
rg -n '/api/receipt' scripts
rg -n 'DEMO_SIGNING_KEY' scripts/ops-check.ts scripts/leak-check.ts scripts/integration-check.ts
git diff --check
git diff -- scripts/ops-check.ts scripts/leak-check.ts scripts/integration-check.ts scripts/release-shared.ts
```

Expected:

- Route grep has no matches.
- Key grep has no concrete lookup/property matches in the three edges.
- Diff check passes.
- Diff contains only declaration-based configuration edits.

## Step 7 — focused automated tests

Run:

```sh
node --experimental-strip-types --test \
  test/boundary-contract.test.mjs \
  test/ops-check.test.mjs \
  test/leak-check.test.mjs \
  test/integration-check.test.mjs \
  test/fault.test.mjs
```

Coverage intent:

- Declaration values remain locked.
- Generic operation behavior stays intact.
- Leak scanning and evidence behavior stay intact.
- Integration aggregation and redaction stay intact.
- Receipt fault verification stays intact.

## Step 8 — repository validation

Run:

```sh
npm test
npm run typecheck
```

Expected:

- All enumerated unit suites pass.
- Astro validation has no errors.
- TypeScript no-emit checks pass.
- Wrangler generated types remain current.

Any pre-existing informational warning will be recorded without treating it as a ticket
failure, provided exit status remains zero and it is unrelated to modified paths.

## Step 9 — executable acceptance validation

Run:

```sh
npm run integration:check
```

This command must:

1. build the project;
2. write an isolated Wrangler config with the declared key name;
3. start the receipt dev server;
4. invoke `npm run ops:check` with the declared path-derived URL;
5. run the existing healthy Playwright flow;
6. invoke `npm run leak:check` with the same declared path-derived URL;
7. report all three checks passed;
8. stop the server and delete temporary config.

Because the integration executable invokes the exact standalone operation and leak npm
scripts, its passing output is direct local-server evidence for all three named commands.

If the integration command reveals a ticket-owned defect, fix it and rerun the narrowest
failed layer followed by the complete integration command.

## Step 10 — progress artifact and commit

Before committing:

- Record implemented changes, deviations, and verification results in `progress.md`.
- Confirm only the four intended script paths contain ticket changes.
- Confirm none is staged in the ordinary index.

Commit one meaningful declaration-wiring unit:

```sh
lisa commit-ticket \
  --ticket-id T-010-02-02 \
  --message "refactor: resolve checks from boundary declaration" \
  --include scripts/ops-check.ts \
  --include scripts/leak-check.ts \
  --include scripts/integration-check.ts \
  --include scripts/release-shared.ts
```

This is one atomic unit because all four paths together satisfy the executable behavior and
recursive script grep boundary.

## Step 11 — post-commit review

1. Capture the resulting commit identifier.
2. Confirm exact source paths are clean with `git status --short -- <paths>`.
3. Confirm no ticket-owned file is staged, modified, or untracked.
4. Re-run or retain the post-edit route grep evidence.
5. Write `review.md` with change summary, tests, acceptance mapping, risks, and open concerns.
6. Stop on this ticket after Review; do not change ticket frontmatter or start other work.

## Deviation policy

- Document any deviation in `progress.md` before continuing.
- Do not expand into browser-flow or core changes unless verification proves they are
  necessary for this ticket's acceptance.
- Do not weaken tests or skip the integration executable to accommodate a failure.
- Do not include generated `dist`, reports, Lisa metadata, or phase artifacts in the source
  commit.

## Completion criteria

- All four script modules use declaration-owned path/key configuration where applicable.
- `commandFor` builds operation and leak URLs from `contract.path`.
- Recursive `/api/receipt` grep under `scripts/` is empty.
- Focused, full, type, and executable integration validation pass.
- Exact ticket source paths are committed through Lisa and clean.
- `progress.md` and `review.md` accurately hand off the completed work.
