# Transfer Log — T-007-02-03 transfer-resources-domain-data

**The acceptance artifact.** Per-category record of the owner-transfer attempt
for the four categories this ticket owns — **1 Repo, 2 Cloudflare resources,
3 Domain, 4 Data** — run on the T-007-02-01 fresh-owner context by
`transfer-drill.sh` (re-runnable from the repo root; raw output in
`evidence/0…9-*.txt`; final clean run 2026-07-11). Scorecard rows moved in
`../T-007-02-01/transfer-signal.md`.

**Honest boundary.** No second Cloudflare account exists on this machine
(`wrangler whoami` → author account only), so per S-007-02 the drill is the
scrubbed local simulation, and every live leg is a **named metered manual
step** — deferred, never faked. Nothing in the drill can touch the author's
account or production Worker: no `wrangler deploy` without `--dry-run`, no
`--remote`, no writes outside the drill directory and this ticket's `evidence/`.

**Wording note.** The ticket says "Worker, KV/DO storage, and stored data."
This repo has **no KV namespace**; its storage surface is **D1**
(`BACKSTAGE_DB`) **+ Durable Objects** (`Sandbox`, `SESSION_COORDINATOR`) —
recorded here rather than silently reinterpreted.

## Owner fill-ins applied (each named; evidence/1-fill-ins.txt)

1. **Zone** → `new-owner-zone.example` (lowercase, still RFC 2606-unroutable —
   we do not pretend to own a live zone). Needed because of finding F-1 below.
2. **Fresh secrets** → per-run generated `DEMO_SIGNING_KEY`/`DEMO_PASSCODE` into
   the context's `.dev.vars` (the scrub drops the author's outright). Boot
   requirement only; rotation *proof* is T-007-02-02's row.
3. **Local D1 id** — **not needed**: both `wrangler deploy --dry-run` and local
   `d1 migrations apply`/`execute`/`dev` accept the config with `database_id`
   removed (local state keys off the binding). The fresh id appears at real
   deploy time under the new account (deferred leg).
4. **Not filled:** `SESSION_REPOSITORY_URL` keeps the harness placeholder —
   `parseSessionConfig` demands a credential-free **HTTPS** URL, so a local
   `file://` stand-in repo is rejected by the runtime's own validation; only a
   real new-owner repo can fill it (live leg).

## The four categories

### 1 Repo — CLEAN (local drill); live leg named — evidence/2-repo.txt

