# Design — T-009-02-03 cold read and flow verification

## Decision summary

Create durable, ticket-local cold-read evidence with Playwright, inspect every capture as a human
review proxy, and keep behavioral and disclosure claims tied to the repository’s existing
authoritative checks.

The evidence set will contain six screenshots:

- index at 1920×1080;
- index at a 375×812 phone viewport;
- locked Backstage at 1920×1080;
- locked Backstage at a 375×812 phone viewport;
- unlocked Backstage at 1920×1080;
- unlocked Backstage at a 375×812 phone viewport.

A `cold-read.md` artifact will answer the ticket’s two glance questions for each state and record
the review for lecture, insider narration, sentence-title drift, safety meaning, and layout.

The complete `npx playwright test` run will remain the end-to-end flow proof.

The configured leak executable will run against a built bundle, an owned local server, and a
known disposable signing key. Its output will be retained as evidence.

The authoring-wire check will resolve every documented link and record both prerequisite Research
citations plus this session’s observed read path.

## Design goals

1. Make the visual claim reviewable after this session ends.
2. Cover both page orientation and the Backstage task revealed after unlock.
3. Keep screenshots deterministic enough to reproduce locally.
4. Avoid changing production code merely to collect evidence.
5. Use the complete existing flow suite without weakening selectors or assertions.
6. Exercise the real leak-check command rather than substituting a source search.
7. Separate exact automated claims from human visual judgment.
8. Preserve Lisa-owned ticket and provenance changes.

## Option 1 — Manual screenshots only

### Shape

Start the development server, open each route in a browser, resize the window, and save images
manually into the ticket directory.

### Benefits

- minimal implementation;
- uses a real browser;
- allows immediate visual judgment.

### Costs

- viewport sizes and page states are easy to vary accidentally;
- unlock steps are not recorded;
- filenames alone do not explain reproduction;
- later reviewers cannot distinguish a current capture from an arbitrary image;
- repeating all states takes unnecessary manual work.

### Assessment

Viable for a one-time glance but weak as durable acceptance evidence.

## Option 2 — Add permanent screenshot assertions to the main suite

### Shape

Add screenshot tests under `tests/`, commit golden images, and make visual comparison part of
`npx playwright test`.

### Benefits

- fully repeatable;
- future copy or layout changes can trigger diffs;
- uses the existing owned server orchestration.

### Costs

- expands a verification ticket into a permanent visual-regression system;
- screenshot baselines are browser and platform sensitive;
- pixel equality cannot judge plainness, wayfinding, or half-second comprehension;
- the story explicitly keeps human judgment binding and does not ask for a fleet-wide copy gate;
- baseline churn would add maintenance unrelated to the ticket’s flow contract.

### Assessment

Rejected as hidden scope and automated theater for a human cold-read criterion.

## Option 3 — Ticket-local Playwright capture script

### Shape

Add a small script under `docs/active/work/T-009-02-03/` that:

- reads an optional base URL;
- launches Chromium;
- creates desktop and phone browser contexts;
- opens index and waits for the signed receipt;
- opens locked Backstage;
- unlocks Backstage with the existing local test passcode;
- writes predictably named full-page PNG files;
- closes all browser resources even on failure.

Run it against the same isolated local configuration used by the suite.

### Benefits

- viewport, route, and unlocked state are explicit;
- all screenshots can be regenerated with one command once the server is running;
- evidence stays beside the ticket rather than becoming production test policy;
- the script uses semantic labels for unlock and confirms the target state is visible;
- reviewers can inspect exact artifacts without running the app.

### Costs

- requires an owned server to be started separately;
- duplicates a small amount of device configuration;
- screenshot capture itself still does not decide whether the copy is good.

### Assessment

Chosen. It gives reproducible evidence without claiming screenshot automation replaces review.

## Option 4 — Reuse only Playwright traces and test attachments

### Shape

Run the current suite and use trace snapshots or failure artifacts as visual evidence.

### Benefits

- no new script;
- behavior and visuals share one run.

### Costs

- passing tests do not retain ordinary screenshots;
- the healthy project uses desktop but Backstage only uses a phone device;
- traces capture interaction moments selected for behavior, not the required cold-read states;
- projector and phone pairs would remain incomplete.

### Assessment

Rejected because it cannot satisfy the explicit visual artifact requirement.

## Viewport decision

### Projector proxy

Use 1920×1080 with desktop device scale factor 1.

This matches historical project evidence and provides a conventional presentation frame. The
review will inspect the first visible screen at normal scale and also consider the full-page
image for content below the fold.

The phrase “projector distance” remains a human viewing proxy. The file dimensions do not prove
physical distance or room conditions.

### Phone proxy

Use 375×812 with device scale factor 1, touch enabled, and mobile context behavior.

This narrow viewport matches the repository’s earlier phone-evidence convention. The main
Backstage behavior suite independently uses Playwright’s Pixel 5 preset, so the ticket obtains
both a 375-pixel visual review and a phone-device functional run.

## State decision

### Index

Capture after the initial receipt becomes visible.

This shows:

