# T-006-01-02 — sample-sponsor-packet-fixture — Structure

The shape of the change: every file created or modified, what each
contains, the seams between them, and the order that matters.

## Files created — the packet (8 files)

### `test/fixtures/sponsor-packet/README.md`
The packet's own label. Contains:
- what this is: a fictional sponsor packet for rehearsing
  `docs/knowledge/assembly-playbook.md` for free, no credentials, no network;
- the fiction disclaimer: Fernway Parcel, its domain
  (`fernway-parcel.example`), API, and brand are invented; the `.example`
  TLD is reserved and never resolves;
- the map: one directory per playbook intake class (naming all six), plus
  `core-moment.md` as the Step-3 seed;
- how it is kept honest: `test/sponsor-packet.test.mjs` mirrors the class
  list from the playbook table and runs the leak check over every file here
  on each `npm test`.

### `test/fixtures/sponsor-packet/core-moment.md`
The chosen demo moment plus intake-statement seeds (playbook Step 3 fields):
- **the moment**: a visitor at the public URL presses "Track my parcel" and,
  within the harness's time budget, sees parcel `FW-2417-DEMO`'s latest scan
  event with its checksum verified — or a legible, named failure;
- stakeholders, personas, references (pointing back into the packet's class
  directories), unknowns (the empty-class notes live here), and the
  acceptance evidence to show (integration:check green, ops:check against
  the live URL).

### `test/fixtures/sponsor-packet/sponsor-site/homepage.md`
Text snapshot of the sponsor's homepage and one product page, as markdown
(what a builder would actually paste from a site): tagline, product blurb
for "Fernway Trace" (the tracking product), pricing tier names, links —
all under `https://fernway-parcel.example/…`.

### `test/fixtures/sponsor-packet/api-docs/parcel-status-api.md`
The load-bearing artifact; must fully specify a local stub. Contains:
- base URL `https://api.fernway-parcel.example/v1` + the "this API is
  fictional — rehearsals implement it as a local stub behind the
  operation-runner seam" note;
- auth: `authorization: Bearer <temporary token>` (pointer to
  `../credentials/`);
- one endpoint: `GET /v1/parcels/{parcelId}` — response JSON shape
  (`parcelId`, `status`, `lastScan{location, scannedAt, event}`,
  `checksum`), status vocabulary, and the checksum rule (SHA-256 over
  `parcelId:scannedAt:event`) so evidence is verifiable, not decorative;
- error shapes: 401 missing/blank token, 404 unknown parcel, 503 with
  `retry-after` (the retry/latency behaviors the operation-runner seam
  exists to absorb; p95 latency note);
- deterministic sample data: parcel `FW-2417-DEMO` with three fixed scan
  events (and one always-404 ID, `FW-0000-VOID`), timestamps fixed so two
  rehearsals build against identical data.

### `test/fixtures/sponsor-packet/code-examples/track-parcel.mjs`
The "GitHub example" class: a ~30-line plain-fetch client the sponsor might
publish — reads the token from `process.env` (never inline), calls the
status endpoint, verifies the checksum, prints the scan event. Header
comment marks it as fictional sample code for the packet, not project
tooling; nothing imports it and no test executes it.

### `test/fixtures/sponsor-packet/design-brief/design-brief.md`
The Figma-brief stand-in: sponsor palette (hex values), type preferences,
the one screen they care about (action → progress → scan event card),
tone words, and an explicit "constraints, not pixel law" note so the
rehearsal keeps the template's structure.

