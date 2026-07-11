# Research — T-006-02-01 clean-copy-rehearsal-run

Descriptive map of the terrain this rehearsal drives. What exists, where, and
how it connects. No solutions here — those are Design's job.

## What the ticket asks

Prove the assembly playbook is followable under session pressure by executing
it *verbatim* on a fresh project and recording every step it fails to answer as
friction. The single acceptance criterion wants one rehearsal log under
`docs/active/work/T-006-02-01/` that records:

1. the clean-copy project's creation,
2. each playbook step executed in order,
3. the vertical slice reachable at its public URL,
4. integration and ops checks green under their time budgets,
5. a verbatim list of leftovers and steps the playbook could not answer.

Parent story S-006-02 adds the operating constraints: the rehearsal runs on "a
scratch project cloned as a clean copy of this template (no commit history, no
`docs/active/**` planning artifacts)", following *only* the playbook with the
fixture packet; **this repo's `src/**` stays untouched**; rehearsal evidence
lands under `docs/active/work/T-006-02-01/`. Story T-006-02-02 (not this
ticket) consumes the leftover list to write demand signals and revise the
playbook.

## The thing being rehearsed

`docs/knowledge/assembly-playbook.md` — the Day-1 play, ~1,900 words, four
beats, twelve numbered steps plus a "Before the event" bootstrap and an exit
gate:

- **Before the event** — `npm install`; `npx playwright install chromium`;
  board init (`lisa init`, `vend init`); deploy bootstrap (`wrangler whoami`,
  `npm run deploy`, two `wrangler secret put`, `wrangler d1 migrations apply
  BACKSTAGE_DB --remote`, two `gh secret set`).
- **Beat 1 Intake** — Step 1 collect one artifact per input class (six classes:
  `sponsor-site`, `api-docs`, `code-examples`, `design-brief`, `sdk`,
  `credentials`); Step 2 route credentials away from anything shared; Step 3
  write the intake statement (demo moment, stakeholders, refs, providers,
  personas, unknowns, acceptance evidence).
- **Beat 2 Prove** — Step 4 go public before ideation (deploy, share URL + repo,
  backstage passcode); Step 5 rename the labeled surface in one change
  (`DEMO_NAME`, `PRIMARY_ACTION_LABEL` in `src/pages/index.astro` +
  `PRIMARY_ACTION_NAME` in `tests/support/flow-contract.ts`); Step 6 prove
  failure legibility with `DEMO_FAULT=broken|stalled npm run integration:check`;
  Step 7 build one vertical slice by replacement behind
  `src/lib/operation-runner.ts`.
- **Beat 3 Check** — Step 8 local gate `npm run integration:check` (45 s
  budget); Step 9 full gate `npm run verify`; Step 10 check the deployed surface
  (`curl --fail`, `OPS_CHECK_URL=… npm run ops:check`, `DEMO_BASE_URL=… npm run
  backstage:feed`, one live backstage round trip).
- **Beat 4 Defer** — Step 11 sweep leftovers (incl. `npm run backstage:feed`);
  Step 12 convert each to one line on `docs/active/demand.md`.
- **Exit gate** — integration:check green in budget, healthy+stalled flows pass,
  core moment works at the public URL + ops:check green live, one live backstage
  round trip, every leftover a one-line signal.

The playbook's own closing note ("Not yet rehearsed live") names *this* story as
the dry run and says: until then, treat rough edges as signals.

## The fixture packet (T-006-01-02 output)

`test/fixtures/sponsor-packet/` — one directory per input class the playbook's
Step 1 names, plus two top-level files:

- `core-moment.md` — the pre-filled intake statement. Demo moment: a visitor
  presses **"Track my parcel"** and within budget sees parcel `FW-2417-DEMO`'s
  latest scan (location, time, event) with its checksum verified; a broken or
  stalled boundary shows a named failure, not a hang. Explicitly
  "shape-identical to the receipt exemplar, so Step 7 is a replacement behind
  the same seam, not new architecture." Providers: one (Fernway Parcel Status
  API, local stub). Unknowns: `sdk/` present but unusable by design; webhook
  push deferred.
- `api-docs/parcel-status-api.md` — the boundary contract. `GET
  /v1/parcels/{parcelId}` → 200 with `{parcelId, status, lastScan{location,
  scannedAt, event}, checksum}`. **Checksum rule**: lowercase hex SHA-256 of
  `parcelId + ":" + lastScan.scannedAt + ":" + lastScan.event`. Errors 401
  `missing_token` / 404 `unknown_parcel` / 503 `scan_network_busy`. Deterministic
  sample: `FW-2417-DEMO` lastScan = Rotterdam sort hub /
  `2026-03-14T09:12:40Z` / `line_haul_departed`; `FW-0000-VOID` always 404.
  Says explicitly: implement as a local stub, stub accepts any non-empty token,
  the slow case should be reproducible (this is what the seam's bounded wait
  absorbs).
