# Cold read — T-009-02-03

## Verdict

Pass.

The exact 1920×1080 and 375×812 first-viewport captures answer the two orientation questions
without requiring the old explanatory walls:

- index: this is `Demo Runway`; watch the server sign a note;
- locked shared list: this is `Backstage`; enter the shared passcode to open it;
- open shared list: this is the `Shared checklist`; add a link or note, then mark or delete it.

No inspected state contains the former two-paragraph passcode lecture, insider self-reference, or
a descriptive sentence used as its page name.

The Backstage safety rule remains visible in one sentence: do not paste passwords, keys, or other
secrets here; send them securely instead.

The complete Playwright suite and the intended client-bundle/raw-response leak check pass.

The authoring standard resolves from the documented injected path and was cited by both rewrite
Research artifacts.

## Honest review boundary

This is the implementing session’s proxy cold read, as the story specifies.

The images make the review reproducible, but image dimensions do not simulate an actual room,
projector brightness, eyesight, or a never-seen-it visitor.

“Half a second” is treated as a glance test: the page name and first task can be taken from the
orientation layer before reading supporting text.

The epic’s true external-human counter read remains a human gate.

Automation proves named behavior and exact disclosure boundaries. It does not prove that the
copy is persuasive.

## Capture method

`capture-screenshots.mjs` launched headless Chromium against an owned local Astro server.

The server used:

- the isolated Backstage Wrangler configuration;
- the local migrated D1 binding;
- the committed Playwright test passcode;
- a disposable ticket-owned signing marker supplied through process environment.

Index captures waited for the display-name heading, a visible signed receipt, and loaded fonts.

Backstage captures first recorded the locked page, then entered the local test passcode and waited
for the shared checklist before recording the open page.

Animations were disabled for capture.

Each state has:

- one exact first-viewport image for the projector/phone glance;
- one `-full` companion for below-the-fold context.

The helper does not start the server, seed entries, change page content, or perform pixel-diff
assertions.

## Screenshot manifest

| Surface | State | Exact viewport | Full-page context |
| --- | --- | --- | --- |
| Index | Loaded receipt, projector | [1920×1080](screenshots/index-projector-1920x1080.png) | [Full](screenshots/index-projector-1920x1080-full.png) |
| Index | Loaded receipt, phone | [375×812](screenshots/index-phone-375x812.png) | [Full](screenshots/index-phone-375x812-full.png) |
| Backstage | Locked, projector | [1920×1080](screenshots/backstage-locked-projector-1920x1080.png) | [Full](screenshots/backstage-locked-projector-1920x1080-full.png) |
| Backstage | Locked, phone | [375×812](screenshots/backstage-locked-phone-375x812.png) | [Full](screenshots/backstage-locked-phone-375x812-full.png) |
| Backstage | Open, projector | [1920×1080](screenshots/backstage-open-projector-1920x1080.png) | [Full](screenshots/backstage-open-projector-1920x1080-full.png) |
| Backstage | Open, phone | [375×812](screenshots/backstage-open-phone-375x812.png) | [Full](screenshots/backstage-open-phone-375x812-full.png) |

All 12 files decode as RGB PNGs.

The six primary images exactly match the viewport dimensions in their names.

The `-full` images retain those widths and extend only in height.

Detailed decoder output is in `evidence/image-metadata.txt`.

## Index — projector cold read

Evidence: [index projector](screenshots/index-projector-1920x1080.png).

### What is this?

`Demo Runway` is the largest text and the page’s `h1`.

It is a short name, not a claim or descriptive sentence.

The nearby tagline `Watch the server sign a note` identifies the demonstration without replacing
the product name.

### What do I do?

`Try the demo` and `Watch the server sign a note` give the first task at a glance.

The loaded `A fresh signed note` card makes the result visible without setup narration.

The primary action is below the first projector frame because the loaded receipt occupies the
second card. The full-page companion shows `Ask for a fresh note` directly below the receipt.

This does not block the first task: the initial signed note loads automatically and is already
visible in the exact viewport.

### Drift and layout review

