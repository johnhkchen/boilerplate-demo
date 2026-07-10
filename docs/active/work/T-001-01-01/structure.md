# Structure — T-001-01-01 astro-static-scaffold

The file-level blueprint implementing the `design.md` decisions. Not code — the
shape of the code. All paths relative to repo root.

## Files created

```
package.json            # project manifest; astro-only dependency; scripts
astro.config.mjs        # explicit output: 'static'; no adapter
tsconfig.json           # extends astro/tsconfigs/base (no new dependency)
.gitignore              # node_modules/, dist/, .astro/
src/
  pages/
    index.astro         # the one page: on-brand landing, self-contained styles
```

No files modified. No files deleted. This is additive greenfield scaffolding on
a repo that currently has no application code.

## Files intentionally NOT created (deferred — see design D-table)

- `wrangler.jsonc` / Cloudflare adapter config → T-001-01-02
- `.github/workflows/*` → T-001-01-03
- `.prettierrc`, `.eslintrc`, `playwright.config.*` → contributor-workflow story
- `src/layouts/`, `src/components/` → not earned by a single page (N1)
- `public/` → not required for the scaffold; add when a static asset needs it
- `package-lock.json` is *generated* by `npm install` during Implement and
  committed (locks the astro version for reproducible later builds); it is not
  hand-authored.

## Public interface / contract this ticket establishes

The scaffold's "interface" is the set of npm scripts and the build contract that
downstream tickets (-02 deploy, -03 CI) and contributors depend on:

- `npm run dev` → Astro dev server serves the index page locally (AC: "dev
  server serves an index page locally").
- `npm run build` → emits a **fully static** `dist/` (AC: "no server-rendered
  routes, no adapter compute"). Output is plain HTML + assets.
- `npm run preview` → serves the built `dist/` for local verification.
- `npm run astro` → passthrough to the Astro CLI (needed by later tickets, e.g.
  `astro add` for the Cloudflare adapter in -02).

Keeping these four scripts stable is the seam -02/-03 build on.

## File-by-file specification

### `package.json`

- `"name"`: kebab project name (e.g. `demo-runway`).
- `"type": "module"` — Astro config and tooling use ESM.
- `"version": "0.0.1"`, `"private": true` — not a published package.
- `"scripts"`: `dev`, `build`, `preview`, `astro` mapping to `astro dev`,
  `astro build`, `astro preview`, `astro`.
- `"devDependencies"`: **exactly one** entry — `astro` (^5). No `dependencies`
  block, no UI/CSS/DB/auth/CMS entries. This single line is what the acceptance
  grep inspects.
- No `engines` pin required (local Node v26 ≫ Astro's minimum); omit to avoid
  false constraints on contributors/CI.

Ordering note (rdspi concurrency): this is the file -02 edits to add
`@astrojs/cloudflare`. Leaving a clean, minimal manifest now minimizes that
future diff.

### `astro.config.mjs`

- `import { defineConfig } from 'astro/config'`.
- `export default defineConfig({ output: 'static' })`.
- No `adapter`, no `integrations`, no `vite` overrides. The explicit `output`
  is the self-documenting anchor D2 called for; -02 adds an `adapter` key
  beside it.

### `tsconfig.json`

- `{ "extends": "astro/tsconfigs/base" }`, nothing more.
- `astro/tsconfigs/base` resolves from the `astro` package already in
  `node_modules` — adds no dependency (D4). Gives editors/language-server correct
  `.astro` IntelliSense and the strictness baseline later tickets tighten.

### `.gitignore`

Three ignore lines that matter for this repo:

- `node_modules/` — never committed.
- `dist/` — build output; must not pollute deploy-ticket diffs.
- `.astro/` — Astro's generated content/type cache.

(Existing repo has no prior `.gitignore`; this creates it. Environment-var
templates like `.env` handling belong to the secrets/deploy tickets, not here.)

### `src/pages/index.astro`

Single self-contained file — three parts:

1. **Frontmatter fence** (`---`…`---`): empty or a small `const` or two for
   copy strings. No data fetching, no imports (keeps it one static file).
2. **Markup**: one semantic landing page — `<html lang="en">` with a proper
   `<head>` (charset, viewport for mobile-first per P3, `<title>` and
   `<meta name="description">` following brand voice), and a `<body>` with a
   single centered "clay surface" card:
   - Name: **Demo Runway** (grabbable, per brand voice).
   - One-line label oriented by what you'd do: e.g. "The starting line every
     demo inherits."
   - A short plain-English sentence: this is the working starting point; the
     live public URL and deploy-on-push land next. Honest about the runway, no
     internal ticket/planning references (charter: no template-planning leakage).
   - No external links, no forms, no scripts.
3. **Scoped `<style>`**: inline claymorphism per D6 —
   - `:root` custom properties for the b28 palette (steel blue `#44679b`,
     off-white `#faf8f5`, cream `#f2efe9`, ink `#1c1917`) and radii/shadow
     tokens (one top-left light source, warm ink-tinted shadow — not flat gray).
   - `font-family` stacks naming Lora (display/heading) and Karla (body) with
     system fallbacks; **no** web-font `@import`/`<link>` (no network dep).
   - A `.clay-surface`-style card and legible, high-contrast, projector-readable
     type scale; responsive via relative units and a `max-width` centered layout.
   - `prefers-color-scheme` is optional-nice but not required; keep light-first
     to match the warm off-white identity.

## Build/verify contract (drives the Plan phase)

- After `npm install`, `npm run build` must exit 0 and produce
  `dist/index.html` (a real static HTML file) with **no** `_worker.js`,
  functions, or server entry in `dist/` (proof of static-only output).
- `npm run dev` must serve the index page at the printed localhost URL.
- `grep` for a UI/CSS framework name (`react`, `vue`, `svelte`, `tailwind`,
  etc.) and for DB/auth/CMS packages across `package.json` returns nothing.

## Change ordering

1. `package.json` → 2. `astro.config.mjs` → 3. `tsconfig.json` →
4. `.gitignore` → 5. `src/pages/index.astro` → 6. `npm install` (generates
`package-lock.json`) → 7. `npm run build` verify → 8. `npm run dev` smoke →
9. commit. Detailed in `plan.md`.
