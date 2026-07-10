# Design — T-001-02-02 projector-and-phone-baseline-layout

Enumerate viable approaches, weigh each against the codebase reality from
`research.md`, choose one, record what was rejected and why. Grounded in the
research, not assumptions.

## The two problems, stated precisely

1. **Projector step-up (the real gap).** Body and heading sizes are held flat on
   large viewports because the type-scale `clamp()` caps are `rem` values and the
   root is a fixed 16px (research §"What the current type scale actually does").
   We need sizes to *grow* on wide displays without breaking the phone side.
2. **Shared responsive container (the promised seam).** Centering, a readable
   line-length (measure), and a fluid horizontal gutter live in `index.astro`'s
   `main` today. `BaseLayout.astro:6` says the container belongs in the layout so
   every future page inherits it.

Both must hold at 375px (no horizontal scroll, ≥44px targets, readable body) and
scale legibly at ~1920px, with zero new dependencies (N5) and pure CSS (P6).

---

## Problem 1 — where projector scaling comes from

### Option A — Raise the per-token `rem` caps (keep per-token `clamp(min, vw, max)`)

Bump each `--text-*` max and widen the `vw` term, e.g.
`--text-3xl: clamp(2.4rem, 5vw + 1rem, 5rem)`.

- **For:** smallest conceptual change; keeps the exact mechanism T-001-02-01
  shipped; per-step control over how fast each size grows.
- **Against:** *many knobs.* Seven type tokens each need a hand-tuned min/vw/max
  triple, and they must stay proportionate to each other by eye. Spacing and
  control sizes stay flat, so on a projector the text grows but the padding,
  gutters, and 44px targets do **not** — the block looks text-heavy and
  disproportionate, not "the same page, bigger." Every future size added to the
  scale inherits the three-number tuning burden.

### Option B — Single fluid **root font-size**; tokens become `rem` steps (CHOSEN)

Set one fluid root — `html { font-size: clamp(1rem, 0.92rem + 0.55vw, 1.5rem) }`
— and simplify `--text-*` to plain `rem` multiples. Because every size, space,
radius, and the 44px control target is already expressed in `rem`, the whole
system scales from one lever: root ≈16px on phone, ≈24px on a 1920px projector.

- **For:** *one knob.* Projector view becomes literally "the same page, scaled" —
  type, spacing, gutter, and tap/click targets grow together and stay in
  proportion. Directly exploits the research finding that the caps are already in
  `rem`. Tokens get *simpler* (a value, not a triple). Respects user zoom because
  the clamp floor is `1rem`, not a px literal.
- **Against:** it re-expresses the type tokens (not just retunes numbers) — a
  larger textual diff to `tokens.css`. Mitigated: it is exactly the "tune the
  `--text-*`/`--space-*` token values" seam T-001-02-01's review sanctioned, and
  it removes complexity rather than adding it. One subtlety to honor: with a fluid
  root, per-token `vw` terms would **compound** with the root's `vw`, so tokens
  must drop `vw` and be pure `rem` — the single fluid mechanism lives only at the
  root. (Codified as an invariant in `structure.md`.)

### Option C — Breakpoint step-up (`@media (min-width: 1600px) { :root { --text-*: … } }`)

Redefine the scale at a wide breakpoint.

- **For:** explicit; easy to reason about "projector = this block applies."
- **Against:** a hard jump at one width is exactly the janky behavior fluid type
  exists to avoid; between 1024 and 1600 nothing grows; picking the breakpoint is
  arbitrary and display-dependent. More CSS than Option B for a worse curve.

**Decision: Option B.** One fluid root drives a coherent, proportional scale;
tokens simplify; it is the sanctioned seam; it satisfies projector step-up and
leaves the already-sound phone floor intact. The fluid-root curve is designed so
the phone (375px) sits at the `1rem` floor and the projector (1920px) reaches the
`1.5rem` ceiling — verified numerically in Plan.

### Tuning the root curve (grounding the numbers)

`clamp(1rem, 0.92rem + 0.55vw, 1.5rem)` with root basis 16px:

| Viewport | `0.92rem + 0.55vw` | Clamped root |
|----------|--------------------|--------------|
| 375px    | 14.72 + 2.06 = 16.8px | **16px** (floor) |
| 768px    | 14.72 + 4.22 = 18.9px | 18.9px |
| 1280px   | 14.72 + 7.04 = 21.8px | 21.8px |
| 1920px   | 14.72 + 10.56 = 25.3px | **24px** (ceiling) |

Phone body (`--text-base: 1rem`) = 16px ✓ readable, targets = 2.75rem = 44px ✓.
Projector body = 24px, h1 (`--text-3xl: ~2.6rem`) ≈ 62px ✓ legible at distance.
Floor never drops below 16px → honors the phone AC and user font-size prefs.

