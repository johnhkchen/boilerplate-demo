# Research — T-009-02-03 cold read and flow verification

## Scope and phase

- Ticket: `docs/active/tickets/T-009-02-03.md`.
- Phase at session start: `research`.
- Parent story: `docs/active/stories/S-009-02.md`.
- Epic: `docs/active/epic/E-009.md`.
- Workflow: `docs/knowledge/rdspi-workflow.md`.
- Binding copy contract: `docs/knowledge/copy-voice-standard.md`.
- Public surface: `src/pages/index.astro`.
- Shared-list surface: `src/pages/backstage.astro`.
- Browser flows: `tests/demo-flow.spec.ts` and `tests/backstage-flow.spec.ts`.
- Test contract: `tests/support/flow-contract.ts`.
- Test orchestration: `playwright.config.ts`.
- Leak executable: `scripts/leak-check.ts`.
- Leak implementation: `src/lib/leak-check.ts`.

This artifact describes the repository state before final verification. It does not choose a
verification implementation.

## Ticket requirement

The ticket is the final dependent ticket after the Backstage and index copy rewrites.

Its single acceptance criterion requires one work artifact to:

- capture projector-distance screenshots of index and Backstage;
- capture phone screenshots of index and Backstage;
- assess whether each screenshot answers “what is this?” and “what do I do?” quickly;
- find no lecture, insider self-reference, or descriptive sentence used as a title;
- record a passing complete `npx playwright test` run;
- record a passing leak check;
- confirm that the copy standard is referenced on the injected authoring path.

The story calls the implementing session’s cold read a proxy. A genuinely new human reader is
the epic’s later human gate and cannot be simulated by an automated assertion.

The workflow requires all remaining RDSPI artifacts. Lisa owns ticket phase and status changes;
those frontmatter fields are outside this session’s edit boundary.

## Current repository state

The worktree contains Lisa-owned changes to `.lisa/provenance.jsonl` and active ticket files.

There is no uncommitted diff in either `src/pages/index.astro` or
`src/pages/backstage.astro`.

Recent commits show both prerequisite rewrites and their reviews:

- `0b69109` rewrote index copy;
- `47a55e5` recorded the index review;
- `4c91ef5` rewrote Backstage copy;
- `5253d7b` shortened the final over-limit delete confirmation;
- `8b2183d` recorded the Backstage review.

The verification ticket’s artifact directory does not exist at research start.

## Binding authoring standard

`docs/knowledge/copy-voice-standard.md` applies to visible copy, accessible names, metadata,
dynamic states, errors, confirmations, and equivalent descriptions.

Its four rules are:

1. use plain kitchen-table English;
2. keep each classified element inside its word and character ceilings;
3. use the short product or place name as wayfinding;
4. begin action labels with a specific verb.

The standard also requires one explanation per task area and a human glance/breath review.

Its author-and-review pass explicitly requires projector-distance and phone cold reads for a
changed public surface.

The current ticket does not add copy. The standard still governs the review judgment because
the ticket verifies copy changed by its two dependencies.

## Index surface

`src/pages/index.astro` renders through `src/layouts/BaseLayout.astro`.

The page has three stacked clay surfaces:

1. orientation;
2. signed-note result and primary action;
3. a link to Backstage.

The orientation layer currently reads:

- eyebrow: `Try the demo`;
- display name: `Demo Runway`;
- tagline: `Watch the server sign a note`;
- lede: `Watch the server sign a fresh note, then leave a thought for the team.`

The browser title is `Demo Runway — Watch the server sign a note`.

The metadata description names both available visitor actions in one sentence.

The primary button remains the template slot `Ask for a fresh note`.

The third card links to `/backstage` with `Leave a note for the team`.

The first viewport therefore exposes a product name, observable demo task, primary action, and
secondary collaboration path without needing script-generated explanatory copy.

The page fetches `/api/receipt` on load and on primary-action activation. It shows a loading
status, a signed receipt on success, or a short retry state on failure.

## Backstage surface

`src/pages/backstage.astro` also renders through `BaseLayout`.

It has two page states:

1. an intro and passcode gate;
2. a shared checklist dashboard after a successful gated feed read.

The locked orientation layer currently reads:

- eyebrow: `Share with your team`;
- display name: `Backstage`;
- tagline: `One shared list, from first note to done.`;
- lede: `Share links and notes in one checklist.`;
- safety note: `Don't paste passwords, keys, or other secrets here; send them securely instead.`

The gate supplies:

- heading: `Open the backstage list`;
- one explanation: `Enter your shared passcode to open the list.`;
- field: `Shared passcode`;
- button: `Open backstage`.

The previous multi-paragraph passcode explanation is absent.

After unlock, the dashboard heading is `Shared checklist`. Its explanation names add, mark, and
delete as the available actions. The add form and list use stable labels and verb-first buttons.

