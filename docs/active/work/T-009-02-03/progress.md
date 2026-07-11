# Progress — T-009-02-03 cold read and flow verification

## Current state

Implementation is complete.

All required visual, flow, leak, source-audit, and authoring-wire evidence is present.

No production source, application test, configuration, migration, ticket frontmatter, or Lisa
provenance file was changed by this ticket.

Review remains after this artifact.

## Phase artifacts

- `research.md` — complete;
- `design.md` — complete;
- `structure.md` — complete;
- `plan.md` — complete;
- `progress.md` — complete with this update;
- `review.md` — remains.

## Incremental commits

### Research

`4a953aa docs(T-009-02-03): map verification surfaces`

Contains only `research.md`.

### Design

`d7a0017 docs(T-009-02-03): design cold-read evidence`

Contains only `design.md`.

### Structure

`83dc871 docs(T-009-02-03): structure verification artifacts`

Contains only `structure.md`.

### Plan

`3cf6d75 docs(T-009-02-03): plan verification run`

Contains only `plan.md`.

### Implementation evidence

`4b03097 test(T-009-02-03): capture cold-read evidence`

Contains:

- ticket-local capture helper;
- `cold-read.md`;
- 6 exact viewport screenshots;
- 6 full-page companion screenshots;
- build, typecheck, Playwright, leak, image, copy-scan, and authoring-wire evidence.

`git diff --cached --check` passed before the commit.

Lisa-owned ticket and provenance changes remained unstaged.

## Step 1 — Baseline reconfirmation

Complete.

The worktree began with modifications to:

- `.lisa/provenance.jsonl`;
- `docs/active/tickets/T-009-01-01.md`;
- `docs/active/tickets/T-009-01-02.md`;
- `docs/active/tickets/T-009-02-01.md`;
- `docs/active/tickets/T-009-02-02.md`;
- `docs/active/tickets/T-009-02-03.md`.

Those are Lisa-owned changes and were preserved.

Focused diffs confirmed no uncommitted change in:

- `src/pages/index.astro`;
- `src/pages/backstage.astro`;
- `tests/demo-flow.spec.ts`;
- `tests/backstage-flow.spec.ts`;
- `playwright.config.ts`;
- `AGENTS.md`;
- `CLAUDE.md`;
- the RDSPI workflow;
- the copy standard.

Recent history contained both prerequisite rewrite commits and reviews.

No overlapping surface edit required reconciliation.

## Step 2 — Capture helper

Complete.

Created `capture-screenshots.mjs`.

The helper:

- imports Chromium from `@playwright/test`;
- resolves paths relative to its module file;
- accepts optional `PLAYWRIGHT_BASE_URL` and `DEMO_PASSCODE` environment inputs;
- defaults to the repository’s owned server URL and committed local test passcode;
- uses explicit 1920×1080 and 375×812 contexts;
- waits for the loaded signed receipt on index;
- captures locked Backstage;
- unlocks through the visible field and action;
- waits for the shared checklist;
- captures open Backstage;
- disables animation during screenshots;
- closes every context and the browser in `finally` blocks;
- lets failures exit nonzero.

`node --check` passed before and after the capture-output adjustment.

The script imports no application internal and makes no application mutation.

## Step 3 — Type verification

Complete.

Command:

```sh
npm run typecheck
```

Result: pass.

- Astro checked 61 files;
- 0 errors;
- 0 warnings;
- 0 hints;
- TypeScript no-emit check passed;
- Worker generated-type check passed.

Evidence: `evidence/typecheck.txt`.

The command emitted the repository’s existing deprecated `session.driver` string-signature
notice. This ticket does not touch session configuration.

## Step 4 — Build

Complete.

The final recorded build used:

- the isolated Backstage Wrangler config;
- `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`;
- the disposable ticket signing marker;
- the committed local test passcode.

Command shape:

```sh
npm run build
```

Result: pass.

- static output mode completed;
- Cloudflare adapter server entrypoints built;
- secrets came from process environment for the isolated build;
- `/backstage/index.html` prerendered;
- `/index.html` prerendered;
- build completed without an error.

Evidence: `evidence/build.txt`.

The existing deprecated session-driver notice also appeared here.

Generated `dist` output remained ignored and unstaged.

