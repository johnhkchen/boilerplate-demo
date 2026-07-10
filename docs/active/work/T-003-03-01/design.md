# Design — T-003-03-01 documented-agent-retrieval-seam

Options weighed against the Research reality, one decision, and what was rejected.

## The decision in one line

Add a **pure retrieval core** (`src/lib/backstage-retrieval.ts`) that composes the existing
passcode gate + `listEntries` into a stable JSON feed `Response`; expose it through a **thin
GET route** at `/api/backstage/feed`; give the agent a **repo-local CLI** to fetch it;
**document** the seam in `docs/knowledge/`; and prove the loop with a **hermetic round-trip
check** that seeds via `saveEntry` and reads back through the core, asserting byte-for-byte
equality and account-free gating.

This mirrors the repo's spine exactly: pure framework-free core + thin edge that owns
env/`Response` (as in `receipt.ts` → `makeReceipt`, and `passcode.ts`'s core → `guardPasscode`).

## Decision 1 — Where the retrieval logic lives

**Options**
- **A. Logic inline in the Astro route.** Fewer files. But: not node-importable by a
  hermetic test (the route's extensionless imports and `import type { APIRoute }` are Vite/
  Astro-shaped), so the acceptance check would need a running server + provisioned D1, or an
  awkward import. Breaks the repo's "pure core, thin edge" idiom.
- **B. Pure core lib + thin route (CHOSEN).** `backstage-retrieval.ts` takes its dependencies
  — the presented `request`, the `configured` passcode, and the `db` handle — as arguments,
  reads no env, imports no Astro. The route reads env off `locals.runtime.env` and delegates.
  The check imports the core directly and exercises the exact composition an agent hits, fully
  in-process against real SQLite.

**Why B.** It is the established pattern (`receipt.ts`, `passcode.ts`, `backstage-store.ts` all
do this) and it is the only option that lets the acceptance check be hermetic, fast, and
truthful without standing up a server or remote D1. The route becomes ~5 lines of glue.

## Decision 2 — Return a `Response` from the core, or a data result?

**Options**
- **A. Core returns a structured `{status, body}`; route serializes.** Symmetric with
  `checkPasscode`'s pure decision.
- **B. Core returns a `Response` directly (CHOSEN).** `guardPasscode` already returns a
  `Response`; `Response`/`Headers` are web globals identical in Workers and Node. Returning a
  `Response` lets the core reuse `guardPasscode`'s denial `Response` verbatim (no re-mapping of
  status/copy) and keeps the gate's HTTP mapping in the one place that already owns it.

**Why B.** Composing `guardPasscode` is the whole point of the gate being reusable; re-deriving
status/body from a `GateDecision` in the core would duplicate `describeDecision`'s job and risk
drift. The core stays testable — a test just `await`s the `Response` and reads `.status`/
`.json()`. (This is also why B needs no dependency on the two pre-existing `passcode.ts` `tsc`
narrowing errors: the core calls `guardPasscode`, whose *signature* is clean.)

## Decision 3 — Route path (must not collide with the submit route)

**Options**
- **A. `GET /api/backstage` (file `api/backstage.ts`).** Natural, but T-003-02-01 (submit)
  will very likely claim `api/backstage.ts` for its `POST`. Sharing that file = the exact
  "two tickets modify the same file" hazard the concurrency rules call a missing dep edge.
  This ticket does **not** depend on T-003-02-01, so it must not touch its file.
- **B. `GET /api/backstage/feed` (file `api/backstage/feed.ts`) (CHOSEN).** A distinct file
  and URL that cannot collide with `api/backstage.ts` (a file and a same-named directory
  coexist fine in Astro routing). "feed" matches the store's own language — `wrangler.jsonc`
  calls the entries an "append-and-retrieve **feed**" — and the product-spec's polling refresh.
- **C. `GET /api/backstage/entries`.** Also fine, but "entries" is more likely to be a name the
  submit route reaches for; "feed" reads as unmistakably the *read* surface.

**Why B.** Zero-collision with the sibling ticket, plain-English, and semantically "the read
feed." Kitchen-table plain (brand voice) even though this is a machine surface.

## Decision 4 — Presentation order

**Options**
- **A. Newest-first (reverse `listEntries`).** Reads like a social feed.
- **B. Oldest-first, i.e. the store's canonical `id ASC` (CHOSEN).**

