# T-006-01-02 — sample-sponsor-packet-fixture — Research

Descriptive only: what exists, where, how it connects. No solutions here.

## Ticket in one line

Commit a reproducible, credential-free sample sponsor packet under
`test/fixtures/sponsor-packet/` so the assembly playbook can be rehearsed for
free (S-006-02) and re-rehearsed after every template change.

## The contract this fixture mirrors

`docs/knowledge/assembly-playbook.md` (landed by T-006-01-01, commit 852be15)
declares the intake contract in Beat 1, Step 1: six input classes, presented
as a table, with an explicit coupling clause — "the sample sponsor packet
fixture (its own ticket, landing behind this doc) mirrors it one directory
per class, so if you change the class names here, change the fixture in the
same breath." The six declared classes:

| Class | What it holds |
|---|---|
| `sponsor-site` | Sponsor website and product pages |
| `api-docs` | Current API documentation for the endpoints you will call |
| `code-examples` | GitHub examples or sample repos |
| `design-brief` | Figma brief or screenshots |
| `sdk` | SDKs or client libraries |
| `credentials` | Temporary API credentials |

T-006-01-01's review (`docs/active/work/T-006-01-01/review.md`, items 1–2)
records two decisions that bind this ticket:

- the six class names are settled and are exactly what this fixture must
  mirror, one directory per class;
