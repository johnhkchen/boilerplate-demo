# Review — T-003-03-01 documented-agent-retrieval-seam

Handoff document. What changed, how well it is tested, and what remains.

## Outcome

The acceptance criterion is met. Following the committed seam doc, a coding agent retrieves
stored entries through one documented read path (`GET /api/backstage/feed`, or
`npm run backstage:feed`), and the exact `text`/`url` of a previously submitted entry comes
back **byte-for-byte**. A check (`test/backstage-retrieval.test.mjs`, in `npm test`) asserts
the retrieved payload equals what was submitted, and the whole path is **account-free** — the
only credential is the shared low-stakes passcode presented in a header; no account, session,
or cookie exists on either side. The two-way loop (submit → retrieve) was additionally proven
over real HTTP against local D1. No ticket phase/status field was changed; no remote resource
was created or accessed.

## Acceptance mapping

| Acceptance clause | Implementation | Evidence |
|---|---|---|
| Following the committed seam doc… | `docs/knowledge/backstage-retrieval-seam.md` — endpoint, header, envelope, codes, CLI, guarantees | committed |
| …an agent retrieves entries | `GET /api/backstage/feed` → pure `readBackstageFeed`; `npm run backstage:feed` CLI | route + `scripts/backstage-feed.ts` |
| exact text/url comes back byte-for-byte | `entries` are verbatim `listEntries()` output; explicit `text`/`url` byte asserts incl. Unicode/newline/quote/query-string | tests 1–2 |
| a check asserts retrieved == submitted | seed via `saveEntry`, read via `readBackstageFeed`, `deepStrictEqual` | `test/backstage-retrieval.test.mjs` |
| no account created on either side | gate is a shared passcode header; no session issued (`set-cookie` null) | test 10 |

## Files created

| File | Purpose |
|---|---|
| `src/lib/backstage-retrieval.ts` | Pure core: gate + `listEntries` → versioned JSON feed `Response` |
| `src/pages/api/backstage/feed.ts` | Thin `GET /api/backstage/feed` edge (`prerender=false`) |
| `scripts/backstage-feed.ts` | Repo-local retrieval CLI (`npm run backstage:feed`) |
| `test/backstage-retrieval.test.mjs` | 10 round-trip / gate / account-free cases |
| `docs/knowledge/backstage-retrieval-seam.md` | The committed seam doc |
| `docs/active/work/T-003-03-01/*.md` | RDSPI artifacts |

## Files modified

| File | Change |
|---|---|
| `package.json` | Registered the new test in `test`; added `backstage:feed` script |

No file deleted. `passcode.ts`, `backstage-store.ts`, `backstage-entry.ts`, the migration,
`wrangler.jsonc`, and `src/env.d.ts` were consumed read-only — `env.d.ts` already types
`DEMO_PASSCODE` and `BACKSTAGE_DB`, so no typing change was needed.

## Public surface added

```ts
// src/lib/backstage-retrieval.ts
FEED_SCHEMA_VERSION = 1
interface BackstageFeed { schemaVersion; gate: 'backstage'; count; entries: BackstageEntry[] }
readBackstageFeed({ request, configured, db }): Promise<Response>
```

```
GET /api/backstage/feed        header: x-demo-passcode: <passcode>
200 → { schemaVersion, gate, count, entries[] }   (entries verbatim, oldest-first, no id)
401 missing · 403 mismatch · 500 gate_misconfigured · 500 store_unavailable
```

Design highlights (full rationale in `design.md`):

- **Pure core + thin edge**, the repo's spine (`receipt.ts`→`makeReceipt`,
  `passcode.ts`→`guardPasscode`). Core reads no env, imports no Astro; the route is 5 lines.
- **Composes, doesn't reimplement.** Reuses `guardPasscode` (returning its denial `Response`
  verbatim, so the gate's HTTP mapping stays in one place) and `listEntries` (verbatim, no
  `id`, oldest-first).
- **Gate is the outer wall.** Store state is revealed only after the gate allows; no denial
  body contains entries or the passcode.
- **Versioned envelope** (`schemaVersion: 1`) so the seam can evolve; `count` + `entries` for
  cheap consumption; MCP-adapter-ready.
- **Oldest-first for a machine seam** — append-only, stable indices for a polling agent.