- the product name;
- the task description;
- a live signed result;
- the primary action;
- the Backstage collaboration path in the full-page image.

Waiting for the receipt removes nondeterministic loading-state timing from the evidence. The
stalled-state behavior remains covered by the existing stalled test.

### Locked Backstage

Capture before entering the passcode.

This is the state where the ticket’s specific regression was visible. It shows the compressed
safety note and the single gate explanation.

### Unlocked Backstage

Capture after a successful feed response and dashboard reveal.

This state proves the post-gate task still orients the visitor to add, mark, and delete work.
It also catches narrow-screen form or list layout problems that a locked-only capture would miss.

## Evidence script boundary

The capture script is verification support, not application code.

It will not:

- import application internals;
- seed or mutate checklist entries;
- take ownership of server startup;
- read `.dev.vars`;
- store a production credential;
- alter page copy or styles;
- perform pixel-diff assertions.

It may use the same public local test passcode already committed in
`tests/support/flow-contract.ts`. The value is explicitly documented as a local test knock, not a
secret.

The script will fail if:

- a route cannot load;
- the index receipt does not appear;
- the Backstage passcode control or action cannot be found;
- unlock does not reveal the dashboard;
- a screenshot cannot be written.

## Cold-read assessment method

Each image will be reviewed against a compact rubric.

### “What is this?”

The first landmark must be a short stable name:

- `Demo Runway` on index;
- `Backstage` on the shared-list page.

The nearby tagline or heading may explain the task but must not replace the name with a sentence.

### “What do I do?”

The orientation layer and nearest primary control must expose a concrete verb:

- `Try`, `Watch`, or `Ask` on index;
- `Share`, `Open`, or `Add` on Backstage.

The answer should not depend on reading multiple adjacent paragraphs.

### Drift review

Inspect for:

- more than one explanation before a control;
- repository, template, runtime, framework, or team-process narration;
- a primary title that is a descriptive sentence;
- labels that use generic verbs such as `Submit` or `Continue`;
- safety meaning repeated or buried;
- text clipped, overlapped, or pushed outside the viewport;
- horizontal scrolling at phone width.

### Safety review

The locked Backstage image must retain a direct instruction not to paste passwords, keys, or
other secrets and must name a safe alternative.

The visual review will not claim that the shared passcode is high-security authentication. The
page’s own warning and the story both treat it as a low-stakes gate.

## Flow verification design

Run exactly:

```sh
npx playwright test
```

Do not narrow projects or specs for the final ticket result.

Expected project coverage:

- healthy index;
- stalled index;
- Backstage phone lifecycle.

Retain console output and the JSON report in the ticket evidence directory. The Playwright
reporter already writes `test-results/flow-report.json`; copy the final report into ticket-owned
evidence so later cleanup does not erase the handoff record.

No selector or expectation will be changed unless the run exposes a real implementation defect.

## Leak verification design

The leak checker needs a built client bundle and a reachable receipt endpoint using the same
known signing key.

Use a disposable explicit value dedicated to this verification. Start the local server with
that value and point `DEMO_BASE_URL` at its address.

Run:

```sh
DEMO_SIGNING_KEY=<owned-test-key> DEMO_BASE_URL=<owned-server> npm run leak:check
```

Save the output under `evidence/leak-check.txt`.

The exact pass claim is:

- the configured key was absent from every scanned browser asset;
- the configured key was absent from the raw receipt response.

Separately search rendered/source public copy for prohibited template-development narration and
accidental literal credentials. Do not conflate that prose audit with the executable’s narrower
secret-marker contract.

## Authoring-wire verification design

Record four facts:

1. `AGENTS.md` and `CLAUDE.md` point to the workflow and standard;
2. the workflow’s relative standard link resolves on disk;
3. the workflow carries the standard’s authoring envelope and Research rule;
4. both prerequisite rewrite Research artifacts cite the standard.

Also record that this session followed the path by reading `CLAUDE.md`, the workflow, the ticket,
and the standard before producing copy-related review judgments.

This is repository and execution evidence. It does not claim visibility into Lisa internals
beyond the documented injection statement supplied to the session.

## Failure policy

If visual review finds copy or layout drift, fix the smallest responsible production surface,
rerun affected checks, recapture all impacted states, and document the deviation in
`progress.md`.

If Playwright fails, diagnose the named project and step. Do not relax budgets or assertions to
obtain green output.

If the leak check is misconfigured, correct the owned server/key setup. If it finds the marker,
stop and treat the disclosure as critical.

If the authoring link does not resolve, repair the documentation wire within the ticket’s stated
acceptance boundary and note the change.

## Rejected scope

- automated copy-length enforcement;
- permanent visual-regression baselines;
- new application copy abstractions;
- changes to auth, storage, or receipt behavior;
- production deployment verification;
- claims that the implementing agent is a never-seen-it human reviewer;
- ticket phase or status edits.

## Chosen outcome

The ticket will finish with inspectable PNG evidence, a concise cold-read verdict, raw flow and
leak outputs, a reproducible capture helper, and the six RDSPI artifacts. Production code should
remain unchanged unless verification discovers a defect.
