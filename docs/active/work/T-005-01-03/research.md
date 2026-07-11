# T-005-01-03 — projector-and-phone-cold-read-pass — Research

Descriptive map of what exists and what constrains this ticket. No solutions
proposed here.

## What the ticket asks for

Evidence, not code: `docs/active/work/T-005-01-03/` must end up containing

1. screenshots of the **built** index page at projector scale,
2. screenshots at a **375px phone viewport**, and
3. a cold-read checklist that answers, from the screenshots alone:
   - what the page is,
   - what its one primary action is,
   - how a visitor leaves the team a note —

   with any question the page **fails** to answer filed as a named follow-up,
   not checked off.

The story (S-005-01) frames this as the implementing session's own cold-read
proxy; a true never-seen-it human read is the epic's human gate and is
explicitly out of scope. The story also pins this ticket's write scope:
**only `docs/active/work/T-005-01-03/`** — `tests/`, `scripts/`, `src/` are
read-only context for this ticket (T-005-01-02 owns the test changes and may
be running in parallel on the same branch).

## The surface being read (already landed)

`src/pages/index.astro`, recomposed in commit `c6a8045` (T-005-01-01, its
dependency, complete with review handoff). Current structure — three stacked
`clay-surface` cards inside a centered `main`, all copy from two frontmatter
template slots plus literals:

- **Identity card** — eyebrow "Start here", `h1` = `DEMO_NAME` ("Demo
  Runway"), tagline "The starting line every demo inherits.", lede telling
  the visitor the page's two moves (watch the signed answer; leave a note).
- **Receipt card** — eyebrow "Watch the server answer", `h2` "A signed note,
  made just now", a `clay-well` panel that starts as "Asking the server…"
  and is filled client-side from `/api/receipt` (issuedAt / nonce /
  signature), and the page's **only** clay-button: `#primary-action`,
  labeled `PRIMARY_ACTION_LABEL` ("Ask for a fresh note"), which re-runs the
  fetch.
- **Note card** — eyebrow "Leave a note", `h2` "Pass the team a thought",
  and `#backstage-link`, a plain accent underlined link "Leave a note for
  the team" → `/backstage` (deliberately not a button; 44px tap target).

Client script: `loadReceipt()` fetches `/api/receipt` on load and on button
press; on failure the status line reads "The server didn't answer just now —
try a refresh." So a screenshot has **two possible receipt states** (filled
vs. error), and only the filled state represents the demo working (P2). The
receipt card is `aria-live` and the machine values wrap anywhere
(`overflow-wrap: anywhere`), which matters at 375px.

Styling is token-only (`src/styles/tokens.css` + `base.css` clay
primitives); type scale uses `--text-3xl` for the h1 downward. Layout is a
single centered column capped at `--measure`, so at projector width the
content column does not stretch — extra width becomes margin.

## How the page gets served (the moving parts)

- **Build**: `npm run build` (Astro 7 → `dist/client` static assets +
  `dist/server` worker). A `dist/` from the T-005-01-01 verification exists
  but its freshness is not guaranteed; the acceptance says "the built page",
  so a fresh build is the trustworthy source.
- **Serving options that exist today**:
  - `npm run preview` = `wrangler dev` on the repo-root `wrangler.jsonc`:
    serves the built worker + assets, reads repo-root `.dev.vars` (present,
    defines `DEMO_SIGNING_KEY` and `DEMO_PASSCODE`), binds local D1 at
    `.wrangler/state`. `/api/receipt` needs only `DEMO_SIGNING_KEY`, so the
    receipt fills. Default port 8787.
  - `npm run dev` = `astro dev`. **Known trap** (project memory + comments
    in `playwright.config.ts`): Astro 7 daemonizes its dev server when it
    detects a coding-agent environment, so a foreground-owned process "exits
    early" and the server orphans, holding its port. The Playwright
    webServer config only clears `CODEX_THREAD_ID`, not Claude's env
    signals. Any approach that starts `astro dev` from this session must
    strip `CLAUDECODE`/`CLAUDE_CODE_*`/`AI_AGENT` env or manage the daemon
    explicitly.
  - The Playwright suite's own webServer (port 4323) exists but belongs to
    the test flows T-005-01-02 is actively editing — starting it here would
    contend for the same port/state as a possibly-parallel sibling ticket.
- **Deployed instance**: `wrangler.jsonc` routes `demo.b28.dev`. Whether the
  currently deployed version includes `c6a8045` is unverified; local build
  is the only source guaranteed to match HEAD.

## Screenshot tooling that exists

- `@playwright/test` ^1.61 is a devDependency and its chromium browser is
  installed (the `healthy` and `backstage` projects have been run in prior
  tickets). The package exports `chromium` for standalone scripting — no
  new dependency needed to drive a browser and call `page.screenshot()`.
- Playwright device presets in use today: `Desktop Chrome` (receipt flows),
  `Pixel 5` (backstage phone flow, 393px). Nothing currently captures
  screenshots; `outputDir: test-results/artifacts` holds traces only.
- No repo convention yet for committed screenshots; work dirs under
  `docs/active/work/` so far contain only markdown. Binary artifacts in a
  work dir are new but consistent with "captured as evidence a human can
  judge" in the ticket context.

## Constraints and assumptions surfaced

- **"Projector scale" is not defined anywhere in the repo.** The ticket's
  intent (Context: "scannable at projector distance") implies both a
  projector-native resolution (1920×1080 is the conference-room default)
  and some proxy for *distance* — a raw 1080p screenshot viewed full-size
  on a laptop is easier to read than the same pixels across a room. Design
  must pick an honest distance proxy.
- **"375px phone viewport"** is exact — iPhone SE/12-mini class logical
  width, narrower than the Pixel 5 (393px) used elsewhere; the number in
  the AC is the spec.
- **Receipt state must be deterministic in the captures**: wait for
  `#receipt-body` to become visible (filled) rather than screenshotting
  whatever race the load is in.
- **Parallel sibling**: T-005-01-02 writes `tests/demo-flow.spec.ts` and
  `tests/support/flow-contract.ts` on the same branch. Ports 4323 (its dev
  server) should be treated as taken; anything this ticket runs should use
  a different port. Files it writes must stay inside the work dir.
- **Commit hygiene**: `git status` shows Lisa-owned modifications
  (`.lisa/provenance.jsonl`, ticket frontmatter files). Commits from this
  ticket must stage only `docs/active/work/T-005-01-03/` paths.
- **Leak surface**: screenshots will contain a locally-signed receipt
  (nonce + signature from the local `.dev.vars` key). The key itself never
  renders; nonce/signature are per-request outputs, same class of value the
  live public page shows anyone. `.dev.vars` values themselves must not
  appear in any committed artifact.
- The checklist's third question ("how a visitor leaves the team a note")
  is answerable from the index screenshots alone — the note card + link
  label — without capturing `/backstage` itself; the ticket names only "the
  built page" (index) as the screenshot subject.

## Open questions carried to Design

1. What concretely stands in for "projector distance" (downscaled copy?
   fold-only viewport shot? both)?
2. Full-page vs. above-the-fold captures on the phone — which does the
   cold-read judge against?
3. Where the capture script lives so the pass is reproducible without
   touching `tests/`/`scripts/` (work dir is the only writable place).
4. Serve via `wrangler dev` (built output, no daemonization risk) vs.
   `astro dev` with stripped env — which is the honest "built page"?