### New `--text-*` steps (pure `rem`, ~1.2 modular-ish, tuned to old anchors)

```
--text-xs: 0.8rem;  --text-sm: 0.9rem;  --text-base: 1rem;  --text-lg: 1.2rem;
--text-xl: 1.5rem;  --text-2xl: 2rem;   --text-3xl: 2.6rem;
```

Chosen so phone sizes land at/above the *old* clamp mins (no phone regression:
h1 38.4px→41.6px, body 16px→16px) while the projector ceiling lifts them well
past the old caps (h1 54.4px→62px, body 17.9px→24px). The gap the research
identified is closed by construction.

---

## Problem 2 — the shared responsive container

### Option A — Promote centering + measure + gutter into `BaseLayout` (CHOSEN)

Wrap `<slot />` in a `.page` shell that owns: min-height fill (`100dvh`),
vertical+horizontal centering, a fluid gutter (`clamp`), safe-area insets, and
`overflow-x` safety. `index.astro`'s `main` drops its bespoke grid/padding and
just contributes page content; the card keeps its own `max-width` measure.

- **For:** fulfills the `BaseLayout.astro:6` promise; every future page inherits
  identical, correct responsive framing for free; removes duplication; one place
  to reason about "no horizontal scroll." `100dvh` fixes the mobile browser-chrome
  height jump that `100vh` causes on phones.
- **Against:** touches three files instead of one. Acceptable — it is the stated
  architecture and the duplication removal pays for it.

### Option B — Leave the container in `index.astro`, only retune tokens

- **For:** minimal file churn; AC is about the rendered page, which one page can
  satisfy.
- **Against:** directly contradicts the `BaseLayout` comment and the "shared seam"
  intent; the next page would re-invent centering; the layout ticket's whole
  point (a container future demos inherit) goes unbuilt. Rejected.

**Decision: Option A.** The container lives in `BaseLayout`; the gutter and
centering become shared; `index.astro` keeps only its card's `max-width` (a
content concern, correctly page-local).

### Container specifics (grounded in research §layout mechanics)

- **Gutter:** `padding-inline: clamp(var(--space-md), 4vw, var(--space-2xl))` —
  20px min each side at 375px (matches today's safe value), growing on wide
  screens so the card isn't marooned against edges on a projector.
- **Measure:** the card stays `max-width: 34rem` (now scaling with the fluid root
  → ~748px at 1920px), keeping line-length readable rather than sprawling.
- **Centering:** `display: grid; place-items: center; min-height: 100dvh`.
- **Overflow safety:** `overflow-x: clip` on the shell as a belt-and-suspenders
  guard so no future content can introduce a horizontal scrollbar; combined with
  `max-width: 100%` on media. (Research confirmed shadows don't scroll, so this is
  insurance, not a fix for a present bug.)
- **Safe areas:** add `env(safe-area-inset-*)` to the gutter so notched phones
  don't clip the card. Pure progressive enhancement (0 where unsupported).

---

## What is deliberately NOT done

- **No JS.** All responsiveness is CSS `clamp`/`grid`/`dvh` in the bundle (P6).
- **No new dependency / no framework.** Screenshots drive system Chrome by CLI
  (research §verification); nothing added to `package.json` (N5).
- **No dark theme.** Still the commented seam from T-001-02-01; out of scope.
- **No web-font loading.** Lora/Karla stay declared with fallbacks (carried
  concern); scaling is orthogonal to font delivery.
- **No copy rewrite** beyond keeping it foundation-only; existing copy already
  satisfies brand voice and the "no product-specific content" clause.
- **No per-selector font sizes** in pages — the anti-pattern T-001-02-01 warned
  against. All sizing flows from tokens + the fluid root.

## Acceptance mapping (how the decision satisfies each sub-clause)

| AC sub-clause | Mechanism |
|---------------|-----------|
| 375px: no horizontal scroll | shell `overflow-x: clip` + 20px gutter + `box-sizing` (already) + no fixed widths |
| 375px: tappable targets | `--control-height: 2.75rem` = 44px at root floor; targets ≥44px |
| 375px: readable body | root floor 1rem → `--text-base` = 16px |
| projection: headings/body scale up | fluid root ceiling 1.5rem → body 24px, h1 ≈62px |
| foundation-only bundle | no product copy/code added; static build unchanged |

## Verification strategy (feeds Plan)

Build → preview → headless-Chrome screenshots at 375×812 and 1920×1080 →
inspect for (a) no horizontal scroll at 375, (b) legibly larger type at 1920 →
plus a numeric check of computed root/`--text-*` at both widths and a `dist/`
grep proving no remote fetch and foundation-only content.
