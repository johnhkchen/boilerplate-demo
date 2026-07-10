# Structure — T-001-02-01 establish-adaptable-design-tokens

The file-level blueprint implementing the `design.md` decisions. Not code — the
shape of the code. All paths relative to repo root.

## Files created

```
src/
  styles/
    tokens.css          # the retheme surface: :root custom properties only (D3/D4/D5)
    base.css            # element base + clay primitives; consumes tokens, zero literals (D3/D6)
  layouts/
    BaseLayout.astro    # <html> shell; imports both stylesheets once; renders <slot/> (D2)
```

## Files modified

```
src/pages/index.astro   # use BaseLayout; drop inline :root tokens + moved primitive; keep page-scoped copy styles consuming tokens
```

## Files deleted

None.

## Dependency / config impact

None. No `package.json` change, no `astro.config.mjs` change, no new tooling. The
`devDependencies = { astro }` gate from T-001-01-01 stays clean — this is the
direct N5 / acceptance check. Pure CSS custom properties + Astro's built-in CSS
import; no PostCSS, no Tailwind, no CSS-in-JS.

---

## File-by-file specification

### `src/styles/tokens.css` (new) — the retheme surface

A single `:root { … }` block, sectioned by comment banners, in this order. Two
tiers per D4: raw palette first, then semantic roles that reference the palette.
**Only this file holds literal values.**

1. **Raw palette (b28 identity constants).**
   `--b28-steel: #44679b`, `--b28-off-white: #faf8f5`, `--b28-cream: #f2efe9`,
   `--b28-ink: #1c1917`, `--b28-ink-soft: #57534e`, plus the two shadow tints
   `--b28-shadow-lo: rgba(28,25,23,.09)`, `--b28-shadow-hi: rgba(255,255,255,.85)`.
2. **Semantic color roles** (reference the palette; the only names surfaces use):
   `--color-bg`, `--color-surface`, `--color-text`, `--color-text-soft`,
   `--color-accent` (= steel), `--color-accent-text` (on-accent), `--color-border`,
   `--color-focus` (= steel).
3. **Type:** `--font-display` (Lora + serif fallback), `--font-body` (Karla +
   system fallback); scale `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`,
   `--text-xl`, `--text-2xl`, `--text-3xl` (larger steps `clamp()` for fluid
   default); `--leading-tight`, `--leading-normal`.
4. **Spacing:** `--space-3xs` … `--space-2xl` (rem modular scale, ~0.25→4rem).
5. **Radius:** `--radius-sm`, `--radius-md`, `--radius-lg` (28px → `--radius-lg`).
6. **Shadow (claymorphism):** `--shadow-raised` (top-left light, warm
   bottom-right, from the two tints), `--shadow-inset` (inset variant).
7. **Focus:** `--focus-ring-width` (~3px), `--focus-ring-offset` (~2px),
   `--focus-ring-color` (= `--color-focus`).
8. **Control-size:** `--control-height` (min 2.75rem = 44px touch target),
   `--control-padding-x`, `--control-radius`, `--control-font`.
9. **Motion:** `--motion-duration` (~200ms), `--motion-ease`.
10. **Commented dark-theme seam** (D7): a disabled example block showing how a
    `:root[data-theme="dark"]` / `prefers-color-scheme` override remaps the
    semantic roles — not active.

Every group gets a one-line comment stating intent. No token without a consumer
or a named near-term consumer.

### `src/styles/base.css` (new) — element base + primitives

Global rules, all values via `var(--…)` — **no literal color/size/radius** here
(that invariant is the retheme proof). Sections:

- **Reset-ish base:** `*, *::before, *::after { box-sizing: border-box }`;
  `html, body { margin: 0; min-height: 100% }`.
- **Body:** background `linear-gradient(160deg, var(--color-bg), var(--b28-cream))`
  (calm warmth), `color: var(--color-text)`, `font-family: var(--font-body)`,
  `line-height: var(--leading-normal)`, antialiasing. (The default `--space-*`
  page padding lives on the page/layout container, not forced globally — -02-02
  owns responsive layout.)
