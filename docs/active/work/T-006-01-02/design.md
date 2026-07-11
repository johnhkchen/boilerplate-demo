# T-006-01-02 — sample-sponsor-packet-fixture — Design

Six decisions, each grounded in research.md. Rejected options recorded.

## D1 — Packet layout: six class directories + two top-level files

```
test/fixtures/sponsor-packet/
  README.md            what this packet is, that it is fictional, how a
                       rehearsal consumes it, how the leak check runs over it
  core-moment.md       the chosen demo moment + intake-statement seeds
  sponsor-site/        one artifact
  api-docs/            one artifact
  code-examples/       one artifact
  design-brief/        one artifact
  sdk/                 one artifact
  credentials/         one artifact
```

The six directories mirror the playbook's Step 1 table one-to-one, exactly
as its coupling clause demands. The core moment is deliberately **not** a
seventh directory: it is not an input class (the playbook puts it in Step 3,
the intake statement), but the ticket AC names it as a packet artifact and
S-006-02 rehearses "the fixture's core-moment vertical slice" — so it lives
as a top-level file, visibly separate from the class mirror.

Rejected: a seventh `core-moment/` directory (breaks the "one directory per
class" mirror the playbook promises); folding the core moment into README
(the AC treats it as its own artifact, and the rehearsal needs to point an
agent at it directly).

## D2 — The fictional sponsor: Fernway Parcel

One invented sponsor, consistent across all six artifacts: **Fernway
Parcel**, a parcel-tracking company, domain `fernway-parcel.example` (RFC
2606 reserved TLD — unresolvable by construction, so the fixture can never
silently depend on the network). README states plainly that the sponsor,
API, and brand are fictional.

Why parcel tracking: the core moment it yields — press one labeled action,
wait a bounded time, see the latest scan event with verifiable evidence —
is shape-identical to the template's receipt exemplar, so the rehearsal
exercises the playbook's Step 7 ("replace the receipt call with the sponsor
call behind the same seam") without inventing new architecture. The
verifiable-evidence detail (a signed scan checksum) keeps the ops-check
philosophy intact: a naive 200 is not proof.

Rejected: reusing the demo's own note/receipt motif as the "sponsor"
(rehearses renaming nothing — Step 5 of the playbook would be vacuous);
any real vendor's name or API shape (impersonation risk, and a rehearsing
agent might try to fetch real docs).

## D3 — The fake sponsor API: documented stub, not hosted service

`api-docs/` describes a small fictional REST API (one status endpoint,
bearer auth, latency expectations, error shapes) **plus deterministic
sample data**, and says explicitly: this API does not exist on any network;
a rehearsal implements it as a local stub behind the operation-runner seam,
in the spirit of the harness's fake slow integration (the story's honest
boundary, verbatim). The sample parcel IDs and canned scan events make the
stub fully specified — two rehearsals produce comparable slices.

Rejected: standing up a real hosted mock (network + account dependency,
defeats "rehearsed for free" and reproducibility); shipping a working stub
implementation inside the packet (story scope says no new scripts or
tooling, and S-006-02's point is that the *playbook + agent* build the
slice — a pre-built stub would rehearse copying, not assembling).

## D4 — The credentials artifact: a placeholder document, zero values

`credentials/temporary-credentials.md` stands in for the sponsor's
credential handoff. It says what the sponsor would hand you (a temporary
API token), states that the packet deliberately contains **no value at
all** (not even a fake one), notes that the fictional API's local stub
accepts any non-empty token — so the rehearsal generates its own throwaway
string — and routes any real value per playbook Step 2 (`.dev.vars`
locally, `wrangler secret put` in production, never repo/bundle/backstage/
chat).

This is the AC's "temp-credential placeholder" read strictly: a committed
token-shaped string, even a fake one, would train the exact reflex the
playbook exists to prevent, and T-006-01-01's research already ruled a
committed value out.