- `code-examples/track-parcel.mjs`, `design-brief/design-brief.md`,
  `sponsor-site/homepage.md`, `sdk/sdk-pointer.md`,
  `credentials/temporary-credentials.md` — the remaining classes.

The fixture is credential-free by design and `sponsor-packet.test.mjs` asserts
it mirrors the intake contract and stays leak-clean.

## The seam and the exemplar to replace

- `src/lib/operation-runner.ts` — framework-free. `runOperation({name,
  timeBudgetMs, invoke})` races the invoke against a deadline; returns a
  structured `OperationResult` with a pass/fail `trace` and, on failure, a
  `{kind: 'operation'|'timeout', message}`. Aborts via `AbortSignal` on timeout.
  This is the seam Step 7 replaces the receipt call behind — it knows nothing
  about HTTP, Astro, Cloudflare, or any provider.
- `src/pages/api/receipt.ts` — the ONE real server route (`prerender = false`).
  Reads `env.DEMO_SIGNING_KEY`, returns a signed receipt, honors
  `DEMO_FAULT=broken|stalled|leak` for the fault demonstrations, emits
  `x-demo-version-*` headers. The parcel slice mirrors this shape: labeled
  action → one boundary call → bounded wait → verifiable evidence.
- `src/pages/index.astro` — the audience page. Template slots `DEMO_NAME =
  'Demo Runway'` and `PRIMARY_ACTION_LABEL = 'Ask for a fresh note'`; the live
  card fetches `/api/receipt` and narrates status via `aria-live`. Step 5
  renames these two.
- `tests/support/flow-contract.ts` — `PRIMARY_ACTION_NAME = 'Ask for a fresh
  note'` (must match `PRIMARY_ACTION_LABEL`), the flow steps, and the budgets:
  per-test 20 s, assertion 8 s, action 10 s, run 40 s, server startup 30 s;
  `LOCAL_BASE_URL = http://127.0.0.1:4323`.

## The harness scripts (all present, package.json wired)

- `scripts/integration-check.ts` → `npm run integration:check` — build + owned
  local server + ops probe + Playwright audience flow + leak assertion, inside a
  45 s overall budget; summary → `test-results/integration-report.json`.
  Narrower: `npm run ops:check`, `test:flow`, `test:flow:stalled`, `leak:check`.
- `scripts/ops-check.ts`, `leak-check.ts`, `backstage-feed.ts`, `promote.ts`,
  `rollback.ts` all exist. `npm run verify` = `npm test` + `typecheck` +
  `integration:check` + `test:flow:backstage` + `deploy:dry`.
- `npm run deploy` = `astro build && wrangler deploy`; `deploy:dry` is the
  dry-run (safe, no publish).

## Tooling reality (probed, not assumed)

- node v26.5.0 (repo needs ≥22.12.0 — OK).
- `npx wrangler whoami` → logged in via OAuth, account
  `caaec605822549aee441310a1c77bb43`, scopes include `workers (write)`.
- `gh auth status` → logged in as `johnhkchen`.
- Playwright chromium + headless shell already installed in the user cache.
- This repo has 147 commits (so a "no commit history" clean copy needs history
  stripped).

## The sharp edge Design must resolve: deploy without collision

`wrangler.jsonc` hardcodes three things tied to *this* project:

- `"name": "demo-runway"` — a clean copy that runs `npm run deploy` unchanged
  **deploys onto the source project's own production Worker**. Same account,
  same name = overwrite.
- `"routes": [{"pattern": "demo.b28.dev", "custom_domain": true}]` — the branded
  hostname belongs to this project's zone; a clean copy claiming it collides.
- `"d1_databases[0].database_id": "c95861d4-…"` — points at the real backstage
  DB. The file's own comment says remove it "before deploying this template to a
  different account"; it says nothing about a same-account clean copy.

The playbook's "Before the event" bootstrap says `npm run deploy` "creates the
Worker" and treats deploy as turnkey. For a *fresh generated* project that would
be true (generation would rewrite these). For a **clean copy on the same
account**, it is not: deploying unchanged is destructive to the source project.
`wrangler secret put` is also interactive/non-echoing by design. This is the
single largest area where a verbatim clean-copy rehearsal diverges from the
playbook's assumptions, and it is exactly the friction the ticket exists to
surface.

## Constraints and assumptions carried into Design

- **Do not touch this repo's `src/**`** (story scope). All slice code lives in
  the clean copy.
- **Follow only the playbook** using the fixture packet — no improvising a
  different demo moment (the packet already fixed it).
- The clean copy must have **no commit history and no `docs/active/**`
  planning artifacts** (strip them).
- The rehearsal is **agent-run against the fixture**, not a live sponsor under
  event pressure (S-006-02 honest boundary); "is the demo convincing" stays a
  human call (charter N4).
- Any foundation/harness gaps or missing provider recipes the rehearsal exposes
  become **new demand signals**, not scope growth here.
