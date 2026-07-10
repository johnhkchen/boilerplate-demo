# Structure — T-001-02-02 projector-and-phone-baseline-layout

The blueprint: which files change, the shape of each change, the boundaries and
invariants, and the order that matters. Not code — the shape of the code.

## Change set at a glance

| File | Change | Responsibility after change |
|------|--------|------------------------------|
| `src/styles/tokens.css` | **modify** | Add fluid root token; replace `clamp()` `--text-*` steps with pure `rem` steps; add layout tokens (`--measure`, `--gutter`). Still the only file with literals. |
| `src/styles/base.css` | **modify** | Apply fluid root to `html`; add the `.page` shell primitive (centering, gutter, `100dvh`, overflow safety, safe-area). Still no literals — all `var(--…)` (1px hairlines excepted). |
| `src/layouts/BaseLayout.astro` | **modify** | Wrap `<slot />` in the `.page` shell — the promised shared responsive container. |
| `src/pages/index.astro` | **modify** | Drop the bespoke `main` grid/gutter (now the shell's job); keep the card's `max-width` measure. Copy unchanged (foundation-only). |

No files created or deleted. No `package.json`, `astro.config.mjs`, or
`wrangler.jsonc` change. No new dependency.

---

## `src/styles/tokens.css` (modify)

**Add — fluid root token** (new, near the Type block):

```
--root-font: clamp(1rem, 0.92rem + 0.55vw, 1.5rem);  /* phone 16px → projector 24px */
```

Documented as: *the single scaling lever — every rem-based size rides this.*

**Replace — the `--text-*` block.** From `clamp(min, Nvw, max)` triples to pure
`rem` steps (values fixed in Design):

```
--text-xs: 0.8rem;  --text-sm: 0.9rem;  --text-base: 1rem;  --text-lg: 1.2rem;
--text-xl: 1.5rem;  --text-2xl: 2rem;   --text-3xl: 2.6rem;
```

Update the adjacent comment: the scale is now root-driven fluid (was per-token
`vw`); projector step-up comes from `--root-font`, phone floor from the root
clamp's `1rem` minimum. Remove the "sane defaults, not final" caveat — this *is*
the final responsive contract this ticket owns.

**Add — layout tokens** (new small block, "Layout"):

```
--measure: 34rem;   /* readable line-length ceiling for a text block */
--gutter: clamp(var(--space-md), 4vw, var(--space-2xl));  /* page side gutter */
```

`--measure` centralizes the `34rem` that was a literal in `index.astro`;
`--gutter` centralizes the page gutter so the shell and any future full-bleed
page agree on one value.

**Unchanged:** raw `--b28-*` palette, semantic color roles, spacing, radius,
shadow, focus, `--control-*`, motion, the dark-theme seam. `--control-height`
stays `2.75rem` (44px at the root floor — verified in Plan).

**Invariant preserved:** literal values live only here.

---

## `src/styles/base.css` (modify)

**Add — fluid root on `html`:**

```
html { font-size: var(--root-font); }
```

Placed with the existing `html, body` reset. This is the one line that turns
every `rem` in the system into a projector-scaling value. `body` keeps
`line-height: var(--leading-normal)` etc.

**Add — the `.page` shell primitive** (new, grouped with the clay primitives but
labelled as layout, since it is structural not decorative):

```
.page {
  min-height: 100dvh;                 /* fill viewport; dvh avoids mobile chrome jump */
  display: grid;
  place-items: center;                /* vertical + horizontal centering */
  padding-block: var(--space-xl);
  padding-inline: max(var(--gutter), env(safe-area-inset-left), env(safe-area-inset-right));
  overflow-x: clip;                   /* belt-and-suspenders: no horizontal scroll ever */
}
```

Notes:
- `env(safe-area-inset-*)` inside `max()` degrades to `0` where unsupported →
  pure progressive enhancement, no fallback branch needed.
- `overflow-x: clip` (not `hidden`) avoids creating a scroll container / spurious
  scroll position while still preventing horizontal overflow.
- No literals: `100dvh` and `env()` are units/functions, not brand values; the
  only bare length is the permitted structural kind. Spacing via tokens.

**Optional media safety** (add): `img, svg, video { max-width: 100%; height: auto }`
— cheap guard so any future media a demo drops in can't blow out the 375px width.
Token-free, structural.

**Unchanged:** `box-sizing` reset, `body` gradient/type, heading rules,
`:focus-visible`, all four clay primitives, reduced-motion guard.

---

## `src/layouts/BaseLayout.astro` (modify)

Wrap the slot in the shell; update the frontmatter comment from "T-001-02-02 adds
the responsive layout container here" to describe what it now *is*.

```
<body>
  <div class="page">
    <slot />
  </div>
</body>
```

Boundary: the layout owns *framing* (fill, center, gutter, overflow safety); the
page owns *content and its measure*. Props (`title`, `description`) and `<head>`
unchanged — the `viewport` meta is already correct.

---

## `src/pages/index.astro` (modify)

The page no longer centers or gutters itself — the shell does. Shape after:

- **Remove** from the scoped `<style>`: `main { display: grid; place-items:
  center; padding: … }` (superseded by `.page`).
- **Change** `.clay-surface { max-width: 34rem }` → `max-width: var(--measure)`
  (kill the last layout literal in a consumer; the card's measure is a content
  concern that correctly stays on the page, but its *value* comes from a token).
- **Keep** `width: 100%` on the card, and the internal padding
  `clamp(var(--space-lg), 5vw, var(--space-xl))`, `.eyebrow`/`h1`/`.tagline`/
  `.lede` rules — all already token-driven and now ride the fluid root.
- **`<main>` stays** as the semantic content wrapper (it may lose its layout
  rules but remains for landmark semantics); the card lives inside it.
- **Copy: unchanged.** Foundation-only, already brand-voiced.

Invariant preserved: no color/radius/shadow/font literals in the page's scoped
styles; the one remaining layout literal (`34rem`) is tokenized.

---

## Ordering (why this sequence)

1. **`tokens.css`** first — define `--root-font`, the new `--text-*`, `--measure`,
   `--gutter`. Nothing consumes them yet; safe.
2. **`base.css`** — apply `html { font-size }` and add `.page`. Now the fluid root
   is live and the shell exists but is unused.
3. **`BaseLayout.astro`** — mount `.page`. Now every page is centered/scaled.
4. **`index.astro`** — remove the now-duplicate `main` layout, tokenize measure.

Each step leaves the site buildable; steps 1–2 are inert until 3 mounts the
shell, so a mistake surfaces at a known point. This ordering also lets the
implement phase commit 1–2 together (token+base foundation) and 3–4 together
(wire-up + cleanup) as two reviewable units.

## Public interfaces / contracts touched

- **`.page`** — new shared layout primitive; contract: "center my single child
  block within a full-height, gutter-safe, overflow-safe frame." Future pages
  just render content inside `BaseLayout` and inherit it.
- **`--root-font`, `--measure`, `--gutter`** — new tokens; part of the retheme
  surface. A Figma retheme can widen the measure or change the scaling curve here
  without touching markup.
- **`--text-*`** — same names, same semantic meaning, new (simpler) values; no
  consumer needs editing beyond the `34rem`→`--measure` swap. Backwards-safe.

## Risk & invariant checklist (verified in Plan)

- Root floor stays ≥`1rem` → phone body never < 16px, targets never < 44px.
- Fluid root has no `vw` in `--text-*` → no compounding (Design invariant).
- No-literal invariant in `base.css`/pages holds (grep in Plan).
- `dist/` stays foundation-only and remote-fetch-free (grep in Plan).
- Static build shape unchanged (`output: 'static'`, `index.html` only).
