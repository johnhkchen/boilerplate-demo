# Plan — T-001-02-01 establish-adaptable-design-tokens

Ordered, individually verifiable steps implementing `structure.md`. Each step is
small enough to reason about; commits are grouped so the tree is coherent at
each commit. Verification is explicit per step and consolidated against the
ticket's acceptance criterion at the end.

## Testing strategy

This ticket adds **no product logic** — it is a styling/token layer. As with
T-001-01-01, the right verification is exercising the build/serve contract and
the AC's specific invariants, not unit tests (there is no function to assert):

- **Build assertion (primary):** `npm run build` exits 0 and emits a static
  `dist/` whose HTML links a **same-origin** bundled stylesheet — no adapter
  compute regression (still `output: 'static'`).
- **No-remote-CSS assertion:** grep the built `dist/` CSS + HTML for
  `http://`, `https://`, `@import`, `//fonts.` → **no external stylesheet or
  font fetch**. Directly proves the AC clause "loads no remote CSS at runtime."
- **Token-consumption assertion:** the emitted CSS contains the token custom
  properties (e.g. `--color-accent`, `--space-`, `--control-height`,
  `--focus-ring`), and the page's rendered rules resolve them — proving "uses
  those tokens instead of browser defaults."
- **Retheme proof (the headline AC):** change ONE semantic token value in
  `tokens.css` (e.g. `--color-accent`), rebuild, confirm the emitted CSS/color
  changes with **no markup edit**; then revert. Demonstrates "retheme by
  changing tokens rather than rewriting semantic structure."
- **No-literal invariant:** grep `base.css`, `BaseLayout.astro`, and
  `index.astro`'s scoped styles for hex colors → clean (all via `var(--…)`).
- **Dependency-gate:** `devDependencies` still `{ astro }`; no new package.
- **Dev smoke:** `npm run dev` serves the index page 200 with expected copy,
  styled (tokens applied).
- Playwright / responsive screenshots belong to **T-001-02-02**; not here.

## Steps

### Step 1 — Author `src/styles/tokens.css`

Create the two-tier token file per structure §`tokens.css`: raw `--b28-*`
palette, then semantic roles, then type / spacing / radius / shadow / focus /
control-size / motion groups, each comment-headed, plus the commented dark-theme
seam. Literal values live **only** here.

**Verify:** file present; valid CSS (no unclosed blocks); every AC-named group
(color, type, spacing, radius, focus, control-size) has tokens; semantic roles
reference `--b28-*`.

### Step 2 — Author `src/styles/base.css`

Create element base (box-sizing, body bg/color/font, headings), the global
`:focus-visible` ring, reduced-motion guard, and the four clay primitives
(`.clay-surface`, `.clay-button`, `.clay-chip`, `.clay-well`). Every value a
`var(--…)`.

**Verify:** grep `base.css` for `#` hex and raw color literals → none; each
primitive references only tokens; `:focus-visible` present.

### Step 3 — Author `src/layouts/BaseLayout.astro`

Create the layout: frontmatter imports `tokens.css` then `base.css`, accepts
`title` + optional `description` props; markup is the `<html lang="en">` shell
(`<head>` meta/title/description/icon) with `<body><slot /></body>`.

**Verify:** file present; imports in tokens→base order; props typed; single
`<slot />`.

### Step 4 — Refactor `src/pages/index.astro` onto the layout

Replace the hand-rolled `<html>/<head>/<body>` with `<BaseLayout>` wrapping the
existing `<main><section class="clay-surface">` copy (wording unchanged). Delete
the inline `:root` token block and the local `.clay-surface` rule. Rewrite the
remaining page-scoped selectors (`.eyebrow`, `.tagline`, `.lede`, `main`
centering) to reference tokens.

**Verify:** no `:root` block or hex literals remain in `index.astro`; page still
renders the same copy; `.clay-surface` now resolves from `base.css`.

### Step 5 — Build + static/no-remote/token assertions

Run `npm run build`.

**Verify (primary AC evidence):**
- exit 0; `dist/index.html` present; still static (no `_worker.js`/functions).
- `dist/index.html` links a same-origin bundled stylesheet (or inlined
  `<style>`); grep dist for `http`/`@import`/`//fonts.` → no remote CSS/font.
- emitted CSS contains the token custom properties and the page rules resolve
  them. Capture listings for `review.md`.

### Step 6 — Retheme proof (and revert)

Temporarily change `--color-accent` (and/or `--radius-lg`) in `tokens.css`,
rebuild, diff the emitted CSS to show the value propagated with **zero markup
change**; then revert the token and rebuild clean.

**Verify:** the single-token edit changes rendered output; reverting restores
baseline. Record before/after in `review.md`. This is the headline AC.

### Step 7 — No-literal + dependency-gate checks

Grep `base.css`, `BaseLayout.astro`, and `index.astro` scoped styles for hex
colors → clean (values via `var`). Confirm `package.json` `devDependencies`
still `{ astro }`; no new dep, no config change.

**Verify:** no stray literals in the consuming files; dependency gate clean.

### Step 8 — Dev smoke

Start `npm run dev` bounded (start, probe, stop). Probe the printed localhost URL.

**Verify:** 200 with expected `<h1>`/title copy; page visibly styled (tokens
applied — steel accent, clay card). Stop the server.

### Step 9 — Commit

Stage the three new files + the modified `index.astro`; commit on `main` with a
message describing the token layer + base layout. `dist/`, `node_modules/`
remain untracked.

**Verify:** `git status` clean except intended tracked files; commit present.

## Consolidated acceptance mapping

| Acceptance clause | Verified by |
|---|---|
| Base layout imports a local stylesheet | Step 3 (`BaseLayout` imports `tokens.css`/`base.css`) |
| Defines documented color/type/spacing/radius/focus/control-size tokens | Step 1 (each group present + commented) |
| Rendered page uses those tokens instead of browser defaults | Steps 4, 5 (page rules resolve `var(--…)`; emitted CSS carries them) |
| Loads no remote CSS at runtime | Step 5 (grep dist: no `http`/`@import`/remote font) |
| Rethemable by changing tokens, not structure | Step 6 (single-token edit propagates; no markup change) + Step 7 (no literals in consumers) |
| No new dependency / N5 | Step 7 (`devDependencies = { astro }`) |
| Advances P3 | Type-scale, control-size, focus tokens are the foundation -02-02 turns into verified responsive behavior |

## Rollback / risk notes

- **Scope creep into -02-02.** Risk: over-tuning the type scale / adding layout
  rules that belong to the responsive ticket. Mitigation: define token *values*
  and the seam; leave verified 375px/projector behavior and layout rules to
  -02-02 (design boundary).
- **Hidden literal.** Risk: a hardcoded color slips into `base.css`, silently
  breaking the retheme guarantee. Mitigation: Step 7 grep is the backstop; the
  tokens/base split (D3) makes it visible in review.
- **Astro inlines the CSS.** Small sheets may be inlined into `<style>` rather
  than linked. That is still same-origin and satisfies "no remote CSS" — the
  assertion checks for *absence of remote* fetches, not for a `<link>`.
- **Regression of the static contract.** Mitigation: Step 5 re-asserts no
  `_worker.js`/functions; no config change is made.
- Rollback is reverting one commit (the refactor is additive + a single page
  edit); the pre-existing inline styling is recoverable from history.
