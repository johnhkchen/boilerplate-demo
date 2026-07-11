# Research — T-007-02-01 fresh-owner-drill-harness

Descriptive terrain map for the drill harness. What exists, where the author
couplings live, how the checks resolve their target, and what "fresh-owner
context with no author credentials/secrets on the runtime path" must actually
mean against this repo. No solutions here — those are Design's job.

## Ticket boundary

Acceptance (single clause): a **documented, re-runnable procedure** produces a
fresh-owner context with **no author credentials/secrets on the runtime path**,
**and** a **per-category checklist with an explicit pass/fail signal** is
committed under `docs/active/work/T-007-02-01/`.

Two deliverables, then:

1. **The harness** — a repeatable way to stand up a clean, scrubbed fresh-owner
   context from this repo.
2. **The signal** — the per-category pass/fail vocabulary every downstream
   transfer attempt (T-007-02-02/03/04) reports against.

The story (`S-007-02`) fixes this ticket as the one that "runs alone — it fixes
the clean context and the per-category pass/fail signal every attempt reports
against." T-007-02-02 (secrets/config) and T-007-02-03 (resources/domain/data)
fan out from it; T-007-02-04 (checks) judges the result. So this ticket produces
no transfer of its own — it produces the *stage* and the *scorecard*.

## What "fresh-owner context" inherits from upstream

The category map is already settled by T-007-01-01's
`transfer-surface-inventory.md` and T-007-01-02's per-category coupling verdicts.
The seven categories, in story order, with their **coupling verdict**:

1. **Repo** — coupled. `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL`
   hardcodes `https://github.com/johnhkchen/boilerplate-demo.git`; the Session
   Worker clones it at provision.
2. **Cloudflare resources** — coupled. `wrangler.jsonc:d1_databases[0].database_id`
   pins `c95861d4-2cfe-47c0-8a9b-c5e081779e48`; live Worker/DO/container instances
   sit under the author's account (selected in CI by `CLOUDFLARE_ACCOUNT_ID`).
3. **Domain** — coupled. `wrangler.jsonc:routes` → `demo.b28.dev`;
   `wrangler.sessions.jsonc:routes` → `demo-session.b28.dev`,
   `code-session.b28.dev`; `SESSION_DOMAIN: b28.dev`.
4. **Data** — coupled. Backstage rows live inside `BACKSTAGE_DB`; session desired
   state lives in `SESSION_COORDINATOR` Durable Object storage — neither travels
   with a clone.
5. **Configuration** — coupled through two committed values: `SESSION_DOMAIN` and
   `SESSION_REPOSITORY_URL`. The rest (binding names, `DEMO_FAULT`, compat
   settings, `secrets.required` name lists) is portable project-local config.
6. **Secrets** — coupled but **fully rotatable**. No secret value is committed.
   Values live in author-controlled stores (Wrangler secret bindings, GitHub
   Actions secrets, gitignored `.dev.vars`).
7. **Checks** — **portable.** Every check resolves a caller-supplied target and
   makes no call to the author's account/zone/central service.

## The runtime path, precisely

The criterion says "no author credentials/secrets **on the runtime path**." The
runtime path is what actually executes when the demo is deployed and served:

- **On the path:** `src/**`, `wrangler.jsonc`, `wrangler.sessions.jsonc`,
  `Dockerfile.session`, `astro.config.mjs`, `migrations/**`, `public/**`, and the
  release tooling under `scripts/**` (promote/rollback run against live infra).
- **Off the path (dev-time only):** `test/**`, `tests/**`, `docs/**`,
  `playwright.config.ts`, `*.example`, `worker-configuration*.d.ts`.

A scan of the runtime path for author markers (`c95861d4…`, `b28.dev`,
`johnhkchen`) returns exactly these hits today:

| File | Line | Kind |
| ---- | ---- | ---- |
| `wrangler.jsonc:27` | `routes` → `demo.b28.dev` | **active config coupling** |
| `wrangler.jsonc:49` | `database_id: c95861d4-…` | **active config coupling** |
| `wrangler.sessions.jsonc:15,16` | session routes | **active config coupling** |
| `wrangler.sessions.jsonc:20` | `SESSION_DOMAIN: b28.dev` | **active config coupling** |
| `wrangler.sessions.jsonc:21` | `SESSION_REPOSITORY_URL` | **active config coupling** |
| `wrangler.jsonc:24` | comment mentioning `demo.b28.dev` | comment only |
| `src/pages/api/receipt.ts:24` | comment mentioning `demo.b28.dev` | comment only |
| `src/styles/tokens.css:9` | comment naming the `--b28-*` brand palette | brand token, shared by design |

