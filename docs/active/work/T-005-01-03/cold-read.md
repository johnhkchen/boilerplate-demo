# T-005-01-03 — Projector & phone cold-read checklist

The epic's done-looks-like, judged from screenshots of the built page:
scannable at projector distance, actionable on a phone, no narrator.

## Rules of the read

- Answers cite **only what is legible in the PNGs in this directory** — no
  appeals to source, DOM, or authorial intent.
- Projector-distance judgments are made against
  `projector-back-of-room.png` (the 1080p viewport capture resampled to
  480px wide — the squint proxy); content questions may also cite the
  full-resolution captures, and say so when they do.
- A question the evidence fails to answer is **not** checked off; it is
  filed as a named follow-up below, per the acceptance criteria.
- Honest boundary (from S-005-01): this is the implementing session's own
  cold-read proxy. A true never-seen-it human read is the epic's human
  gate and is not simulated here.

## Provenance

- Built from: commit `2ad2e2d` (HEAD; `src/` identical to `c6a8045`, the
  T-005-01-01 recomposition — no source changes since).
- Pipeline: `npm run build` → `npx wrangler dev --port 8791` (repo-root
  `wrangler.jsonc`, local `.dev.vars` signing key) →
  `node docs/active/work/T-005-01-03/capture.mjs` →
  `sips --resampleWidth 480 projector-1920x1080.png --out projector-back-of-room.png`.
- Captured 2026-07-10 (receipt cards show the live timestamp). Every
  capture waited for `#receipt-body` to be visible — a real signed answer
  from the server, never the loading or error state.

| File | Context | Pixels |
| --- | --- | --- |
| `projector-1920x1080.png` | 1920×1080 viewport, DSF 1, no scroll | 1920×1080 |
| `projector-1920x1080-full.png` | same, full page | 1920×2045 |
| `projector-back-of-room.png` | the viewport shot at 480px wide | 480×270 |
| `phone-375-fold.png` | 375×667 viewport, DSF 2, mobile+touch | 750×1334 |
| `phone-375-full.png` | same, full page | 750×3446 |

## Q1 — What is the page?

**Answer as read:** "Demo Runway — the starting line every demo inherits.
A working demo page, live right now; watch the card below get a freshly
signed answer from the server, and further down, leave the team a note."
Read from `projector-1920x1080.png` (identity card fills the top of the
first screen) and `phone-375-fold.png` (the identity card *is* the phone's
first screen, fully legible).

At back-of-room distance (`projector-back-of-room.png`): the name **Demo
Runway**, the tagline, and the section heading "A signed note, made just
now" survive the shrink; the ledes do not (expected — hierarchy is doing
its job).

**PASS** — on both surfaces the first screen says what this is without a
narrator.

## Q2 — What is its one primary action?

**Answer as read:** "Ask for a fresh note" — the page's single
button-shaped element (solid accent, clearly pressable), sitting under the
signed-note panel. Read from `projector-1920x1080-full.png` and
`phone-375-full.png`; it is visibly the *only* button anywhere on the
page.

**But the question is not answered from the projector's no-scroll view.**
In `projector-1920x1080.png` the fold cuts mid-receipt-panel ("MADE AT" is
the last legible line); the button is below it, and in
`projector-back-of-room.png` no action of any kind is legible. The
identity lede *names* the action in prose ("watch the card below get a
freshly signed answer") — legible at full resolution, lost at distance.
On the phone the button is one natural scroll down with a generous tap
target — fine for a surface where scrolling is native, and the fold's
lede names both moves.

**NOT checked off for the projector.** Filed as **F-005-01-03-1** and
**F-005-01-03-2** below. (Phone: pass.)

## Q3 — How does a visitor leave the team a note?

**Answer as read:** scroll to the last card — eyebrow "LEAVE A NOTE",
heading "Pass the team a thought", and an underlined accent link
**"Leave a note for the team"** ("no account, no sign-in" per its lede).
Read from `phone-375-full.png` (link renders with a full-width-legible
label and a comfortable tap target) and `projector-1920x1080-full.png`.
The first screen on both surfaces points at it in prose ("further down,
leave the team a note of your own").

**PASS** — answerable from the screenshots, and the path is actionable on
the phone where it would actually be used. The at-distance caveat (the
card is below the projector fold, like everything after the receipt
panel) is covered by F-005-01-03-1; the room is told the path exists by
the legible first screen only at full resolution, not at back-of-room
shrink (F-005-01-03-2).

## Also observed (no question attached)

- The long hex values (one-time tag, signature) wrap cleanly inside the
  well at 375px — no horizontal overflow anywhere in `phone-375-full.png`.
- Receipt values differ between the projector and phone captures (fresh
  nonce/signature per context) — incidental live proof the server answered
  twice.

## Follow-ups filed

- **F-005-01-03-1 — primary action sits below the 1920×1080 fold.** A
  projector room sees the identity card and the top of the receipt panel
  but no button; the presenter must scroll before the room knows what to
  press. Evidence: `projector-1920x1080.png` (fold ends at "MADE AT") vs
  `projector-1920x1080-full.png` (button at ~1400px). Ticket seed: tighten
  the receipt card's vertical rhythm at wide viewports (or lift the button
  above the well) so the one clay-button lands inside the first projector
  screen; keep the 375px layout untouched.
- **F-005-01-03-2 — the verb-forward labels don't survive projector
  distance.** At `projector-back-of-room.png` scale only the display
  headings ("Demo Runway", "A signed note, made just now") remain legible;
  the eyebrows — which carry the page's what-to-do verbs ("Start here",
  "Watch the server answer", "Leave a note") — shrink to texture, so the
  at-distance read loses exactly the orientation layer the recomposition
  added. Ticket seed: scale the eyebrow size up at wide viewports (token
  change) or fold the verbs into the headings themselves; judge against a
  fresh back-of-room resample.

## Verdict against the acceptance criterion

Screenshots at projector scale and 375px phone viewport: **present** (five
PNGs above). Checklist answering the three questions from the screenshots
alone: **Q1 pass, Q3 pass, Q2 pass on phone but not checked off at
projector distance** — the two projector-distance failures are filed as
named follow-ups F-005-01-03-1 and F-005-01-03-2 rather than checked off,
as the AC instructs.
