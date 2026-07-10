# Design — T-001-01-01 astro-static-scaffold

Decisions grounded in `research.md`. This ticket produces the smallest honest
Astro project that builds to a fully static `dist/`, serves an index page in
dev, and keeps `package.json` to astro + tooling only.

## Decision summary

| # | Question | Decision |
|---|----------|----------|
| D1 | How to scaffold | **Hand-author** a minimal file set (not `create astro`) |
| D2 | Rendering mode | **`output: 'static'` asserted explicitly** in config |
| D3 | Dependencies | **`astro` only** as a devDependency; no other runtime/dev deps |
| D4 | TypeScript tooling | **Include `tsconfig.json`** (astro base) but **no** `typescript`/`@astrojs/check` dep yet |
| D5 | The one page | **One `src/pages/index.astro`**, real on-brand copy, self-contained |
| D6 | Visual identity | **Inline claymorphism tokens** from the b28 palette; no vendored kit, no network |
| D7 | Ignore/meta files | `.gitignore` (node_modules, dist, .astro) + `astro/` types via `.astro/` |

---

## D1 — Hand-author vs. `npm create astro`

**Options.** (a) Run `npm create astro@latest` and prune. (b) Hand-author the
four or five files a static Astro project actually needs.

**Chosen: (b) hand-author.** The official starter injects choices this ticket
must *not* make: a `@astrojs/*` starter may pull example components, a README,
sometimes Tailwind/UI prompts, and a broader `package.json`. The AC is a
minimalism gate (N1/N5) — every file must be defensible. A static Astro build
needs only: `package.json`, `astro.config.mjs`, `src/pages/index.astro`, plus
`tsconfig.json` and `.gitignore`. Hand-authoring makes the scaffold auditable at
a glance and avoids pruning noise that reads as leftover template cruft.

**Rejected: (a).** Faster to type but yields a larger, less-defensible surface
and risks a stray UI/CSS dependency slipping into `package.json` — a direct
acceptance failure. The whole point of the ticket is a *deliberate* substrate,
not a generated one.

## D2 — Rendering mode: explicit `output: 'static'`

**Options.** (a) Empty/near-empty `astro.config.mjs`, relying on static being
Astro's default. (b) Explicitly set `output: 'static'`.

**Chosen: (b) explicit.** Research established that static output is
*load-bearing* — it is what delivers "no compute cold start" and "idle hosting
effectively free" (P6, spec non-goals), and it is re-asserted by T-001-01-02's
AC ("static assets, no compute cold start"). Making it explicit documents intent
at exactly the file that -02 will edit to add the Cloudflare adapter, so the next
ticket adds an adapter *without* silently flipping to SSR. Self-documenting
config beats an invisible default here.

**Rejected: (a).** Correct behavior, but the default is invisible; a later edit
could switch rendering with no visible diff against an explicit baseline.

## D3 — Dependencies: `astro` only

**Options.** (a) `astro` alone. (b) `astro` + `prettier`/`eslint`. (c) `astro` +
`typescript` + `@astrojs/check`.

**Chosen: (a).** The AC says "astro and tooling only," and the charter admits
tooling "only where repeated evidence earns" it (N2/guardrails). Formatting,
linting, type-checking, and Playwright are all named in the product spec's
*agent-and-teammate workflow* surface — i.e. they belong to later tickets/stories
about the contributor loop, not to this substrate ticket. Adding them here would
be framework-by-inertia in miniature. Keep the dependency list to exactly one
line so the acceptance grep is trivially clean.

**Rejected: (b)/(c).** Each is defensible tooling, but none is needed to satisfy
*this* ticket, and each expands the surface a reviewer must justify. Defer to the
ticket that actually wires the check into CI/PR validation.

## D4 — `tsconfig.json` without a `typescript` dependency

**Options.** (a) No tsconfig at all. (b) `tsconfig.json` extending
`astro/tsconfigs/base`, but no `typescript`/`@astrojs/check` dependency.
(c) tsconfig + full TS toolchain.

**Chosen: (b).** `astro/tsconfigs/base` ships *inside* the `astro` package, so
referencing it adds **no new dependency**. Its presence gives editors and the
Astro language server correct IntelliSense for `.astro` files from the first
commit and establishes the strictness baseline later tickets tighten — a free
ergonomic win that doesn't touch the dependency gate. Actual `astro check`
type-checking (which *does* need the `typescript`/`@astrojs/check` deps) is
deferred to D3's later tooling ticket.

**Rejected: (a)** loses editor support for no gain. **(c)** pulls deps this
ticket explicitly defers.

## D5 — The one index page

**Options.** (a) Astro's default placeholder page. (b) A near-empty `<h1>`.
(c) A single self-contained `index.astro` with real, on-brand landing copy.

**Chosen: (c).** Per user-global brand voice, the visible page is *real
deliverable copy*, not a placeholder — a parlor, not a portfolio: plain
kitchen-table English, the grabbable name **"Demo Runway,"** and a label that
orients by what you'd *do* with it ("The starting line every demo inherits").
The page states plainly that it's the working starting point and that the live
URL and deploy-on-push arrive next — honest about the runway without narrating
internal ticket state (charter: no template planning leakage into shipped pages).
Kept to a single file (no layout/component split) because one page doesn't earn
an abstraction yet (N1 — the idea drives structure, not the scaffold).

**Rejected: (a)** ships vendor placeholder copy that violates brand voice.
**(b)** wastes the one legible surface P1 hands to the team.

## D6 — Visual identity: inline tokens, no vendored kit

**Options.** (a) Ship near-unstyled HTML. (b) Vendor `b28-clay.css` from
`https://b28.dev/kit/b28-clay.css`. (c) Inline a small set of claymorphism tokens
+ styles scoped to the page, using the b28 palette.

**Chosen: (c).** This resolves the tension research surfaced. The user-global
visual identity asks every frontend to read as one family (sincere claymorphism,
steel blue `#44679b` on warm off-white `#faf8f5`, ink `#1c1917`, Lora + Karla,
one top-left light source, warm ink-tinted shadows). Inlining a handful of CSS
custom properties and a couple of `.clay-surface`/`.clay-button`-flavored styles
in the page's `<style>` block honors that identity **without** adding a CSS
*framework dependency* (AC-clean) and **without** a build-time/runtime network
fetch (the kit's own guidance says offline single-file contexts vendor rather
than runtime-link; this scaffold has no `just sync-kit` step yet). Fonts:
reference Lora/Karla via system-safe `font-family` stacks with graceful
fallback — no web-font network dependency at this stage. The result is
projector-legible and mobile-first (spec P3) while staying a thin, replaceable
surface a stakeholder's Figma direction can later override.

**Rejected: (b)** introduces an external fetch and more bytes than a substrate
ticket warrants, and there's no vendoring pipeline to keep it in sync yet.
**(a)** abandons the brand's "one family" identity on the very first page for no
real minimalism gain — a few inline tokens cost almost nothing.

## D7 — Ignore and generated-type files

`.gitignore` excludes `node_modules/`, `dist/` (build output — never
committed), and `.astro/` (generated types cache). This keeps the committed tree
to source only and prevents the built `dist/` from polluting later deploy
tickets' diffs.

## Explicitly out of scope (deferred to the ticket chain)

- Cloudflare adapter, `wrangler.*`, any SSR/edge compute → **T-001-01-02**.
- CI, GitHub Actions, deploy secrets → **T-001-01-03**.
- Formatting/linting/type-check tooling and Playwright → later
  contributor-workflow story.
- Design-system kit vendoring (`just sync-kit`, full `b28-clay.css`) → whenever
  a richer UI earns it.
