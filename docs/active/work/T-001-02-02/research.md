# Research — T-001-02-02 projector-and-phone-baseline-layout

Descriptive map of the terrain this ticket touches. What exists, where, how it
connects, and the constraints that bound a solution. No proposals — those belong
to `design.md`.

## The ticket in one line

Deliver the legibility half of P3: baseline responsive typography and layout so
the *same* page reads from the back of a room on a projector and works one-handed
on a phone. Concretely: a 375px-wide viewport shows no horizontal scroll,
comfortably tappable targets, and readable body text; at large/projection scale
the heading and body sizes scale **up** so text stays legible at distance; the
deployed bundle stays foundation-only (no product-specific copy or code).

## Where the relevant code lives today

```
src/layouts/BaseLayout.astro   # document shell; single import site for the token layer
src/styles/tokens.css          # the retheme surface — type scale, spacing, control sizes
src/styles/base.css            # element base + clay primitives (.clay-surface/-button/-chip/-well)
src/pages/index.astro          # the ONLY page; a centered clay card with foundation copy
astro.config.mjs               # output: 'static' (no SSR adapter — load-bearing, P6)
wrangler.jsonc                 # Cloudflare static-assets deploy (T-001-01-02)
package.json                   # devDependencies: astro ^5.13, wrangler ^4 — nothing else
```

This ticket inherits a clean seam from **T-001-02-01** (commit `805b0c9`), which
promoted the inline proto-tokens into `tokens.css` + `base.css` and introduced
`BaseLayout.astro`. That ticket's review explicitly hands this one the
responsive-sizing work and names the intended seam (see below).

## The seam T-001-02-01 left for this ticket (sourced)

Three signals converge on *where* and *how* this work is expected to land:

1. **`BaseLayout.astro:6` comment:** "T-001-02-02 adds the responsive layout
   container here." The base layout currently wraps content in nothing but
   `<body><slot /></body>` — there is no shared container, gutter, or centering
   at the layout level. Each page rolls its own (`index.astro` has a
   `main { display: grid; place-items: center }`).

2. **`tokens.css:45-46` comment:** "T-001-02-02 tunes/verifies projector + phone
   sizing; these are sane defaults, not the final responsive contract."

3. **T-001-02-01 review, concern #1 (type-scale ownership boundary):** if this
   ticket needs different sizing, it should "tune the `--text-*` / `--space-*`
   **token values** … rather than add per-selector sizes." Tuning tokens is the
   sanctioned mechanism; per-selector overrides are the anti-pattern to avoid.

## What the current type scale actually does (the gap to close)

`tokens.css` defines a fluid scale where each step is `clamp(min, Nvw, max)`:

```
--text-base: clamp(1rem,   2.6vw, 1.12rem);
--text-lg:   clamp(1.15rem,3.4vw, 1.4rem);
--text-2xl:  clamp(1.8rem, 5.5vw, 2.4rem);
--text-3xl:  clamp(2.4rem, 7vw,   3.4rem);   /* h1 */
```

Computed at the two viewports this ticket cares about (root font-size = 16px):

| Token       | 375px (phone)                 | 1920px (projector)              |
|-------------|-------------------------------|---------------------------------|
| `--text-base` | 2.6vw=9.75 → **min 16.0px** | 2.6vw=49.9 → **max 17.9px**     |
| `--text-lg`   | 3.4vw=12.75 → **min 18.4px**| 3.4vw=65.3 → **max 22.4px**     |
| `--text-3xl`  | 7vw=26.25 → **min 38.4px**  | 7vw=134.4 → **max 54.4px**      |

The **phone side is already sound**: mins clamp to readable rem values (body
16px). The **projector side is the gap**: the `max` caps are in `rem` and the
root is a fixed 16px, so body text tops out at ~18px and h1 at ~54px no matter
how wide the display gets. "Body sizes scale up so text remains legible at
distance" is *not* satisfied — the caps hold sizes flat across all large
viewports. The `vw` term only bites in the narrow mid-range between min and max;
past the max it is inert.

