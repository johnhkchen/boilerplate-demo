# Structure — T-009-02-03 cold read and flow verification

## Change boundary

This ticket is expected to add verification artifacts only.

No production source, application test, configuration, migration, or ticket frontmatter file is
scheduled for modification.

If verification exposes a defect, the responsible existing file may be changed only after the
deviation is recorded in `progress.md`. The normal structure below assumes the current surfaces
pass.

## Ticket artifact directory

All new files live under:

```text
docs/active/work/T-009-02-03/
```

Planned tree:

```text
T-009-02-03/
├── research.md
├── design.md
├── structure.md
├── plan.md
├── progress.md
├── review.md
├── cold-read.md
├── capture-screenshots.mjs
├── screenshots/
│   ├── index-projector-1920x1080.png
│   ├── index-phone-375x812.png
│   ├── backstage-locked-projector-1920x1080.png
│   ├── backstage-locked-phone-375x812.png
│   ├── backstage-open-projector-1920x1080.png
│   └── backstage-open-phone-375x812.png
└── evidence/
    ├── playwright.txt
    ├── playwright-report.json
    ├── build.txt
    ├── typecheck.txt
    ├── leak-check.txt
    ├── public-copy-scan.txt
    └── authoring-wire.txt
```

`research.md`, `design.md`, `structure.md`, `plan.md`, `progress.md`, and `review.md` are the six
required RDSPI artifacts.

`cold-read.md` is the ticket-specific acceptance artifact that connects screenshots to the two
visitor questions and the manual review rubric.

## `capture-screenshots.mjs`

### Responsibility

Own browser capture only.

The script creates deterministic viewport contexts, navigates through public browser behavior,
and writes screenshots. It does not start infrastructure or decide the review verdict.

### Inputs

Environment variables:

- `PLAYWRIGHT_BASE_URL`, optional, default `http://127.0.0.1:4323`;
- `DEMO_PASSCODE`, optional, default `playwright-backstage-knock`.

The defaults match the existing local flow contract and Playwright server.

### Outputs

Six PNG files in the sibling `screenshots/` directory.

The script derives that directory from its own module URL, so it works from any shell working
directory.

### Internal organization

The file will contain:

1. constants for base URL, passcode, output path, and viewport definitions;
2. a small filename-safe capture function;
3. a function that captures the index state for one viewport;
4. a function that captures locked and unlocked Backstage for one viewport;
5. browser startup and sequential context execution;
6. a `try/finally` browser close boundary;
7. concise operator output listing each written path.

### Browser contexts

Projector context:

```js
{
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce'
}
```

Phone context:

```js
{
  viewport: { width: 375, height: 812 },
  screen: { width: 375, height: 812 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
  reducedMotion: 'reduce'
}
```

The explicit scale factor keeps artifact pixel dimensions aligned with filenames.

### Index capture contract

For each context:

1. navigate to `/`;
2. wait for the `Demo Runway` heading;
3. wait for `#receipt-body` to become visible;
4. wait for fonts to be ready;
5. capture a full-page screenshot.

The receipt wait confirms the server boundary answered and stabilizes the visible state.

### Backstage capture contract

For each context:

1. navigate to `/backstage`;
2. wait for the exact `Backstage` heading and passcode field;
3. capture the full locked page;
4. fill the committed local test passcode;
5. activate `Open backstage`;
6. wait for `#backstage-gate` to hide;
7. wait for `#backstage-dashboard` to become visible;
8. wait for the `Shared checklist` heading;
9. capture the full unlocked page.

The script does not add or delete an entry. The main flow suite owns mutation coverage.

### Failure behavior

Uncaught navigation, locator, wait, or screenshot errors exit nonzero.

The browser closes in `finally`.

No catch block converts a failed capture into a successful exit.

## `cold-read.md`

### Responsibility

Provide the human-readable acceptance record.

### Sections

1. evidence method and honest boundary;
2. screenshot manifest with viewport and state;
3. index projector review;
4. index phone review;
5. locked Backstage projector review;
6. locked Backstage phone review;
7. open Backstage projector review;
8. open Backstage phone review;
9. copy drift and safety audit;
10. flow result;
11. leak result;
12. authoring-wire result;
13. final verdict and any open concern.

