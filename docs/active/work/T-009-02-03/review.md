# Review — T-009-02-03 cold read and flow verification

## Outcome

The ticket is complete.

The final proxy cold read passes for index and Backstage at exact 1920×1080 projector and
375×812 phone viewports.

The evidence answers the two visitor questions directly:

- `Demo Runway` — watch the server sign a note;
- locked `Backstage` — enter the shared passcode and open the list;
- open `Backstage` — add a link or note to the shared checklist, then mark or delete it.

The old passcode lecture, insider self-reference, and descriptive-sentence title wording are
absent from the inspected screens and targeted source scan.

The compressed Backstage safety rule remains visible before the gate.

The complete Playwright suite passes.

The emitted browser assets and one raw receipt response pass the exact signing-marker leak check.

The standard is linked from the documented injected authoring path and cited by both prerequisite
rewrite Research artifacts.

No production code change was needed.

## Files created

### RDSPI artifacts

- `research.md` — repository, surface, test, leak, and authoring-wire map;
- `design.md` — evidence options, tradeoffs, and selected capture method;
- `structure.md` — artifact tree and capture/evidence boundaries;
- `plan.md` — ordered implementation and verification steps;
- `progress.md` — execution log, results, and deviations;
- `review.md` — this handoff.

### Ticket-specific review artifact

- `cold-read.md` — screenshot manifest, per-state visitor answers, visual review, command results,
  acceptance assessment, and honest boundary.

### Capture support

- `capture-screenshots.mjs` — ticket-local Chromium capture helper.

### Raw and summarized evidence

- `evidence/typecheck.txt`;
- `evidence/build.txt`;
- `evidence/playwright.txt`;
- `evidence/playwright-report.json`;
- `evidence/leak-check.txt`;
- `evidence/leak-check-default-dist.txt`;
- `evidence/image-metadata.txt`;
- `evidence/public-copy-scan.txt`;
- `evidence/authoring-wire.txt`.

### Screenshots

Six exact first-viewport PNGs:

- index projector;
- index phone;
- locked Backstage projector;
- locked Backstage phone;
- open Backstage projector;
- open Backstage phone.

Six matching `-full` PNGs preserve below-the-fold context.

## Files modified

None outside the new ticket work directory.

The ticket’s production dependencies remain the already-committed prerequisite changes in:

- `src/pages/index.astro`;
- `src/pages/backstage.astro`.

This ticket did not modify either file.

It also did not modify:

- `BaseLayout`;
- page styles;
- API routes;
- auth or passcode behavior;
- storage or migrations;
- Playwright specs or configuration;
- leak-check implementation;
- the copy standard or workflow;
- any ticket phase or status field.

## Files deleted

None.

## Production behavior change

None.

The capture helper is documentation-side verification support and is not imported by the app,
build, runtime, or normal test suite.

The only local data mutation was removal of rows carrying the explicit Playwright seed marker
from the isolated local D1 store before final screenshots. No remote store and no unmarked entry
was touched.

## Visual evidence coverage

### Index

Projector and phone exact viewports show:

- `Try the demo`;
- `Demo Runway`;
- `Watch the server sign a note`;
- the one-sentence orientation lede;
- the loaded signed-note result beginning in the first viewport.

Full-page context shows:

- the complete receipt;
- `Ask for a fresh note`;
- the team-note card;
- `Leave a note for the team`.

The task is understandable in the first viewport even where the action button is below the fold,
because the initial signed note loads automatically and its result is visible.

### Locked Backstage

Projector and phone exact viewports show:

- `Backstage` as the short place name;
- one shared-list tagline;
- one short checklist lede;
- the one-sentence safety note;
- the verb-forward gate heading;
- the passcode instruction and field.

The projector capture contains the complete `Open backstage` button. On phone it begins at the
bottom edge and is fully visible after a short scroll in the full-page companion.

### Open Backstage

Projector and phone exact viewports show:

- retained `Backstage` wayfinding;
- `Backstage is open` status;
- `Shared checklist` landmark;
- the add/mark/delete lifecycle sentence;
- the start of the `Add something` task.

Full-page context shows the whole form, `Add to the list`, list status, and empty-state next step.

### Visual quality result

No inspected application content is clipped, overlapped, or horizontally overflowing.

The phone layouts wrap headings and long values within the available measure.

The content hierarchy remains clear at both widths.

## Cold-read assessment

### What is this?

Pass.

Both routes lead with stable names:

- `Demo Runway`;
- `Backstage`.

`Shared checklist` identifies the open Backstage destination without replacing the page name.

### What do I do?

Pass.

The first task labels use concrete actions:

- try;
- watch;
- ask;
- leave;
- open;
- add;
- mark;
- delete.

No task requires decoding implementation vocabulary.

### No lecture

Pass.

Each reviewed task area has one short explanation. The former unlock/account/passcode cluster is
gone.

### No insider self-reference

Pass.

No visible string discusses the repository, template, generated project, framework, runtime, or
development history.

Necessary terms such as `server`, `passcode`, and `signature` name visitor-visible behavior.

### No sentence-title

Pass.

The page names are nouns. Section headings are short landmarks or action-led tasks.

### Safety meaning

Pass.

The Backstage note tells visitors not to paste passwords, keys, or other secrets and to send them
securely instead.

It is one sentence and appears before the passcode gate.

## Automated test coverage

### Complete browser flow

Command:

```sh
npx playwright test
```

Result:

- 3 expected tests passed;
- 0 unexpected;
- 0 flaky;
- 2 intentional project-guard skips;
- total duration 5.2 seconds.

#### Healthy index coverage

