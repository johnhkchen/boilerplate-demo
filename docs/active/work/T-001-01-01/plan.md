# Plan — T-001-01-01 astro-static-scaffold

Ordered, individually verifiable steps implementing `structure.md`. Each step is
small enough to reason about; commits are grouped so the tree is coherent at
each commit. Verification criteria are explicit per step and consolidated at the
end against the ticket's acceptance criterion.

## Testing strategy

This ticket adds no product logic, so there are **no unit tests** to write — the
right verification is exercising the build/dev contract itself (the spec's
"tests carry current truth" applies to logic; a scaffold's truth is that it
builds static and serves):

- **Build assertion (primary):** `npm run build` exits 0 and produces a static
  `dist/index.html` with **no** server entry (`_worker.js`, `_functions`, or an
  SSR entry) present — proving `output: 'static'` with no adapter compute.
- **Dev smoke:** `npm run dev` starts and the index page responds 200 with the
  expected on-brand copy at the printed localhost URL.
- **Dependency-gate assertion:** grep `package.json` for UI/CSS/DB/auth/CMS
  package names → no matches; `devDependencies` contains only `astro`.
- Playwright / CI smoke belong to later tickets (spec agent-workflow surface);
  not introduced here.

## Steps

### Step 1 — Author the manifest and config trio

Create `package.json`, `astro.config.mjs`, `tsconfig.json` per structure spec.

- `package.json`: `type: module`, `private: true`, scripts (dev/build/preview/
  astro), single devDependency `astro` (^5).
- `astro.config.mjs`: `defineConfig({ output: 'static' })`, no adapter.
- `tsconfig.json`: `{ "extends": "astro/tsconfigs/base" }`.

**Verify:** files exist and are valid JSON/JS (JSON parses; config is ESM). No
install yet, so no build.

### Step 2 — Author `.gitignore`

Create `.gitignore` with `node_modules/`, `dist/`, `.astro/`.

**Verify:** file present; entries cover generated/installed artifacts so the
next `npm install` and build won't stage noise.

### Step 3 — Author the index page

Create `src/pages/index.astro`: semantic landing page + inline claymorphism
`<style>` (b28 palette tokens, Lora/Karla font stacks with system fallback,
mobile-first viewport, projector-legible type). On-brand copy: name "Demo
Runway," a do-oriented label, one honest plain-English sentence. No imports, no
scripts, no external links/fonts.

**Verify:** file present; content matches brand-voice and no-network-dependency
constraints (no `<link rel="stylesheet">`/`@import` to remote fonts).

### Step 4 — Install dependencies

Run `npm install`. Generates `node_modules/` (ignored) and
`package-lock.json` (committed — locks the astro version for reproducible -02/-03
builds).

**Verify:** install exits 0; `package-lock.json` created; `node_modules/astro`
present. `node_modules/` NOT staged (gitignore working).

### Step 5 — Build and assert static output

Run `npm run build`.

**Verify (primary AC evidence):**
- exit 0;
- `dist/index.html` exists and is real static HTML containing the page copy;
- `dist/` contains **no** `_worker.js`, `_routes.json`, `functions/`, or SSR
  entry — i.e. static-only, no adapter compute. Capture the `dist/` listing as
  evidence for `review.md`.

### Step 6 — Dev-server smoke

Start `npm run dev` (bounded: start, probe, stop — do not leave running). Probe
the printed localhost URL.

**Verify:** dev server starts; index route returns 200 with the expected `<h1>`/
title copy. Record the result; stop the server.

### Step 7 — Dependency-gate check

Grep `package.json` (and `package-lock.json`'s top-level deps) for `react`,
`vue`, `svelte`, `solid`, `preact`, `tailwind`, `@tailwindcss`, and common DB/
auth/CMS package markers.

**Verify:** no matches; `devDependencies` = `{ astro }` only. This is the direct
N1/N5 acceptance gate.

### Step 8 — Commit

Stage source + `package-lock.json` (not `node_modules/`, not `dist/`) and commit
on `main` with a message describing the scaffold. Incremental-commit guidance
(rdspi Implement) is satisfied by one coherent commit here since the files form
a single indivisible "does it build static" unit; if authored in stages, commit
config+ignore first, then the page, then the lockfile — but a single scaffold
commit is acceptable and cleaner for a greenfield add.

**Verify:** `git status` clean except intended tracked files; `dist/` and
`node_modules/` untracked; commit present.

## Consolidated acceptance mapping

| Acceptance clause | Verified by |
|---|---|
| Astro build completes | Step 5 exit 0 |
| Emits fully static `dist/` (no SSR routes, no adapter compute) | Step 5 dist listing: `index.html` present, no `_worker.js`/functions |
| Dev server serves an index page locally | Step 6 dev smoke 200 |
| `package.json` declares no UI/CSS/DB/auth/CMS deps — astro + tooling only | Step 7 grep clean; devDependencies = astro |
| N1/N5 respected | Steps 1 & 7 (single-dep manifest, no framework-by-inertia) |
| Advances P1 | Scaffold is the substrate the public URL (-02) builds on |

## Rollback / risk notes

- Greenfield add — rollback is deleting the created files; no existing behavior
  to regress.
- Risk: an Astro major bump changing the static-build default. Mitigated by the
  explicit `output: 'static'` (D2) and the committed lockfile (Step 4).
- Risk: accidental transitive UI framework via a starter — avoided by
  hand-authoring (D1); the grep in Step 7 is the backstop.