- **Headings:** `h1–h3` use `--font-display`, `--leading-tight`, `--color-text`.
- **`:focus-visible`:** global visible ring —
  `outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset)`. Closes the scaffold a11y gap.
- **Reduced motion:** wrap any transition in
  `@media (prefers-reduced-motion: no-preference)`.
- **Clay primitives (D6), token-only:**
  - `.clay-surface` — raised card: `--color-surface`, `--radius-lg`,
    `--shadow-raised`. (Ported verbatim-in-behavior from `index.astro`.)
  - `.clay-button` — raised control using `--control-*`; `:active` swaps
    `--shadow-raised` → `--shadow-inset` (genuinely recesses).
  - `.clay-chip` — small pill: `--control-padding-x`, `--radius-sm`, `--text-sm`.
  - `.clay-well` — inset panel: `--shadow-inset`, `--color-surface`,
    `--radius-md`.

### `src/layouts/BaseLayout.astro` (new) — the import site + shell

- **Frontmatter:** `import '../styles/tokens.css'; import '../styles/base.css';`
  (order matters — tokens define the vars base consumes). Accept `Astro.props`:
  `title` (string) and optional `description` (string). No data fetching.
- **Markup:** the `<html lang="en">` shell moved out of `index.astro` — `<head>`
  with charset, viewport, `<title>{title}</title>`,
  `<meta name="description">`, `<link rel="icon" href="data:,">`; `<body>` renders
  `<slot />`. This is where -02-02 will add the responsive layout container.
- **No inline `<style>` beyond nothing** — global styling now lives in the
  imported sheets; page-specific styling stays scoped in the page.

### `src/pages/index.astro` (modified) — consume the layout + tokens

- **Frontmatter:** `import BaseLayout from '../layouts/BaseLayout.astro';` keep
  the `name` / `tagline` consts and the `title` / `description` strings.
- **Markup:** replace the hand-rolled `<html>/<head>/<body>` with
  `<BaseLayout title={…} description={…}> … </BaseLayout>` wrapping the existing
  `<main><section class="clay-surface">…</section></main>` copy (unchanged
  wording — brand voice already approved in -01-01).
- **Scoped `<style>`:** drop the `:root` token block and the `.clay-surface`
  definition (now global). Keep only page-specific selectors — `.eyebrow`,
  `.tagline`, `.lede`, and the `<main>` centering — **rewritten to reference
  tokens** (`var(--color-accent)`, `var(--text-*)`, `var(--space-*)`) instead of
  literals. This is the visible proof the page "uses those tokens instead of
  browser defaults."

## Public interface / contract this ticket establishes

The seam downstream tickets and future pages depend on:

- **`BaseLayout.astro`** — every page renders inside it and inherits the token
  layer. Props: `title` (required), `description` (optional). T-001-02-02 adds
  responsive layout rules *inside* this file; new pages import it rather than
  re-authoring a `<head>`.
- **`tokens.css`** — the single retheme file. A Figma brief edits values here.
  Semantic role names (`--color-*`, `--text-*`, `--space-*`, `--control-*`,
  `--focus-*`, `--radius-*`) are the stable public vocabulary; the raw `--b28-*`
  palette is the swappable identity layer beneath.
- **`base.css` primitives** — `.clay-surface` / `.clay-button` / `.clay-chip` /
  `.clay-well` are the shared building blocks; games/products layer only their
  own piece colors on top.

## Invariant that encodes the AC (checked in Review)

`base.css`, `BaseLayout.astro`, and `index.astro`'s scoped styles contain **no
literal color, radius, shadow, or font value** — every such value is a
`var(--…)` resolved from `tokens.css`. Grepping the non-token files for hex
colors / `px` radii should come back clean (spacing/util `px` like `1px` borders
excepted and tokenized where it recurs). This is the machine-checkable proof of
"retheme by changing tokens, not structure."

## Change ordering

1. `src/styles/tokens.css` → 2. `src/styles/base.css` (consumes tokens) →
3. `src/layouts/BaseLayout.astro` (imports both) → 4. refactor
`src/pages/index.astro` onto the layout → 5. `npm run build` + retheme proof →
6. commit. Detailed in `plan.md`.
