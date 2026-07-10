# Review — T-001-02-02 projector-and-phone-baseline-layout

Handoff for a human reviewer. What changed, how it was verified, and what to
watch. Commits: `31a214a` (fluid root + shell) and `5614cfd` (mount shell +
tokenize measure).

## What changed

Turned the T-001-02-01 token defaults into a *verified* responsive contract: the
same page reads on a projector and works one-handed on a phone. Four files
modified; none created or deleted; no dependency added.

| File | Change | Purpose |
|------|--------|---------|
| `src/styles/tokens.css` | modified | Added `--root-font` (single fluid scaling lever); replaced the seven `clamp()` `--text-*` triples with pure `rem` steps; added `--measure` + `--gutter` layout tokens. Literals still live only here. |
| `src/styles/base.css` | modified | `html { font-size: var(--root-font) }`; new `.page` responsive shell (viewport-fill, centered, gutter, overflow-safe); media `max-width:100%` guard. No literals. |
| `src/layouts/BaseLayout.astro` | modified | Wraps `<slot />` in `<div class="page">` — the shared container every page now inherits. |
| `src/pages/index.astro` | modified | Dropped bespoke `main` centering/gutter (now the shell's job); card centers via `margin-inline:auto`; `max-width: var(--measure)` replaces the last `34rem` literal. Copy unchanged. |

### The design in one paragraph
One fluid root font-size drives everything. Because every size, space, radius,
and the 44px control target is a `rem`, scaling the root scales them together: a
phone rests near the `1rem` floor (16px body, 44px targets), a projector reaches
the `1.5rem` ceiling (24px body, ~62px h1). The old per-token `clamp()` caps were
`rem` values against a fixed 16px root, so they held sizes flat on large
displays — that was the gap. Tokens are now pure `rem` steps (no `vw`, so they
don't compound with the root). A `.page` grid shell centers content and, via a
pinned `minmax(0,1fr)` column, guarantees no horizontal scroll on a phone.

## Acceptance criteria — verdict: MET

The AC is one compound clause; each sub-condition mapped to measured evidence
(true device viewports via CDP `setDeviceMetricsOverride`, not `--window-size`):

| Sub-clause | Evidence |
|-----------|----------|
| 375px: no horizontal scroll | `documentElement.scrollWidth == 375 == viewport`; card 333px inside 375px with balanced gutters (`phone-375.png`) |
| 375px: comfortably tappable targets | `--control-height` 2.75rem → ~46px at the 16.78px root (≥44px, P3) |
| 375px: readable body text | body/root = 16.78px (≥16px); heading/body wrap cleanly |
| projection scale: heading & body scale up | body 16.8→**24px**, h1 43.6→**62.4px** at 1920px (`projector-1920.png`) |
| foundation-only bundle | copy unchanged (template's own strings); no product-specific copy/code added by this ticket |

Screenshots at both viewports are saved in this directory as the primary
evidence.

## Test coverage

No unit/integration tests added — the correct call, matching T-001-02-01. This is
a CSS/layout change with no product logic; its "current truth" is a build + render
+ measure contract, exercised directly:

- **Build** — succeeds; `/` prerendered to `dist/index.html`; `_routes.json`
  excludes `/` from the Worker (served as an edge asset). Passed.
- **No-remote-CSS** (served page) — no `http(s)`, `@import`, external `<link>`,
  or remote font in `dist/index.html`. Passed (P6).
- **No-literal invariant** — no hex/rgb in `base.css`/`BaseLayout`/`index` scoped
  styles; `34rem` tokenized. Passed.
- **No-compounding invariant** — no `vw` in any `--text-*`. Passed.
- **Numeric sizing** — root/body/h1/target/measure computed at 375px and 1920px;
  all AC thresholds hold (table above). Passed.
- **Screenshots** — phone (no h-scroll, gutters, readable) and projector
  (step-up, centered). Passed.

**Coverage gaps (intentional, owned by later tickets):**
- No automated visual-regression / CI screenshot job. This ticket *produced* the
  375px + projector screenshots by hand-driving Chrome; wiring that into CI (and a
  `stylelint` rule for the no-literal invariant) belongs to the tooling/testing
  story, not here (N5 — no test/lint dependency added by inertia).
- No mid-range breakpoint assertions (tablet, ultra-wide > 1920). The fluid curve
  is continuous, so behavior between the two verified endpoints interpolates;
  spot-checking exotic widths is future hardening, not an AC requirement.

## Open concerns / flags for human attention

1. **`_worker.js` in the build is by design, not this ticket (informational).**
   During this session, concurrent tickets (T-002-01-02) landed on `main` adding
   the `@astrojs/cloudflare` adapter and `src/pages/api/receipt.ts`
   (`prerender = false`). The build now emits `_worker.js` + `_routes.json`
   alongside the static pages. Per the committed `astro.config.mjs` comment this
   is **static-first, not static-only**: every *page* (incl. `/`) is still
   prerendered and served as an asset; only `/api/*` invokes the Worker. Nothing
   in this ticket touched that surface. Called out so a reviewer comparing this
   ticket's `dist/` to T-001-02-01's (`index.html`-only) isn't surprised by the
   shape change — it is unrelated to the responsive work.

2. **Headless screenshot viewport is not honored by `--window-size` here
   (tooling, low).** Old and new headless Chrome floored the layout viewport at
   ~500px on this machine, so naive `--window-size=375` captures *looked* clipped.
   Real 375px evidence required a CDP `setDeviceMetricsOverride` harness (Node
   global `WebSocket`, no dependency). Any future CI screenshot job must use CDP
   device metrics, **not** `--window-size`, or it will produce misleading images.

3. **Centering hardened past the design spec (low, documented).** `.page` ships
   with `grid-template-columns: minmax(0,1fr)` + `align-content:center` +
   card `margin-inline:auto` (design said `place-items:center`). Reason: an auto
   grid track can overflow with wide content — a real risk for a template others
   extend. Functionally identical for today's card; strictly safer for future
   pages. See `progress.md` §Deviations.

4. **Carried-forward, unchanged:** Lora/Karla still declared with system
   fallbacks (no web-font fetched); dark theme still a commented seam. Both remain
   out of scope and untouched; the `--font-*` and semantic-role tokens are the
   seams those future swaps will use. Root scaling is orthogonal to font delivery.

## Downstream readiness

- **Retheme seam intact and extended.** The responsive curve is one token
  (`--root-font`); measure and gutter are tokens (`--measure`, `--gutter`). A
  Figma direction can retune projector/phone behavior by editing tokens, never
  markup or per-selector sizes.
- **`.page` shell is reusable.** Any future page rendered inside `BaseLayout`
  inherits correct phone/projector framing and overflow safety for free.
- **P3 fully delivered for the baseline page** — the room and the phone both work,
  proven with measurements and screenshots.

**Bottom line:** acceptance met and verified end-to-end (no h-scroll at 375px,
≥44px targets, readable body; genuine step-up at projector scale; foundation-only,
no remote CSS, no new dependency). No product logic to unit-test. No blocking
concerns — the one build-shape surprise (`_worker.js`) is a sibling ticket's
by-design change, not a regression here. Ready to advance.