- No lecture: pass; each card has one short explanation.
- No insider self-reference: pass; the visible copy discusses the visitor-visible server result.
- No sentence-title: pass; `Demo Runway` is a name.
- Verb-forward task: pass; `Try`, `Watch`, `Ask`, `Share`, and `Leave` name actions.
- Projector scan: pass; strong name/heading hierarchy and generous separation.
- Clipping/overlap: pass in captured application content.

## Index — phone cold read

Evidence: [index phone](screenshots/index-phone-375x812.png).

### What is this?

`Demo Runway` remains the first large landmark and wraps cleanly to two lines.

The name is followed immediately by the short signed-note task.

### What do I do?

`Try the demo` and `Watch the server sign a note` remain fully visible in the first card.

The second card begins within the first phone viewport and shows the signed-note result and its
one-sentence safety explanation.

The primary action and team-note link are below the fold, visible in the full-page companion.

The visitor does not need those controls to understand the initial automatic task.

### Drift and layout review

- No lecture: pass.
- No insider self-reference: pass.
- No sentence-title: pass.
- Name and task remain visible without horizontal scrolling: pass.
- Receipt values wrap within the card in full-page context: pass.
- Cards, text, and controls remain inside the 375-pixel width: pass.

## Locked Backstage — projector cold read

Evidence: [locked Backstage projector](screenshots/backstage-locked-projector-1920x1080.png).

### What is this?

`Backstage` is the dominant page name.

`One shared list, from first note to done.` identifies the place as a shared work list.

The short lede makes the content concrete: links and notes in one checklist.

### What do I do?

`Open the backstage list` is a verb-forward task heading.

The single explanation says to enter the shared passcode.

The `Shared passcode` field and `Open backstage` action are visible in the same projector frame.

### Safety review

The safety note is above the gate and readable before entry.

It states both the prohibition and next step in one sentence:

- do not paste passwords, keys, or other secrets here;
- send them securely instead.

It does not explain implementation, credential storage, or team process.

### Drift and layout review

- Former shared-knock/vault lecture: absent.
- Adjacent repeated explanation: absent.
- Insider self-reference: absent.
- Sentence-title: absent; `Backstage` is the place name.
- Gate heading, field, and action fit together: pass.
- Projector hierarchy and control visibility: pass.

## Locked Backstage — phone cold read

Evidence: [locked Backstage phone](screenshots/backstage-locked-phone-375x812.png).

### What is this?

`Backstage` remains the first dominant landmark.

The tagline wraps naturally without clipping and still reads as one brief thought.

### What do I do?

The top of the gate and its passcode field fit in the first phone viewport.

`Open the backstage list` and the one-line instruction are visible before the field.

The `Open backstage` button begins at the bottom edge of the exact viewport and is fully visible
in the full-page companion after a short natural scroll.

The task is understandable before scrolling because the heading, explanation, and field are
already present.

### Safety and layout review

- Safety note is fully visible before the gate: pass.
- No repeated passcode paragraph: pass.
- No horizontal scrolling: pass.
- No clipped heading, label, input, or note: pass.
- Touch-size field and action are preserved in full context: pass.

## Open Backstage — projector cold read

Evidence: [open Backstage projector](screenshots/backstage-open-projector-1920x1080.png).

### What is this?

The page keeps `Backstage` as the top name.

`Backstage is open` names the current state.

`Shared checklist` is the dashboard landmark.

### What do I do?

The dashboard explanation gives the lifecycle in one sentence: add a link or note, then mark or
delete each item.

`Add something` begins the first task area in the same frame.

The full-page companion shows the form controls, `Add to the list`, list status, and empty-state
instruction.

### Drift and layout review

- One dashboard explanation: pass.
- Concrete add/mark/delete verbs: pass.
- No implementation or account narration: pass.
- Stable place and section names: pass.
- Form and empty list remain within the centered measure: pass.
- No seeded test content remains in the final evidence: pass.

## Open Backstage — phone cold read

Evidence: [open Backstage phone](screenshots/backstage-open-phone-375x812.png).

### What is this?

`Backstage` remains visible at the top, followed by the open-state label and `Shared checklist`.

The phone does not replace these wayfinding names with generic `Dashboard` or `Welcome` copy.

### What do I do?

