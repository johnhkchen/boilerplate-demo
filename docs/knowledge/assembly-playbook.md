# Rapid assembly playbook

This is the Day-1 play: how one builder spends the golden first one or two
agent contexts turning sponsor material plus a chosen demo moment into a
tested, public, end-to-end vertical slice on the deployed foundation. It runs
in four ordered beats — **intake, prove, check, defer** — and it ends only
when the core moment is observed working under the harness's time budgets and
every leftover has become a one-line demand signal. "Code written" is not an
exit.

The play assumes a project freshly generated from this template, so every
path, command, and check below already exists in the repo you are standing
in. Run the steps in order. Depth lives in the referenced knowledge docs;
this doc is the sequence.

## Before the event

Preparation is its own lifecycle phase (`docs/knowledge/product-spec.md`),
not part of Day 1. Arrive with:

- dependencies installed: `npm install` and `npx playwright install chromium`
  (`docs/knowledge/integration-check.md`, prerequisites);
- the board initialized: the project owner has run `lisa init` then
  `vend init` (`docs/knowledge/vend-workflow.md`), so `docs/active/demand.md`
  exists and is empty of template history;
- the one-time deploy bootstrap done or ready to run: authenticate with
  `npx wrangler whoami`, create the Worker with `npm run deploy`, set both
  runtime secrets with `npx wrangler secret put DEMO_SIGNING_KEY` and
  `npx wrangler secret put DEMO_PASSCODE`, apply the committed migration with
  `npx wrangler d1 migrations apply BACKSTAGE_DB --remote`, and store CI
  credentials with `gh secret set CLOUDFLARE_API_TOKEN` and
  `gh secret set CLOUDFLARE_ACCOUNT_ID`. The full sequence, with the DNS
  caveats, is `docs/knowledge/deployment.md`.

## Beat 1 — Intake

### Step 1. Collect one artifact per input class

Gather what the sponsor and the event actually handed you, sorted into six
classes. This list is a contract: the sample sponsor packet fixture (its own
ticket, landing behind this doc) mirrors it one directory per class, so if
you change the class names here, change the fixture in the same breath.

| Class | What it holds |
|---|---|
| `sponsor-site` | Sponsor website and product pages |
| `api-docs` | Current API documentation for the endpoints you will call |
| `code-examples` | GitHub examples or sample repos |
| `design-brief` | Figma brief or screenshots |
| `sdk` | SDKs or client libraries |
| `credentials` | Temporary API credentials |

An empty class is fine — note it as an unknown in Step 3. A class you cannot
name is a sign you are improvising; stop and look again.

### Step 2. Route credentials away from everything shared

Temporary credentials never enter the repository, a browser bundle, a
backstage entry, or chat. Locally: copy `.dev.vars.example` to `.dev.vars`
and put values there (gitignored). Production: `npx wrangler secret put`,
interactive and non-echoing. The backstage door refuses secrets by policy —
direct collaborators to a separate secure exchange
(`docs/knowledge/backstage-retrieval-seam.md`).

### Step 3. Write the intake statement

One short written statement, before any code: the **demo moment** (the single
thing the audience must see work), stakeholders, references, providers,
personas, unknowns, and the acceptance evidence you will show. This is the
structured intake the product spec calls for, and it is what you point the
coding agent at alongside the sponsor references.

Depth: `docs/knowledge/product-spec.md` (inputs, intake, Day-1 lifecycle).

## Beat 2 — Prove

### Step 4. Go public before ideation deepens

Deploy the still-generic site through the bootstrap above (or push `main` if
CI is already wired) and share two links with the team now: the public URL
and the repository. Teammates and their agents branch and contribute from
minute one; stakeholders get the backstage link (`src/pages/backstage.astro`)
and the shared Day-1 passcode. Public-before-deep-ideation is invariant P1
(`docs/knowledge/charter.md`) — the deploy is the first step of the play,
not its finale.

### Step 5. Rename the labeled surface — in one change

The audience page announces itself through template slots in
`src/pages/index.astro`: `DEMO_NAME` and `PRIMARY_ACTION_LABEL`. The
Playwright contract pins that label as the accessible name
`PRIMARY_ACTION_NAME` in `tests/support/flow-contract.ts`. Rename all of them
in the same change, or `npm run test:flow` fails on the named activation
step — that legible failure is the contract enforcing itself.

### Step 6. Prove failure legibility before real credentials

Before wiring the sponsor API, watch the harness catch a broken and a stalled
boundary while everything is still fake and cheap:

```sh
DEMO_FAULT=broken npm run integration:check
DEMO_FAULT=stalled npm run integration:check
```

Both must go red with named evidence (`receipt [operation]`,
`receipt [timeout]`), then green again with the fault off. A third mode,
`DEMO_FAULT=leak`, proves the disclosure assertion trips — it is deliberately
unsafe and never runs on a shared, preview, or production deployment. If the
demo cannot fail visibly, you will not notice when it fails invisibly.

### Step 7. Build the one vertical slice by replacement

