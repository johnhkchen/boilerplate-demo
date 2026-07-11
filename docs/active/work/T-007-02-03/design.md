# Design — T-007-02-03 transfer-resources-domain-data

Decision: **a scripted, re-runnable local transfer drill** on the T-007-02-01
fresh-owner context, attempting each owned category (1 Repo, 2 Cloudflare
resources, 3 Domain, 4 Data) with real commands and real observables, recording
`pass` / `gap` / `deferred` per the scorecard's rules — with every live leg that
needs a second Cloudflare account or a real zone named as the metered manual
step, never faked.

## Options considered

### A. Documentation-only runbook (rejected)

Write the transfer procedure, mark all four rows `deferred`, attempt nothing.

- ✗ Violates the story's PE-7 rule ("ATTEMPTS and OBSERVES") and the scorecard's
  non-negotiable: `deferred` may only name a metered live step, not stand in for
  work that *could* run locally.
- ✗ Would leave the two concrete gaps this research already smelled
  (`test/promote.test.mjs:246`, DO-state export) unproven and unrecorded — the
  exact value this ticket exists to produce.

### B. Live transfer under a real second account (rejected as the primary path)

Authenticate a second Cloudflare account, deploy the scrubbed context there,
attach a real second zone, import data remotely.

- ✗ No second account exists on this machine (`wrangler whoami` → author's
  account only; research). The story pre-authorizes exactly this fallback: "Where
  a real second Cloudflare account is unavailable, the fresh-owner context is a
  scrubbed local/second-account simulation with that manual live step named
  explicitly as metered and deferred."
