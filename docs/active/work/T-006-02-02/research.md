# Research — T-006-02-02 deferral-signals-and-playbook-revision

Descriptive map of what exists and how it connects. No solutions proposed here.

## The ticket in one line

Close E-006's loop: land the rehearsal's 11 logged leftovers as one-line signals
on the rehearsal project's demand board, revise
`docs/knowledge/assembly-playbook.md` so every logged friction is resolved or
explicitly deferred, and show by listing that the clean copy holds the playbook
with no `docs/active/**` planning artifacts leaked from this repo.

## Inputs this ticket consumes

### The rehearsal log (the sole upstream deliverable)

`docs/active/work/T-006-02-01/rehearsal-log.md` — a verbatim record of executing
the playbook on a clean copy against the fixture sponsor packet. Its final
section ("Verbatim leftovers + steps the playbook could not answer") is
**already board-ready**: 11 numbered lines, each `what + why it might matter`,
each tagged with a routing hint:

| # | Tag | Substance |
|---|---|---|
| 1 | `[playbook]` | Step 2 omits declaring a new credential in `wrangler.jsonc` (`.dev.vars` value alone is silently dropped by workerd) |
| 2 | `[playbook]` | Step 4 has no collision-free clean-copy deploy — `npm run deploy` would overwrite the source project's `demo-runway` Worker / `demo.b28.dev` / production D1 (proven via `deploy:dry`) |
| 3 | `[playbook]` | Step 5 rename list incomplete — `tests/demo-flow.spec.ts` hardcodes `heading { name: 'Demo Runway' }` at lines 32 and 101 |
| 4 | `[playbook]` | Steps 7↔8 tension — `ops:check`/`integration:check`/`leak:check` are receipt-bound (`/api/receipt` hardcoded at `scripts/integration-check.ts:319,330`; `assertReceiptShape`; `DEMO_SIGNING_KEY`); replacing the slice invalidates the checks |
| 5 | `[playbook]` | Session-pressure hazard — checks inside a coding-agent session lie (Astro dev daemonization; only `CODEX_THREAD_ID` neutralized) |
| 6 | `[playbook]` | Before-event/board init undefined for a clean copy — no `docs/active/demand.md` exists for Step 12 to write to |
| 7 | `[playbook]` | `npm install` not turnkey where postinstall scripts are blocked (`workerd`/`sharp`/`esbuild`) |
| 8 | `[E-002 harness]` | `ops:check` on a stalled boundary reports `[operation]` not `[timeout]` under `astro dev` |
| 9 | `[slice]` | `operation-runner` collapses upstream 401/404/503 to `operation\|timeout`; replacement boundaries lose status granularity |
| 10 | `[deferred]` | Webhook push updates mentioned on sponsor site, undocumented — not built |
| 11 | `[deferred]` | `sdk/` class unusable by design (packet's honest unknown) — no SDK path exercised |

The step-by-step section also records per-step verdicts (answered / friction /
could-not-answer). Every friction and could-not-answer verdict maps onto one of
leftovers #1–#7; there are no logged frictions outside the leftover list except
two "honest slice-side notes" under Step 7 (502-vs-404 and fault-injection
mechanics), which the log itself classifies as slice findings, not playbook
findings — they surface in leftover #9 and in Step 6's evidence respectively.

### The predecessor's review handoff

`docs/active/work/T-006-02-01/review.md` ranks the revisions: finding #4 is the
highest-leverage playbook change (and "likely spawns an E-002 signal, not just a
doc edit"); #2 "may be an E-001/board signal, not resolvable in the playbook
alone"; #1, #3, #6, #7 are "clean, self-contained playbook edits"; #5 warrants
"a prominent playbook note and possibly a harness fix."

## The three surfaces this ticket touches

### 1. The rehearsal project (the clean copy) — still on disk

`/private/tmp/claude-501/-Users-johnchen-swe-repos-boilerplate-demo/3299e229-5e22-4d03-bd5d-ed37d572da11/scratchpad/cleancopy`

Verified this session: it exists; `docs/` holds `knowledge/`, `archive/`, and
two loose files; **`docs/active/` does not exist** (deleted at creation to
satisfy "no planning artifacts"); `docs/knowledge/assembly-playbook.md` is
present (the pre-revision version it was rehearsed against). It is not a git
repository. This is the project whose "own demand board" the acceptance
criterion names — and per leftover #6, that board does not exist yet. On a
generated project, `vend init` would mint it (`vend-workflow.md`,
"Complementarity"); a raw clean copy has no equivalent step.

Being under `/private/tmp`, the clean copy is ephemeral (gone on reboot), which
is why the acceptance asks for **a listing** as evidence rather than the copy
itself.

### 2. The playbook — `docs/knowledge/assembly-playbook.md` (this repo)

239 lines, four beats (intake / prove / check / defer), Before-event section,
Steps 1–12, an exit gate, and a "What this play is not" section whose last
bullet says **"Not yet rehearsed live"** and points at S-006-02 — now factually
stale, since the dry run has run. Sections implicated by the frictions:

- **Before the event** (lines 16–33): `npm install` turnkey assumption (#7);
  board-init assumption "the project owner has run `lisa init` then `vend init`"
  (#6); deploy bootstrap via `npm run deploy` (#2).
- **Step 2** (lines 59–63): `.dev.vars` copy instruction with no mention of
  declaring new secrets in `wrangler.jsonc` (#1).
- **Step 3** (lines 65–73): doesn't say a pre-filled packet substitutes for
  authoring the intake statement (minor friction, logged under Step 3).
- **Step 4** (lines 77–85): "Deploy the still-generic site through the
  bootstrap" — collision risk from a clean copy (#2).
- **Step 5** (lines 87–94): rename set `DEMO_NAME` / `PRIMARY_ACTION_LABEL` /
  `PRIMARY_ACTION_NAME` — missing the hardcoded test heading (#3).
- **Step 6** (lines 96–110) and **Step 8** (lines 135–150): no warning that the
  checks are unreliable inside a coding-agent session (#5).
- **Step 7** (lines 112–127) and **Step 8**: "replace behind the same seam" vs
  receipt-bound checks (#4).
- **Step 12 / exit gate** (lines 193–218): assume `docs/active/demand.md`
  exists (#6, same root as Before-event).
- **"What this play is not"** (lines 228–239): stale "Not yet rehearsed live."

### 3. This repo's demand board — `docs/active/demand.md`

The pull board: header doctrine ("thin demand signals, not epics — one line of
what + why it might matter"), then 4 numbered signals. Cleared signals
crystallize to `docs/archive/demand-cleared.md`. Relevant routing rules:

- S-006-02, Out of this slice: "Fixing foundation or harness gaps the rehearsal
  exposes (those return to the board against E-001/E-002 as signals)."
- E-006, right-size rule: "if the rehearsal exposes missing provider recipes or
  tooling, those return to the demand board as new signals rather than growing
  this card."
- `vend-workflow.md`: vend pulls ONE signal per `vend chain`; the board is the
  contract; signals are appended as one-liners.

So leftovers that a doc edit cannot resolve (harness/tooling: at minimum the
receipt-bound harness, the clean-copy/generation deploy story, agent-marker
neutralization) have a designated home on **this repo's** board, distinct from
the acceptance clause about the **rehearsal project's** board.

## Acceptance criterion, decomposed

1. **"The rehearsal project's demand board holds each logged leftover as a
   one-line signal"** — all 11 leftovers, on a demand board inside the clean
   copy. The board must first be minted (leftover #6 is self-referential: the
   friction is the missing board, and landing the signals proves the protocol).
2. **"The diff to assembly-playbook.md resolves or explicitly defers every
   logged friction"** — frictions = #1–#7 plus the Step 3 minor friction and
   the Step 6 environment friction (already folded into #5). "Resolves" = the
   playbook now answers the step; "explicitly defers" = the playbook names the
   limit and points at the board signal.
3. **"A listing of the clean copy shows docs/knowledge/assembly-playbook.md
   present with no docs/active/** planning artifacts leaked"** — "leaked" means
   *from this repo*: no `epic/`, `stories/`, `tickets/`, `work/`, `pm/`, no
   template demand history. A freshly minted `demand.md` holding only the
   rehearsal's own signals is the playbook's expected end-state for a project
   board ("empty of template history"), not a leak. The listing is captured as
   evidence under this ticket's work dir.

## Constraints and assumptions

- **Do not touch** `src/**`, `scripts/`, `tests/`, configs — the story scopes
  this ticket to signals + playbook revision. Harness fixes route to the board.
- **Do not update** ticket frontmatter (`phase`/`status`) — Lisa handles it.
- `.lisa/provenance.jsonl` and sibling ticket files show as modified in git
  status — Lisa's bookkeeping, not this ticket's concern; commits must scope to
  this ticket's paths only.
- Commit style in history: `docs(knowledge): … (T-006-01-02)`,
  `docs(demo): T-006-01-02 progress and review handoff` — conventional type +
  scope, ticket ID in the subject.
- The clean copy's own `assembly-playbook.md` stays the version that was
  rehearsed — it is part of the rehearsal record; the revision lands in this
  repo (the template source). Nothing in the acceptance asks to re-sync it.
- The fixture packet and playbook class table are a paired contract
  (playbook Step 1); no class names change here, so the fixture is untouched.

## Open questions carried to Design

- Which of the 11 leftovers also land on **this repo's** board, and as how many
  signals (one per finding vs. clustered)?
- Where exactly the session-pressure warning lives (Step 6, Step 8, or a
  Beat-3 preamble) and how prominent it should be.
- Whether Step 4's revision prescribes a rename-and-provision sequence or
  states plainly that only a generated project goes public.