Key structural fact: **the caps are expressed in `rem`.** If the root font-size
were itself to grow on large viewports, every `rem` min and max would grow with
it — the caps would rise instead of holding flat. That is the lever.

## Layout mechanics that bear on "no horizontal scroll" at 375px

- `base.css` sets `box-sizing: border-box` globally and `body { margin: 0 }`.
- `index.astro`'s `main { padding: clamp(--space-md, 4vw, --space-xl) }` gives a
  20px min gutter each side at 375px; the card is `width: 100%; max-width: 34rem`,
  so on a 375px screen it renders at 375−40 = 335px. No overflow **today** — but
  this centering/gutter logic lives in the page, not the shared layout.
- `--shadow-raised` casts offsets up to `14px 16px 34px`. Shadows paint outside
  the box but do **not** create scrollable overflow, so they are safe at 375px.
- No element currently uses fixed pixel widths, `100vw`, or negative margins —
  the usual horizontal-scroll culprits are absent.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` is
  already present in `BaseLayout.astro:22` — the precondition for phone layout.

## The "foundation-only" constraint

`index.astro` copy — "Demo Runway", "The starting line every demo inherits",
"Point your coding agent at it and build the demo you came to make" — is copy
about *the template itself*, not about any downstream product/demo. That is
foundation copy and satisfies "no product-specific copy or code in the deployed
bundle." The constraint to preserve: do **not** introduce demo-specific content,
sample product features, or throwaway code while adding responsive behavior.
Brand voice (user-global CLAUDE.md) also governs any copy touched: parlor-not-
portfolio, plain kitchen-table English, verb-forward labels.

## Charter / brand constraints in scope

- **P3 — the room and phone both work.** This ticket is the *verified* half:
  screenshots at 375px and at projection scale are the acceptance evidence.
- **P6 — sovereignty / static-first.** No SSR, no runtime fetch. Any responsive
  behavior must be pure CSS shipped in the bundle. No JS media-query shims.
- **N5 — not framework-by-inertia.** No Tailwind, no PostCSS, no CSS-in-JS. Plain
  custom properties + media/clamp are the tools already in play; stay there.
- **Claymorphism identity (user-global).** Type is Lora (display) + Karla (body);
  control targets ≥44px (`--control-height: 2.75rem`); calm motion. Scaling must
  keep these proportions coherent, not distort them.

## Verification surface available

- `npm run build` emits static `dist/`; `npm run preview` serves it locally.
- **System Chrome is present** (`/Applications/Google Chrome.app`) — headless
  `--screenshot --window-size=W,H` can capture the two required viewports
  (≈375×812 phone, ≈1920×1080 projector) against the preview server. This makes
  the AC's "screenshots" literally producible, closing the visual-regression gap
  T-001-02-01's review flagged as this ticket's to open.
- No Playwright/Puppeteer is installed and none should be added (N5) — driving
  system Chrome by CLI needs no new dependency.

## Assumptions and open questions (resolved in Design)

1. **Where does projector scaling come from?** Raise per-token `rem` caps (many
   knobs) vs. a single fluid **root font-size** so every `rem` bound rides up on
   large viewports (one knob). Design decides; the rem-cap structure above makes
   the root-font lever attractive.
2. **Does spacing scale on projector too, or only type?** Coherence argues for
   proportional scaling of the whole block; Design weighs this.
3. **Where does the responsive container live?** The `BaseLayout` comment says
   "here." Design decides how much of `index.astro`'s `main` centering/gutter to
   promote into the shared layout so future pages inherit it.
4. **Which projector width to target for screenshots?** 1920px is the common
   projector/large-display native width; Design/Plan fix the exact capture sizes.

## No dependency change

Pure CSS + a CLI screenshot against system Chrome. No new npm package, no PostCSS,
no test framework. The `devDependencies = { astro, wrangler }` gate stays clean.
