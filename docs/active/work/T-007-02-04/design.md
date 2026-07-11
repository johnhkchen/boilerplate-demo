# Design — T-007-02-04 verify-checks-under-new-owner

Decide **how** to run the demo's own checks against the new-owner deployment and
record the drill's headline pass/fail. Grounded in `research.md`.

## The decision in one line

Compose the three predecessor tools into one re-runnable `verify-checks.sh` that
stands up the fresh-owner context (scrubbed + lowercase-zone + fresh secrets), then
runs **`integration:check`, `ops:check`, `leak:check`, and `test:flow:backstage`**
against a locally-served instance under a **sanitized author-free environment**, and
records each leg green/red on the scorecard — with the real deployed-URL leg named and
deferred.

## Option space

### A. Run the checks in the author's working tree (repo root)
Point `ops`/`leak` at the repo-root `astro dev`, run `integration:check` and the flow
in place.
- **Rejected.** This is *not* the new-owner deployment. The repo root carries the
  author's `.dev.vars`, `.git` remote, `b28.dev` routes, and the author `database_id` —
  the exact couplings the drill exists to remove. Green here would prove nothing about
  sovereignty. Row 7's whole point is "author accounts removed from the path."

### B. Run against the fresh-owner context, but inherit the ambient environment
Build/serve the scrubbed context but let the shell's `CLOUDFLARE_*`/OAuth env through.
- **Rejected.** The author's Cloudflare OAuth is reachable; a check *could* dial the
  author account, and the agent daemonization markers make the dev-server checks flake
  (the "exited early" artifact). Inheriting env defeats "author accounts removed."

### C. Fresh-owner context + sanitized `env -i` + local serve  ✅ **chosen**
Build the scrubbed, config-filled, freshly-secreted context; run every leg under
`env -i PATH=… HOME=… TMPDIR=…` plus a per-check allowlist, against a server the drill
owns at `127.0.0.1`.
- **Chosen.** It is the honest local stand-in for the new-owner deployment that
  T-007-02-02/03 already validated, and the sanitize does double duty: removes the
  author account **and** de-daemonizes the dev server so the checks reproduce CI.

### D. Wait for a real second-account deploy, then run the checks against the live URL
- **Rejected as the primary path, kept as the deferred leg.** No second Cloudflare
  account exists on this machine (`wrangler whoami` → author only). Per PE-7 the live
  run is the metered manual step: named in the artifact, `deferred`, not faked. Option C
  produces the observable now; D is what a real owner runs later by exporting
  `DEMO_BASE_URL=https://demo.<owner-zone>` and re-running the same commands.

## Which checks, and why each

Row 7's observable lists four; the design runs all four rather than leaning on
`integration:check` alone:

1. **`integration:check`** — the demo's own "works observably" gate (P2). It owns its
   build + server + the ops/leak/flow-healthy trio internally, so it is the single
   strongest signal that the transferred demo *runs*. This is the leg neither
   T-007-02-02 nor -03 ran; running it here is this ticket's core new evidence.
2. **`ops:check`** (standalone) — the signed-receipt boundary against a served
   instance, with the **new-owner** `DEMO_SIGNING_KEY` (not integration's throwaway
   key), proving the rotated signing secret verifies end to end.
3. **`leak:check`** (standalone) — disclosure scan over the context's `dist` + a served
   `/api/receipt`, proving no secret/author value leaks from the *new-owner* build.
4. **`test:flow:backstage`** — the phone submit→retrieve loop. Self-hosts its webServer
   (migration + `astro dev` on 4323) with the flow-contract passcode; the mobile main
   flow the scorecard names. T-007-02-03 hit `/api/backstage/feed` by curl but never
   drove the actual browser flow — this closes that.

`test:flow` (healthy desktop) runs *inside* `integration:check` (leg 1), so it is
covered without a separate invocation; the design notes this rather than double-running.

## How the observable maps to pass/fail (the scorecard contract)

Per `transfer-signal.md`, row 7 resolves to exactly one of:

- **`pass`** — all four legs exit 0 against the served new-owner context with author
  accounts/env off the path. The live deployed-URL re-run is separately `deferred`.
- **`gap`** — any leg exits non-zero. Record the **failing check name + the exact seam**
  (file:line or binding). Never hidden.
- **`deferred`** — used only for the metered live leg (checks against a real deployed
  new-owner URL), with the exact command named. Never used to mask a red local leg.

A leg that cannot run for an *environment* reason that is a known non-demo artifact
(the daemonization hazard) is handled by **eliminating the artifact** (sanitize the
env) — not by calling it deferred. If, after sanitizing, a flow still cannot run
in-session, it is recorded as **environment-deferred with the exact outside-session
command**, distinct from a demo `gap`, per `transfer-signal.md:107`.

## Isolation & safety design

- **Author account off the path:** `env -i` drops `CLOUDFLARE_*`/OAuth-adjacent env;
  every command is local (`astro dev`, `wrangler dev/d1 --local`, `--dry-run`) — no
  `deploy`, no `--remote`, no live D1. Wrangler's OAuth token (on disk, not env) is
  never exercised because nothing authenticates.
- **No source mutation:** all work happens in a throwaway `$CONTEXT` under `TMPDIR`;
  the repo tree is only *read* (via `git archive`). Evidence lands solely under this
  ticket's `evidence/`.
- **Secret hygiene:** fresh secrets live in a `mktemp` 0600 store, never printed, and
  a trap deletes the private dir + stops servers + removes `$CONTEXT/.wrangler` on any
  exit — mirroring the rotation script's guarantees.
- **node_modules:** symlink the repo's `node_modules` into `$CONTEXT` (as
  `rotate-fresh-owner.sh` does) — dev deps only, no credential, avoids a multi-minute
  install per run.

## Reuse vs. new code

- **Reuse:** `scrub-fresh-owner.sh` (context), the config fill-in + secret-gen +
  `SANITIZED_ENV` + serve-and-poll patterns from `rotate-fresh-owner.sh`.
- **New:** `verify-checks.sh` — the row-7 driver. It differs from
  `rotate-fresh-owner.sh` by running the **`integration:check` wrapper** and the
  **backstage browser flow** (rotation ran the individual ops/flow/leak commands to
  prove *secrets*, not the demo's own check suite), and by recording the result as
  row 7's headline verdict rather than the secret inventory.
- The acceptance artifact is `checks-run.md`; per-leg raw output in `evidence/`.

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Daemonization "exited early" flake | `env -i` sanitize strips agent markers; pre-clear `.wrangler/state` |
| Port collision with a lingering daemon | Pick non-default ports; `astro dev stop`/`pkill` guard before run |
| Backstage migration lands in wrong D1 | Playwright config's `--persist-to .wrangler/state` already aligns it; run flow via `test:flow:backstage` unchanged |
| A red leg tempts a "deferred" relabel | Contract: attempted-and-failed = `gap` with named seam; only the live-URL leg is `deferred` |
| Serving needs a parseable config (F-1) | Fill a **lowercase** owner zone before serving |
