# Plan — T-010-03-01

## Objective

Rewire both public demo Playwright projects to the receipt boundary declaration
through `tests/support/flow-contract.ts`, preserving all current browser behavior
while removing exemplar heading, selector, and route literals from the spec.

## Baseline safeguards

Before source edits:

1. Record `git status --short` in `progress.md`.
2. Treat existing Lisa, Codex, provenance, and ticket changes as unrelated.
3. Confirm `tests/support/flow-contract.ts` and `tests/demo-flow.spec.ts` are
   clean.
4. Do not edit ticket phase or status frontmatter.
5. Do not write phase artifacts to `docs/active/work/T-010-03-01`.
6. Use `apply_patch` for source edits.
7. Never use ordinary `git add` or `git commit`.

## Step 1 — add the flow adapter

Modify `tests/support/flow-contract.ts`.

Actions:

1. Import `receiptBoundary` from the portable source module.
2. Export `DEMO_FLOW_BOUNDARY`.
3. Derive `pathGlob` by prefixing the declared path with Playwright's any-origin
   glob.
4. Reference `receiptBoundary.landmark` without copying it.
5. Export `DEMO_HEADING` from the grouped landmark.
6. Keep the existing `PRIMARY_ACTION_NAME` public name.
7. Change its initializer to the grouped landmark action name.
8. Update its comment to describe declaration ownership.
9. Leave backstage and budget exports unchanged.

Independent verification:

- inspect the focused diff;
- search the support file for the heading and action literals;
- confirm neither public literal is newly duplicated there.

Completion criterion:

- flow support exposes the grouped browser contract and explicit heading/action
  aliases, all derived from `receiptBoundary`.

## Step 2 — rewire shared spec setup

Modify `tests/demo-flow.spec.ts`.

Actions:

1. Import `DEMO_FLOW_BOUNDARY` and `DEMO_HEADING` from flow support.
2. Bind the landmark once for readable repeated use.
3. Add a checked helper for the first evidence record.
4. Give the helper a declaration-oriented error message.
5. Avoid receipt-specific evidence names in helper code and comments.

Independent verification:

- run TypeScript formatting inspection;
- confirm the helper returns a narrowed evidence record without assertions or
  casts.

Completion criterion:

- later test steps can consume only declared landmark fields.

## Step 3 — rewire the healthy flow

Actions:

1. Replace the hard-coded heading name with `DEMO_HEADING`.
2. Replace result-body visibility lookup with the declared body selector.
3. Replace loading-status lookup with the declared status selector.
4. Replace nonce/signature assertions with an iteration over all declared
   evidence records.
5. Include each evidence name in an assertion message.
6. Keep the primary action role lookup through `PRIMARY_ACTION_NAME`.
7. Read pre-click freshness text through the checked first evidence record.
8. Assert that record changes after activation.
9. Assert its new value matches its declared regex.
10. Preserve the action re-enable assertion and timing budget.

Independent verification:

- inspect the healthy test for literal selectors or regexes;
- confirm the evidence loop checks every declared record;
- confirm freshness cannot pass vacuously when evidence is absent.

Completion criterion:

- the healthy flow expresses the same behavioral proof entirely through the
  support contract.

## Step 4 — rewire the stalled flow

Actions:

1. Replace the route interception literal with the derived `pathGlob`.
2. Replace its hard-coded heading with `DEMO_HEADING`.
3. Replace all status lookups with the declared status selector.
4. Replace all body lookups with the declared body selector.
5. Preserve the action role, enabled/disabled checks, and timing budgets.
6. Rewrite concrete comments so the acceptance grep sees no forbidden literals.

Independent verification:

- inspect the route registration order;
- confirm the unresolved handler remains empty;
- confirm both pre-click and post-click stalled observations remain present.

Completion criterion:

- the stalled project follows the declared route and landmarks without changing
  its fault mechanism.

## Step 5 — run architectural source checks

Run the exact acceptance grep:

```sh
grep -En 'Demo Runway|#receipt-|/api/receipt' tests/demo-flow.spec.ts
```

