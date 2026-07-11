# Plan — T-004-04-02 secrets-and-uncommitted-work-safety

## Implementation approach

Implement in small vertical safety units. Each unit starts with or includes focused tests, is
validated independently, updates `progress.md`, and is committed without staging unrelated
worktree changes. The ticket frontmatter remains untouched.

## Step 1 — establish the implementation ledger

Create `progress.md` with:

- ticket/current phase context;
- selected design summary;
- known pre-existing dirty worktree files;
- checklist matching this plan;
- validation table;
- deviations section;
- commit ledger.

Verification:

- only this ticket's work directory is added;
- ticket phase/status remain unchanged.

Atomic commit intent:

- commit Research, Design, Structure, Plan, and initial Progress as the RDSPI blueprint.

## Step 2 — add pure secret contracts

In `src/lib/session-lifecycle.ts`:

1. define runtime-secret limits and reserved names;
2. parse the JSON object without echoing source input;
3. reject non-object JSON, arrays, unsafe names, reserved names, blank/short values, excessive
   entries, and excessive aggregate bytes;
4. implement longest-first exact-value redaction;
5. compose redaction with the existing single-line/bounded public-error helper;
6. retain backward compatibility for non-session callers of `safeErrorMessage()`.

In `test/session-lifecycle.test.mjs`:

1. cover empty and populated maps;
2. cover each invalid class;
3. prove exact values and repeated/overlapping values redact;
4. prove public errors redact before truncation and line folding;
5. prove error messages never reproduce malformed secret source.

Verification:

```bash
node --experimental-strip-types --test test/session-lifecycle.test.mjs
```

Atomic commit intent:

- `feat(session): define runtime secret safety contracts`.

## Step 3 — inject and redact runtime secrets

In `wrangler.sessions.jsonc`:

1. declare `SESSION_RUNTIME_SECRETS` as required;
2. explain its JSON shape and secret-only configuration path.

Regenerate `worker-configuration.sessions.d.ts`.

In `src/session-worker.ts`:

1. parse the binding at the outer Worker boundary;
2. return a fixed configuration failure on invalid data;
3. pass the typed map to coordinator `up`, `logs`, and `down` calls;
4. extend `ensureProcess()` with `env` and inject into both service starts;
5. redact provisioning/reconcile failures before storage, structured log, and API response;
6. redact process stdout/stderr before byte bounding;
7. redact generic outer-handler failures;
8. ensure no secret values enter session records or structured success logs.

Tests:

- inspect service-launch helper output or exported helper behavior to prove secrets are passed as
  environment values, not command interpolation;
- prove bounded logs receive redacted strings;
- add static assertions where runtime DO mocking is disproportionate.

Verification:

```bash
npm run session:types
npm run session:types:check
npx tsc --noEmit --project tsconfig.sessions.json
node --experimental-strip-types --test test/session-lifecycle.test.mjs
```

Atomic commit intent:

- `feat(session): inject and redact launch secrets`.

## Step 4 — define teardown preservation contracts

In `src/lib/session-lifecycle.ts`:

1. add the down input union;
2. accept exactly preserve, digest-acknowledged destroy, or force destroy;
3. reject empty/extra/ambiguous objects;
4. add SHA-256 digest validation;
5. define patch response types and size limit;
6. build the fixed staging/binary-diff command;
7. make command output a small machine-readable metadata line;
8. parse clean/dirty metadata strictly;
9. ensure the command never interpolates client-controlled content.

Tests:

- all valid/invalid request shapes;
- digest format edge cases;
- fixed paths and required Git flags;
- metadata parser clean/dirty/error cases;
- patch size limit behavior.

Verification:

```bash
node --experimental-strip-types --test test/session-lifecycle.test.mjs
```

Atomic commit intent:

- `feat(session): define safe teardown protocol`.

## Step 5 — implement coordinator preservation

In `src/session-worker.ts`:

1. parse down request bodies with the existing stream bound;
2. add a private preservation inspection helper;
3. run the fixed command with a bounded timeout;
4. refuse and retain session when command execution or metadata validation fails;
5. enforce the maximum complete patch size;
6. read patch content in base64 only after metadata passes;
7. independently verify decoded byte count/digest in Worker code if Web Crypto/runtime support is
   available; otherwise compare trusted command hash plus SDK-reported size and document it;
8. return dirty preservation without changing desired ready state;
9. regenerate and compare digest before acknowledged destroy;
10. return 409 on workspace races;
11. permit immediate clean destroy;
12. permit force destroy only on explicit force input;
13. preserve existing failed-record behavior when destroy itself fails;
14. log metadata but never patch content.

Tests:

- pure helper coverage provides most branches;
- TypeScript validates Sandbox read-file result handling;
- local fixture command test proves a produced patch applies against its base.

Verification:

```bash
npm run session:validate
npm test
```

Atomic commit intent:

- `feat(session): preserve dirty work before teardown`.

## Step 6 — implement CLI handoff

In `scripts/session.ts`:

1. parse `down` and `down --force` distinctly;
2. send JSON for every down request;
3. keep up/status/logs request behavior unchanged;
4. for normal down, inspect the preserve response;
5. validate server-provided revision, digest, byte count, and base64;
6. independently hash decoded bytes with Node crypto;
7. construct a safe deterministic filename;
8. write with exclusive creation and mode `0600`;
9. acknowledge only after successful local persistence;
10. omit base64 from printed output;
11. show the local path and final destroy result;
12. on force, send exactly `{mode:"destroy",force:true}`;
13. redact configured values from raw response and transport errors before output.

Make file writing injectable or factor orchestration into helpers so tests remain hermetic.

Tests:

- existing CLI mapping tests updated for JSON down;
- clean normal response causes no file write/second request;
- dirty response creates exact bytes then sends digest;
- mismatch and write failures make only one request;
- race response retains artifact and exits nonzero;
- force makes one request with explicit boolean;
- secret-bearing success/failure/non-JSON/transport messages are redacted.

Verification:

```bash
node --experimental-strip-types --test test/session-lifecycle.test.mjs
npm test
```

Atomic commit intent:

- `feat(session): add verified patch handoff to CLI`.

## Step 7 — execute a Git fixture integration check

Create a temporary repository outside the project worktree using shell commands only for test
setup. Apply the fixed preservation algorithm to a fixture containing:

- modified tracked text;
- deleted tracked file;
- untracked text file;
- untracked binary file;
- executable mode change if supported by the filesystem.

Capture the generated patch, clone/check out the fixture's base commit elsewhere, apply with
`git apply --binary`, and compare the resulting staged tree to the dirty source's staged tree.

Do not commit fixture files to the repository unless repeatability requires a permanent test.
If the exercise reveals shell portability issues, fix the helper and unit tests before moving
on.

Verification criteria:

- digest matches the patch bytes;
- patch is under the configured bound;
- `git apply --binary --index` succeeds;
- source and recovered index trees match;
- ignored and empty-directory limitations are explicitly documented.

Atomic commit intent:

- fold any discovered fix into a focused follow-up commit; evidence may be summarized in
  `progress.md` without storing sensitive/generated patch content.

## Step 8 — update durable operations documentation

In `docs/knowledge/session-lifecycle.md`:

1. add required Worker-secret setup using a non-echoing input flow;
2. give an empty-map example and a placeholder-only populated shape;
3. describe the launch-only process environment boundary;
4. explain authorized collaborator visibility;
5. list image/worktree/storage/output exclusions;
6. document exact-value redaction scope and limitations;
7. replace unsafe down instructions with normal/force syntax;
8. explain two-step digest verification;
9. document artifact naming and restrictive permissions;
10. document recovery commands;
11. document size, ignored-file, empty-directory, disconnect, and platform-replacement behavior;
12. update production checklist and validation commands.

Verification:

- examples contain placeholders only;
- no real secret/token-shaped value is introduced;
- existing image/lifecycle claims remain accurate.

Atomic commit intent:

- `docs(session): document secret and teardown safety`.

## Step 9 — full regression and security review

Run:

```bash
npm test
npm run session:validate
npm run typecheck
npm run deploy:dry
git diff --check
```

Also inspect:

- `git diff -- Dockerfile.session .dockerignore wrangler.sessions.jsonc`;
- repository search for example secret values used in tests;
- repository search for `SESSION_RUNTIME_SECRETS` to confirm no logging/storage;
- compiled/dry-run output where practical for accidental literal inclusion;
- all down call sites for an implicit destructive path;
- Git status to isolate unrelated Lisa/shared-worktree changes.

If Docker is already available and the local session image/runtime can be exercised within the
remaining ticket window, run a dirty-work local lifecycle proof. Otherwise state that unit,
fixture, type, and dry-run evidence cover the implementation while remote Containers remain an
open production gate.

Update `progress.md` with exact command results and deviations.

Atomic commit intent:

- focused fixes only; do not create a validation-only code commit unless artifacts changed.

## Step 10 — review and handoff

Create `review.md` with:

- outcome and acceptance-criterion verdict;
- architecture and protocol summary;
- files created/modified/deleted;
- commit list;
- secret-flow audit;
- teardown/preservation audit;
- exact test counts and command results;
- fixture/local runtime evidence;
- known gaps and limitations;
- critical human/production gates;
- confirmation that ticket phase/status were not edited.

Update `progress.md` to complete, commit the final artifacts, and stop. Lisa detects `review.md`
and owns all subsequent phase/status transitions.

## Rollback strategy

The implementation is additive except for down request semantics.

- Runtime-secret injection can be disabled operationally with the valid empty JSON object.
- Normal down safely refuses when preservation fails, so rollback urgency does not threaten
  collaborator work.
- Reverting the preservation commits would restore unsafe down and must not be deployed while a
  dirty session exists.
- Before any rollback of the Worker, run the safe CLI down or manually commit/export the live
  session work.

## Completion criteria

- configured launch-secret values are absent from image/worktree/durable state and redacted from
  every owned output boundary;
- both managed services receive launch secrets only through `startProcess.env`;
- normal down destroys clean work directly or dirty work only after verified local patch handoff;
- edits between export and destroy cause refusal;
- force destruction requires `--force` and an explicit API boolean;
- patch recovery is fixture-proven;
- full repository tests and Sessions Worker validation pass;
- `progress.md` and `review.md` are complete;
- ticket frontmatter is unchanged.