The browser keeps the entered passcode only in page memory and sends it as
`x-demo-passcode`. It is not stored in markup, a URL, a cookie, or browser storage.

## Layout and viewport behavior

`BaseLayout` supplies a responsive `.page` shell and receives page-owned title and description
props. It contains no literal visitor copy of its own.

Both pages use shared clay primitives and page-local responsive layout rules.

The index limits cards to the shared reading measure and wraps long receipt values.

Backstage uses responsive grids, full-width controls on narrow screens, and wrapping entry
content. Its existing Playwright project uses the Pixel 5 device preset.

The repository has historical cold-read evidence using 1920×1080 and 375-pixel phone captures.
Those dimensions provide a local evidence convention, although this ticket names the review
purpose rather than exact dimensions.

## Playwright coverage

`npx playwright test` selects three projects from `playwright.config.ts`:

- `healthy` runs the successful signed-receipt index flow;
- `stalled` runs the index with `/api/receipt` deliberately left pending;
- `backstage` runs the complete gated checklist lifecycle on a Pixel 5 profile.

The suite is serial, uses one worker, has no retries, and owns a server at
`http://127.0.0.1:4323` unless an external base URL is supplied.

The owned server receives deterministic local test values:

- signing key: `playwright-local-test-key` unless overridden;
- passcode: `playwright-backstage-knock`.

The Backstage project applies the D1 migration to the same local persistence directory used by
the dev server before running.

The healthy index test verifies page identity, receipt visibility, nonce/signature shapes,
primary-action naming, fresh response behavior, and action re-arming.

The stalled index test verifies visible loading narration, no fabricated receipt, and a primary
action that visibly reacts while the request is pending.

The Backstage test verifies locked state, wrong-passcode refusal, unlock, seeded feed display,
submission without a second credential prompt, completion, deletion, and feed agreement after
each mutation.

The flow suite exercises behavior at desktop widths for index and at a real phone device profile
for Backstage. It does not itself create the ticket’s four review screenshots.

## Leak-check boundary

`npm run leak:check` runs `scripts/leak-check.ts`.

The command requires:

- a built bundle, defaulting to `dist`;
- a reachable receipt endpoint, defaulting to `http://localhost:4321/api/receipt`;
- a non-empty `DEMO_SIGNING_KEY` from the environment or `.dev.vars`.

The implementation scans browser assets while excluding Worker server output and top-level
metadata. It also reads one raw receipt response.

The result passes only if the exact configured signing key appears in neither browser assets nor
the response body.

The check does not search prose for words such as `secret`, `passcode`, or template history.
Those public-copy claims require a separate source/rendered-content review.

## Injected authoring path

`AGENTS.md` points Codex readers to `CLAUDE.md` first.

Both `AGENTS.md` and `CLAUDE.md` state that `docs/knowledge/rdspi-workflow.md` is injected by
Lisa. Both also link directly to `docs/knowledge/copy-voice-standard.md` before copy work.

`docs/knowledge/rdspi-workflow.md` links to `copy-voice-standard.md` using a path relative to its
own `docs/knowledge` directory.

The workflow summarizes the standard’s four-rule authoring envelope and requires Research to
cite the standard and map copy surfaces before Design.

Both prerequisite rewrite Research artifacts cite the standard:

- `docs/active/work/T-009-02-01/research.md` for Backstage;
- `docs/active/work/T-009-02-02/research.md` for index.

This session also received the RDSPI workflow in its user instructions and read the standard
before assessing the surfaces. That is direct execution evidence that the intended path is live,
within the repository’s documented injection boundary.

## Constraints and assumptions

- Verification should preserve the already-reviewed page copy unless evidence finds a failure.
- Screenshot evidence belongs under `docs/active/work/T-009-02-03/`.
- Screenshot capture may use a temporary local server and a ticket-local script or direct
  Playwright invocation.
- Backstage evidence must include the locked page because the removed lecture and safety note are
  visible there; an unlocked capture is also relevant to the full task orientation.
- “Projector distance” is a human review condition represented by a 1920×1080 capture and visual
  inspection, not a machine assertion.
- “Half a second” is a glance heuristic, not a measured performance threshold.
- A passing leak check requires a locally controlled key and endpoint so the evidence is
  reproducible without reading a developer secret.
- Source history and internal comments are not user-facing unless rendered or announced.
- User-supplied entry content and opaque receipt values are outside authored-copy counts.
- Lisa-owned worktree changes must remain unstaged and unmodified.

## Research conclusion

The repository already contains the final rewritten surfaces and the behavioral harness needed
for the ticket. Remaining work is to select a reproducible evidence method, capture and inspect
the four viewport states, exercise all three browser projects, run the bundle/response leak
check against an owned key, confirm public-copy and authoring-wire claims, and record the results
without overstating automated evidence as a real human cold read.