- static shell and display name;
- signed receipt response;
- receipt nonce and signature shapes;
- primary-action accessible name;
- fresh response after activation;
- action re-enabled after completion.

#### Stalled index coverage

- static shell while the boundary stalls;
- visible loading narration;
- no fabricated receipt;
- labeled action visibly reacts while the request remains pending.

#### Backstage phone coverage

- locked initial state;
- wrong-passcode denial;
- successful unlock;
- feed rendering;
- no second credential prompt for submission;
- add entry;
- complete entry;
- delete entry;
- canonical feed state after each transition.

### Static verification

`npm run typecheck` passed:

- Astro: 61 files, 0 errors, 0 warnings, 0 hints;
- TypeScript no-emit: pass;
- Worker generated types: current.

`npm run build` passed against the isolated process-environment configuration.

### Capture-helper verification

- `node --check` passed;
- all navigation/state waits completed;
- all 12 screenshot writes completed;
- all PNGs decoded;
- exact viewport dimensions match filenames.

## Leak coverage

Final command shape:

```sh
DEMO_SIGNING_KEY=<owned-marker> \
DEMO_BASE_URL=http://127.0.0.1:4323 \
LEAK_CHECK_DIR=dist/client \
npm run leak:check
```

Result: pass.

- 5 emitted browser assets checked;
- 1 raw receipt response checked;
- 0 findings.

The build, server, and check used the same disposable out-of-band marker.

The executable’s default `dist` root also includes Astro’s `dist/server/.dev.vars`; that first
run correctly found the marker in the server-only file. The failed diagnostic is retained.

Selecting `dist/client` uses the checker’s existing supported input and tests the intended browser
surface. No disclosure exclusion was added.

The leak executable proves only absence of the exact configured marker from those two surfaces.
The separate source audit covers the ticket’s template-history and literal-credential prose
claims.

## Public-copy source coverage

The targeted scan found none of the known drift phrases:

- old `starting line` sentence title;
- old shared-knock/vault language;
- old unlock/account explanation;
- generated-project, template-history, or repository-history narration.

It also found no page literal for:

- signing-key assignment;
- passcode assignment;
- Playwright passcode;
- ticket-owned marker.

Internal comments remain out of visitor scope.

## Authoring-wire coverage

Pass.

The evidence confirms:

- `AGENTS.md` routes Codex to `CLAUDE.md`;
- both files name the Lisa-injected RDSPI workflow;
- both files link the copy voice and length standard;
- the workflow-relative standard link resolves;
- the workflow summarizes all four authoring rules;
- the workflow requires copy-map and standard citation before Design;
- Backstage rewrite Research cites the standard;
- index rewrite Research cites the standard;
- this verification Research cites the standard;
- this execution read the workflow and standard before review.

This verifies the repository/documented session boundary, not Lisa internals beyond the supplied
injection statement.

## Acceptance criterion assessment

### Projector-distance and phone screenshots

Pass.

The artifact directory contains exact viewport and full context images for index and both
Backstage states.

### Half-second orientation questions

Pass as the implementing session’s documented glance proxy.

Names and first tasks are in the orientation layer without a lecture.

### No lecture, insider self-reference, or sentence-title

Pass in image review and source scan.

### `npx playwright test`

Pass end to end.

### Leak check

Pass on the actual emitted browser directory and live raw response.

### Injected standard wire

Pass with resolved pointers and citations from both prerequisite sweeps.

## Deviations reviewed

### Exact viewport plus full-page pairs

Accepted and beneficial.

The first capture design wrote only full pages under viewport-shaped filenames. Review caught the
height mismatch before handoff. The helper now writes exact evidence and separate context images.

### Astro client/server output boundary

Accepted with raw evidence retained.

The default leak directory spans server output, so the supported `dist/client` override is needed
to express the checker’s intended browser-asset boundary on this Astro version.

### Local seed cleanup

Accepted.

Only Playwright-marked entries in the isolated local store were removed. This made the visual
evidence deterministic and did not alter application source or remote state.

## Coverage gaps and limitations

1. The cold read is not an external-human study. A person who has never seen the project still
   needs to perform the epic’s real room/physical-phone gate.
2. Headless Chromium at fixed pixels cannot reproduce projector optics, room distance, device
   font rendering, or assistive-technology use.
3. Screenshots are evidence, not golden visual-regression baselines; the normal test suite does
   not compare them automatically.
4. The exact-marker leak check does not detect an unrelated unknown credential. It proves the
   configured signing key stayed off the named browser surfaces.
5. The auxiliary HTTP attempt to remove prior Playwright seed rows received 403 on the manual
   evidence server, although the authoritative full Playwright run passed its PATCH and DELETE
   lifecycle immediately beforehand. Cleanup therefore used a local D1 command while the server
   was stopped. This did not affect ticket acceptance, but the discrepancy is recorded in
   `progress.md` rather than hidden.
6. Typecheck and build emit the existing deprecated session-driver signature notice. It is
   unrelated to copy or flow verification.

## Open concerns

No critical issue requires human attention before accepting this ticket.

Two non-blocking follow-ups remain outside scope:

- perform the epic’s true never-seen-it human cold read in a real room and on a physical phone;
- if desired, align the leak executable’s default directory with current Astro’s `dist/client`
  layout in a separate tooling ticket so callers do not need the supported override.

The one-off manual management-request 403 may be revisited if it reproduces outside the auxiliary
cleanup attempt. The committed Playwright lifecycle is green and remains the stronger browser/API
evidence.

## Final verdict

Ready for human review.

All ticket acceptance clauses have direct evidence, the full flow is green, the intended leak
boundary is clean, the authoring wire is live, and no production change or critical concern
remains.