Now spend the high-agency context. The shipped receipt slice is the
load-bearing exemplar: `src/pages/index.astro` calls
`src/pages/api/receipt.ts`, which runs its work under
`src/lib/operation-runner.ts` — the seam that gives every boundary a time
budget, progress, retry, and an explicit failure state. Replace the receipt
call with the sponsor call **behind the same seam**; keep the labeled action,
the status narration, and the bounded wait. One slice, end to end, at the
public URL — not three half-slices. Resist detours: no extra pages, no
speculative providers, no framework additions without an idea-driven reason
(charter N5). What the slice does is the idea's business; that it cannot hang
silently is the template's.

Depth: `docs/knowledge/charter.md` (P1, P2, guardrails);
`docs/knowledge/product-spec.md` (integration harness seams).

## Beat 3 — Check

The agent runs the checks and reads the evidence before any human is asked to
find a bug (`docs/knowledge/charter.md`, guardrails). Escalate scope in
order:

### Step 8. Local gate

```sh
npm run integration:check
```

One command: production build, an owned local server, the operation probe,
the Playwright audience flow, and the bundle/response leak assertion — all
inside a **45-second overall budget** (override with
`INTEGRATION_CHECK_TIMEOUT_MS` only after reading which check consumed it).
The machine-readable summary lands at `test-results/integration-report.json`.
Per-step flow budgets — 20 s per test, bounded waits on every assertion —
live in `tests/support/flow-contract.ts`; the stalled variant proves the wait
is bounded, so your slice inherits "cannot wait forever" for free. Iterate on
a single boundary with the narrower commands: `npm run ops:check`,
`npm run test:flow`, `npm run test:flow:stalled`, `npm run leak:check`.

### Step 9. Full gate

```sh
npm run verify
```

Unit tests, typecheck, the integration check, the backstage phone flow
(`npm run test:flow:backstage`), and a dry-run deploy. This is the same gate
CI runs on push and `scripts/promote.ts` enforces before anything public
moves.

### Step 10. Check the deployed surface, not just localhost

Push `main`: CI verifies, then promotes an immutable, commit-tagged version
(`npm run promote`; `npm run rollback` is the one-second undo). Then confirm
the live surface by hand, with the production URL from `wrangler.jsonc`:

```sh
curl --fail https://<your-demo-hostname>/
OPS_CHECK_URL=https://<your-demo-hostname>/api/receipt npm run ops:check
DEMO_BASE_URL=https://<your-demo-hostname> npm run backstage:feed
```

Close the stakeholder loop once for real: submit one backstage entry through
the live page, then watch it come back through the feed CLI. What a
stakeholder submits, an agent retrieves — that loop working is Day-1
collaboration proven.

Depth: `docs/knowledge/integration-check.md` (budgets, fault modes, evidence);
`docs/knowledge/deployment.md` (release, verification, rollback);
`docs/knowledge/backstage-retrieval-seam.md` (the feed seam and CLI).

## Beat 4 — Defer

### Step 11. Sweep the session for leftovers

List everything unresolved: unfinished integrations, disproven assumptions,
UX gaps, reliability work, deployment concerns, and opportunities noticed
while building. Also sweep the backstage feed (`npm run backstage:feed`) —
stakeholder input that arrived during the build is leftover too.

### Step 12. Convert every leftover into a one-line signal

Each item becomes exactly one line on `docs/active/demand.md`, in the board's
own shape: **what + why it might matter**. Nothing becomes an epic, story, or
ticket tonight. The pull board is deliberately thin — `vend chain` pulls one
signal when there is capacity, and Lisa's RDSPI loop
(`docs/knowledge/rdspi-workflow.md`) starts only when work is substantial
enough to earn its research-and-planning overhead. A deferral that never
became a signal is the only failure mode of this beat: it evaporates.

Depth: `docs/knowledge/vend-workflow.md` (the board contract, the drive).

## Exit gate

The session is over when all of the following are **observed**, not assumed:

- `npm run integration:check` exits 0 within its 45-second budget, fault
  modes off;
- the Playwright flows — healthy and stalled — pass within their budgets in
  `tests/support/flow-contract.ts`, against your renamed action;
- the core moment works at the public URL in a fresh browser session, and
  `OPS_CHECK_URL=… npm run ops:check` passes against the live hostname;
- one backstage entry submitted live comes back through
  `npm run backstage:feed`;
- every leftover from Step 11 is a one-line signal on
  `docs/active/demand.md`.

That is the product spec's Day-1 definition made checkable: a public
responsive URL, a convincing core path, no exposed keys, a stakeholder
feedback link, an automated smoke path, explicit timeout and failure
behavior, and analytics readiness. Plausible-looking code, green checks you
did not run, or a demo that only worked on localhost do not pass the gate.
Whether the demo is *convincing* stays a human call (charter N4) — the gate
proves it is *working and observable* so the human judges the right thing.

## What this play is not

- **Not Day 2.** Users, billing, admin, persistence, editable content, email,
  and monitoring are the productization playbook — demand signal #2, its own
  future doc. Handoff rehearsal is signal #3. Name them on the board; do not
  start them tonight.
- **Not a provider cookbook.** Per charter N2, this play prescribes seams and
  sequence only; provider-specific recipes wait for repeated evidence across
  events.
- **Not yet rehearsed live.** The dry run of this playbook against a sample
  sponsor packet is its own story (S-006-02); until then, treat rough edges
  as signals for the board.