## Step 5 — Complete Playwright suite

Complete.

Command executed exactly:

```sh
npx playwright test
```

Result: pass in 5.2 seconds.

Structured stats:

- expected: 3;
- unexpected: 0;
- flaky: 0;
- skipped: 2.

The two skipped test instances are the spec’s intentional cross-project guards:

- the stalled test skips in `healthy`;
- the healthy test skips in `stalled`.

All applicable tests ran:

### Healthy index

Passed:

- public demo load;
- signed receipt response;
- nonce and signature shape;
- labeled primary action;
- fresh receipt after action;
- action re-arm.

### Stalled index

Passed:

- public demo load;
- visible waiting narration;
- hidden receipt body while stalled;
- labeled action response while request remains pending.

### Backstage phone lifecycle

Passed:

- locked page;
- wrong-passcode refusal;
- successful unlock and feed;
- submission without a second credential prompt;
- completion from the checklist;
- deletion from the checklist;
- feed agreement across state changes.

Evidence:

- `evidence/playwright.txt`;
- `evidence/playwright-report.json`.

The server emitted only the existing session-driver notice and color-environment warnings from
the test runner.

## Step 6 — Owned evidence server

Complete.

Applied the D1 migration with:

```sh
npx wrangler d1 migrations apply BACKSTAGE_DB \
  --local \
  --persist-to .wrangler/state \
  --config tests/support/backstage.wrangler.jsonc
```

Wrangler reported no pending migrations.

Started Astro at `http://127.0.0.1:4323` with:

- empty `CODEX_THREAD_ID` to keep the process foreground-owned;
- `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`;
- absolute isolated config path;
- `DEMO_PASSCODE=playwright-backstage-knock`;
- the disposable ticket signing marker.

Both `/` and `/backstage` returned successfully before capture.

The managed server was stopped after evidence work. A final process scan found no owned Astro
server remaining.

## Step 7 — Screenshot capture

Complete.

The final helper run wrote 12 PNG files.

### Exact viewport evidence

- `index-projector-1920x1080.png` — 1920×1080;
- `index-phone-375x812.png` — 375×812;
- `backstage-locked-projector-1920x1080.png` — 1920×1080;
- `backstage-locked-phone-375x812.png` — 375×812;
- `backstage-open-projector-1920x1080.png` — 1920×1080;
- `backstage-open-phone-375x812.png` — 375×812.

### Full-page companions

- index projector — 1920×1853;
- index phone — 375×1369;
- locked Backstage projector — 1920×1171;
- locked Backstage phone — 375×888;
- open Backstage projector — 1920×2391;
- open Backstage phone — 375×1765.

All images decoded as non-interlaced RGB PNGs.

Evidence: `evidence/image-metadata.txt`.

## Step 8 — Leak check

Complete with one documented configuration correction.

The build, local server, and leak checker used the same disposable out-of-band marker.

### First run

The first run used the executable default:

```text
LEAK_CHECK_DIR=dist
```

It failed with:

```text
client asset: server/.dev.vars
```

The marker was in an Astro server-only environment file, not a browser asset. Current Astro output
separates:

- browser output: `dist/client`;
- server output: `dist/server`.

This exact default-root behavior is already documented in prior project tickets, including both
prerequisite Backstage verification records.

The failed diagnostic was preserved as `evidence/leak-check-default-dist.txt`.

### Intended browser-boundary run

Reran with the executable’s supported directory override:

```sh
LEAK_CHECK_DIR=dist/client npm run leak:check
```

Result: pass.

- browser assets checked: 5;
- raw response bodies checked: 1;
- findings: 0.

Evidence: `evidence/leak-check.txt`.

No leak-check code, exclusion, or formatter was changed.

## Step 9 — Image decoding and dimensions

Complete.

The first implementation of the helper wrote only full-page images under filenames containing
the viewport dimensions.

Visual review caught that their heights exceeded `1080` and `812`. Widths were correct, but the
names did not describe exact first-viewport evidence.

The helper was adjusted to write two images per state:

- exact viewport under the base filename;
- full-page context under `-full.png`.

All images were recaptured and rechecked.

This is a planned-evidence refinement, not a product change.

## Step 10 — Visual cold read

Complete.

Every exact viewport image and full-page companion was inspected.