**Crucial distinction for the signal:** a marker match is not automatically an
author coupling. `--b28-*` palette tokens are the *shared* claymorphism brand
identity, intentionally common across b28 frontends — not an author-account
credential. Comments narrate; they do not route traffic. The scrub targets the
**active config couplings** (the five real seams T-007-01-02 flagged), and the
signal records comment/brand residue as *portable*, not as a gap.

**No author SECRET is on the runtime path at rest.** Every secret is uncommitted
(`.dev.vars` is gitignored; `secrets.required` names only). This is why the
"no credentials/secrets" clause is largely a property of a *clean tree*, and the
config-identity scrub is what remains.

## The clean-tree property (scrub-for-free)

`git archive HEAD | tar -x` reconstructs the tree from committed content only. It
therefore **drops**, with no extra work: `.git/` (author history/remote),
`.dev.vars` (author local secrets), `.promote/` and `.wrangler/` (author deploy
state), `dist/` and `node_modules/` (build/vendor). Confirmed: the archive's
top-level listing contains none of these. The template planning trail
`docs/active/**` *is* committed, so it must be removed explicitly — the guardrail
(E-007, proven by T-006-02-02) is that template history must never leak into a
generated/handed-off project.

## How the checks resolve a target (why category 7 is portable)

- `scripts/ops-check.ts` — default `http://localhost:4321`; `DEMO_BASE_URL` /
  `OPS_CHECK_URL` override. Exit 0 healthy · 1 failed · 2 misconfigured.
- `scripts/leak-check.ts` — same base default; `LEAK_CHECK_URL` / `LEAK_CHECK_DIR`
  override; asserts `DEMO_SIGNING_KEY` never reaches a bundle or response body.
- `scripts/integration-check.ts` — owns a disposable key (`randomBytes`) and a
  local server; passes `DEMO_BASE_URL` / `OPS_CHECK_URL` / `PLAYWRIGHT_BASE_URL`
  to its children. Self-contained.
- `playwright.config.ts` — `PLAYWRIGHT_BASE_URL` override; projects
  `healthy`/`stalled`/`backstage`.
- `package.json:scripts.verify` = `test && typecheck && integration:check &&
  test:flow:backstage && deploy:dry` — the exact gate CI runs.

Every one accepts a caller-supplied URL, so T-007-02-04 can point them at a
new-owner deployment with a single env var — no author account required.

## The honest boundary (PE-7)

The story is explicit: the drill **attempts and observes**; it does not automate
any category's transfer. Where a real second Cloudflare account is unavailable,
the fresh-owner context is a **scrubbed local/second-account simulation**, with
the manual live step named as metered and deferred. This mirrors T-006-02-01
Design Decision 2 (the clean-copy rehearsal deferred the public-URL leg for a
concrete, recorded reason rather than faking it). The harness must make the
same honest cut: it can produce and prove a *scrubbed context*, but standing up
live resources under a second account is a named manual leg, not something this
ticket claims to have executed.

## Prior art in this repo

- **T-006-02-01** — the closest analog. Built a clean copy via `git archive HEAD`
  in the scratchpad, deleted `docs/active/**`, and recorded a `rehearsal-log.md`
  deliverable backed by `evidence/*`. It kept this repo's `src/**` untouched. Its
  Design Decision 2 (defer the deploy leg locally) is the template for our honest
  boundary. Its finding on Playwright daemonization under agent sessions
  (`[[boilerplate-demo-playwright-daemonization]]`) warns that flow checks are
  unreliable inside this session — relevant to what the signal can *observe now*.
- **T-007-01-01 / T-007-01-02** — the inventory and coupling verdicts this ticket
  scores against. Do not re-derive them; consume them.

## Constraints carried forward

- **No product runtime code rewrite.** The story permits *drill scripts*, but
  `src/**`, `wrangler*.jsonc`, and product `scripts/**` stay untouched in this
  repo. All scrubbing happens in a scratch copy.
- **Nothing in this repo changes except `docs/active/work/T-007-02-01/**`.**
- **Do not edit ticket frontmatter** — Lisa advances phases from artifacts.
- Signal must name the **exact failing seam** for any non-clean category, never
  silently skip (story acceptance + E-007 "done looks like").
- Distinguish active config coupling from brand/comment residue.
- Respect N2 (Cloudflare-first surface only) and N3/P7 (no mandatory central
  control plane) — the harness is portable and local-first.