### Screenshot table fields

- file;
- route;
- state;
- viewport;
- “what is this?” answer;
- “what do I do?” answer;
- result.

The answers will quote only short authored labels needed to explain the verdict.

### Claim boundary

The document must say that this is the implementing session’s proxy cold read.

It may claim:

- the name and next action are visible;
- the inspected images contain no lecture, insider narration, or sentence-title;
- the layouts show no observed clipping or horizontal overflow;
- automated commands passed.

It may not claim:

- a new external human completed the read;
- pixel dimensions prove physical projector legibility;
- the leak checker proves every possible disclosure is absent;
- automation proves the demo is convincing.

## `evidence/playwright.txt`

Raw combined stdout and stderr from `npx playwright test`.

The file should preserve:

- all project/test names;
- step names;
- pass/fail summary;
- duration;
- relevant server warnings.

It should not be hand-edited after capture.

## `evidence/playwright-report.json`

Copy of `test-results/flow-report.json` immediately after the complete suite succeeds.

This provides structured confirmation of project selection and outcomes independent of the
human-readable terminal log.

## `evidence/build.txt`

Raw output from `npm run build`.

The build is required before the leak checker because its default asset root is `dist`.

## `evidence/typecheck.txt`

Raw output from `npm run typecheck`.

This confirms the evidence addition did not coincide with an existing Astro or TypeScript
failure and records generated Worker type agreement.

## `evidence/leak-check.txt`

Raw output from `npm run leak:check` with an explicit owned signing key and base URL.

The expected successful shape is:

- `leak check — passed`;
- a positive count of client assets checked;
- one response body checked.

The key value itself need not be written into the artifact; the progress record can describe it
as a disposable ticket-owned marker.

## `evidence/public-copy-scan.txt`

Record a targeted source/rendered-copy scan distinct from the marker leak checker.

The scan should cover `src/pages/index.astro` and `src/pages/backstage.astro` for:

- old sentence-title wording;
- old passcode-lecture phrases;
- template/repository/development-history narration in user-facing literals;
- suspicious literal key or production passcode assignments.

Internal comments may contain technical vocabulary. Results must distinguish comments from
rendered strings rather than treating all matches as public leaks.

## `evidence/authoring-wire.txt`

Record:

- each source file containing the pointer;
- resolved target paths;
- existence checks;
- prerequisite Research citations;
- a final pass/fail statement.

The evidence may be produced with `rg`, `test -f`, and path normalization. It should remain
readable without requiring a custom program.

## Existing files read but not modified

### `src/pages/index.astro`

Source for the public orientation and signed-note states.

### `src/pages/backstage.astro`

Source for locked and unlocked shared-list states.

### `tests/demo-flow.spec.ts`

Behavior authority for healthy and stalled index states.

### `tests/backstage-flow.spec.ts`

Behavior authority for the complete phone checklist lifecycle.

### `playwright.config.ts`

Owns test project selection, local server, isolated D1 setup, and deterministic test values.

### `scripts/leak-check.ts` and `src/lib/leak-check.ts`

Own the executable disclosure-check contract.

### `AGENTS.md`, `CLAUDE.md`, and `docs/knowledge/rdspi-workflow.md`

Own the documented authoring path.

### `docs/knowledge/copy-voice-standard.md`

Owns the review contract.

## Commit structure

Meaningful units:

1. Research artifact;
2. Design artifact;
3. Structure artifact;
4. Plan artifact;
5. capture helper plus raw screenshot/check evidence and `cold-read.md`;
6. progress artifact;
7. review artifact.

Commits will stage only ticket-owned paths. Lisa-owned modified files remain unstaged.

## Structural verification

Before Review:

- all listed files exist;
- all six PNGs are non-empty and decode as images;
- PNG dimensions match their filename viewport widths for full-page captures;
- evidence logs contain successful exit summaries;
- `git diff --check` passes on text artifacts;
- `git status --short` shows no accidental production or ticket-frontmatter edit from this work;
- every implementation commit contains only the intended ticket directory unless a documented
  verification fix became necessary.
