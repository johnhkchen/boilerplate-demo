# T-005-01-03 — projector-and-phone-cold-read-pass — Review

Handoff self-assessment. This was an evidence ticket: the deliverable is
judged screenshots plus a cold-read checklist, not code.

## What changed

**One commit, `bf2653e`, touching only `docs/active/work/T-005-01-03/`.**
No file in `src/`, `tests/`, `scripts/`, or config was created, modified,
or deleted; the working tree's Lisa-owned modifications (ticket
frontmatter, `.lisa/provenance.jsonl`) were left unstaged, and ticket
phase/status fields are untouched per the workflow.

Created (besides the five RDSPI phase artifacts):

- **Five PNGs** of the built index (`dist` freshly rebuilt from `2ad2e2d`;
  `src/` identical to the T-005-01-01 recomposition commit `c6a8045`),
  served by `wrangler dev` on port 8791 with the local `.dev.vars` signing
  key so every capture shows a real signed receipt:
  - `projector-1920x1080.png` — the no-scroll room view;
  - `projector-1920x1080-full.png` — full page at 1080p width;
  - `projector-back-of-room.png` — the room view resampled to 480px, the
    distance/squint proxy the projector judgments were made against;
  - `phone-375-fold.png` / `phone-375-full.png` — 375×667 at DSF 2
    (AC-pinned width), first screen and full page.
- **`capture.mjs`** — the dependency-free harness (uses the repo's
  installed Playwright chromium) that made them; it hard-fails unless
  `#receipt-body` is visible, so a loading/error state can never ship as
  evidence. Reproduce with: build → `npx wrangler dev --port 8791` →
  `node docs/active/work/T-005-01-03/capture.mjs` → the `sips` resample
  line recorded in cold-read.md.
- **`cold-read.md`** — the checklist. Rules of the read (screenshots only,
  distance judged at 480px), full provenance, the three AC questions, two
  named follow-ups, and an explicit honest-boundary note.

## Acceptance criteria — status

| AC clause | Status |
| --- | --- |
| Work dir contains screenshots at projector scale | ✓ 1080p viewport + full-page + back-of-room resample |
| …and at a 375px phone viewport | ✓ fold + full page, 375 logical px (750 physical, DSF 2) |
| Checklist answers "what is the page" from screenshots alone | ✓ PASS — name, tagline, and both moves on the first screen of both surfaces |
| …"what is its one primary action" | ◐ PASS on phone; **not checked off** at projector distance — filed as follow-ups instead, per the AC's own instruction |
| …"how does a visitor leave the team a note" | ✓ PASS — note card + underlined "Leave a note for the team" link, actionable tap target at 375px |
| Failed questions filed as named follow-ups rather than checked off | ✓ F-005-01-03-1 and F-005-01-03-2 (below) |

## The two findings a human should weigh

1. **F-005-01-03-1 — the primary action is below the 1920×1080 fold.**
   The room sees the identity card and the top of the receipt panel; the
   page's one clay-button ("Ask for a fresh note") is ~320px below the
   fold. Seed: tighten the receipt card's vertical rhythm at wide
   viewports or lift the button above the well — copy/layout only, phone
   layout untouched.
2. **F-005-01-03-2 — the verb-forward eyebrows don't survive distance.**
   At the back-of-room resample only the display headings remain legible,
   so the orientation layer T-005-01-01 added ("Start here" / "Watch the
   server answer" / "Leave a note") is exactly what distance erases.
   Seed: scale eyebrows up at wide viewports (token-level) or move the
   verbs into the headings.

   Both are filed, not fixed — fixing them is outside this ticket's
   write scope (`src/` read-only here) and would re-open T-005-01-01's
   settled surface while T-005-01-02 pins selectors against it. They are
   cheap, adjacent, and could be one small ticket together.

## Test coverage

- **No automated tests added, by design.** The story assigns the automated
  contract (labeled action exists and responds) to the parallel sibling
  T-005-01-02; this ticket's evidence is inherently judged-by-a-human. No
  source changed, so the repo's `npm test` / `typecheck` / flow suites are
  unaffected by construction.
- The evidence has its own gates, all exercised: dist verified fresh and
  recomposed before serving (one clay-button element, correct label,
  `/backstage` link); `/api/receipt` probed healthy before capture;
  capture waits on the filled receipt; PNG dimensions verified; every
  image visually inspected before the checklist was written.
- **Gap to note**: `capture.mjs` is a committed artifact but nothing runs
  it in CI — it will silently rot if ports, selectors, or Playwright's API
  drift. Acceptable for a work-dir evidence harness; worth revisiting only
  if cold-read passes become a recurring gate.

## Open concerns

1. The Q2 projector result means the epic's done-looks-like ("scannable at
   projector distance") is **not yet fully met** by the current surface —
   that is the cold read working as intended, but a human should decide
   whether F-1/F-2 block the epic or ride as fast-follows.
2. This pass is the session's own cold-read proxy (stated in the
   artifact). The epic's real gate — a never-seen-it human — remains open
   and should read the same five PNGs.
3. The captures embed a locally-signed receipt (nonce + signature from the
   local dev key). Same value class the public page shows anyone;
   `.dev.vars` contents appear nowhere. No leak-surface change.
4. Binary PNGs (~1.5 MB total) are now in repo history under a work dir —
   consistent with "captured as evidence", but if work-dir sweeps ever
   archive to a slimmer format, these are the first candidates.

## Handoff pointers

- Judge the ticket by reading `cold-read.md` beside the five PNGs —
  `projector-back-of-room.png` first (it decides Q2), then
  `phone-375-full.png` (it decides Q3).
- Diff to read: `git show bf2653e --stat` (all creations, one directory).
- Follow-up seeds F-005-01-03-1 / F-005-01-03-2 are written to be mintable
  as tickets verbatim from cold-read.md §Follow-ups.
