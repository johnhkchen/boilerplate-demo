# Progress — T-001-02-01 establish-adaptable-design-tokens

Execution log for the Implement phase. Tracks what was completed against
`plan.md`, deviations, and verification evidence. Commit:
`805b0c9 — Establish adaptable design-token + primitive layer (T-001-02-01)`.

## Status: complete

All nine plan steps executed. Build green, static, no remote CSS, retheme
proven, dependency gate clean, dev smoke passed, committed.

## Step-by-step

| Step | Plan item | Status | Evidence |
|------|-----------|--------|----------|
| 1 | `tokens.css` (two-tier, all AC groups) | ✅ | `src/styles/tokens.css`; palette → semantic roles; color/type/spacing/radius/shadow/focus/control-size/motion + commented dark seam |
| 2 | `base.css` (base + primitives, token-only) | ✅ | `src/styles/base.css`; `:focus-visible` ring; `.clay-surface/.clay-button/.clay-chip/.clay-well` |
| 3 | `BaseLayout.astro` (import site + shell) | ✅ | `src/layouts/BaseLayout.astro`; imports tokens→base; `title`/`description` props; `<slot />` |
| 4 | Refactor `index.astro` onto layout | ✅ | inline `:root` + local `.clay-surface` removed; page styles now `var(--…)` |
| 5 | Build + static/no-remote/token asserts | ✅ | `mode: "static"`; `dist/` = `index.html` only; no `http`/`@import`/remote font; tokens present in emitted CSS |
| 6 | Retheme proof (+ revert) | ✅ | `--color-accent` → `#b3123c` propagated to output with no markup edit; reverted clean (0 crimson refs after) |
| 7 | No-literal + dependency gate | ✅ | no hex/rgb in `base.css`/`BaseLayout.astro`/`index.astro`; `dependencies: {}`; devDeps = astro (+ wrangler, from -01-02) |
| 8 | Dev smoke | ✅ | `localhost:4321` → 200, "Demo Runway", `clay-surface` rendered, tokens inlined |
| 9 | Commit (ticket files only) | ✅ | `805b0c9`; 3 new files + `index.astro`; concurrent -01-02 files untouched |

## Verification highlights

- **Static preserved:** build reported `output/mode: "static"`; `dist/` contains
  only `index.html` — no `_worker.js`, `functions/`, or `_routes.json`, even
  though the concurrently-landed Cloudflare adapter is now in the config.
- **No remote CSS at runtime:** Astro **inlined** the token+base CSS into a
  `<style>` block in `index.html` (small enough to inline). Zero `http(s)://`
  URLs, zero `@import`, zero remote font references in `dist/`. Satisfies the AC
  clause directly — the check is for *absence of remote fetches*, and an inlined
  `<style>` is same-origin by definition (plan risk note anticipated this).
- **Retheme proof (headline AC):** editing one semantic token
  (`--color-accent`) in `tokens.css` changed the emitted color from steel
  `#44679b` to crimson `#b3123c` with **no edit to any markup**; revert restored
  the baseline. "Change tokens, not structure" demonstrated end-to-end.
- **No-literal invariant:** `base.css`, `BaseLayout.astro`, and `index.astro`
  scoped styles contain no hex/rgb/hsl color literals — every value resolves via
  `var(--…)`. This is the structural guarantee the retheme keeps working.

## Deviations from plan

1. **Environment shifted mid-flight (concurrent thread).** T-001-01-02
   (Cloudflare deploy) landed on the shared branch during this ticket: `package.json`
   now also carries `wrangler`, and `astro.config.mjs` references an adapter.
   *Impact on this ticket: none.* My change adds no dependency and no config
   edit; the build still emits fully static output. I staged **only** this
   ticket's four files (rdspi concurrency: commit serialization via the shared
   branch; do not sweep another thread's work into this commit).

2. **CSS delivered inline, not as a linked `_astro/*.css`.** Astro chose to
   inline the small stylesheet. This was anticipated in `plan.md` (Step 5 risk)
   and fully satisfies "loads no remote CSS at runtime." No action needed; if a
   future page grows the CSS past Astro's inline threshold it will emit a
   same-origin hashed `<link>`, still non-remote.

## Nothing outstanding for this ticket

Responsive 375px/projector verification, layout container rules, real
button/input components, web-font vendoring, and a live dark theme are
deliberately deferred (see `design.md` "Out of scope"; T-001-02-02 owns the
responsive half). No blocked work, no TODO left in code.