Rejected: committed fake token (see above); empty directory with no file
(violates "one artifact per class", and an empty dir is uncommittable in
git anyway).

## D5 — Verification home: a committed unit test, enumerated in `npm test`

New `test/sponsor-packet.test.mjs`, following the existing
`leak-check.test.mjs` pattern (node:test, direct `runLeakCheck` import,
stubbed `fetchImpl`), appended to the `package.json` test list. It asserts,
in order:

1. **Contract mirror, mechanically.** Parse the class names out of the
   playbook's Step 1 table (`docs/knowledge/assembly-playbook.md`) and
   assert the packet's directory set equals that set exactly, each
   directory non-empty. This turns the playbook's prose coupling clause
   ("change the fixture in the same breath") into a failing test — rename a
   class in the doc and `npm test` goes red until the fixture follows.
2. **Leak check passes over the fixture.** `runLeakCheck` with
   `bundleDir = test/fixtures/sponsor-packet`, a clean stubbed response,
   and — as the scanned secrets — the two committed placeholder values from
   `.dev.vars.example`. Those are the only credential-adjacent strings that
   exist in the repo to leak; asserting they never appear in the packet has
   real teeth (someone pasting example env content into the fixture fails).
   Assert `outcome: 'passed'` and `checked.assetFiles` equals an
   independent recursive file count of the packet — proving every artifact
   was actually scanned, not skipped.
3. **The rehearsal pointer holds.** Assert the playbook text contains the
   literal `test/fixtures/sponsor-packet` path, so the AC's "rehearsal note
   points at the packet" cannot silently regress in a future doc edit.

Why a test and not a one-off run: the ticket's stated motivation is
re-rehearsal "after every template change"; the repo's only repeatable
check home is the enumerated test suite. A manual
`LEAK_CHECK_DIR=… npm run leak:check` would satisfy the AC's words once,
then evaporate — and the script edge always fetches a response URL, so a
standalone run needs a live server the fixture shouldn't depend on.

Judgment call, named: the story scope says "no new scripts or tooling." A
`test/*.test.mjs` file in the existing suite is read here as neither — the
exclusion targets `scripts/` CLIs and `src/**`; tests are how this repo
makes acceptance criteria observable. Flagged again in review.md for the
human pass.

Rejected: manual verification only (above); parsing nothing and hardcoding
the six names in the test (drifts silently from the doc — the exact failure
the coupling clause warns about); pointing the actual `scripts/leak-check.ts`
edge at the fixture inside the test (its config resolution reads env and
always needs the response fetch; `runLeakCheck` with injected `fetchImpl`
is the established unit seam for exactly this).

## D6 — Playbook edits: restore the literal path at both pointer sites

Two minimal edits to `docs/knowledge/assembly-playbook.md`, exercising the
permission T-006-01-01's review explicitly granted ("may restore the
literal"):

1. Step 1's coupling sentence: "the sample sponsor packet fixture (its own
   ticket, landing behind this doc)" → names `test/fixtures/sponsor-packet/`.
2. The "Not yet rehearsed live" bullet — the AC's rehearsal note — gains
   the packet path, so a reader (or the S-006-02 rehearsal agent) can walk
   straight from the note to the input.

Rejected: adding a rehearsal how-to section to the playbook (that is
S-006-02's revision loop; tonight the note points, it does not teach).

## Voice and content calibration

Packet prose stays plain kitchen-table English (per brand voice) while
reading like real sponsor material: short, specific, no lorem ipsum. Each
class artifact is 20–60 lines — enough that an agent can actually build
from it, short enough to review at a glance. Total fixture ≈ 300 lines.

## Acceptance mapping

| AC clause | Design answer |
|---|---|
| one artifact per named input class | D1 layout + D5 assertion 1 |
| … incl. chosen core moment | D1 `core-moment.md` |
| leak-check passes over the fixture | D4 (nothing to leak) + D5 assertion 2 |
| rehearsal note points at the packet | D6 + D5 assertion 3 |