- ✗ Attempting it anyway from this machine is actively dangerous: `npm run
  deploy` from a copy overwrites the author's production `demo-runway` Worker
  (T-006-02-01 finding #2). The drill must be structurally unable to do that.
- ✓ Kept as the named deferred leg each category cites, with the exact commands a
  real second owner runs.

### C. Scripted local drill on the scrubbed context (chosen)

One idempotent script (`transfer-drill.sh`, same shape as the harness's
`scrub-fresh-owner.sh`) that: builds the fresh-owner context via the T-007-02-01
harness → applies the **named owner fill-ins** a real new owner would make →
attempts all four categories with observable commands → writes evidence files.
Results are transcribed into `transfer-log.md` and the scorecard rows 1–4.

- ✓ Genuine attempts with pass/fail observables, re-runnable by a reviewer.
- ✓ Reuses the committed harness instead of re-implementing the scrub (one
  source of truth for what "fresh-owner context" means).
- ✓ Structurally safe: the script never invokes a mutating `wrangler` command
  without `--dry-run` or `--local`, so the author's account and production Worker
  cannot be touched even by accident.

## Key design decisions inside option C

### D1. Owner fill-ins are explicit, minimal, and logged

The scrubbed context is deliberately un-runnable (loud placeholders). A real new
owner's first move is filling them; the drill simulates that owner and logs each
fill-in as a numbered step:

1. **Zone** → `new-owner-zone.example` (lowercase). Still RFC 2606-unroutable —
   honest about having no real zone — but passes the runtime's own
   `DNS_NAME` validation. The fact that the harness's uppercase
   `NEW-OWNER-ZONE.example` fails `parseSessionConfig`
   (`session-lifecycle.ts:94,296`) is **recorded as a drill finding** (harness
   placeholder vs runtime validation seam), not silently papered over.
2. **Secrets** → fresh values generated per-run into the context's `.dev.vars`
   (`openssl rand -hex 32` for `DEMO_SIGNING_KEY`, a random passcode). Required
   merely to boot the Worker; rotation *proof* stays T-007-02-02's row.
3. **D1 id** → only if the local runtime refuses a missing `database_id`, insert
   a loud local placeholder id and record that as the observed owner fill-in for
   local dev (the deploy-time answer — Wrangler provisions on deploy — stays part
   of the deferred live leg).

### D2. Category attempts and their observables

- **1 Repo** — make the context a repository the new owner owns: `git init` +
  commit in the context, push to a drill-created bare "new-owner" remote, clone
  back and diff. Observable: round-trip succeeds; `git remote -v` shows no
  author remote. `SESSION_REPOSITORY_URL` stays the harness's HTTPS placeholder
  — the runtime rejects non-HTTPS URLs (`parseSessionConfig`), so a local
  `file://` stand-in is *impossible by design*; pointing at the real new-owner
  GitHub repo is a named deferred fill-in.
- **2 Resources** — prove the definitions reproduce and run outside the author's
  account: `npm install`, `npm run deploy:dry` (App Worker build + config
  validation, no API call), `npm run session:validate` (Session Worker types +
  dry-run), then **actually run** the App Worker: `wrangler dev` on the built
  `dist/` with drill-local persistence, probe `/` and `/api/*` over HTTP.
  Live provisioning under a second account: deferred, commands named.
  (Container image build is not exercised — Docker adds minutes and its own
  toolchain; `session:validate`'s dry-run covers the config contract. Named as a
  scope cut in the log.)
- **3 Domain** — three observables: (a) zero `b28.dev` route/var in the context
  (grep, already harness-asserted, re-checked after fill-ins); (b) the session
  host derivation accepts the new zone and derives `demo-session.<zone>` /
  `code-session.<zone>` matching the routes (direct `parseSessionConfig` +
  `sessionUrls` call via `node --experimental-strip-types`); (c) the shipped test
  suite's reaction — expected **gap**: `test/promote.test.mjs:246` asserts the
  literal `demo.b28.dev` against the real `wrangler.jsonc`, so a re-pointed tree
  fails its own `npm test`. Run that test in the context and capture the failure
  as the gap evidence. Live DNS resolution off `b28.dev`: deferred (no real zone).
- **4 Data** — move rows end to end between two drill-owned stores, author-side
  → new-owner-side: seed fixture rows into an "author stand-in" local D1
  (`--persist-to` dir A; the author's real `.wrangler/state` is never written),
  `wrangler d1 export`, import into the context's local D1 (dir B),
  `SELECT COUNT(*)`+content compare, then prove the moved rows **serve** through
  the running Worker's `GET /api/backstage/feed`. DO session state: attempt the
  export → there is no wrangler/DO storage export seam and the only read path is
  the Worker's own control API — expected **gap**, named. Remote D1 import under
  a second account: deferred.

### D3. Recording — one log, scorecard rows moved

- `transfer-log.md` (this dir) is the acceptance artifact: per category, what was
  attempted, the observable, verdict `clean` / `gap(seam)` / metered-deferred
  step, pointing at `evidence/*.txt` raw output.
- `../T-007-02-01/transfer-signal.md` rows **1–4 only** are updated in place, per
  that file's own protocol ("downstream tickets move their owned rows"). Rows
  5–7 (T-007-02-02 / T-007-02-04, running in parallel) are not touched; edits are
  confined to the four table rows + their per-category detail paragraphs to keep
  the merge surface minimal.
- Verdict vocabulary follows the scorecard exactly: a category attempted and
  failed is a **gap with the seam named**; `deferred` is reserved for the
  second-account/real-zone legs.

## Rejected micro-alternatives

- **Seeding the author's real local D1** for the data move — mutates dev state
  outside the ticket's namespace; `--persist-to` drill dirs cost nothing.
- **Editing `test/promote.test.mjs` or the `DNS_NAME` regex to make the drill
  green** — the story forbids rewriting product runtime code, and the failures
  *are the findings*; fixes become board signals (S-007-03 territory), not
  drive-by patches.
- **Playwright flows as the serving observable** — unreliable inside an agent
  session (`[[boilerplate-demo-playwright-daemonization]]`); direct `curl`
  against `wrangler dev` on the built `dist/` is the proven-stable probe
  (T-006-02-01 precedent), and full checks are T-007-02-04's row anyway.
