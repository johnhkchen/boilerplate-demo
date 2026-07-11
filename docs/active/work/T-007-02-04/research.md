# Research — T-007-02-04 verify-checks-under-new-owner

Descriptive map of the surface this ticket verifies. It is the **capstone** of
S-007-02: rows 1–6 of the transfer scorecard (`../T-007-02-01/transfer-signal.md`)
were moved by the harness (T-007-02-01), the secret/config rotation (T-007-02-02),
and the resource/domain/data transfer (T-007-02-03). This ticket owns **row 7 —
Checks**: run the demo's own checks against the new-owner deployment with the
author's accounts and any fleet service removed from the runtime path.

## What "the demo's own checks" are

`package.json` scripts, each a thin edge that resolves its target from the
environment and calls no author-central service:

| Check | Script | What it exercises | Target env var (default) |
|-------|--------|-------------------|--------------------------|
| **integration** | `integration:check` → `scripts/integration-check.ts` | Lifecycle owner: builds once, starts **one** isolated `astro dev` (port 4324, per-run random `DEMO_SIGNING_KEY`, temp wrangler config), then runs `operation`, `flow` (healthy), `leak` against it | self-hosted; `INTEGRATION_CHECK_PORT` |
| **ops** | `ops:check` → `scripts/ops-check.ts` | Signed-receipt boundary through the traced operation; out-of-band signature verify | `OPS_CHECK_URL` / `DEMO_BASE_URL` (`localhost:4321`) |
| **leak** | `leak:check` → `scripts/leak-check.ts` | Client-bundle (`dist`) + raw-response disclosure scan | `LEAK_CHECK_URL` / `DEMO_BASE_URL`, `LEAK_CHECK_DIR` (`dist`) |
| **flow (main)** | `test:flow` → `playwright --project=healthy` | Desktop receipt demo flow (`tests/demo-flow.spec.ts`) | `PLAYWRIGHT_BASE_URL` or self-hosted webServer (port 4323) |
| **flow (backstage)** | `test:flow:backstage` → `playwright --project=backstage` | Phone-viewport stakeholder submit→retrieve loop (`tests/backstage-flow.spec.ts`, Pixel 5) | same |

Row 7's observable names `integration:check`, `leak:check`, `ops:check`,
`test:flow:backstage`. `integration:check` **already runs** `ops`/`leak`/`flow-healthy`
internally against its own server, so the demo's "works observably" signal (P2) is
concentrated there; the standalone `ops`/`leak` and the `test:flow:backstage` phone
flow are the additional legs the scorecard enumerates.

## How each check resolves its target — the portability property

Every check reads a caller-supplied URL and falls back to a **local** default; none
hardcodes an author host or reaches a central service:

- `ops-check.ts:57` / `leak-check.ts:36`: `DEMO_BASE_URL ?? http://localhost:4321`,
  overridable by `OPS_CHECK_URL` / `LEAK_CHECK_URL`.
- `integration-check.ts:76`: base URL is always `http://127.0.0.1:${port}` — its own
  spawned server; it never dials out.
- `playwright.config.ts:26`: `baseURL = PLAYWRIGHT_BASE_URL ?? LOCAL_BASE_URL`; when
  unset it owns a local webServer (migration + `astro dev` on 4323).

**Fleet/central-service check (the ticket's "any fleet service removed"):** a grep of
`src/**` + `scripts/**` for `fleet|central|lisa|vend|api.cloudflare|b28.dev|johnhkchen`
finds only (a) `src/styles/tokens.css` brand palette (`--b28-*`, allowed residue),
(b) a narrative comment in `src/pages/api/receipt.ts:24`, and (c) `src/lib/promote.ts`
comments about Lisa's *checkout* (the promote script is dev-time board tooling, not a
runtime call). **No check makes an outbound author/fleet request.** The category is
`portable` — confirmed, not assumed.

## What "the new-owner deployment" is here — the honest boundary