**Why B.** For a *machine* seam an agent polls on a 1–2 minute cycle, append-only oldest-first
means new entries land at the **end** and existing indices never shift — a stable prefix an
agent can diff cheaply. Newest-first shifts every index on each new entry. The store already
guarantees this order deterministically; the seam documents it rather than inventing a view
concern. (A human-facing backstage *page* — a different, later surface — can reverse for
display; that is not this machine seam's job.)

## Decision 5 — Response envelope

**Options**
- **A. Bare JSON array of entries.** Minimal. But no room for a stable version marker or
  count, and it conflates "the feed" with "an entry list."
- **B. Versioned envelope (CHOSEN):**
  ```json
  { "schemaVersion": 1, "gate": "backstage", "count": 2, "entries": [ …verbatim entries… ] }
  ```

**Why B.** `schemaVersion: 1` matches the repo idiom (`integration-check.ts`'s report carries
`schemaVersion: 1`) and lets the seam evolve without breaking agents. `gate: "backstage"`
mirrors the denial body shape (`guardPasscode` emits `{ gate, error, detail }`) so success and
failure share a recognizable envelope. `count` is a cheap convenience. The `entries` array is
the **verbatim** `listEntries` output — the four public fields, unmodified — so byte-for-byte
fidelity is preserved through the envelope. Pretty-printed (`JSON.stringify(body, null, 2)`)
like every other route/report here.

## Decision 6 — Misconfiguration handling

The route reads `locals.runtime?.env`. Two things can be missing: `DEMO_PASSCODE` (a blank
value) and `BACKSTAGE_DB` (no binding). Design:
- **Passcode blank/absent → the gate already returns `misconfigured/500`** (checked before the
  visitor's input; the gate owns this). The core just returns `guardPasscode`'s `Response`.
- **`db` absent → the core returns its own 500** with a safe `{gate, error:'store_unavailable',
  detail}` body, checked **after** the gate passes (so a caller without the passcode never
  learns anything about store state — the gate is the outer wall). This mirrors `receipt.ts`
  treating a missing key as a 500 misconfiguration with a safe message, never a leak or a hang.

## Decision 7 — Shape of the "check"

**Options**
- **A. Live HTTP `retrieve:check` script** hitting `localhost:4321/api/backstage/feed` (like
  `leak:check`). Highest end-to-end fidelity, but needs a running server + provisioned/seeded
  D1, and there is **no submit route yet** to seed through. Flaky and not self-contained.
- **B. Hermetic node:test against the pure core (CHOSEN).** Build a real `node:sqlite` store
  from the **committed** migration (the `backstage-store.test.mjs` helper), seed entries via
  `saveEntry` ("what was submitted"), call `readBackstageFeed({request, configured, db})` with
  a `Request` carrying the passcode header, parse the JSON, and assert the retrieved entries
  equal the submitted ones **byte-for-byte** (`deepStrictEqual` + explicit `text`/`url` byte
  asserts, incl. Unicode/newline/quote/query-string content). Plus gate cases (missing→401,
  wrong→403, and **no entries appear in any denial body**) and the account-free property.

**Why B.** It is the repo's dominant, hermetic idiom; it proves the acceptance claim ("byte-
for-byte", "a check asserts equality", "no account either side") against real SQLite with no
server; and it works today without the unbuilt submit route. Registered in `npm test` so it
runs in the same suite as everything else. A future live smoke via the `*:check` family is
noted as out-of-scope (it would duplicate fidelity, exactly as T-003-01-03 argued against a
Miniflare test).

## Decision 8 — The repo-local CLI

The ticket is "the **read path through which a coding agent retrieves**." A JSON route is that
path; a **repo-local CLI** (`scripts/backstage-feed.ts`, `npm run backstage:feed`) is the
product-spec's named machine interface and the concrete affordance the seam doc points an agent
at. It is a thin fetch-and-print of the running seam (reads base URL + passcode from env/
`.dev.vars`, like `leak-check.ts`), **not** part of `npm test` (it needs a running server), and
its exit codes follow the `*:check` family (0 ok, 1 gate/HTTP failure, 2 misconfigured). This
keeps the automated check hermetic while still shipping the agent's real retrieval tool.

**Rejected:** making the CLI itself the acceptance check (would reintroduce the live-server
dependency of Option 7A). The CLI *demonstrates* the seam; the node:test *proves* it.

## What is explicitly NOT in scope

- **No submit route / write half** — T-003-02-01 owns it; this seam only reads.
- **No human-facing backstage page** — T-003-02-02.
- **No `env.d.ts` change** — `DEMO_PASSCODE` and `BACKSTAGE_DB` are already typed.
- **No `passcode.ts` edit** — the two pre-existing `tsc` errors are another (done) ticket's;
  touching that file risks a cross-ticket conflict and is out of scope.
- **No remote D1 provisioning** — the seam works against whatever handle it is given; the
  operator applies migrations at first deploy (unchanged from T-003-01-01).