Expected result: no output and grep exit status 1.

Run definition searches:

```sh
rg -n "Demo Runway|Ask for a fresh note" \
  src/lib/boundary-contract.ts tests/support/flow-contract.ts tests/demo-flow.spec.ts
```

Expected result:

- each literal occurs only in `src/lib/boundary-contract.ts`;
- flow support contains only property-derived aliases;
- the spec contains neither literal.

Completion criterion:

- the exact grep is empty;
- heading and action have one definition in the scoped contract chain.

## Step 6 — run focused static verification

Run:

```sh
npm run typecheck
node --experimental-strip-types --test test/boundary-contract.test.mjs
```

Rationale:

- typecheck validates cross-layer imports, readonly evidence iteration, and
  helper narrowing;
- the focused unit suite confirms all declaration fields and patterns remain
  exactly as expected.

Completion criterion:

- both commands exit zero;
- any environment limitation is recorded exactly rather than hidden.

## Step 7 — run healthy browser acceptance

Run:

```sh
npm run test:flow
```

Expected proof:

- the declared heading becomes visible;
- the declared body becomes visible;
- the declared status hides;
- every declared evidence record matches its regex;
- the declared primary action is visible and enabled;
- freshness evidence changes after click;
- the action re-enables;
- the command exits zero.

Completion criterion:

- healthy project passes without retries.

## Step 8 — run stalled browser acceptance

Run:

```sh
npm run test:flow:stalled
```

Expected proof:

- the derived route glob intercepts the real boundary request;
- the declared heading remains visible;
- status stays visible and body stays hidden;
- the declared action exists and begins enabled;
- clicking disables it while the request remains unresolved;
- stalled narration remains observable;
- the command exits zero.

Completion criterion:

- stalled project passes without retries.

## Step 9 — inspect the source unit

Run:

```sh
git diff --check -- tests/support/flow-contract.ts tests/demo-flow.spec.ts
git diff -- tests/support/flow-contract.ts tests/demo-flow.spec.ts
git status --short
```

Confirm:

- only the two planned source files belong to this ticket;
- no user/automation changes were overwritten;
- no generated Playwright artifacts are untracked or staged;
- no ordinary index staging exists for ticket paths;
- comments remain accurate after abstraction.

Completion criterion:

- clean diff check and scoped, reviewable source diff.

## Step 10 — commit through Lisa

Inspect command help first:

```sh
lisa commit-ticket --help
```

Use one ticket commit with exact repository-relative include paths:

- `tests/support/flow-contract.ts`;
- `tests/demo-flow.spec.ts`.

Message intent: make demo flows consume the declared landmark contract.

Afterward:

1. capture the commit identifier and Lisa output;
2. check both source paths are clean;
3. confirm unrelated dirty paths remain excluded;
4. record the result in `progress.md`.

Completion criterion:

- Lisa reports a successful ticket-owned commit containing exactly two paths.

## Step 11 — implementation record

Write `progress.md` in the private attempt directory.

Record:

- baseline and pre-existing dirty paths;
- completion of each source step;
- exact grep result;
- typecheck and focused unit results;
- healthy and stalled Playwright results;
- diff inspection;
- Lisa commit identifier;
- deviations and remaining work.

Completion criterion:

- progress truthfully describes the implementation and has only Review left.

## Step 12 — review

Inspect the committed diff and acceptance evidence. Write `review.md` with:

- outcome and commit;
- files modified, created, and deleted;
- final export and data-flow structure;
- healthy/stalled behavior preserved;
- definition-count and grep evidence;
- typecheck and test results;
- copy review;
- test coverage assessment;
- gaps, limitations, and human-review flags.

Completion criterion:

- Review is self-contained and the ticket remains active for Lisa publication.

## Atomicity rationale

This ticket has one meaningful source unit. The support adapter without a
consumer is unused scaffolding. The consumer without the adapter does not
compile. The two exact paths therefore belong in one Lisa commit.

## Rollback boundary

The source unit can be reverted by one ticket commit without affecting the
portable declaration or production page. No data migration, configuration
change, or generated artifact is involved.
