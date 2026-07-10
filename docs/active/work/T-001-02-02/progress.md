# Progress — T-001-02-02 projector-and-phone-baseline-layout

Execution log for the Implement phase. What landed, deviations from the plan and
why, and the verification results.

## Commits

| # | SHA | Scope |
|---|-----|-------|
| A | `31a214a` | `tokens.css` + `base.css` — fluid root type scale + `.page` shell |
| B | `5614cfd` | `BaseLayout.astro` + `index.astro` — mount shell, tokenize card measure |

Only the four source files were committed. The `docs/` work tree and governance
files stay untracked/Lisa-managed, per the T-001-02-01 convention.

## Steps executed (vs plan)

- **Step 1 (tokens.css)** — done as planned. Added `--root-font`, replaced the
  seven `clamp()` `--text-*` triples with pure `rem` steps, added `--measure` /
  `--gutter`.
- **Step 2 (base.css)** — done: `html { font-size: var(--root-font) }`, the
  `.page` shell, and the `img/svg/video { max-width:100% }` media guard.
- **Step 3 (BaseLayout.astro)** — done: `<slot />` wrapped in `<div class="page">`,
  comment refreshed to present tense.
- **Step 4 (index.astro)** — done: removed the bespoke `main { grid; padding }`,
  switched the card to `max-width: var(--measure)`.
- **Steps 5–7 (verification)** — done; results below.

## Deviations from the design/structure

1. **`.page` centering mechanism — hardened beyond `place-items: center`.**
   Structure specified `place-items: center`. The shipped `.page` uses
   `grid-template-columns: minmax(0, 1fr); align-content: center;` (default
   `justify-items: stretch`) plus `margin-inline: auto` on the card, and a
   `.page > * { max-width:100%; min-width:0 }` guard. **Why:** `place-items:center`
   makes the single grid item shrink-wrap to its content's max-content, and an
   *auto* grid track can grow past the container — a real overflow risk for a
   template future demos extend with wide content (tables, `<pre>`, media).
   Pinning the column to `minmax(0,1fr)` makes the track exactly the container
   width; stretching the wrapper and centering the card with `margin-inline:auto`
   removes the shrink-wrap entirely. Functionally equivalent for today's card,
   strictly more robust for future pages. This is a hardening, **not** a bugfix —
   see the verification note below on why the apparent "overflow" was a capture
   artifact, not a layout defect.
2. **Root value at 375px is 16.8px, not the 16px floor.** The design table said
   "phone rests on the 1rem floor." Measured: at 375px the clamp's middle term
   (`0.92rem + 0.55vw` = 16.78px) applies; the 1rem floor only engages below
   ~262px. Still ≥16px and readable — the AC is met; the note is a precision
   correction, no code change.

## Verification results

### Build & contract greps
- `npm run build` — succeeds. `/` is prerendered to `dist/index.html`;
  `_routes.json` **excludes** `/` and `/_astro/*` from the Worker → the homepage
  is served straight from edge assets (static-first intact; `_worker.js` exists
  only for the concurrently-added `/api/receipt` route — see Concerns).
- Served page (`dist/index.html`) — **no** remote CSS/font, `@import`, or external
  `<link>`. CSS inlined same-origin (P6). ✓
- No color/radius/shadow/font literal in `base.css`, `BaseLayout.astro`, or
  `index.astro` scoped styles. ✓
- No `vw` in any `--text-*` token (no compounding with the root). ✓
- `34rem` literal gone from `index.astro` (now `var(--measure)`). ✓
- Copy unchanged / foundation-only. ✓

### Measured sizing (true device viewports, via CDP `setDeviceMetricsOverride`)

| Metric | Phone 375×812 (dsf2, mobile) | Projector 1920×1080 |
|--------|------------------------------|---------------------|
| layout viewport | 375 | 1920 |
| `documentElement.scrollWidth` | **375 → no horizontal scroll** ✓ | **1920 → no overflow** ✓ |
| root / body font-size | 16.78px (≥16 ✓) | **24px** |
| h1 (`--text-3xl` 2.6rem) | 43.6px | **62.4px** |
| control target (`--control-height` 2.75rem) | ~46px (≥44 ✓) | 66px |
| card width (`--measure` 34rem) | 333px (fits w/ gutters) | 816px (centered) |

Body 16.8→24px and h1 43.6→62.4px confirm the **projector step-up**; phone stays
readable with no horizontal scroll and ≥44px targets. Both directions of the AC
met, with numbers, not eyeballing.

### Screenshots (the AC evidence)
`docs/active/work/T-001-02-02/phone-375.png`, `projector-1920.png` — phone shows
the card fully inside 375px with balanced gutters and clean heading wrap;
projector shows the same page proportionally larger, centered within the measure.

**Verification tooling note (important).** `--window-size=375` did **not** yield a
375px layout viewport in headless Chrome on this machine — old *and* new headless
floor the layout viewport at ~500px and squeeze it into the requested image size,
which *looked* like a right-edge overflow in early captures. It was a capture
artifact, not a page defect (confirmed: `scrollWidth == viewport` at a true 375px
override). Honest screenshots required driving Chrome via the DevTools Protocol
(`Emulation.setDeviceMetricsOverride`) using Node's global `WebSocket` — a
throwaway scratchpad harness, **no** project dependency added (N5 intact).

## Out-of-scope observations (not touched)

- Working tree/build now emits `_worker.js` + `src/pages/api/receipt.ts` from
  concurrent tickets (T-002-01-02) that landed on `main` during this session.
  This is by design (adapter present only for the one non-prerendered API route)
  and unrelated to this ticket. Flagged in `review.md` for the human reviewer.