`npx wrangler whoami` on this machine returns **only the author account**
(`john.hk.chen@gmail.com`, `caaec605…`). Per S-007-02's honest boundary and PE-7,
there is no second live Cloudflare account, so the "new-owner deployment" the checks
run against is the **fresh-owner context served locally** — exactly the stand-in
T-007-02-03 used (`wrangler dev` at `127.0.0.1`, off `b28.dev`) and T-007-02-02 used
for its ops/flow/leak leg. Running the same checks against a **real deployed
new-owner URL** is the metered live leg — named and deferred, never faked as `pass`.

## The context under test — built from the predecessors

The stage is produced by three re-runnable tools, composed:

1. `../T-007-02-01/scrub-fresh-owner.sh [DEST]` — builds the context with
   `git archive HEAD | tar -x` (committed content only), asserting `.git`,
   `.dev.vars`, `.promote`, `.wrangler` absent. Guarantees **no author secret/state
   on the runtime path**. Scrubs the five active couplings to loud placeholders.
2. Config fill-in (as `../T-007-02-02/rotate-fresh-owner.sh` stage 2 and
   `../T-007-02-03` do): replace `NEW-OWNER-ZONE.example` → a **lowercase** owner zone
   and `NEW-OWNER/REPO` → an owner repo URL. Lowercase is load-bearing (finding F-1
   below).
3. Fresh new-owner secrets generated in a private 0600 store (as
   `rotate-fresh-owner.sh` stage 3): `DEMO_SIGNING_KEY`, `DEMO_PASSCODE`, session +
   CI values. The scrub drops the author's `.dev.vars` outright, so there is no author
   secret to inherit.

## Environment isolation — "author accounts removed from the path"

`rotate-fresh-owner.sh` established the pattern this ticket reuses: run every
build/dev/check under a **sanitized environment** —
`env -i PATH=… HOME=… TMPDIR=…` (its `SANITIZED_ENV`). That single choice:

- drops ambient `CLOUDFLARE_*` / OAuth env so no author account reaches the check;
- **also** strips the Claude/Codex coding-agent markers, which is what makes the
  dev-server-owning checks (integration, Playwright) run foreground rather than
  daemonizing (see the daemonization hazard below);
- forwards only an allowlist plus the per-check target/secret vars.

Wrangler's OAuth token lives in `~/Library/Preferences/.wrangler/config/…`, not env,
but the local checks here never authenticate: no `deploy` (only `--dry-run`), no
`--remote`, no live D1. So a sanitized env plus local-only commands keeps the author's
account fully off the path.

## Known hazards and prior findings this ticket must honor

- **Playwright/integration daemonization** (`[[boilerplate-demo-playwright-daemonization]]`):
  under Claude Code, `astro dev` daemonizes and the flow "exits early" — an
  *environment artifact, not a demo gap* (`transfer-signal.md:107`). Reproduce CI by
  stripping the agent env (the `env -i` sanitize does this). Clear local D1 state
  (`.wrangler/state`, `tests/support/.wrangler`) between runs.
- **F-1 (harness placeholder case)**: `src/lib/session-lifecycle.ts` `DNS_NAME` is
  lowercase-only — the scrub's `NEW-OWNER-ZONE.example` is rejected. Fill a lowercase
  zone (`new-owner.example`) so the Session Worker parses (`../T-007-02-03`).
- **Domain gap** (row 3, T-007-02-03): `test/promote.test.mjs:246` asserts the literal
  `demo.b28.dev` — the *unit test suite* `npm test` fails on a re-pointed tree. That is
  a **known upstream gap owned by S-007-03**, not row 7's runtime checks; row 7 is the
  integration/leak/ops + flow trio, which do not assert a domain literal.
- **Data gap** (row 4, T-007-02-03): `SESSION_COORDINATOR` DO storage has no export
  seam — a data-transfer gap, orthogonal to whether the checks run green.

## Constraints (story-level)

- **Attempt-and-observe (PE-7):** run the checks, record green or red honestly; any red
  is a **named gap** (failing check + seam), never hidden. A category not runnable
  locally is **deferred** with the metered step named — never used to mask a red.
- **No product runtime rewrite** (S-007-02): drill scripts + docs only, under
  `docs/active/work/T-007-02-04/**`. The source working tree is not modified.
- **No author-account mutation:** no `deploy`, no `--remote`, no writes outside the
  drill dir and this ticket's `evidence/`.
