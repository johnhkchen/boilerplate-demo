# Design — T-001-02-01 establish-adaptable-design-tokens

Decisions grounded in `research.md`. This ticket promotes the proto-token block
inlined in `index.astro` into a documented, template-owned stylesheet that a
base layout imports, and closes the token gaps the AC names (spacing, focus,
control-size, an explicit type scale) — while keeping the whole surface plain
CSS, zero-dependency, and retheme-by-token.

## Decision summary

| # | Question | Decision |
|---|----------|----------|
| D1 | Delivery mechanism | **Astro frontmatter `import`** of local CSS (bundled, same-origin, hashed) — not `public/` `<link>`, not remote kit |
| D2 | Introduce a base layout? | **Yes — `src/layouts/BaseLayout.astro`**, the single import site for the token layer and the seam -02-02 builds on |
| D3 | One file or split | **Split: `tokens.css` (the retheme surface) + `base.css` (element base + clay primitives)** |
| D4 | Token tiering | **Two tiers: raw palette → semantic roles.** Retheming edits values; markup never changes |
| D5 | Token coverage | Color, type scale, spacing, radius, shadow, focus, control-size, motion — a compact documented set, each group commented |
| D6 | Primitive layer | **Port `.clay-surface`, add `.clay-button`, `.clay-chip`, `.clay-well`** — token-only, no hardcoded color |
| D7 | Dark mode | **Structure for it, don't ship it.** Semantic tokens make dark a later `:root` override, not a rewrite |
| D8 | Fonts | **Keep system-safe Lora/Karla stacks as tokens; no remote font fetch** (unchanged from D6 of -01-01) |

---

## D1 — Delivery: Astro `import`, not `public/`, not remote

**Options.** (a) `import '../styles/tokens.css'` in the layout frontmatter.
(b) Put `.css` in `public/` and hand-write `<link rel="stylesheet" href="/...">`.
(c) Runtime-link `https://b28.dev/kit/b28-clay.css`.

**Chosen: (a).** Astro bundles imported CSS to a hashed `dist/_astro/*.css` (or
inlines it when small) and emits a same-origin relative `<link>`. That is
exactly "loads no remote CSS at runtime," gets content-hash cache-busting for
free, and needs no config change. It is the idiomatic path and keeps the token
files as *source* (linted, diffed, co-located under `src/`).

**Rejected: (b)** ships unhashed, unbundled CSS and splits styling into a
`public/` path that reads as an asset, not source — weaker retheme ergonomics
for no gain here. **(c)** violates the ticket's explicit "no remote kit" and P6
sovereignty; there is no `just sync-kit` vendoring pipeline to keep it honest.

## D2 — Introduce `src/layouts/BaseLayout.astro`

**Options.** (a) Import the stylesheet directly in `index.astro` frontmatter, no
layout. (b) Create a minimal `BaseLayout.astro` that owns the `<html>` shell,
imports the token layer, and renders a `<slot />`.

**Chosen: (b).** The AC literally names "the base layout" as the import site, and
research confirmed there's no shared seam yet. A base layout is the honest home
for a *template-wide* concern: it is imported once, every future page inherits
the tokens, and T-001-02-02 has a defined place to add responsive layout rules
without touching each page. This is the scaffold's own tagline made real — "the
starting line every demo inherits." N1 ("one page doesn't earn a layout") held
at scaffold time; the token layer is precisely the cross-page concern that now
earns it.

**Rejected: (a).** Importing into `index.astro` satisfies the letter of "no
remote CSS" but not the AC's "base layout," and it re-buries a shared concern in
a single page — the next page would duplicate the `<head>` and the import. Worse
ergonomics for -02-02.

## D3 — Split `tokens.css` + `base.css`

**Options.** (a) One `base.css` with tokens and rules together. (b) Two files:
`tokens.css` = the `:root` custom-property declarations (the retheme surface),
`base.css` = element base styles + primitive classes that *consume* the tokens.

**Chosen: (b).** The AC's success condition is "retheme by changing tokens rather
than rewriting semantic structure." A file that is *nothing but tokens* makes
that seam obvious and auditable: a designer or agent opens `tokens.css`, changes
values, done. `base.css` (and primitives) then contain **zero hardcoded colors,
sizes, or radii** — every value is a `var(--…)`. That invariant is the proof the
retheme actually works, and the split is what makes it reviewable at a glance.

**Rejected: (a).** Workable, but mixing the retheme surface with consuming rules
muddies "change tokens, not structure" and makes it easy to sneak a hardcoded
value in later. The split is cheap insurance.

