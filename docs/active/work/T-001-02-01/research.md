# Research — T-001-02-01 establish-adaptable-design-tokens

Descriptive map of the terrain this ticket touches. What exists, where, how it
connects, and the constraints that bound a solution. No proposals here — those
belong to `design.md`.

## The ticket in one line

Extract a small, **template-owned** token + primitive layer into a local
stylesheet so the baseline looks deliberate without locking future demos to a
remote kit, a CSS framework, or a prematurely fixed visual style. The base
layout imports it; the page consumes tokens instead of browser defaults; nothing
remote loads at runtime; a future Figma brief rethemes by editing tokens, not
markup.

## Where the relevant code lives today

```
src/pages/index.astro     # the ONLY page; owns ALL styling inline today
astro.config.mjs          # output: 'static' (load-bearing; no adapter yet)
package.json              # single devDependency: astro ^5.13.0
tsconfig.json             # extends astro/tsconfigs/base
```

There is **no** `src/styles/`, **no** `src/layouts/`, **no** `src/components/`.
T-001-01-01 deliberately deferred all three (its `structure.md`: "not earned by
a single page (N1)"). This ticket is the first to earn a shared style seam.

## What `index.astro` already establishes (the precedent to preserve)

`src/pages/index.astro:33-122` holds a scoped `<style>` block that is, in effect,
a proto-token-layer. It already defines, inline on `:root`:

- **Color:** `--steel #44679b`, `--off-white #faf8f5`, `--cream #f2efe9`,
  `--ink #1c1917`, `--ink-soft #57534e`.
- **Radius:** `--radius: 28px`.
- **Shadow (claymorphism):** `--shadow-lo rgba(28,25,23,.09)` (warm, ink-tinted,
  bottom-right), `--shadow-hi rgba(255,255,255,.85)` (top-left light source).
- **Fonts:** `--font-display` (Lora + serif fallbacks), `--font-body`
  (Karla + system-ui fallbacks).

It then hardcodes, NOT as tokens (the gaps this ticket must close):

- **Type scale** — `clamp()` sizes are inlined per-selector (`h1`, `.tagline`,
  `.lede`, `.eyebrow`), not lifted to `--text-*` tokens.
- **Spacing** — margins/paddings are ad-hoc `rem`/`clamp()` literals; no
  `--space-*` scale.
- **Focus** — no focus-ring tokens or `:focus-visible` styling at all.
- **Control sizes** — none (there are no buttons/inputs yet).

The card style `.clay-surface` (`index.astro:73-83`) is already named after the
b28 kit primitive but is defined locally and page-scoped.

## The constraints, sourced

**Brand identity (user-global CLAUDE.md).** "Sincere claymorphism" on the b28
palette: steel blue on warm off-white/cream, ink text, Lora (display) + Karla
(body). One light source (top-left), warm ink-tinted shadows (never flat gray),
generous radii, calm motion, *what looks pressable is pressable*. There is a
shared kit `b28-clay.css` served at `https://b28.dev/kit/b28-clay.css` exposing
token custom-properties plus `.clay-surface` / `.clay-well` / `.clay-button` /
`.clay-chip` primitives — the naming vocabulary this ticket should echo.

**...but the ticket says do NOT remote-link that kit.** Ticket context: "without
locking future demos to a remote kit, a CSS framework, or a prematurely fixed
visual style." The kit's own guidance (user-global) agrees: offline/standalone
frontends **vendor** it at build (`just sync-kit`), they do not runtime-link.
There is no `just sync-kit` pipeline in this repo. So the token layer must be
**locally authored and owned**, structurally compatible with the kit's
vocabulary but not fetched from it.

**Charter invariants that bear on this ticket:**

- **P3 — the room and phone both work.** Projector-legible, phone-usable. This
  ticket lays the *token* foundation (type scale, control sizes, focus) that
  T-001-02-02 turns into verified responsive behavior.
- **P6 — sovereignty.** No mandatory dependence on a central platform → no
  runtime fetch of `b28.dev/kit/*`. The stylesheet ships in the bundle.
- **N5 — not framework-by-inertia.** No Tailwind, no CSS-in-JS runtime, no
  PostCSS plugin chain. Plain CSS custom properties are the lightest tool that
  fully satisfies the AC.
- **"A polished default design system that can yield to stakeholder Figma
  direction"** (product-spec, Public demo). The retheming seam IS the product
  requirement, not a nicety.

## How the stylesheet will connect (Astro mechanics)

Astro bundles CSS imported from a component/layout/page frontmatter
(`import '../styles/tokens.css'`) into a hashed asset emitted under
`dist/_astro/` and referenced by a **same-origin relative `<link>`** (small
sheets may be inlined). Either path satisfies "loads no remote CSS at runtime" —
there is no cross-origin request. A global stylesheet imported once in a base
layout applies to every page that layout wraps. This is the idiomatic,
zero-dependency mechanism; it needs no config change.

A `public/`-served `.css` referenced by a hand-written `<link href="/...">` is
the alternative delivery path — also same-origin, but unbundled and unhashed.
Noted for `design.md` to weigh.

## Sibling ticket boundary (avoid overlap)

- **T-001-02-01 (this):** the token + primitive layer and the retheme seam.
- **T-001-02-02 (depends on this):** "baseline responsive typography and layout"
  — screenshots at 375px (no horizontal scroll, tappable targets) and at
  projection scale (headings/body scale up). It will *consume and tune* the
  `--text-*` / `--space-*` / `--control-*` tokens defined here and add the base
  layout's responsive layout rules. So: define the tokens and the seam now;
  leave verified responsive behavior and any layout scaffolding for -02-02. The
  base layout introduced here is the shared surface -02-02 builds its layout on.

## Assumptions and open questions (resolved in Design)

1. **Does "base layout" mean introduce `src/layouts/`?** The AC names "the base
   layout" as the import site. The scaffold has none. Design must decide: create
   a minimal base layout (satisfies the AC wording, gives -02-02 its seam) vs.
   import the stylesheet directly into `index.astro`. Leaning to the former.
2. **One stylesheet or split (tokens vs. primitives/base)?** Both satisfy the AC.
   Design weighs a clean tokens/base split for reviewability against a single
   entry file.
3. **One-tier vs. two-tier tokens?** A raw-palette → semantic-role split
   (`--steel` → `--color-accent`) is what makes "retheme by changing tokens,
   not structure" real. Design decides how far to layer without over-building.
4. **Dark mode now?** Prior ticket kept light-first. Scope check in Design;
   likely structure tokens so a dark theme is a later token override, not a
   rewrite — but do not implement dark here.

## No dependencies change

Pure CSS custom properties. No new npm package, no PostCSS, no Tailwind. The
`devDependencies = { astro }` acceptance gate from T-001-01-01 must stay clean —
this ticket adds files, not dependencies.