## Test coverage

Ten hermetic cases, all green, against **real** `node:sqlite` built from the **committed**
migration (so "byte-for-byte against the store" is literal):

1. A submitted entry round-trips byte-for-byte through the seam.
2. Hard content — newlines, Unicode (`café ☺ 😀` + combining mark), quotes, percent-encoded
   query string — survives exactly.
3. Multiple entries come back oldest-first (insertion order).
4. Empty store → `200`, `count 0`, `entries []`.
5. Envelope is stable/versioned; entries expose exactly the four public fields (no `id`).
6. Missing passcode → `401`, no `entries` in the body.
7. Wrong passcode → `403`, no `entries`.
8. Blank server passcode → `500` (fails closed), no `entries`.
9. Correct passcode but no bound store → safe `500 store_unavailable`, no `entries`.
10. Account-free: shared passcode is the only credential; no session/`set-cookie` issued.

`npm test` → **80/80 pass** (baseline 60 + this ticket's 10 + the sibling submit ticket's).

### Beyond the unit check — real end-to-end

The full loop was driven over real HTTP against local D1 under `astro dev`: `POST
/api/backstage/entries` (a reference with newline/quotes/`café`/`😀`/percent-encoded URL, and a
feedback) → `201`; then `GET /api/backstage/feed` and `npm run backstage:feed` returned both
entries **byte-for-byte**, oldest-first, in the envelope. Gate behavior confirmed live:
no header → `401`, wrong → `403`, correct → `200`.

### Coverage gaps (intentional)

- **No automated live-HTTP `*:check` script.** The acceptance "check" is the hermetic test;
  a CI script hitting a running server + provisioned/seeded D1 would duplicate fidelity (the
  same argument T-003-01-03 made against a Miniflare test). The manual live loop above covers
  the real path; the CLI is the reusable live tool.
- **No human-facing backstage page.** Owned by T-003-02-02.
- **The CLI is not in `npm test`** — it needs a running server; its no-config/unreachable
  paths were exercised manually (exit 2), its success path against the live server (exit 0).

## Open concerns

### Pre-existing branch typecheck errors — human attention (not this ticket)

`npx tsc --noEmit` still exits non-zero solely on the two `src/lib/passcode.ts` `GateDecision`
narrowing errors from T-003-01-02. They are pre-existing and untouched here; this ticket's
core, route, and CLI add **zero** new errors. `passcode.ts` was deliberately not edited — it
is another (done) ticket's file, and touching it risks a cross-ticket conflict. Flagged so the
branch is not mistaken for newly broken.

### Concurrent sibling ticket T-003-02-01 (submit route)

Ran on the same branch simultaneously and created `entries.ts` / `backstage-submission.ts` /
`backstage-route.test.mjs`. This ticket touched none of them. The distinct route path
(`feed.ts` vs `entries.ts`) kept the two conflict-free; the only shared file, `package.json`,
was appended to path-by-path. The two routes were verified coexisting in the build and over
live HTTP.

### Remote D1 lifecycle (unchanged from T-003-01-01)

No remote database was provisioned and no remote migration applied. The operator runs the
authenticated first deploy + `wrangler d1 migrations apply` before the live seam reads a
deployed table. `DEMO_PASSCODE` must be set as a Worker secret in production (and in
`.dev.vars` for local dev — a placeholder was added locally, never committed).

## Security and sovereignty

- No secret is accepted, stored, or logged; the core holds no credential and reads no env. The
  passcode is server-only, not `PUBLIC_`-prefixed — never in the client bundle (P3).
- `id` is storage-private and never returned; only the four public fields leave the seam.
- Denials never echo the passcode or reveal store state.
- Binding stays name-only; no account ID, UUID, or token added — template stays sovereign and
  transferable (P6). All automated verification ran against in-process/local SQLite; no remote
  data was touched.

## Final assessment

Complete and committed in five focused commits plus artifacts. The retrieval seam satisfies its
byte-for-byte, account-free criterion with a truthful real-engine check and a real end-to-end
HTTP loop, stays within scope (read only — no submit, no page, no `passcode.ts` edit), reuses
the done gate and store rather than reimplementing them, and respects the template's purity and
sovereignty constraints. The only cross-branch concern is the unrelated, pre-existing
`passcode.ts` typecheck error.