## D4 — Two-tier tokens: raw palette → semantic roles

The mechanism that makes retheming real. Two layers in `tokens.css`:

1. **Raw palette (primitives):** the literal brand values, named by what they
   *are* — `--b28-steel: #44679b`, `--b28-off-white`, `--b28-cream`, `--b28-ink`,
   `--b28-ink-soft`. These are the b28 identity constants.
2. **Semantic roles:** named by what they *do* — `--color-bg`, `--color-surface`,
   `--color-text`, `--color-text-soft`, `--color-accent`, `--color-accent-text`,
   `--color-focus`, `--color-border`. `base.css` and pages reference **only**
   these.

A Figma brief then remaps roles (`--color-accent: <new>`) or swaps the palette
underneath, and every surface follows — no selector is touched. This is the
literal AC clause "rethemed … by changing tokens rather than rewriting its
semantic structure." A dark theme (D7) is just an alternate set of role values.

**Rejected:** one-tier (semantic names holding raw hex directly). Simpler, but
loses the "here are the brand constants, here is how they're applied" separation
that makes both a palette swap and a role remap clean.

## D5 — Token coverage (compact, documented, each group commented)

The AC enumerates color, type, spacing, radius, focus, and control-size. Ship
exactly those plus the two already load-bearing groups (shadow, motion):

- **Color** — palette + semantic roles (D4).
- **Type** — `--font-display`, `--font-body`; a small scale `--text-xs … --text-3xl`
  and `--leading-tight` / `--leading-normal`. Sizes may use `clamp()` for sane
  fluid defaults; **verified** projector/phone tuning is -02-02's job (research
  boundary).
- **Spacing** — a modular `--space-3xs … --space-2xl` scale (rem-based) so
  margins/paddings stop being ad-hoc literals.
- **Radius** — `--radius-sm`, `--radius-md`, `--radius-lg` (lifts the lone
  `--radius: 28px`).
- **Shadow** — `--shadow-raised` / `--shadow-inset` built from the warm
  ink-tinted `--shadow-lo` + top-left-light `--shadow-hi` (claymorphism honesty).
- **Focus** — `--focus-ring-width`, `--focus-ring-offset`, `--focus-ring-color`
  (steel). Backs a global `:focus-visible` outline — an a11y gap in the scaffold.
- **Control-size** — `--control-height` (≥ 2.75rem / 44px touch target),
  `--control-padding-x`, `--control-radius`, `--control-font`. Prepares the
  harness's buttons/inputs without building them.
- **Motion** — `--motion-duration`, `--motion-ease`, gated by
  `prefers-reduced-motion` (calm motion, brand).

"Compact" is the discipline: one coherent scale per axis, every token commented
with its intent. No token without a consumer or a near-term consumer named.

## D6 — Primitive layer: port + extend the clay set

Port `.clay-surface` out of `index.astro` into `base.css` and add the kit's
sibling primitives so the vocabulary matches b28: `.clay-button` (raised,
genuinely recesses on `:active` — "what looks pressable is pressable"),
`.clay-chip`, `.clay-well` (inset). All built **only** from tokens. This is the
"primitive layer" the ticket title names; it stays small (composition over
inheritance, guardrail) and light when unused. Playing-piece / product colors
are explicitly *not* added — those layer on top per-project.

## D7 — Dark mode: structure, don't ship

Prior ticket chose light-first to match the warm identity. Keep that. But because
semantic roles (D4) are the only thing surfaces reference, a dark theme becomes a
single future block overriding role values (`@media (prefers-color-scheme: dark)`
or `:root[data-theme="dark"]`, per user-global). Leave a commented seam noting
this; do **not** implement dark now (scope, and -02-02 is about size not theme).

## D8 — Fonts unchanged: token stacks, no network

Keep `--font-display` (Lora + serif fallback) and `--font-body` (Karla + system
fallback) as tokens. No web-font `@import`/`<link>` — the "no remote CSS at
runtime" clause covers font CSS too. Real Lora/Karla vendoring stays a later
design-system ticket (carried forward from -01-01 review concern #2).

## Out of scope (deferred)

- Verified 375px / projector screenshots and responsive layout rules →
  **T-001-02-02**.
- Actual button/input *components* (Astro components) → harness story; this
  ticket ships the CSS control-size tokens + `.clay-button` primitive only.
- Web-font vendoring, a dark theme, and any `just sync-kit` pipeline → later.
- New dependencies of any kind → none; plain CSS only.
