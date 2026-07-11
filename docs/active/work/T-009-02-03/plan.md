# Plan — T-009-02-03 cold read and flow verification

## Execution rules

- Continue from Plan through Implement and Review without pausing for phase approval.
- Do not edit the ticket’s `phase` or `status` fields.
- Stage only files under `docs/active/work/T-009-02-03/` unless a verified product defect
  requires a documented correction.
- Preserve Lisa-owned changes already present in the worktree.
- Record any deviation before executing the changed course.
- Do not weaken tests, budgets, selectors, or leak-check behavior to obtain a pass.
- Treat visual review as a human proxy and automated checks as bounded factual evidence.

## Step 1 — Reconfirm the implementation baseline

Inspect `git status --short`.

Inspect focused diffs for:

- `src/pages/index.astro`;
- `src/pages/backstage.astro`;
- `tests/demo-flow.spec.ts`;
- `tests/backstage-flow.spec.ts`;
- `playwright.config.ts`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `docs/knowledge/rdspi-workflow.md`;
- `docs/knowledge/copy-voice-standard.md`.

Confirm that the rewrite commits remain at `HEAD` ancestry and no overlapping surface change
appeared after Research.

Verification criteria:

- no uncommitted surface or test diff exists;
- Lisa-owned ticket/provenance changes remain identifiable;
- the expected index and Backstage copy is still present;
- no verification artifact from an earlier incomplete run needs reconciliation.

## Step 2 — Add the capture helper

Create `capture-screenshots.mjs` with the structure defined in `structure.md`.

Use Playwright’s Chromium export from `@playwright/test`.

Resolve output paths relative to `import.meta.url`.

Create the screenshot directory with `mkdir(..., { recursive: true })`.

Use explicit projector and phone context options.

For index:

- navigate to `/`;
- confirm the display-name heading;
- wait for the receipt body;
- wait for fonts;
- capture full page.

For Backstage:

- navigate to `/backstage`;
- confirm locked orientation;
- capture locked full page;
- fill the passcode;
- click `Open backstage`;
- confirm the dashboard is visible;
- capture open full page.

Print one line per output.

Verification criteria:

- `node --check` passes;
- no credential other than the committed local test default appears;
- browser cleanup is protected by `finally`;
- failures propagate to a nonzero process exit;
- no application source is imported or modified.

## Step 3 — Run static type verification

Create the ticket `evidence/` directory.

Run:

```sh
npm run typecheck
```

Retain combined output in `evidence/typecheck.txt`.

Verification criteria:

- Astro reports zero errors;
- TypeScript no-emit checks pass;
- Worker generated types are current;
- command exits zero.

If an existing unrelated warning appears, preserve and classify it in Progress.

## Step 4 — Build the application

Run:

```sh
npm run build
```

Retain combined output in `evidence/build.txt`.

Verification criteria:

- Astro server and client builds finish;
- public and Backstage pages prerender or build as configured;
- command exits zero;
- `dist` contains browser assets for the leak checker.

Do not stage generated `dist` output.

## Step 5 — Run the complete browser suite

Ensure no manually started server occupies the owned test port.

Run exactly:

```sh
npx playwright test
```

Retain combined output in `evidence/playwright.txt`.

Immediately copy the generated JSON report from `test-results/flow-report.json` to
`evidence/playwright-report.json`.

Verification criteria:

- healthy index test passes;
- stalled index test passes;
- Backstage phone lifecycle test passes;
- all three projects are represented;
- there are no retries or skipped applicable tests disguised as success;
- command exits zero.

If the command exceeds the repository global budget, diagnose the named setup or step rather than
raising the budget.

## Step 6 — Start an owned evidence server

Apply the local Backstage D1 migration with the isolated config and the repository-root
persistence directory:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB \
  --local \
  --persist-to .wrangler/state \
  --config tests/support/backstage.wrangler.jsonc