### `test/fixtures/sponsor-packet/sdk/sdk-pointer.md`
The "SDK pointer" (AC's phrase): names the fictional package
(`@fernway/parcel-sdk`), says it is not published anywhere by construction,
and directs the rehearsal to the api-docs + code-example instead — with a
line on why that is realistic (event SDKs are often stale; current API docs
outrank them, and the playbook treats an unusable class as a Step-3 unknown,
not a blocker).

### `test/fixtures/sponsor-packet/credentials/temporary-credentials.md`
The placeholder per D4: what the sponsor would hand over (a temp token,
expiry note), the deliberate absence of any value in the packet, "the local
stub accepts any non-empty token — generate your own throwaway", and the
Step-2 routing rules restated in one breath with pointers
(`.dev.vars`, `wrangler secret put`, backstage refuses secrets).

## Files created — verification (1 file)

### `test/sponsor-packet.test.mjs`
node:test, mirrors `test/leak-check.test.mjs` conventions. Internal shape:

- constants: `PLAYBOOK = 'docs/knowledge/assembly-playbook.md'`,
  `PACKET = 'test/fixtures/sponsor-packet'`,
  `EXAMPLE_ENV = '.dev.vars.example'` (paths repo-root-relative; tests run
  from repo root).
- `intakeClasses(markdown)` — extracts class names from table rows matching
  `/^\| \`([a-z-]+)\` \|/m` (the playbook's Step 1 table is the only table
  in the doc whose first cell is a backticked name). Returns string array.
- `walkFiles(dir)` — recursive file lister (fs/promises `readdir`
  withFileTypes), used both for per-class non-emptiness and the coverage
  count.
- `placeholderValues(envExample)` — pulls the quoted values of
  `DEMO_SIGNING_KEY` / `DEMO_PASSCODE` lines from `.dev.vars.example`.
- tests:
  1. *packet mirrors the playbook's intake classes* — set equality between
     parsed class names and packet subdirectory names (expects exactly six
     to exist today, but derives the list, never hardcodes it); every class
     directory contains ≥ 1 file.
  2. *leak check passes over every packet file* — for each placeholder
     value: `runLeakCheck({ bundleDir: PACKET, responseUrl:
     'https://demo.invalid/api/receipt', secret, timeBudgetMs: 100,
     fetchImpl: clean stub })` → `outcome === 'passed'`, zero findings, and
     `checked.assetFiles === walkFiles(PACKET).length`.
  3. *the playbook's rehearsal note points at the packet* — playbook source
     contains the literal `test/fixtures/sponsor-packet`.

Public interface: none (a test). Its two load-bearing dependencies are the
playbook table's row format and `runLeakCheck`'s config/result shape — both
asserted in existing artifacts (`assembly-playbook.md`, `src/lib/leak-check.ts`).

## Files modified (2)

### `docs/knowledge/assembly-playbook.md`
Two sentence-level edits, no structural change:
- Step 1, coupling sentence: "(its own ticket, landing behind this doc)" →
  "(`test/fixtures/sponsor-packet/`)", keeping the same-breath clause
  intact.
- "What this play is not", last bullet: the dry-run sentence gains the
  packet path — "…against the sample sponsor packet
  (`test/fixtures/sponsor-packet/`) is its own story (S-006-02)…".

### `package.json`
`scripts.test`: append `test/sponsor-packet.test.mjs` to the enumerated
file list (end of list, matching the suite's additive history). No other
key changes.

## Boundaries

- **No `src/**` changes.** The packet references the operation-runner seam
  and receipt exemplar by path in prose only.
- **Nothing imports the fixture.** The packet is data; only
  `test/sponsor-packet.test.mjs` reads it, and only as files on disk.
- **The fixture stays network-free.** Every URL inside it uses the reserved
  `.example` TLD; the test never fetches (stubbed `fetchImpl`).
- **The test depends on doc structure once.** The single regex over the
  Step 1 table is the one deliberate doc↔test coupling (it *is* the
  feature); the rehearsal-note assertion is a plain substring check.

## Ordering

1. Packet files first (fixture exists → playbook may point at it honestly —
   the same existence rule T-006-01-01 honored in reverse).
2. Playbook edits second.
3. Test + `package.json` enumeration third (it asserts both of the above;
   landing it earlier would be red on its own commit).

Each step is independently committable and leaves `npm test` green.
