# Checks Run — T-007-02-04 verify-checks-under-new-owner

**The acceptance artifact.** The drill's headline pass/fail: the demo's own checks
run against the new-owner deployment with the author's accounts and any fleet service
removed from the runtime path. Produced by `verify-checks.sh` (re-runnable from the
repo root; raw output in `evidence/`; final clean run 2026-07-11).

## Headline

**PASS — all four demo checks green against the served-local new-owner context.**

| Check | Result |
|-------|--------|
| `integration:check` (build + serve + operation/leak/flow-healthy) | **green** — exit 0 |
| `ops:check` (signed-receipt boundary, new-owner signing key) | **green** — exit 0 |
| `leak:check` (client-bundle + response disclosure) | **green** — exit 0 |
| `test:flow:backstage` (phone submit→retrieve loop) | **green** — exit 0 |

**Honest boundary.** `npx wrangler whoami` on this machine returns only the author
account (`john.hk.chen@…`, `caaec605…`) — no second live Cloudflare account. Per
S-007-02 / PE-7 the "new-owner deployment" is therefore the **fresh-owner context
served locally** (off `b28.dev`, at `127.0.0.1`), the same stand-in T-007-02-02/03
used. Running the identical checks against a **real deployed new-owner URL** is the
metered live leg — named as `deferred` below, never reported as a local `pass` and
never faked.

## Run it again

From the repository root:

```sh
docs/active/work/T-007-02-04/verify-checks.sh
```

Optional explicit configuration (defaults shown):

```sh
docs/active/work/T-007-02-04/verify-checks.sh \
  --context /tmp/demo-runway-checks-context \
  --owner-zone new-owner.example \
  --repository-url https://github.com/new-owner/demo-runway.git \
  --serve-port 4337
```

`new-owner.example` is reserved and intentionally unroutable; it is **lowercase** to
satisfy the Session Worker's lowercase-only `DNS_NAME` rule (finding F-1 from
`../T-007-02-03`). Exit codes: `0` all four green · `1` a check red (a row-7 gap,
seam named) · `2` misinvocation / environment error.

## What the script guarantees

1. Builds the proven-clean context via T-007-02-01's `scrub-fresh-owner.sh`
   (`git archive HEAD` — committed content only; `.git`/`.dev.vars`/`.promote`/
   `.wrangler` asserted absent).
2. Fills the lowercase new-owner zone + repo placeholders (config off author defaults).
3. Generates fresh new-owner secrets in a private mode-0600 store; never prints them.
4. **Does not** write a `.dev.vars` into the build tree (that would package into
   `dist/server/.dev.vars` and the leak check would correctly flag it — the operator
   rule T-007-02-02 discovered). Secrets reach the runtime only via a private wrangler
   config and per-check env.
5. Runs every build/dev/check under a sanitized `env -i PATH/HOME/TMPDIR` environment —
   no `CLOUDFLARE_*`/OAuth vars, no coding-agent markers (which also de-daemonizes the
   dev server so the checks reproduce CI).
6. Uses only local commands: `astro build`, `astro dev`, `wrangler dev`/`d1 --local`,
   `playwright test`. No `deploy`, no `--remote`, no live D1 — the author's account is
   never authenticated.
7. Redacts the generated signing key + passcode from every evidence file (transcripts
   and JSON reports), stops servers, and deletes the private store + `$CONTEXT/.wrangler`
   on any exit.

The source working tree is not modified; every write lands under a throwaway
`$CONTEXT` or this ticket's `evidence/`.

## Per-check detail

### CHECK 1 — `integration:check` — GREEN — evidence/1-integration.txt, integration-report.json
The demo's own "works observably" gate (P2). It owns its build, starts one isolated
`astro dev` (port 4324, per-run random key), and runs `operation`, `flow` (healthy
desktop demo flow), and `leak` against it. **All three passed** (`integration-report.json`:
`outcome: passed` for operation, flow, leak). This is the single strongest signal the
transferred demo *runs* — and the leg neither T-007-02-02 nor -03 exercised. Because
it runs `test:flow` (healthy) internally, the desktop main flow is covered here and is
not double-run separately.

