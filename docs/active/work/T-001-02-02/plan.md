# Plan — T-001-02-02 projector-and-phone-baseline-layout

Ordered, independently verifiable steps with an explicit testing strategy. Each
step is small enough to commit atomically; the two commits mirror the two
reviewable units from `structure.md` (token+base foundation, then wire-up).

## Testing strategy (what "verified" means here)

This is a CSS/layout change with no product logic, so — matching the precedent of
T-001-02-01 — no unit/integration test files are added (N5: no test framework by
inertia). "Current truth" is a **build + render + measure** contract, exercised
directly:

- **Build assertion** — `npm run build` succeeds; `dist/` is `index.html`-only,
  `output: 'static'`, no server entry.
- **No-regression greps** — no color/radius/shadow/font literals in `base.css`,
  `BaseLayout.astro`, or `index.astro` scoped styles (the invariant); `dist/`
  contains no `http(s)://`/`@import`/remote font (P6); `dist/` carries no
  product-specific copy (foundation-only).
- **Numeric sizing check** — compute `--root-font` and key `--text-*` at 375px
  and 1920px; assert phone body ≥16px & targets ≥44px, projector body & h1
  strictly larger than the old caps. (Pure arithmetic — no browser needed, and
  it is the objective backbone under the screenshots.)
- **Screenshot evidence (the AC's literal ask)** — headless system Chrome against
  the preview server at **375×812** and **1920×1080**; inspect for no horizontal
  scroll at 375 and visibly larger type at 1920. Saved under the work dir.

Verification criteria per step are listed inline below.

---

## Step 1 — Retune the token layer (`tokens.css`)

**Do:**
1. Add `--root-font: clamp(1rem, 0.92rem + 0.55vw, 1.5rem);` to the Type block
   with a "single scaling lever" comment.
2. Replace the seven `--text-*` `clamp()` triples with the pure-`rem` steps:
   `xs .8 / sm .9 / base 1 / lg 1.2 / xl 1.5 / 2xl 2 / 3xl 2.6`.
3. Update the Type comment (root-driven fluid; remove "sane defaults, not final").
4. Add the Layout block: `--measure: 34rem;` and
   `--gutter: clamp(var(--space-md), 4vw, var(--space-2xl));`.

**Verify:** file parses (build in Step 2 confirms); literals remain confined to
this file; no `--text-*` contains `vw` (grep — enforces the no-compounding
invariant).

## Step 2 — Apply the fluid root + add the shell (`base.css`)

**Do:**
1. Add `html { font-size: var(--root-font); }` alongside the existing reset.
2. Add the `.page` shell: `min-height: 100dvh; display: grid; place-items:
   center; padding-block: var(--space-xl); padding-inline: max(var(--gutter),
   env(safe-area-inset-left), env(safe-area-inset-right)); overflow-x: clip;`.
3. Add media guard `img, svg, video { max-width: 100%; height: auto; }`.

**Verify:** `npm run build` succeeds (first real build of the pair). No-literal
grep on `base.css` still clean (only new `var(--…)`, units, `env()`). Commit
**A** here: "Fluid root type scale + responsive page shell tokens/base".

## Step 3 — Mount the shell (`BaseLayout.astro`)

**Do:** wrap `<slot />` in `<div class="page">…</div>`; refresh the frontmatter
comment to describe the now-existing container (drop the "T-001-02-02 adds…"
future-tense note).

**Verify:** build succeeds; emitted `dist/index.html` shows `<div class="page">`
wrapping the page content.

## Step 4 — Simplify the page (`index.astro`)

**Do:**
1. Remove `main { display: grid; place-items: center; padding: … }` from the
   scoped style (superseded by `.page`).
2. `.clay-surface { max-width: 34rem }` → `max-width: var(--measure)`.
3. Leave copy, card padding, and text-role rules untouched.

**Verify:** build succeeds; no-literal grep on `index.astro` scoped styles clean
(the `34rem` literal is gone). Commit **B** here: "Move responsive container to
BaseLayout; tokenize card measure".

## Step 5 — Numeric sizing verification

**Do:** compute at 375px and 1920px (root basis 16px):
- root: `0.92rem+0.55vw` → 375: 16.8→**clamp 16px**; 1920: 25.3→**clamp 24px**.
- body `--text-base` (1rem): 375 = **16px** (≥16 ✓); 1920 = **24px** (> old 17.9 ✓).
- h1 `--text-3xl` (2.6rem): 375 = **41.6px** (≥ old min 38.4 ✓); 1920 = **62.4px**
  (> old cap 54.4 ✓).
- control `--control-height` (2.75rem): 375 = **44px** (≥44 ✓).

**Verify:** all four assertions hold (they do, by the values chosen in Design).
Record the table in `progress.md`.

## Step 6 — Contract greps on `dist/`

**Do / Verify:**
- `dist/` = `index.html` only; no `_worker.js`/server entry (static).
- `grep -RiE 'https?://|@import' dist` → no remote CSS/font (P6). *(Note: the
  page copy references a bare product name only; assert no external URL fetch.)*
- foundation-only: `dist/index.html` contains no demo/product-specific feature
  copy beyond the template's own baseline strings.

## Step 7 — Screenshots (the AC evidence)

**Do:**
1. `npm run build && npm run preview` (background); resolve the served port.
2. Headless Chrome:
   - phone: `--headless --screenshot=phone-375.png --window-size=375,812
     --hide-scrollbars=false --force-device-scale-factor=1 <url>`
     (scrollbars visible so a horizontal bar, if any, is caught).
   - projector: `--screenshot=projector-1920.png --window-size=1920,1080 <url>`.
3. Save both under `docs/active/work/T-001-02-02/`.

**Verify:** open both. Phone: card fits within 375px, no horizontal scrollbar,
tagline/lede readable, card not clipped at edges. Projector: heading and body
render visibly larger than phone (step-up working), block stays centered within
the measure, gutter present. Note results + any pixel measurements in
`progress.md` and summarize in `review.md`.

---

## Rollback / risk notes

- Each commit leaves the site buildable; Commit A is inert until Step 3 mounts
  the shell, so a sizing mistake is isolated to the token change and revertable
  alone.
- If the projector step-up reads too large/small in screenshots, the *only* knob
  to turn is `--root-font`'s slope/ceiling in `tokens.css` — no markup or
  per-selector change (proof the seam works). Document any such tune in progress.
- If `100dvh` misbehaves in the screenshot environment, `min-height: 100vh` is
  the safe fallback; note if used.

## Out of scope (restated, so it isn't scope-crept in Implement)

No JS, no dependency, no dark theme, no web-font loading, no copy rewrite beyond
foundation-only, no per-selector font sizes. Sibling/story boundaries per
`research.md`.
