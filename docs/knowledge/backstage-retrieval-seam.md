# Backstage retrieval seam

The one documented read path a coding agent (or teammate) uses to pull stored backstage
entries back out, verbatim. It is the read half of the stakeholder backstage door; the write
half is the submit route (`POST /api/backstage/entries`). Together they close the loop: what a
stakeholder submits, an agent retrieves.

- **Account-free.** The only credential is the shared low-stakes passcode (`DEMO_PASSCODE`),
  presented in a request header. No sign-up, no session, no cookie, no per-user record on
  either side.
- **Low-stakes, clearly labelled.** This gate is a shared knock, not a server secret. It keeps
  casual traffic out; it is not identity. Never put real secrets in a backstage entry — direct
  collaborators to a separate secure exchange (product-spec, stakeholder backstage).
- **Stable and machine-readable.** JSON today, the same seam a repo-local CLI reads and a later
  MCP adapter can wrap. The envelope carries a `schemaVersion` so it can grow without breaking
  a parser.

## The endpoint

```
GET /api/backstage/feed
Header: x-demo-passcode: <the shared passcode>
```

On success it returns every stored entry, **oldest-first** (insertion order), in a versioned
envelope:

```json
{
  "schemaVersion": 1,
  "gate": "backstage",
  "count": 2,
  "entries": [
    {
      "type": "reference",
      "url": "https://example.com/x?q=a%20b&t=caf%C3%A9",
      "text": "line1\nline2 \"q\" café 😀 end",
      "submittedAt": "2026-07-10T18:19:05.039Z"
    },
    {
      "type": "feedback",
      "url": "https://example.com/y",
      "text": "the flow felt smooth",
      "submittedAt": "2026-07-10T18:19:05.062Z"
    }
  ]
}
```

Each entry has exactly four fields — `type` (`reference` | `feedback`), `url`, `text`,
`submittedAt` (ISO-8601) — returned **verbatim**. The storage-private `id` is never exposed.

**Why oldest-first:** an agent polling on a one-to-two-minute refresh cycle sees new entries
append at the *end*, so existing indices never shift and a stable prefix can be diffed cheaply.
A human-facing page may present newest-first; this machine seam keeps canonical append order.

## Status codes

| Status | When | Body |
|--------|------|------|
| `200` | Passcode accepted | The feed envelope above (`entries` may be `[]`). |
| `401` | No passcode header | `{ gate, error: "passcode_missing", detail }` — no `entries`. |
| `403` | Wrong passcode | `{ gate, error: "passcode_mismatch", detail }` — no `entries`. |
| `500` | Server passcode not set | `{ gate, error: "gate_misconfigured", detail }` — fails closed. |
| `500` | Store binding absent | `{ gate, error: "store_unavailable", detail }` — checked only after the gate allows. |

The gate is the outer wall: a caller without the passcode is refused before the store is ever
read, so a denial never reveals whether — or what — anything is stored. No denial body contains
the passcode or any store detail.

## Retrieve it

### With the repo-local CLI (the agent's path)

```sh
npm run backstage:feed
```

It fetches the running seam, presents the passcode, and prints just the `entries` array as
JSON. It reads:

- **`DEMO_PASSCODE`** — from the environment, else from `.dev.vars`. Never printed.
- **`DEMO_BASE_URL`** — default `http://localhost:4321`; the CLI appends `/api/backstage/feed`.
  Point it at a deployed demo with e.g. `DEMO_BASE_URL=https://your-demo.example npm run
  backstage:feed`. (Or set `BACKSTAGE_FEED_URL` to the full URL directly.)

Exit codes: `0` retrieved · `1` refused by the gate/server (body printed to stderr) ·
`2` misconfigured or unreachable (no passcode, network error, timeout).

### With `curl`

```sh
curl -H "x-demo-passcode: $DEMO_PASSCODE" http://localhost:4321/api/backstage/feed
```

### Local dev setup

Copy `.dev.vars.example` to `.dev.vars` and set `DEMO_PASSCODE` (any shared string), then
`npm run dev`. The Cloudflare adapter's platformProxy surfaces it — and the `BACKSTAGE_DB` D1
binding — at `Astro.locals.runtime.env`, exactly as in production (where `DEMO_PASSCODE` is a
Worker secret and `BACKSTAGE_DB` is the deployed database). A blank `DEMO_PASSCODE` makes the
gate fail closed (`500`).

## Guarantees

- **Byte-for-byte.** `text` and `url` come back exactly as submitted — newlines, Unicode,
  quotes, and percent-encoded query strings are preserved unchanged.
- **No `id` leak.** Only the four public contract fields ever leave the seam.
- **No secret in the browser.** `DEMO_PASSCODE` is read server-side only and is not
  `PUBLIC_`-prefixed, so it is never inlined into client output (charter P3).
- **Sovereign.** The binding stays name-only; no account ID, database UUID, or token lives in
  the repo (charter P6).

## Where it lives

| Piece | File |
|-------|------|
| Pure core (gate + list + envelope) | `src/lib/backstage-retrieval.ts` |
| HTTP edge | `src/pages/api/backstage/feed.ts` |
| Repo-local CLI | `scripts/backstage-feed.ts` (`npm run backstage:feed`) |
| Entry contract | `src/lib/backstage-entry.ts` |
| Store (write/list) | `src/lib/backstage-store.ts` |
| Shared gate | `src/lib/passcode.ts` |

## Verifying the loop

`test/backstage-retrieval.test.mjs` (in `npm test`) is the executable proof: it writes entries
through the persistence module into a real SQLite store built from the committed migration,
reads them back through this seam, and asserts the retrieved payload equals what was submitted
byte-for-byte — plus the gate denials and the account-free property. The full write→read loop
also runs over real HTTP against local D1 (`POST /api/backstage/entries` then this endpoint).