- the playbook deliberately does **not** name the literal path
  `test/fixtures/sponsor-packet/` yet (it says "its own ticket, landing
  behind this doc") because the path did not exist; this ticket "may restore
  the literal" once the directory is real.

## Acceptance criteria, decomposed

The ticket AC (and the story acceptance in `docs/active/stories/S-006-01.md`)
requires three observable things:

1. **One artifact per input class the playbook's intake step names.** The AC
   text enumerates examples: "API doc, SDK pointer, design brief,
   temp-credential placeholder, chosen core moment." Note the mismatch: the
   playbook names six classes; the AC's example list has five items, one of
   which — *chosen core moment* — is **not** an input class at all. In the
   playbook the core moment belongs to Step 3 (the intake statement: "the
   single thing the audience must see work"), and S-006-02's acceptance
   speaks of "the fixture's core-moment vertical slice" — so the packet must
   carry a chosen core moment *somewhere*, even though it is not one of the
   six class directories. Where it lives is a Design decision.
2. **The leak-check script passes over the fixture.**
3. **The playbook's rehearsal note points at the packet.** The rehearsal
   note is the last bullet of "What this play is not": "Not yet rehearsed
   live. The dry run of this playbook against a sample sponsor packet is its
   own story (S-006-02)…" — currently pathless, per the deferral above.

## Story-level constraints (S-006-01, S-006-02)

- Scope: "a sample sponsor packet under test/fixtures/sponsor-packet/. …
  No src/** changes, no new scripts or tooling."
- Honest boundary: "The sponsor packet uses a fake sponsor API in the spirit
  of the harness's fake slow integration; no real credentials enter the
  repo."
- S-006-02 (the dry run) will drive a clean template copy end to end using
  *only* the playbook plus this packet, and must yield "the fixture's
  core-moment vertical slice" live at a public URL. So the packet is the
  sole sponsor-side input of that rehearsal: it must contain enough for an
  agent to build one vertical slice without any external account, network
  dependency, or payment.

## The leak-check machinery

- `scripts/leak-check.ts` — thin CLI edge. Config via env:
  `LEAK_CHECK_DIR` (default `dist`), `LEAK_CHECK_URL` (default
  `<DEMO_BASE_URL>/api/receipt`), `DEMO_SIGNING_KEY` (falls back to reading
  `.dev.vars`), `LEAK_CHECK_TIMEOUT_MS` (default 2000). Exit codes: 0 clean,
  1 leak, 2 misconfigured. Notably: pointing the script at an arbitrary
  directory is already supported via `LEAK_CHECK_DIR`, but the script
  *always also* fetches one response URL, so a standalone run needs a live
  server (or the integration harness).
- `src/lib/leak-check.ts` — the pure engine, `runLeakCheck(config)`. Walks
  `bundleDir` recursively, reads every file, flags any file containing the
  `secret` marker. Root-level exclusions: `_worker.js/`, `_routes.json`,
  `.assetsignore` (build-output concepts; a fixture directory would have
  none). Rejects if the directory is missing or contains zero files.
  `fetchImpl` is injectable, which is how unit tests run the whole check
  without a server.
- `test/leak-check.test.mjs` — the established test pattern: build a temp
  directory, call `runLeakCheck` directly with a stubbed `fetchImpl`
  returning a clean `Response`, assert `outcome`/`findings`/`checked`
  counts. `checked.assetFiles` reports exactly how many files were scanned.

## Test-suite conventions

- Unit tests are `test/*.test.mjs`, run with
  `node --experimental-strip-types --test <explicit file list>` — the list
  is hand-enumerated in `package.json` `scripts.test`. A new test file is
  invisible to `npm test` until appended there.
- `.mjs` tests import `.ts` modules directly (strip-types).
- Playwright specs live separately in `tests/` and are not involved here.
- There is currently **no** `test/fixtures/` directory anywhere in the repo;
  this ticket creates the first committed fixture tree.

## Credential-handling reality the packet must respect

- `.dev.vars` is gitignored; `.dev.vars.example` is the committed template
  with placeholder values (`replace-with-a-long-random-string`,
  `replace-with-a-shared-passcode`) and explicit "never commit the real key"
  guidance.
- Playbook Step 2 routes temporary credentials: locally to `.dev.vars`,
  production via `npx wrangler secret put`, never into repo, bundle,
  backstage, or chat.
- The leak check's semantics are "this configured secret value appears
  nowhere a browser can receive" — it scans for a *known marker*, it does
  not pattern-match for credential-shaped strings in general.

## What the rehearsal will build against (fixture realism targets)

- The exemplar slice the playbook tells builders to replace: labeled action
  in `src/pages/index.astro` (template slots `DEMO_NAME` = "Demo Runway",
  `PRIMARY_ACTION_LABEL` = "Ask for a fresh note") → `src/pages/api/receipt.ts`
  → `src/lib/operation-runner.ts` (time budget, progress, retry, explicit
  failure). The Playwright contract pins the accessible name in
  `tests/support/flow-contract.ts` (`PRIMARY_ACTION_NAME`).
- `src/pages/api/receipt.ts` is itself the "fake slow integration" the story
  cites in spirit: a locally-implemented boundary with deliberate fault
  modes. A "fake sponsor API" in that spirit is one documented well enough
  to implement as a local stub, not a real hosted service.
- The demo moment in the packet therefore has to be something replaceable
  behind the same seam: one labeled action, one boundary call, bounded wait,
  verifiable evidence.

## Assumptions and constraints surfaced

- The fixture must be entirely fictional: no real sponsor names, domains, or
  API shapes copied from a real vendor (reserved/`.example` domains keep it
  honest and un-fetchable).
- "One artifact per class" is a minimum of one file per directory; nothing
  in the AC caps artifact count.
- The `credentials` class artifact can never be a committed real (or even
  realistic-looking committed) value — T-006-01-01 research already flagged
  it "can never be a *committed* fixture artifact as a real value"; AC calls
  it a "temp-credential placeholder."
- "Leak-check passes over the fixture" needs a *repeatable* home to serve
  the ticket's "re-rehearsed after every template change" motivation — a
  one-off manual run would satisfy the words but not the intent. The repo's
  mechanism for repeatable checks is the enumerated `npm test` suite.
- Working tree carries unrelated dirty state from other threads
  (`.lisa/provenance.jsonl`, T-006-01-01 ticket/work files); commits from
  this ticket must stage only this ticket's paths.
- The playbook's Step 1 coupling clause ("change the fixture in the same
  breath") is prose today; nothing mechanically enforces that class names in
  the doc and directories in the fixture stay in sync.

## Files this ticket will plausibly touch (inventory, not commitment)

- `test/fixtures/sponsor-packet/**` — new (the packet).
- `docs/knowledge/assembly-playbook.md` — the two pointer sites: Step 1's
  fixture sentence and the "Not yet rehearsed live" bullet.
- `test/sponsor-packet.test.mjs` + `package.json` — if Design chooses a
  committed verification home for the leak-check AC.