**Attempted:** made the context a repository the new owner owns: `git init` +
commit, push to a drill-created bare `new-owner.git` remote, clone back, verify.
**Observed:** round trip exit 0; `git remote -v` in the clone shows only the
drill remote (no `johnhkchen/*`); clone-back tree byte-identical to the context;
`.dev.vars` correctly **not** in history (the context's `.gitignore` held).
**Deferred (metered):** create the real new-owner GitHub repo, push, and set
`wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` to it (see fill-in 4).

### 2 Cloudflare resources — CLEAN (definitions + local run); live deploy deferred — evidence/3,6

**Attempted:** in the context: `npm install`; `npm run deploy:dry` (App Worker:
astro build + `wrangler deploy --dry-run`); `npm run session:validate` (Session
Worker: generated types + tsc + dry-run); then actually **ran** the App Worker
(`wrangler dev`, stage 6).
**Observed:** deploy:dry green **without a `database_id`** — the auto-provision
contract the config comment promises holds at validation level; session dry-run
lists both DOs, the container, and the re-pointed vars; the Worker served
HTTP 200 at `127.0.0.1:8799` with D1 + assets + version-metadata bindings live.
**Scope cut (named):** the `Dockerfile.session` container **image build** was
not exercised (Docker toolchain + minutes); `session:validate` covers the
config contract only.
**Deferred (metered):** `npm run deploy` + session deploy under a **real second
Cloudflare account** — none exists on this machine, and deploying from here
would overwrite the production `demo-runway` Worker (T-006-02-01 finding #2).
When attempted for real, a name/route collision is a `gap`, not a pass.

### 3 Domain — GAP (seam named); config side clean; live re-point deferred — evidence/4,7

**Attempted:** re-pointed everything off `b28.dev` (harness scrub + lowercase
fill-in), then exercised the runtime's own host derivation and the shipped test
suite against the re-pointed tree.
**Observed clean:** zero `b28.dev` route/var literals in either wrangler config
(narrative comments are the harness's allowed residue); `parseSessionConfig` +
`sessionUrls` derive `demo-session.new-owner-zone.example` /
`code-session.new-owner-zone.example` — exactly matching the route patterns, so
**one zone value re-points all three hosts consistently**;
`classifyProxyHost('demo-session.b28.dev')` → `null` (old author host no longer
authorized).
**GAP:** `test/promote.test.mjs:246` (test `extractCustomDomain reads the real
wrangler.jsonc`) asserts the literal `demo.b28.dev` against the real config —
the re-pointed tree **fails its own `npm test`** (observed: 19 pass, 1 fail,
expected `demo.b28.dev`, actual `demo.new-owner-zone.example`). Seam:
`test/promote.test.mjs` domain-literal assertion; fix belongs to the gap list
(S-007-03), e.g. deriving the expectation from the config or a contract constant
(same shape as T-006-02-01's rename finding #3).
**Finding F-1 (harness seam):** the scrub placeholder `NEW-OWNER-ZONE.example`
is rejected by `src/lib/session-lifecycle.ts` (`DNS_NAME` is lowercase-only:
`SESSION_DOMAIN must be a lowercase DNS name`) — the scrubbed Session Worker
cannot parse its own config until a real lowercase zone is filled. Loudness is
the placeholder's job, but a lowercase variant (`new-owner-zone.example`) would
be equally loud *and* runnable; harness-revision candidate for S-007-03.
**Deferred (metered):** attaching the routes to a real new-owner zone and
observing live DNS resolution — `new-owner-zone.example` is unroutable by
intent; the local stand-in observable is the Worker serving at `127.0.0.1`
(off `b28.dev`), stage 6.

### 4 Data — D1 half CLEAN (local drill); DO half GAP (seam named) — evidence/5,6,8

**Attempted (D1):** full export/import between two drill-owned stores: author
stand-in (copy of author config + migrations, its own `.wrangler` state) seeded
with 2 fixture rows → `wrangler d1 export --table backstage_entries --no-schema`
→ import into the context's local store → count + serve.
**Observed:** 2/2 rows arrive (`SELECT COUNT(*)` → `n: 2`) and — the end-to-end
proof — both rows **serve through the running Worker** via
`GET /api/backstage/feed` under the fresh new-owner passcode (stage 6:
`count: 2`, both `TRANSFER-DRILL fixture` texts verbatim).
**Migration-friction note:** the unscoped dump also carries
`d1_migrations`/`sqlite_sequence` bookkeeping rows that collide with the
new-owner store's own applied migrations — `--table backstage_entries` is the
required move; worth a line in the eventual runbook.
**GAP:** `SESSION_COORDINATOR` Durable Object state (the `SessionRecord` under
`SESSION_STORAGE_KEY`) has **no export/import seam at all** — wrangler has no
DO-storage subcommand (checked its command surface; evidence/8), and the only
read path is the live Worker's own control API (`/__session/status`). Seam:
`wrangler.sessions.jsonc:durable_objects.bindings → SESSION_COORDINATOR`.
Mitigating fact: it is *desired* state — one small re-creatable JSON document —
but the transfer is not clean, so: gap.
**Deferred (metered):** the same scoped export piped to
`wrangler d1 execute --remote` against the new account's freshly provisioned D1.

## Verdict summary (scorecard rows moved)

| # | Category | Verdict | Failing seam (if gap) | Metered live leg (deferred) |
|---|----------|---------|------------------------|------------------------------|
| 1 | Repo | **clean** (local drill) | — | real GitHub repo + `SESSION_REPOSITORY_URL` |
| 2 | Cloudflare resources | **clean** (dry + local run) | — | deploy under a real second account |
| 3 | Domain | **gap** | `test/promote.test.mjs:246` `demo.b28.dev` literal (+ F-1 harness placeholder case) | real zone delegation + DNS |
| 4 | Data | **gap** (DO) / clean (D1, local) | `SESSION_COORDINATOR` DO storage: no export/import seam | remote D1 import under new account |

Acceptance reading: the Worker + D1 storage + moved data **run under the
new-owner context** (stage 6, served at a host off `b28.dev`) within the
story's scrubbed-simulation boundary; every category attempt above is recorded
clean or gap **with the failing seam named**, and every live step is metered
and named, not skipped.
