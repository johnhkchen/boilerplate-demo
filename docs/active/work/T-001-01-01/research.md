# Research — T-001-01-01 astro-static-scaffold

## Ticket in one line

Create the minimal Astro static scaffold (`src/`, one index page, static
output) that every later demo inherits — the substrate for the public URL
without framework-by-inertia.

## Current repository state

The repo has **no application code**. It contains only planning/governance
material and tool state:

```
CLAUDE.md, AGENTS.md, SEED.md, LICENSE   # governance + agent context
docs/knowledge/   product-spec, charter, vision, rdspi-workflow, vend-workflow
docs/active/      demand, epic/, stories/, tickets/, pm/, work/
.lisa/  .lisa.toml  .lisa-layout.kdl      # Lisa RDSPI orchestration state
.vend/                                     # Vend pull-board state
.git/ (single commit: "Initial commit")
```

Confirmed absent (this ticket introduces them): `package.json`, `src/`,
`astro.config.*`, `tsconfig.json`, `.gitignore`, `node_modules/`, `dist/`.
There is nothing to migrate or refactor — this is a greenfield scaffold.

Toolchain present: Node `v26.4.0`, npm `11.17.0`. Astro 5.x is compatible.

## What the product documents require of the scaffold

From `docs/knowledge/product-spec.md` ("Public demo" surface):

- Astro foundation with a Cloudflare deployment adapter *(adapter is a later
  ticket — see boundaries below)*.
- **Static-first initial page** with effectively free idle hosting and no long
  compute cold start.
- Projector-readable typography/contrast; mobile-first responsive layout.
- A polished default design system that can yield to stakeholder Figma direction.
- **No mandatory React application**; Tailwind or client islands are added only
  when they earn their place.

From `docs/knowledge/charter.md`:

- **P1 — public before deep ideation** (this ticket's stated advance): get a
  functioning public site into the team's hands before guesses accumulate.
- **N1 — not a universal application framework.** The idea drives product code;
  the scaffold must stay a runway, not a framework.
- **N5 — not framework-by-inertia.** React, Tailwind, databases, storage, auth,
  and CMS enter only for a concrete idea-driven reason — never as a default.

The acceptance criterion restates N1/N5 concretely: `package.json` declares no
UI framework, CSS framework, database, auth, or CMS dependency — **astro and
tooling only**.

## The story and its ticket chain (boundaries)

Story `S-001-01` — *public-url-ships-on-push* — is three ordered tickets:

1. **T-001-01-01 (this)** — the static scaffold. `depends_on: []`.
2. **T-001-01-02** — *cloudflare-deploy-to-public-url*. `depends_on:
   [T-001-01-01]`. Makes the public Cloudflare URL exist; page delivered as
   **static assets, no compute cold start**; wrangler config carries no secrets.
3. **T-001-01-03** — *deploy-on-push-to-main*. `depends_on: [T-001-01-02]`. CI
   redeploys on every push to main; credentials live only as CI secrets.

This tells us precisely where the line sits:

- **In scope here:** Astro project that builds to a fully static `dist/`, a dev
  server that serves an index page, and a `package.json` limited to astro +
  tooling.
- **Out of scope here (T-001-01-02):** the Cloudflare adapter, `wrangler`
  config, and anything that produces server-rendered/edge compute. Crucially,
  even -02 keeps the page **static** — so this scaffold should stay on Astro's
  default `output: 'static'` and must not adopt an SSR adapter.
- **Out of scope here (T-001-01-03):** CI / GitHub Actions / deploy secrets.

The dependency DAG (`depends_on`) means -02 and -03 will build **on top of**
these files. Whatever config file this ticket writes (`astro.config.mjs`) is the
same file -02 will edit to add the Cloudflare adapter. Keeping this file present
and minimal now avoids a merge/ownership conflict later (per rdspi-workflow
"Concurrency": shared files across tickets are a dependency edge — which we have).

## Constraints and assumptions surfaced

- **Static output is load-bearing**, not incidental: it is what delivers "no
  compute cold start" and "idle hosting effectively free" (P6, spec non-goals).
  The build must emit static HTML/asset files with zero server routes.
- **Dependency minimalism is an acceptance gate**, not a preference. A single
  stray UI/CSS-framework dependency fails the ticket. Tooling that is *not* a
  UI/CSS/DB/auth/CMS product (e.g. `typescript`, `@astrojs/check` for type
  checking) is permissible as "tooling," but should be kept to what earns its
  place this early.
- **Brand voice governs the one visible page.** Per user-global `CLAUDE.md`, all
  user-facing copy is a parlor-not-portfolio: plain kitchen-table English, a
  real grabbable name ("Demo Runway"), labels that orient by what you'd *do*.
  The index page copy is real deliverable copy, not lorem ipsum.
- **Visual identity** (user-global): sincere claymorphism on the b28.dev palette
  (steel blue `#44679b`, off-white `#faf8f5`, cream `#f2efe9`, ink `#1c1917`,
  Lora display + Karla body). A shared `b28-clay.css` kit exists. Tension to
  resolve in Design: honoring the visual identity vs. the AC's "no CSS framework
  dependency" and "minimal scaffold" — a vendored plain-CSS file is not a
  framework dependency, but network fetch and weight cut against minimalism.
- **Template hygiene** (charter guardrail): template-development plans/history
  must not leak into generated projects. Not directly exercised by this ticket,
  but the scaffold should not hardcode template-only planning references into
  shipped pages.
- **Node/npm assumption:** contributor and CI Node is ≥ what Astro 5 requires
  (Node 18.17+/20+/22+); local is v26, comfortably above. Pin nothing exotic.

## Open questions for Design

1. Astro's `create astro` starter vs. a hand-authored minimal set of files —
   which yields the smallest honest scaffold that still passes `astro build`?
2. TypeScript/`astro check` tooling in from the start, or defer until a ticket
   needs it? (Trade minimalism against the agent-workflow "type checks" goal.)
3. How much visual identity to bake into the single page now vs. leaving a clean
   surface for stakeholder Figma direction later — inline tokens vs. vendored
   `b28-clay.css` vs. near-unstyled.
4. Explicitly assert `output: 'static'` in config, or rely on it being Astro's
   default? (Explicit is self-documenting for the -02 adapter edit.)
