# Plan — T-009-02-01 rewrite backstage copy to standard

## Plan objective

Conform all authored Backstage copy to the binding voice and length standard while preserving the
one-passcode checklist behavior, phone flow, safety meaning, and public credential boundary.

The implementation is intentionally one coherent runtime unit followed by evidence and review
artifacts.

## Preconditions

- Research, Design, and Structure artifacts are committed.
- `docs/knowledge/copy-voice-standard.md` remains the binding contract.
- The worktree contains unrelated Lisa and sibling-ticket changes.
- Only ticket-owned paths will be staged.
- Ticket phase and status frontmatter will not be edited.

## Step 1 — capture the implementation baseline

### Actions

1. Record `git status --short`.
2. Confirm `src/pages/backstage.astro` has no uncommitted change from another task.
3. Confirm `tests/backstage-flow.spec.ts` has no uncommitted change from another task.
4. Re-read the exact source regions that will change.
5. Reconfirm the current ticket frontmatter only for phase awareness; do not edit it.

### Verification

- Both intended source files are clean relative to `HEAD`.
- Unrelated dirty paths are identified and left alone.
- The selected copy still matches the Design artifact.

### Atomicity

Read-only; no commit.

## Step 2 — rewrite page metadata and intro

### Actions

In `src/pages/backstage.astro`:

1. change the browser title to `Backstage`;
2. replace metadata with the selected visitor-action sentence;
3. replace the intro eyebrow with `Share with your team`;
4. retain the `Backstage` `h1`;
5. retain the conforming tagline;
6. replace the intro lede with the selected one-sentence purpose;
7. replace the note with the direct do-not-paste-secrets rule and safe next step.

### Verification

- Browser title begins with and equals the display name.
- Metadata is one sentence under 20 words and 150 characters.
- Lede is one sentence under 20 words and 120 characters.
- Safety note is one sentence under 20 words and 120 characters.
- The literal words `passwords`, `keys`, and `secrets` remain visible.
- The note tells the visitor to send them securely instead.

### Atomicity

Part of the single runtime-copy commit because the complete page must remain internally coherent.

## Step 3 — simplify locked gate copy

### Actions

1. retain the verb-forward gate heading;
2. replace the gate `.section-copy` with the selected passcode instruction;
3. retain `Shared passcode` and `Open backstage`;
4. remove the redundant help paragraph beneath the passcode input.

### Verification

- Gate task has one direct instruction.
- No session-memory or reload lecture remains in visible copy.
- Password input attributes remain unchanged.
- IDs, form action behavior, and alert region remain unchanged.
- No script or ARIA reference targets the removed help node.

### Atomicity

Part of the runtime-copy commit.

## Step 4 — rewrite dashboard orientation and field copy

### Actions

1. shorten the dashboard heading to `Shared checklist`;
2. replace dashboard `.section-copy` with the selected action summary;
3. replace `What are you handing us?` with a visitor-centered legend;
4. simplify the two option labels and hints;
5. replace the text-field help with the selected prompt;
6. replace `What the team has` with `On the list`;
7. replace the two-sentence empty state with one action sentence;
8. retain conforming field labels, buttons, statuses, and accessible list name.

### Verification

- All option labels fit 5 words / 32 characters.
- All hints fit 12 words / 80 characters and use one sentence.
- Both `.section-copy` nodes fit 20 words / 120 characters.
- No “handing us,” stakeholder, repository, template, runtime, or implementation narration remains.
- Protocol radio values remain `reference` and `feedback`.

### Atomicity

Part of the runtime-copy commit.

## Step 5 — rewrite client-rendered states

### Actions

1. replace completion and deletion errors;
2. replace missing, wrong, service-failure, and connection-failure unlock messages;
3. replace missing/long note and invalid/missing URL errors;
4. replace the expired-unlock message;
5. replace server and connection submission failures;
6. simplify the 422 branch to one fixed `Check the entry and try again.` error;
7. remove now-unused response-body issue parsing;
8. retain conforming loading, success, status, confirmation, and accessible-label strings.

### Verification

- Every fixed validation/error state fits 14 words / 100 characters.
- Every success state fits 12 words / 80 characters.
- Buttons/loading action labels remain verb-forward.
- No raw server validation issue is rendered.
- `isRecord` remains used by feed validation, so its helper is retained.
- Fetch paths, methods, headers, body, and response-status branches remain stable.

### Atomicity

Part of the runtime-copy commit.

## Step 6 — update the copy-coupled test assertion

### Actions

In `tests/backstage-flow.spec.ts`, change the expected focused dashboard heading from
`The shared checklist` to `Shared checklist`.

### Verification

- The assertion still uses role-based lookup.
- It still checks focus after successful unlock.
- No behavior expectation or flow step changes.

### Atomicity

Commit with the page change so source and its acceptance test never disagree.

## Step 7 — run the authored-string count audit

### Actions

Use a read-only Node script that inventories the final fixed page strings by class and computes:

- whitespace-token word count;
- Unicode code-point character count;
- pass/fail against the class maxima.

