# Progress — T-001-01-01 astro-static-scaffold

Execution log for the Implement phase. Steps map to `plan.md`.

## Completed

- **Step 1 — manifest + config trio.** Created `package.json` (type: module,
  private, scripts dev/build/preview/astro, single devDependency `astro@^5.13.0`),
  `astro.config.mjs` (`defineConfig({ output: 'static' })`, no adapter),
  `tsconfig.json` (`extends astro/tsconfigs/base`). ✓
- **Step 2 — `.gitignore`.** Created with `dist/`, `node_modules/`, `.astro/`,
  and `.DS_Store` (added the macOS entry to keep the tree clean). ✓
- **Step 3 — index page.** Created `src/pages/index.astro`: single semantic
  landing page, inline claymorphism `<style>` on the b28 palette (steel
  `#44679b`, off-white `#faf8f5`, cream `#f2efe9`, ink `#1c1917`), Lora/Karla
  font stacks with system fallbacks (no remote font fetch), mobile-first
  viewport, projector-legible clamp() type scale. On-brand copy: name "Demo
  Runway," do-oriented tagline "The starting line every demo inherits," one
  honest plain-English lede. No imports/scripts/external links. ✓
- **Step 4 — install.** `npm install` exited 0; `package-lock.json` generated
  (committed); `node_modules/astro` present and correctly gitignored. ✓
- **Step 5 — build + static assertion.** `npm run build` exited 0; log shows
  `output: "static"`, `mode: "static"`; produced `dist/index.html` only.
  Server-entry check found **no** `_worker.js`, `_routes.json`, or `functions/`
  — fully static, no adapter compute. `dist/index.html` contains the page copy. ✓
- **Step 6 — dev smoke.** `npm run dev` served `http://localhost:4321/` →
  HTTP 200 with "Demo Runway" and the tagline present. Server started, probed,
  and stopped (bounded). ✓
- **Step 7 — dependency gate.** Grep of `package.json` for react/vue/svelte/
  solid/preact/tailwind/next/remix/prisma/drizzle/mongoose/auth/clerk/supabase/
  contentful/sanity/strapi → **no matches**. `dependencies: null`,
  `devDependencies: { astro }` only. N1/N5 satisfied. ✓
- **Step 8 — commit.** Staged scaffold source + lockfile only. See deviations.

## Deviations from plan

1. **Commit scope narrowed to scaffold source only.** The repo's `docs/`,
   `CLAUDE.md`, `AGENTS.md`, `SEED.md`, `.lisa*`, and `.vend/` were already
   untracked at session start (the initial commit did not include them; Lisa/
   Vend manage that state). Committing them would be out of scope and could
   entangle template-governance material with the scaffold. Staged only:
   `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`,
   `.gitignore`, `src/pages/index.astro`. `dist/`, `node_modules/`, `.DS_Store`
   deliberately excluded.
2. **RDSPI work artifacts not force-committed.** Left the `docs/active/work/
   T-001-01-01/*.md` artifacts on disk (untracked, like the rest of `docs/`) so
   Lisa can detect them for phase transitions without pulling the whole
   untracked docs tree into the scaffold commit.
3. **Single scaffold commit** rather than three sub-commits — the files form one
   indivisible "does it build static" unit; plan Step 8 permitted this.

## Notes carried to Review

- `npm audit` reports Astro advisories (1 high, 1 low). None of the affected
  code paths (`define:vars`, server islands, slot names, spread props, host-
  header SSRF on error pages) are exercised by this static single page; the
  esbuild item is dev-server-on-Windows only. The fix is `astro@7` — a breaking
  major beyond this ticket's scope. Flagged for a follow-up tooling decision.