```

Start Astro on `127.0.0.1:4323` with:

- `CODEX_THREAD_ID` empty;
- `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`;
- absolute `DEMO_WRANGLER_CONFIG_PATH`;
- `DEMO_PASSCODE=playwright-backstage-knock`;
- a disposable ticket-owned `DEMO_SIGNING_KEY`;
- `npm run dev -- --host 127.0.0.1 --port 4323`.

Keep the server in a managed terminal session and poll until the route answers.

Verification criteria:

- server startup is foreground-owned and observable;
- `/` returns a successful response;
- `/backstage` returns a successful response;
- the same explicit signing key is available to the later leak command;
- no `.dev.vars` value is needed.

## Step 7 — Capture all screenshots

Against the owned evidence server, run:

```sh
node docs/active/work/T-009-02-03/capture-screenshots.mjs
```

Verification criteria:

- all six expected PNGs exist;
- each file is non-empty;
- projector captures are 1920 pixels wide;
- phone captures are 375 pixels wide;
- index images contain the loaded receipt state;
- locked Backstage images contain the safety note and passcode gate;
- open Backstage images contain the shared checklist;
- no unexpected console or navigation failure aborted the script.

Use an image decoder or repository image-view tool to verify content rather than trusting only
filenames.

## Step 8 — Run the executable leak check

While the evidence server is running, execute:

```sh
DEMO_SIGNING_KEY=<same-owned-key> \
DEMO_BASE_URL=http://127.0.0.1:4323 \
npm run leak:check
```

Retain combined output in `evidence/leak-check.txt`.

Verification criteria:

- command exits zero;
- output states `leak check — passed`;
- at least one client asset was scanned;
- exactly one response body was scanned;
- no finding names an asset or response surface.

Stop the owned evidence server after screenshot and leak evidence is complete.

## Step 9 — Verify screenshot dimensions and decoding

Use the platform image metadata utility or another read-only decoder over every PNG.

Record filename, pixel width, pixel height, and decode result.

Full-page heights may exceed the viewport height. Width must match the named viewport.

Verification criteria:

- six of six decode;
- width matches 1920 or 375 as named;
- no image is blank or truncated by a failed navigation;
- files remain under the ticket directory.

## Step 10 — Perform the visual cold read

Inspect each image at normal scale.

For each state answer:

1. What is this?
2. What do I do?

Review the primary orientation layer before reading supporting copy in detail.

Then inspect for:

- lecture-length adjacent explanation;
- insider self-reference;
- descriptive sentence used as title;
- missing verb-forward action;
- lost secret-handling warning;
- clipped or overlapping text;
- horizontal phone overflow;
- controls too separated from their explanation to scan as one task.

Create `cold-read.md` with the screenshot manifest, per-image answers, evidence command results,
authoring-wire result, honest boundary, and verdict.

Verification criteria:

- every PNG is linked by relative path;
- all six states receive an explicit pass/fail judgment;
- the safety review is explicit;
- the half-second claim is framed as a glance proxy;
- any failed state triggers correction and recapture before continuing.

## Step 11 — Run the public-copy source audit

Search the two page files for the known drifted phrases and prohibited public-copy categories.

Also inspect all string literals rendered into the interface for suspicious credential or
template-history content.

Write a readable command/result summary to `evidence/public-copy-scan.txt`.

Verification criteria:

- old `starting line every demo inherits` sentence-title wording is absent;
- old `shared knock`/multi-paragraph passcode lecture wording is absent;
- no literal signing key or real passcode appears in rendered copy;
- no visitor-facing string narrates repository or template-development history;
- internal engineering comments are not misreported as rendered copy.

## Step 12 — Verify the authoring wire

Resolve and record:

- `AGENTS.md` → `CLAUDE.md`;
- `AGENTS.md` → `docs/knowledge/rdspi-workflow.md`;
- `AGENTS.md` → `docs/knowledge/copy-voice-standard.md`;
- `CLAUDE.md` → workflow and standard;
- workflow-relative `copy-voice-standard.md` → the canonical standard file.

Search both prerequisite Research artifacts for the standard citation.

Write the results to `evidence/authoring-wire.txt`.

Verification criteria:

- all targets exist;
- both rewrite Research artifacts cite the standard;
- the workflow includes the four-rule envelope and pre-Design mapping requirement;
- this ticket’s Research cites the standard;
- evidence states the documented injection claim and its observable session boundary precisely.

## Step 13 — Inspect all implementation evidence

Review:

- `git diff --check`;
- `git status --short`;
- new ticket directory inventory;
- image metadata;
- tail and summary of every command log;
- structured Playwright report status;
- focused production-source diff.

Verification criteria:

- no production source changed unless recorded as a deviation;
- no ticket frontmatter was staged or edited by this work;
- no empty or temporary evidence file remains;
- no server process owned by the session remains running;
- logs and cold-read conclusions agree;
- all acceptance clauses have direct evidence.

## Step 14 — Commit implementation evidence

Stage only:

- capture helper;
- screenshot files;
- evidence logs/report;
- `cold-read.md`.

Commit as one verification-evidence unit after every check is green.

Do not include `test-results`, `dist`, `.wrangler`, Lisa provenance, or ticket files.

## Step 15 — Write `progress.md`

Record:

- planning commits;
- every executed step;
- exact command outcomes;
- screenshot inventory and visual verdict;
- wire result;
- public-copy scan result;
- deviations and warnings;
- remaining Review phase.

Commit the progress artifact separately.

## Step 16 — Review

Write `review.md` as the final handoff.

It must summarize:

- files created, modified, and deleted;
- production behavior change, if any;
- screenshot coverage;
- end-to-end test coverage;
- leak-check coverage and boundary;
- authoring-wire evidence;
- acceptance-criterion result;
- open concerns and known limitations;
- critical human-attention items, if any.

Run a final artifact and worktree inspection, commit `review.md`, and stop without changing ticket
frontmatter.