### CHECK 2 — `ops:check` — GREEN — evidence/2-ops.txt
Standalone signed-receipt boundary against the served new-owner context, using the
**new-owner** `DEMO_SIGNING_KEY` (not integration's throwaway). Output:
`✓ receipt — passed`, `signature verified against the out-of-band key` — proving the
rotated signing secret verifies end to end through a served instance.

### CHECK 3 — `leak:check` — GREEN — evidence/3-leak.txt
Disclosure scan over the context's `dist` (23 client assets) + the served
`/api/receipt` response (1 body). Output: `✓ leak check — passed`. Because the tree was
built with no `.dev.vars`, nothing packages into the bundle — the clean-build property
holds for the new-owner build.

### CHECK 4 — `test:flow:backstage` — GREEN — evidence/4-flow-backstage.txt, flow-report.json
The phone-viewport (Pixel 5) stakeholder submit→retrieve loop, driven end to end:
open the backstage form → submit a reference under the shared passcode →
`POST /api/backstage/entries` returns 201 → read it back through
`GET /api/backstage/feed`. Output: `1 passed (2.4s)`. This drives the actual browser
flow T-007-02-03 only approximated by curling the feed. Gated on the public
flow-contract passcode (`playwright-backstage-knock`) and Playwright's default local
test key — **no new-owner secret is passed to or embedded by the flow.**

## Author-account / fleet-service absence (the "removed from the path" contract)

- **No fleet/central author service on the check path.** A grep of `src/**` +
  `scripts/**` for `fleet|central|lisa|vend|api.cloudflare|b28.dev|johnhkchen` finds
  only: the `--b28-*` brand palette (`src/styles/tokens.css`, allowed residue), one
  narrative comment (`src/pages/api/receipt.ts:24`), and dev-time board comments in
  `src/lib/promote.ts` (the promote *script*, not a runtime call). **No check makes an
  outbound author/central request** — every check resolves a caller-supplied local
  target.
- **No author account reachable.** The `env -i` sanitize drops all `CLOUDFLARE_*`/OAuth
  env; all commands are local; nothing authenticates. Wrangler's on-disk OAuth token is
  never exercised.
- **Secret hygiene verified.** A scan of all evidence for the generated 48+-hex
  signing key/passcode returns none; the only long-hex values are per-request receipt
  one-time nonces (non-secret) and the public flow-contract passcode.

## Gap ledger

| Item | State | Detail |
|------|-------|--------|
| Four demo checks vs. served new-owner context | **pass** | all green (this artifact) |
| Same checks vs. a **real deployed new-owner URL** | **deferred-live** | metered: needs a second Cloudflare account. Re-run with `DEMO_BASE_URL=https://demo.<owner-zone>` + `PLAYWRIGHT_BASE_URL=…` against the deployed Worker. Not faked as pass. |
| Row-7 checks themselves | **no gap found** | no check went red against the new-owner context |

**Out of row 7's scope (pre-existing gaps carried by other tickets — *not* check
failures):** the domain-literal in `test/promote.test.mjs:246` (row 3, S-007-03) is a
*unit-test* assertion, not one of row 7's integration/leak/ops/flow checks — those do
not assert a domain literal and all ran green. The `SESSION_COORDINATOR` DO export seam
(row 4, T-007-02-03) is a data-transfer gap, orthogonal to whether the checks run. They
are listed here only so a reader does not mistake them for row-7 check failures.

## Scorecard delta (`../T-007-02-01/transfer-signal.md`)

Row 7 (**Checks**) moves from `deferred` to **`pass` (attempted)** — the demo's
integration/leak/ops + backstage flow run green against the served-local new-owner
context with author accounts and any fleet service off the path; the live deployed-URL
re-run remains the named `deferred` leg.