Results are recorded in `cold-read.md`.

### Index

Pass.

- “What is this?” — `Demo Runway`.
- “What do I do?” — watch the server sign a note; ask for another; leave a team note.
- No descriptive sentence replaces the display name.
- No repository or template narration is visible.
- Phone copy wraps without horizontal overflow.

### Locked Backstage

Pass.

- “What is this?” — `Backstage`, one shared list.
- “What do I do?” — enter the shared passcode and open the list.
- The old passcode lecture is absent.
- One short gate explanation remains.
- The safety note preserves both the prohibited content and safe alternative.

### Open Backstage

Pass.

- “What is this?” — the open `Shared checklist` inside Backstage.
- “What do I do?” — add a link or note, then mark or delete it.
- The add form and empty state remain legible at 375 pixels.
- No implementation narration or repeated task explanation appears.

The half-second claim is explicitly framed as the implementing session’s glance proxy.

## Screenshot data cleanup deviation

The complete Backstage flow intentionally leaves its seed entry in the local isolated D1 store.
Repeated local runs had accumulated two Playwright-marked seed entries.

Those entries were test artifacts, not product fixtures, and made the open-state cold-read image
less deterministic.

An initial HTTP cleanup attempt against the manually started evidence server received 403 on the
management methods and changed no data. No assertion or application file was altered in response;
the authoritative Playwright management flow had already passed its PATCH and DELETE steps.

After stopping the server, a local-only Wrangler D1 command removed only rows whose text matched
the test marker `pw-backstage-`.

The server was restarted and screenshots were recaptured with the empty state.

No remote database was contacted. No unmarked local entry was deleted.

The final images show `0 entries` and the ordinary empty-state instruction.

## Step 11 — Public-copy scan

Complete.

Evidence: `evidence/public-copy-scan.txt`.

No matches were found for:

- old sentence-title wording;
- old shared-knock/vault wording;
- old multi-paragraph unlock/account wording;
- generated-project narration;
- template or repository history;
- literal signing-key or passcode assignments;
- the committed Playwright passcode;
- the ticket-owned signing marker.

The scan distinguishes internal source comments from rendered strings.

Result: pass.

## Step 12 — Authoring wire

Complete.

Evidence: `evidence/authoring-wire.txt`.

Confirmed:

- `AGENTS.md` points Codex readers to `CLAUDE.md`;
- both files link the RDSPI workflow;
- both files link the copy voice and length standard;
- the workflow-relative standard link resolves;
- the workflow carries the four-rule authoring envelope;
- the workflow requires copy-surface mapping and standard citation before Design;
- Backstage rewrite Research cites the standard;
- index rewrite Research cites the standard;
- this verification Research cites the standard;
- this session received and followed that read path.

Result: pass within the documented injection boundary.

## Step 13 — Final implementation inspection

Complete.

Confirmed:

- no production diff;
- no test/config diff;
- no ticket frontmatter staged by this work;
- no empty evidence file;
- no running owned development server;
- all screenshot dimensions match their role;
- raw and structured Playwright evidence agree;
- leak evidence reports 5 assets and 1 response clean;
- cold-read conclusions agree with inspected images;
- `git diff --cached --check` passed after raw log whitespace normalization.

## Deviations summary

1. Added full-page companions alongside exact viewport screenshots after detecting that a
   full-page-only file did not honestly match a `1920x1080` or `375x812` filename.
2. Used supported `LEAK_CHECK_DIR=dist/client` after the default root classified Astro’s
   `dist/server/.dev.vars` as a client asset; preserved the failed diagnostic.
3. Removed only accumulated Playwright seed rows from the isolated local D1 store so final open
   screenshots show the deterministic empty state.

No deviation changed application behavior or weakened verification.

## Acceptance status before Review

- projector-distance index evidence — pass;
- phone index evidence — pass;
- projector-distance locked/open Backstage evidence — pass;
- phone locked/open Backstage evidence — pass;
- half-second orientation proxy — pass;
- no lecture — pass;
- no insider self-reference — pass;
- no sentence-title — pass;
- safety meaning preserved — pass;
- `npx playwright test` — pass;
- client-bundle/raw-response leak check — pass;
- injected authoring path — pass.

Review is the only remaining phase.
