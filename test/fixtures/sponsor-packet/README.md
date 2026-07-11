# Sample sponsor packet — Fernway Parcel

A complete, fictional stand-in for what a hackathon sponsor hands a demo
team, so `docs/knowledge/assembly-playbook.md` can be rehearsed for free —
no credentials, no accounts, no network — and re-rehearsed after every
template change.

**Everything here is invented.** Fernway Parcel, its products, API, brand,
and people do not exist. Every URL uses the reserved `.example` top-level
domain (RFC 2606), so nothing in this packet can resolve, even by accident.

## What's in the box

One directory per input class the playbook's intake step (Beat 1, Step 1)
names — the directory names *are* the contract:

| Directory | Playbook class |
|---|---|
| `sponsor-site/` | Sponsor website and product pages |
| `api-docs/` | Current API documentation for the endpoints you will call |
| `code-examples/` | GitHub examples or sample repos |
| `design-brief/` | Figma brief or screenshots |
| `sdk/` | SDKs or client libraries |
| `credentials/` | Temporary API credentials (a placeholder — see the file) |

Plus one top-level seed that is not an input class:

- `core-moment.md` — the chosen demo moment and the intake-statement
  fields for the playbook's Step 3, pre-filled for this packet.

## How a rehearsal uses it

Start a clean copy of the template, open the playbook, and treat this
directory as "what the sponsor and the event actually handed you." Beat 1
sorts it (already sorted — that's the fixture's one indulgence), Step 3
copies from `core-moment.md`, and Beat 2's Step 7 builds the parcel-status
slice against a local stub of `api-docs/parcel-status-api.md`. The dry-run
story (S-006-02) runs exactly this.

## How it's kept honest

`test/sponsor-packet.test.mjs` (in the ordinary `npm test` suite):

- reads the playbook's intake table and asserts this packet has exactly one
  directory per class, each non-empty — rename a class in the doc and the
  suite goes red until the fixture follows ("change the fixture in the same
  breath");
- runs the leak check (`src/lib/leak-check.ts`) across every file in this
  packet and asserts it passes — no credential-adjacent value ever lives
  here;
- asserts the playbook still points at this path.
