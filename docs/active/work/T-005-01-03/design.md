# T-005-01-03 — projector-and-phone-cold-read-pass — Design

Four decisions carried over from research, each with the options weighed and
the choice made.

## Q1 — What serves "the built page"?

**Options**

- **A. `wrangler dev` against a fresh `npm run build`** (repo-root
  `wrangler.jsonc`, explicit non-default port). Serves exactly the built
  worker + static assets; `.dev.vars` supplies `DEMO_SIGNING_KEY`, so
  `/api/receipt` answers and the receipt card fills. Wrangler does not
  daemonize under coding-agent env (the known trap is Astro-dev-specific).
- **B. `astro dev` with agent env stripped.** Works (project memory has the
  recipe) but serves the *dev* transform, not the built page the AC names,
  and inherits the orphaned-daemon failure mode if the strip is incomplete.
- **C. Static file server over `dist/client`.** No worker → `/api/receipt`
  404s → every screenshot shows the error state. Captures a broken-looking
  demo; useless as P2 evidence.
- **D. The deployed `demo.b28.dev`.** No guarantee it includes `c6a8045`;
  evidence would not be traceable to HEAD.

**Decision: A.** Fresh `npm run build`, then `wrangler dev --port 8791`
started as a managed background process and killed by PID afterwards. Port
8791 avoids wrangler's default 8787 (any stray session) and 4323 (the
Playwright dev server that parallel sibling T-005-01-02 may be running).
Local D1 binds from `.wrangler/state` as usual; the index page never touches
it. Rejected B (dev ≠ built, daemon risk), C (fails the point of the
evidence), D (unverifiable version).

## Q2 — What stands in for "projector distance"?

A raw 1920×1080 PNG inspected full-size on a laptop is *easier* to read than
the same pixels projected across a room, so a 1080p capture alone would be a
dishonest pass. Options:

- **A. 1080p viewport capture only.** Cheap, flattering, weak evidence.
- **B. 1080p capture + a downscaled "back of the room" copy.** Downscaling
  to ~25% width and reading *that* approximates the squint test: whatever
  survives shrinking (hierarchy, the one button, section labels) is what
  survives distance. macOS `sips` does the resample with zero new
  dependencies.
- **C. Simulate with a huge font-scale or zoomed viewport.** Changes layout
  under test — no longer the page as shipped.

**Decision: B.** Three projector artifacts:
`projector-1920x1080.png` (viewport capture — exactly what a room sees with
no scrolling, receipt filled), `projector-1920x1080-full.png` (full-page,
for the record — shows whether anything material hides below the fold), and
`projector-back-of-room.png` (the 1080p viewport capture resampled to 480px
wide via `sips`). The cold-read judges scannability against the
back-of-room copy, content against the 1080p originals. Rejected A as
self-flattering, C as not-the-page.

## Q3 — Phone captures: fold, full page, or both?

The AC pins width at 375px (iPhone SE/12-mini class; deliberately narrower
than the Pixel-5 393px used by the test suite). A phone visitor scrolls, so
a full-page capture is fair for "how do I leave a note" (the note card sits
last); but "what is this page / what do I do" must land in the first screen.

**Decision: both.** `phone-375-fold.png` — 375×667 viewport,
`deviceScaleFactor: 2`, viewport capture (first screen, judges questions 1
and 2) — and `phone-375-full.png` — same context, `fullPage: true` (judges
question 3 and wrap behavior of the long hex values). 667 is the shortest
mainstream height at 375 wide, so it is the *conservative* fold; anything
that fits there fits every 375-wide phone.

## Q4 — Where does the capture live, and in what form?

Story scope: this ticket writes **only** `docs/active/work/T-005-01-03/`.
So the capture script cannot go to `scripts/` or `tests/` (also avoids file
contention with T-005-01-02).

**Decision:** a standalone `capture.mjs` inside the work dir, run as
`node docs/active/work/T-005-01-03/capture.mjs` from the repo root. It
imports `chromium` from `@playwright/test` (already installed, browsers
present — node resolves `node_modules` by walking up from the work dir).
Deterministic sequencing inside the script:

1. `goto('http://127.0.0.1:8791/')`, wait for `#receipt-body` to be
   **visible** (receipt filled — never captures the mid-fetch or error
   state; hard-fails after timeout rather than shipping ambiguous
   evidence).
2. Projector context: viewport 1920×1080, DSF 1 → two captures.
3. Phone context: viewport 375×667, DSF 2, `isMobile`, touch → two
   captures.
4. Writes PNGs into the work dir; `sips` resample runs as a separate shell
   step (macOS-only tool, kept out of the portable script).

The script is committed with the evidence: it *is* the reproducibility
story ("how were these made") without touching repo tooling.

## The cold-read checklist itself

`cold-read.md`, structured as the three AC questions verbatim. Rules of the
read, stated in the artifact so a reviewer can audit the honesty:

- Answers may cite **only what is legible in the screenshots** — no
  appeals to the source, the DOM, or intent.
- Each question gets: the answer as read, which screenshot(s) it was read
  from, and a pass/fail.
- A question the page fails to answer is **not** checked off; it is filed
  as a named follow-up (`F-005-01-03-<n>` + a one-line proposed ticket
  seed) per the AC's explicit instruction.
- Borderline reads (legible at 1080p but lost in the back-of-room copy)
  count as fails for the projector question set — the distance proxy is the
  bar, per Q2.

Also recorded: capture provenance (commit hash of the built tree, command
lines, viewport specs) so the evidence is traceable.

## What this design does not do

- No changes to `src/`, `tests/`, `scripts/`, styles, or copy — even if the
  cold read fails, this ticket *files* the failure; it does not fix it.
- No `/backstage` screenshots — the AC's third question is about the route
  *from the index*, and the story scopes backstage as read-only context.
- No claim of convincingness or a real human cold read (N4 / the epic's
  human gate) — the artifact says "session's own cold-read proxy" on its
  face.
