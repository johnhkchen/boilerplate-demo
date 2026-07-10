# Review — T-001-02-01 establish-adaptable-design-tokens

Handoff for a human reviewer. What changed, how it was verified, and what to
watch. Commit: `805b0c9 — Establish adaptable design-token + primitive layer
(T-001-02-01)`.

## What changed

Promoted the proto-token block that T-001-01-01 inlined in `index.astro` into a
documented, template-owned style layer that a new base layout imports. Three
files created, one modified; nothing deleted.

| File | Change | Purpose |
|------|--------|---------|
| `src/styles/tokens.css` | **new** | The single retheme surface. Two tiers: raw `--b28-*` palette → semantic roles. Documents color, type scale, spacing, radius, shadow, focus, and control-size tokens (+ motion, + a commented dark-theme seam). Literal values live only here. |
| `src/styles/base.css` | **new** | Element base styles, a global `:focus-visible` ring, reduced-motion guard, and the clay primitives (`.clay-surface`, `.clay-button`, `.clay-chip`, `.clay-well`). Every value is `var(--…)` — no literals. |
| `src/layouts/BaseLayout.astro` | **new** | The document shell and single import site for the token layer; `title`/`description` props; renders `<slot />`. The seam every page inherits and where T-001-02-02 adds responsive layout. |
| `src/pages/index.astro` | **modified** | Renders inside `BaseLayout`; dropped the inline `:root` tokens and local `.clay-surface`; remaining page styles rewritten to consume tokens. Copy unchanged. |

**Not committed (by design):** the concurrently-landed T-001-01-02 files
(`wrangler` dep, adapter config, any `wrangler.jsonc`) — already committed by
that thread; and the pre-existing untracked governance tree (`docs/`, `CLAUDE.md`,
`.lisa*`, `.vend/`, `.codex/`, `AGENTS.md`, `SEED.md`), managed outside this
commit.

## Acceptance criteria — verdict: MET

The AC is one compound clause; each sub-condition mapped to evidence:

| Sub-clause | Evidence |
|-----------|----------|
| Base layout imports a local stylesheet | `BaseLayout.astro` frontmatter `import '../styles/tokens.css'; import '../styles/base.css';` |
| …defines documented color, type, spacing, radius, focus, control-size tokens | `tokens.css` — each group present and comment-headed; all six AC-named axes covered (plus shadow/motion already load-bearing) |
| Rendered page uses those tokens instead of browser defaults | `index.astro` styles resolve `var(--…)`; emitted `dist/index.html` carries the custom properties and applies them (steel accent, clay card, focus ring) |
| Loads no remote CSS at runtime | `dist/` grep: **no** `http(s)://`, **no** `@import`, **no** remote font. CSS is inlined into a same-origin `<style>` |
| Rethemable by changing tokens, not structure | Single-token edit (`--color-accent` → `#b3123c`) propagated to output with **zero markup change**; reverted clean. No-literal invariant in consumers backs this |
| No new dependency (N5) | `dependencies: {}`; this ticket added no package; still plain CSS |
| Advances P3 | Type-scale, `--control-height` (44px touch target), and focus tokens are the foundation T-001-02-02 turns into verified responsive behavior |

## Test coverage

No unit/integration tests were added — the correct call, matching the precedent
set by T-001-01-01. This ticket introduces **no product logic**: it is a token +
CSS layer whose "current truth" is a build/serve/retheme contract. That contract
was exercised directly:

- **Build assertion** — `mode: "static"`, `dist/` = `index.html` only, no server
  entry. Passed.
- **No-remote-CSS assertion** — grep `dist/` for `http`/`@import`/remote font →
  none. Passed.
- **Token-consumption assertion** — token custom properties present in emitted
  CSS and applied. Passed.
- **Retheme proof** — one-token edit propagates, revert restores. Passed.
- **No-literal invariant** — no hex/rgb in `base.css`/`BaseLayout.astro`/
  `index.astro` scoped styles. Passed.
- **Dev smoke** — `localhost:4321` → 200, "Demo Runway", styled. Passed.

**Coverage gaps (intentional, owned by later tickets):**
- No Playwright / visual-regression on the rendered tokens → contributor-workflow
  / testing story; T-001-02-02 adds the 375px + projector **screenshot**
  verification that naturally exercises the type/spacing/control tokens.
- No automated lint asserting the no-literal invariant → currently a review-time
  grep. A `stylelint` rule (`declaration-property-value-disallowed-list` for raw
  colors outside `tokens.css`) would make it machine-checkable; belongs to the
  tooling/lint ticket, not here (N5 — no lint dep introduced by inertia).

## Open concerns / flags for human attention

1. **Type-scale ownership boundary with T-001-02-02 (low, by design).** This
   ticket ships fluid `clamp()` `--text-*` defaults. The *verified* projector +
   phone sizing (screenshots at 375px and projection scale) is T-001-02-02's AC.
   If -02-02 needs different breakpoints or step ratios, it should tune the
   `--text-*` / `--space-*` **token values** (that is the seam working as
   intended) rather than add per-selector sizes. Flagged so the two tickets stay
   coordinated.

2. **CSS is inlined, not linked (informational).** Astro inlined the small
   stylesheet into `<head>`. This satisfies "no remote CSS" and is fastest for a
   one-page baseline (no extra request). As pages/CSS grow past Astro's inline
   threshold it will emit a same-origin hashed `<link>` — still non-remote, but
   reviewers comparing bundles across tickets should expect that transition.

3. **Fonts still declared, not loaded (carried from -01-01 concern #2).** Lora/
   Karla remain `font-family` names with system fallbacks; no web-font is
   fetched (deliberate — "no remote CSS at runtime" covers font CSS). Real
   Lora/Karla vendoring is a later design-system ticket. The token
   (`--font-display`/`--font-body`) is the seam that swap will use.

4. **Dark theme is structured but not shipped.** `tokens.css` has a commented
   `:root[data-theme="dark"]` seam. Because surfaces reference only semantic
   roles, enabling dark later is a value remap, not a rewrite — no code change
   in `base.css` or pages. Not in scope here.

## Downstream readiness

- **T-001-02-02 (responsive typography/layout):** inherits `BaseLayout.astro`
  as its layout home and tunes/consumes the `--text-*`/`--space-*`/`--control-*`
  tokens. Clean seam — no conflicting file with this commit beyond the shared
  layout it will extend.
- **Integration harness (buttons/inputs):** `--control-*` tokens and
  `.clay-button` are ready to back real controls; the 44px min-height touch
  target and `:focus-visible` ring are already in place (P3).
- **Figma retheme (Day-2 design direction):** the whole point — a designer or
  agent edits `tokens.css` role values (or swaps the `--b28-*` palette) and
  every surface follows. Proven end-to-end.

**Bottom line:** acceptance met and verified end-to-end (static, no remote CSS,
retheme proven, dependency gate clean), no product logic to unit-test, no
blocking concerns. Ready to advance.