The first phone viewport contains the lifecycle explanation and the start of `Add something`.

The full-page companion shows the full form, verb-forward `Add to the list` button, `On the list`
heading, `0 entries` status, and `Add the first link or note above.` empty state.

### Drift and layout review

- Task order is legible from heading to options to fields to button: pass.
- Hints remain adjacent to their own fields: pass.
- No horizontal overflow at 375 pixels: pass.
- Controls fill the available measure without clipping: pass.
- Empty-state next step agrees with the form above: pass.

## Cross-surface copy verdict

The source audit is recorded in `evidence/public-copy-scan.txt`.

Known old wording is absent:

- `starting line every demo inherits`;
- `shared knock` / `not a vault`;
- `unlock once to see` / `no second sign-in`;
- generated-project, template-history, and repository-history narration.

No page contains a literal signing-key assignment, passcode assignment, Playwright passcode, or
ticket-owned signing marker.

Internal engineering comments contain necessary technical terms but do not render into the page.

The safety note uses the noun `secrets` to tell the visitor what not to submit. That is a safety
rule, not a leaked value.

## End-to-end flow result

Command:

```sh
npx playwright test
```

Result: pass in 5.2 seconds.

Structured report:

- expected: 3;
- unexpected: 0;
- flaky: 0;
- skipped: 2.

The two skips are intentional project guards: each index test skips in the other index project.
Every applicable project test ran.

Coverage:

- healthy signed receipt and refreshed primary action;
- stalled receipt boundary with visible narration and responsive action;
- Backstage phone gate, wrong-passcode refusal, unlock, feed, submit, complete, and delete.

Evidence:

- `evidence/playwright.txt`;
- `evidence/playwright-report.json`.

## Leak result

The application was rebuilt with the isolated config and the same disposable marker later
supplied to the evidence server and leak checker.

The checker ran against:

- `LEAK_CHECK_DIR=dist/client`;
- `http://127.0.0.1:4323/api/receipt`;
- the out-of-band disposable signing marker.

Result: pass.

- client assets checked: 5;
- response bodies checked: 1;
- findings: 0.

Evidence: `evidence/leak-check.txt`.

The first attempt used the executable’s default `dist` root and correctly reported
`server/.dev.vars`. Astro’s current build separates browser files under `dist/client` and server
files under `dist/server`; the latter is not a browser asset. That diagnostic is preserved in
`evidence/leak-check-default-dist.txt`.

Using `LEAK_CHECK_DIR=dist/client` is the checker’s supported configuration and matches its
documented client-bundle contract. No checker code or exclusion rule was changed.

The separate public-copy scan covers prose categories outside the exact-marker leak check.

## Authoring-wire result

Evidence: `evidence/authoring-wire.txt`.

Pass.

- `AGENTS.md` points Codex to `CLAUDE.md`.
- Both files link the injected RDSPI workflow and the copy standard.
- The workflow-relative standard link resolves.
- The workflow contains the four-rule authoring envelope.
- The workflow requires standard citation and copy-surface mapping before Design.
- Backstage rewrite Research cites the standard.
- Index rewrite Research cites the standard.
- This verification Research cites the standard.
- This session read the workflow and standard before its copy-review judgment.

The claim is limited to the documented path, resolved repository files, and context supplied to
this execution.

## Final acceptance assessment

### Projector and phone evidence

Pass: six exact viewport images cover index, locked Backstage, and open Backstage; six full-page
companions preserve context.

### “What is this?”

Pass: `Demo Runway` and `Backstage` remain immediate stable names.

### “What do I do?”

Pass: visible task labels name watch, open, add, mark, and delete actions without an explanatory
wall.

### No lecture, insider self-reference, or sentence-title

Pass in visual inspection and source scan.

### Full Playwright flow

Pass: 3 applicable tests, 0 unexpected outcomes.

### Leak check

Pass on the emitted browser assets and one raw receipt response.

### Standard wire

Pass: pointers resolve and all three sweep/verification Research artifacts cite the contract.

## Open concern

The only remaining acceptance boundary is the epic’s intentionally deferred never-seen-it human
read in a real room and on a physical phone. No critical implementation issue was found in this
proxy pass.
