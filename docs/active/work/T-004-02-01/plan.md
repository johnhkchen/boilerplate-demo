# T-004-02-01 — stable-demo-on-custom-domain — Plan

Ordered, independently verifiable steps. Each step names its verification and
commit point. Testing strategy at the end.

## Step 1 — Pre-flight baseline (no changes)

Record the "before" state so verification has something to diff against:

- `curl -sI https://demo.b28.dev/` → expect `530` / body `error code: 1033`
  (the dangling tunnel CNAME).
- `curl -sI https://demo-runway.john-hk-chen.workers.dev/` → expect `200`.
- `git status` — confirm only intended files will be staged (the working tree
  already carries unrelated untracked ticket files; never `git add -A`).

**Verify:** both curls match expectations. **Commit:** none.

## Step 2 — Declare the custom domain in wrangler.jsonc

- Add the `routes` block (`demo.b28.dev`, `custom_domain: true`) with its
  comment, per structure.md Change 1.
- Extend the header comment's template-adopter note (parallel to the
  `database_id` clause).

**Verify:** `npm run deploy:dry` passes (config parses, build succeeds, no
deploy). `npm run worker:types:check` unchanged (routes add no bindings).
**Commit:** `feat(deploy): bind demo.b28.dev to the app worker as a custom domain`
— staged files: `wrangler.jsonc` only.

## Step 3 — One-time attach (override the stale record)

- Run `npm run deploy`. Expected: wrangler detects the existing DNS record on
  `demo.b28.dev` and asks to override; answer yes.
- Non-TTY fallback chain (design.md Decision 3): (1) pseudo-TTY via
  `script -q /dev/null`, (2) Custom Domains API with
  `override_existing_dns_record: true`, (3) document-and-block.
- Record in progress.md which path succeeded and the exact prompt/output.

**Verify:** deploy output lists `demo.b28.dev (custom domain)` as a trigger.
**Commit:** none (platform action; config was committed in Step 2).

## Step 4 — Runtime verification battery

All against the live hostname; allow a short cert/DNS propagation pause:

1. `curl --fail -sI https://demo.b28.dev/` → `200`, `content-type: text/html`,
   over HTTPS (TLS handshake itself proves the cert).
2. `OPS_CHECK_URL=https://demo.b28.dev/api/receipt npm run ops:check` → passes
   (proves the Worker, not a cache, answers on the hostname; exercises env +
   signing secret end-to-end).
3. `curl --fail -s https://demo.b28.dev/backstage` → 200 HTML (page loads; its
   APIs stay passcode-gated — no passcode is used or needed here).
4. WebSocket-absence sweep on the shipped artifact:
   `grep -ri "ws://\|wss://\|websocket" dist/` → no hits (matches the source
   sweep from research).
5. Surface check: confirm the deploy output/trigger list binds only this one
   hostname to only this Worker; `curl -s -o /dev/null -w '%{http_code}' https://demo.b28.dev/api/backstage/feed`
   without a passcode → non-200 (gate intact on the new hostname).

**Verify:** all five green. **Commit:** none.

## Step 5 — Documentation (deployment.md)

Apply structure.md Change 2: bootstrap step for the one-time override,
canonical-URL swap in "Release and verification" (workers.dev demoted to
Worker-health probe), and the new "Custom domain, certificates, and public
surface" section covering hostname-depth/cert behavior, WS-path status,
and the public-surface statement.

**Verify:** re-read against the AC's three documentation clauses — custom
domain + HTTPS ✓, no editor/admin surface ✓, hostname-depth/cert documented ✓,
WS paths verified-and-documented ✓. **Commit:**
`docs(deploy): document the demo.b28.dev custom domain, certs, and public surface`
— staged files: `docs/knowledge/deployment.md` only.

## Step 6 — Progress log and review

- progress.md maintained throughout Steps 1–5 (created at Step 1's execution).
- review.md written last: files changed, verification evidence, coverage
  assessment, open concerns (CI watch-item from structure.md's failure map,
  dead tunnel cleanup as operator hygiene, unpushed commits).

## Testing strategy

- **No new unit tests.** The diff is one wrangler config block and docs; there
  is no new logic, branch, or parser to test. The existing `npm run verify`
  gate already covers the config via `deploy:dry` on every CI run — a broken
  routes block fails CI before deploy.
- **Integration/runtime coverage** is the Step 4 battery against the real
  hostname — the only place custom-domain behavior is observable at all (no
  local emulation of custom domains exists in wrangler dev).
- **Regression surface:** `npm test` and the Playwright backstage flow are
  untouched by this diff; run `npm run deploy:dry` + `npm run worker:types:check`
  locally as the proportionate pre-commit slice (full `verify` runs in CI and
  needs a Playwright browser + local D1 setup; the diff cannot affect those
  paths — justify in review.md if skipped).

## Rollback story

- Before Step 3: revert the wrangler.jsonc commit; nothing happened on the
  platform.
- After Step 3: removing the routes block and redeploying detaches the custom
  domain; `demo.b28.dev` returns to a dead hostname (the old tunnel CNAME is
  gone — that's acceptable; it pointed at nothing). workers.dev remains the
  fallback URL throughout — zero downtime for the existing public demo.

## Risks called forward

| Risk | Likelihood | Mitigation |
|---|---|---|
| Zone in a different account | low (all signals say same) | attach errors cleanly; block + report |
| Prompt undrivable from agent shell | medium | fallback chain, Step 3 |
| Cert issuance lag | low | pause + retry in Step 4 |
| CI regression on next push | low | domain persists on Worker; watch-item in review.md |