Include metadata, static markup, accessible fixed labels, and dynamic state templates. For dynamic
labels, count only the authored surrounding string where IDs, times, counts, issue values, URLs,
or user content are opaque.

### Verification

- Script exits nonzero for any fixed string over either maximum.
- Every fixed string is one sentence where its class requires one.
- Headings and labels satisfy their required shape.
- Manual adjacency review confirms one explanation per task.
- Manual plain-language review confirms no insider narration.

### Atomicity

Read-only evidence; results summarized in `progress.md`.

## Step 8 — run compile and diff checks

### Actions

1. run `git diff --check` on the two implementation files;
2. run `npm run typecheck`;
3. inspect the diff for identifier, route, protocol, and style drift.

### Verification

- no whitespace errors;
- Astro check and TypeScript checks pass;
- only intended strings, one redundant node, one 422 display branch, and one test expectation
  differ.

### Failure handling

- Fix formatting or type errors before runtime testing.
- If an unexpected baseline failure is unrelated, capture exact evidence and continue only if the
  requested acceptance can still be assessed honestly.

## Step 9 — run the phone flow

### Actions

Run:

`npm run test:flow:backstage`

### Verification

The Pixel 5 project must prove:

- page loads locked;
- wrong passcode is refused;
- correct passcode unlocks and focuses `Shared checklist`;
- passcode input is cleared;
- no second password field appears;
- add succeeds;
- complete succeeds;
- delete succeeds;
- API feed reflects every transition.

### Failure handling

- Determine whether failure is copy-selector drift, runtime regression, shared-state interference,
  or environment setup.
- Fix only ticket-owned causes.
- Record reruns and deviations in `progress.md`.

## Step 10 — build and verify disclosure boundary

### Actions

1. run `npm run build`;
2. start a local app server for the established leak check;
3. run `npm run leak:check` against the fresh `dist` and local receipt response;
4. stop the owned server;
5. run a silent credential scan over `dist` using configured passcode and signing-key values;
6. report only credential names and pass/fail, never values;
7. search built Backstage output for development-history/insider phrases.

### Verification

- fresh build passes;
- established leak check passes;
- configured signing key is absent from built public output;
- configured backstage passcode is absent from built public output;
- no literal secret value is printed into evidence;
- built page contains the short safety warning;
- built page does not contain the old passcode lecture.

### Failure handling

- A real credential match is critical and must be fixed before commit.
- A stale `dist` result requires rebuilding and rerunning, not explaining it away.
- A local response-server setup failure is evidence-unavailable, not a passing leak check.

## Step 11 — commit implementation

### Actions

1. re-run `git status --short`;
2. stage only `src/pages/backstage.astro` and `tests/backstage-flow.spec.ts`;
3. inspect `git diff --cached --name-status`;
4. run `git diff --cached --check`;
5. inspect the staged diff;
6. commit with a ticket-scoped message;
7. run `git show --check --stat` on the commit.

### Verification

- exactly two intended files are in the implementation commit;
- no ticket frontmatter, provenance, sibling work, build output, local database, or test artifact is
  staged;
- the commit is internally tested and whitespace-clean.

## Step 12 — write and commit `progress.md`

### Actions

Create the Implement artifact with:

- completed plan steps;
- exact source/test changes;
- count-audit results;
- typecheck/build/flow/leak results;
- credential-scan result without values;
- deviations and rationale;
- remaining Review work;
- implementation commit ID.

### Verification

- evidence distinguishes passed, failed, and not-run checks;
- no credential values appear;
- unrelated worktree state is named but not claimed;
- `git diff --check` passes for the artifact.

### Atomicity

Commit `progress.md` separately as the Implement evidence unit.

## Step 13 — Review

### Actions

1. inspect the full ticket commit range;
2. audit exact changed paths;
3. rerun or confirm critical checks if the source has moved;
4. compare final source against each acceptance clause;
5. identify test gaps, open concerns, limitations, and critical issues;
6. write `review.md`;
7. commit the Review artifact only.

### Verification

The Review must summarize:

- files created, modified, and deleted;
- visitor-visible changes;
- security meaning preservation;
- test coverage and gaps;
- disclosure evidence;
- deviations;
- open concerns and critical issues.

## Planned commits

The phase artifacts before implementation are already incremental commits.

Remaining commits:

1. `feat(T-009-02-01): conform backstage copy` — page plus coupled flow expectation;
2. `docs(T-009-02-01): record backstage copy implementation` — `progress.md`;
3. `docs(T-009-02-01): review backstage copy rewrite` — `review.md`.

## Definition of done

- all six phase artifacts exist;
- the page copy matches the selected Design;
- every authored fixed string fits its class envelope;
- unlock explanation is not repeated across adjacent elements;
- the safety rule explicitly prohibits secrets and gives a safe next step;
- no insider self-reference remains in ticket-named surfaces;
- the phone backstage flow passes;
- typecheck and build pass;
- the established leak check passes;
- configured credentials are absent from fresh built output;
- no unrelated shared-worktree change is committed;
- `review.md` records evidence and open concerns;
- ticket phase/status frontmatter remains Lisa-owned.
