# Fresh-Owner Drill Harness — the re-runnable procedure

The documented, re-runnable procedure that produces a **fresh-owner context** —
a clean copy of this demo with the author's account, zone, and repo couplings
scrubbed to loud new-owner placeholders and **no author credential or secret on
the runtime path**. It is the stage every owner-transfer attempt runs on; the
scorecard it reports against is `transfer-signal.md`.

## What this is — and the honest boundary

This is a **scrubbed local simulation**, not a live handoff. It reads no author
credential and stands up no Cloudflare resource. Producing a *provably clean
context* is what this ticket does; deploying that context under a **real second
Cloudflare account** is the metered manual leg — named here, attempted by
T-007-02-03 / T-007-02-04, not executed by this harness (PE-7: attempt and
observe, don't fake). This is the same honest cut T-006-02-01 made when it
deferred the public-URL leg of the clean-copy rehearsal.

## Definitions this harness relies on

- **Runtime path** — what actually runs when the demo is deployed: `src/**`,
  `wrangler.jsonc`, `wrangler.sessions.jsonc`, `Dockerfile.session`,
  `astro.config.mjs`, `migrations/**`, `public/**`, `scripts/**`. *Off* the path
  (dev-time only): `test/**`, `tests/**`, `docs/**`, `*.example`.
- **Active config coupling** — one of the five committed values that bind the demo
  to the author's account/zone/repo (the seams T-007-01-02 flagged `coupled`).
  These are what the scrub targets.
- **Allowed residue** — shared b28 brand tokens (`--b28-*` palette) and narrative
  comments that mention `b28.dev`. These are *not* author-account couplings —
  the palette is the shared claymorphism brand identity — so the harness names
  them but does **not** scrub them.

## Run it

From the repo root:

```sh
docs/active/work/T-007-02-01/scrub-fresh-owner.sh [DEST_DIR]
```

`DEST_DIR` defaults to `${TMPDIR:-/tmp}/fresh-owner-context` and is rebuilt fresh
each run (idempotent — verified by running twice; identical verdict). Exit codes:
`0` context produced and proven clean · `1` a residual author coupling or a
dropped-secret file remained (named) · `2` misinvoked (not repo root, or
`git archive` failed).

## What it removes for free — the clean-tree property

Step 1 builds the tree with `git archive HEAD | tar -x`, which reconstructs
**only committed content**. That single choice drops, with no extra care:

- `.git/` — author history and remote,
- `.dev.vars` — author's local secret values (gitignored),
- `.promote/`, `.wrangler/` — author deploy/build state (gitignored),
- `dist/`, `node_modules/` — build output and vendored deps.

The harness then asserts `.git`, `.dev.vars`, `.promote`, `.wrangler` are absent
and fails if any survived — so the secret-scrub is a *guaranteed property of the
tool*, not of anyone's carefulness. Step 2 additionally removes `docs/active/**`
(the template's RDSPI planning trail) per the E-007 leak guardrail;
`docs/knowledge/**` stays as read-only reference.

## What it edits — the five active couplings

| Seam (file:key) | From | To |
|-----------------|------|----|
| `wrangler.jsonc:d1_databases[0].database_id` | `c95861d4-…` | **removed** (config comment says remove before another account provisions) |
| `wrangler.jsonc:routes[].pattern` | `demo.b28.dev` | `demo.NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:routes[].pattern` | `demo-session.b28.dev`, `code-session.b28.dev` | `*.NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:vars.SESSION_DOMAIN` | `b28.dev` | `NEW-OWNER-ZONE.example` |
| `wrangler.sessions.jsonc:vars.SESSION_REPOSITORY_URL` | author repo | `https://github.com/NEW-OWNER/REPO.git` |

**Why placeholders, not blanks.** `NEW-OWNER-ZONE.example` is an RFC 2606 reserved,
guaranteed-unroutable name: loud, greppable, and impossible to mistake for real.
A blank `SESSION_DOMAIN` would slip past a naive "no `b28.dev`" grep while leaving
the seam invisible and unset. The one removal (`database_id`) follows the config's
own written instruction rather than inventing a fake UUID. Each edit is followed
by an assertion that its source string is gone, so upstream renames fail the run
loudly instead of yielding a half-scrubbed tree.

## The proof (from a real run — `evidence/scrub-run.txt`)

Before the scrub, all six active couplings are present:

```
==> Scan BEFORE scrub — active author couplings on the runtime path
  [coupled] D1 database_id (account-bound)  ->  c95861d4-2cfe-47c0-8a9b-c5e081779e48
  [coupled] App route (author zone)  ->  "pattern": "demo.b28.dev"
  [coupled] Session preview route (author zone)  ->  "pattern": "demo-session.b28.dev"
  [coupled] Session editor route (author zone)  ->  "pattern": "code-session.b28.dev"
  [coupled] SESSION_DOMAIN var (author zone)  ->  "SESSION_DOMAIN": "b28.dev"
  [coupled] SESSION_REPOSITORY_URL var (author repo)  ->  johnhkchen/boilerplate-demo.git
```

After the scrub, none remain, and the author-state files are absent:

```
==> Scan AFTER scrub — active author couplings on the runtime path
  (none — all five active couplings scrubbed)

==> Asserting author-secret / local-state files are absent from the context
  [absent] .git
  [absent] .dev.vars
  [absent] .promote
  [absent] .wrangler
```

The only `b28.dev` left on the runtime path is **allowed residue** — the shared
brand palette in `src/styles/tokens.css` and two narrative comments
(`wrangler.jsonc:24`, `src/pages/api/receipt.ts:24`). None routes traffic or
carries a credential; the harness lists them explicitly rather than hiding them
(`evidence/scan-after.txt`). The scrubbed `wrangler.jsonc` / `wrangler.sessions.jsonc`
were confirmed to still parse as valid JSON (comment-stripped round-trip), so the
`database_id` removal left no dangling comma.

## Re-running under a real second account (the deferred leg)

The harness produces the clean stage; a real handoff then fills the placeholders
and stands up live infrastructure. That is metered work owned downstream:

1. **New owner authenticates** their own Cloudflare account (`npx wrangler whoami`)
   and creates a new GitHub repo — replace `github.com/NEW-OWNER/REPO.git`.
2. **Rotate config + secrets** (T-007-02-02): set real `SESSION_DOMAIN`, install
   fresh `DEMO_SIGNING_KEY` / `DEMO_PASSCODE` / session secrets via
   `wrangler secret put`; prove `leak:check` / `ops:check` green with them.
3. **Provision resources, domain, data** (T-007-02-03): `npm run deploy` under the
   new account (Wrangler provisions a fresh D1 for the removed `database_id`),
   attach the new zone's routes, move backstage rows + session state.
4. **Verify checks** (T-007-02-04): run the integration/leak/ops trio + backstage
   flow against the new-owner URL with author accounts removed from the path.

Each attempt records its result on the `transfer-signal.md` scorecard — `pass`,
or a `gap` naming the exact failing seam. This harness fixes the starting line;
it does not run the race.

## Scope notes

- Committed board/agent tooling dirs (`.lisa/`, `.vend/`, `.codex/`, `.github/`)
  ride along in the archive. They are template internals off the runtime path and
  carry no author credential (`deploy.yml` reads account/token from GitHub
  secrets, hardcodes none); a real project-generation step would strip the board
  tooling, but that is E-001 generation scope, not this drill.
- This ticket changed nothing in the repo outside
  `docs/active/work/T-007-02-01/**` — the story's untouched-runtime guarantee.
