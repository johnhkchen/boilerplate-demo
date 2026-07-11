# Plan — T-007-02-02 rotate-secrets-and-config

## Objective

Perform and record a complete new-owner secret/config rotation rehearsal from
the predecessor's scrubbed context, while naming live Cloudflare/GitHub store
installation as deferred because this run has no genuine new-owner authority.

## Step 1 — freeze the inventory and evidence rules

Create the ticket work directory and the four pre-implementation RDSPI
artifacts. Reconcile the exact secret list against both Wrangler configs,
generated types, upstream transfer inventory, and CI workflow.

Verification:

- six Worker binding names are accounted for;
- two CI input names are accounted for;
- session API keys are represented inside `SESSION_RUNTIME_SECRETS`;
- config ownership is limited to the two story-defined session vars;
- no ticket frontmatter is edited by this work.

Atomic commit: Research, Design, Structure, and Plan.

## Step 2 — implement the pure verifier

Create `verify-rotation.ts` with no new dependencies.

Implementation slices:

1. strict CLI parsing for context/repo/mode;
2. string-safe JSONC comment stripping;
3. exact required-secret inventory extraction/comparison;
4. workflow destination checks for CI names;
5. configuration assertions for owner domain/repository/routes;
6. production parser calls for runtime-secret map and Access config;
7. generated passcode good/bad request assertions;
8. forbidden-path and active-author-marker scan;
9. exact-value scan by secret name;
10. SHA-256 fingerprint and redacted report formatting.

Verification:

- TypeScript executes with `node --experimental-strip-types`;
- a valid synthetic fixture reports pass;
- omission of each inventory class produces a named failure;
- an author marker produces a named failure;
- a copied secret in a scanned file produces only name/path, never value;
- output JSON contains no exact input value.

Atomic commit with Step 3 because the orchestrator provides the intended fixture
and public entry point.

## Step 3 — implement the rotation orchestrator

Create `rotate-fresh-owner.sh`.

Implementation slices:

1. parse arguments and validate repo-root invocation;
2. invoke T-007-02-01's harness into a disposable context;
3. replace placeholder routes/domain/repository only in that context;
4. create a private temp directory and early cleanup trap;
5. generate all eight independent values without printing them;
6. store them in mode-0600 JSON for bounded child loading;
7. invoke the verifier and capture its JSON report;
8. run existing integration check with only the fresh signing key exported;
9. copy/redact normalized integration evidence;
10. run final exact-value scans over build and evidence;
11. emit final pass plus named deferred-live stores.

Security verification:

- `bash -n` passes;
- script contains no `set -x`, `echo "$SECRET"`, argument-value secret command,
  or committed example value;
- temp secret file mode is checked as `600`;
- cleanup occurs on success and injected failure;
- transcript and JSON artifacts contain no generated exact value.

Atomic commit: orchestrator + verifier.

## Step 4 — run the rehearsal

Run from repository root using reserved simulation targets:

```sh
docs/active/work/T-007-02-02/rotate-fresh-owner.sh
```

The run must:

- regenerate the clean predecessor context;
- show the two configuration seams off author values;
- rotate all eight secret seams in the simulated new-owner store;
- validate the nested `NEW_OWNER_DEMO_API_KEY` runtime secret;
- execute production config/passcode validators;
- run integration → ops/flow/leak with the new signing key;
- produce redacted evidence;
- leave no private temp file behind.

If the existing integration runner fails for an environment-only reason, record
the exact check and retry only after diagnosing it. Do not suppress a red or
rewrite acceptance. An attempted functional failure is a gap.

## Step 5 — adversarial checks

Exercise failure behavior against disposable copies, without modifying the
successful evidence:

1. insert an author route marker and expect non-zero + named configuration seam;
2. remove one required binding and expect inventory mismatch;
3. put one generated exact value into a scanned runtime fixture and expect a
   name/path leak finding;
4. make the two Access audiences equal and expect parser rejection;
5. use a wrong passcode request and confirm denial is the expected control, not
   a failure;
6. rerun the full rehearsal and compare outcome/schema for idempotence.

Capture only summarized adversarial outcomes in `progress.md`; do not persist
private fixtures or values.

## Step 6 — regression verification

Run the repository checks in proportion to the docs-only drill implementation:

```sh
npm test
npm run typecheck
npm run deploy:dry
git diff --check
```

The integration runner already covers build, the healthy browser flow,
`ops:check`, and `leak:check`. Run `npm run test:flow:backstage` separately if
the generated-passcode production assertion is not sufficient or if the broader
suite has changed during implementation.

Record command, exit status, meaningful counts, and pre-existing warnings. Do
not copy logs containing process environments.

## Step 7 — write the operator handoff

Create `rotation-run.md` from performed evidence.

Document:

- local rehearsal command and actual outcome;
- exact config changes in the scratch context;
- all eight rotation states and fingerprints;
- session API-key presence without value;
- ops/leak/passcode/parser results;
- clean-source provenance and exact-value scan result;
- live install commands using interactive/stdin paths;
- `wrangler secret list --format json` name-only confirmation;
- `gh secret list` name-only confirmation;
- remote checks left to T-007-02-04;
- explicit `deferred-live` reason for both external stores;
- empty or populated named non-rotatable gap ledger.

No claim of remote installation is allowed without remote evidence.

Atomic commit: procedure + evidence.

## Step 8 — update progress

Create/update `progress.md` before and after meaningful units. Record:

- completed steps;
- files created;
- exact test outcomes;
- deviations and rationale before executing changed work;
- commit hashes or any commit limitation;
- live-store deferrals and why they are not local gaps;
- any non-rotatable secret as a named gap.

Do not alter ticket phase/status; Lisa observes artifact presence.

## Step 9 — review

Inspect only this ticket's diff plus relevant generated evidence.

Review questions:

- Does every secret in upstream inventory appear exactly once?
- Does “rotated” mean new-owner generated provenance rather than copied value?
- Are Access identifiers and nested API keys covered?
- Are config values off author defaults without claiming domain ownership?
- Did ops/leak actually use the generated signing key?
- Is the passcode functionally exercised?
- Can any raw secret be recovered from repository/artifacts/logs?
- Are remote stores labeled deferred rather than passed?
- Are attempted failures named as gaps?
- Are unrelated dirty files untouched?

Write `review.md` summarizing changes, coverage, open concerns, critical issues,
and acceptance disposition. Stop after the file is written.

## Verification matrix

| Criterion | Evidence |
| --- | --- |
| Rotation run | `rotation-run.txt`, `rotation-report.json` |
| Every Worker secret | exact config inventory + six report rows |
| CI deployment inputs | workflow destination check + two report rows |
| Any runtime API keys | parsed `NEW_OWNER_DEMO_API_KEY` member |
| Config off author defaults | config section + author-marker scan |
| Ops healthy | integration report operation row |
| Leak clean | integration report disclosure row + eight-value scan |
| Passcode changed/works | production `guardPasscode` good/wrong assertions |
| No author secret inherited | git-archive forbidden-path proof |
| Non-rotatable gaps named | `nonRotatableGaps` report array + runbook ledger |
| Remote honesty | two `deferred-live` store records |

## Rollback

All repository changes are new ticket-scoped files and can be removed without
affecting runtime. Scratch contexts and secret temp directories are disposable.
No external rollback is needed because this plan performs no remote mutation.
