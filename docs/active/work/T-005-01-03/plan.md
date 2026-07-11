# T-005-01-03 — projector-and-phone-cold-read-pass — Plan

Ordered, independently verifiable steps. Steps 1–6 produce the evidence;
step 7 produces the judgment; step 8 commits. Verification criterion listed
with each step — a step is done when its check passes, not when its command
exits.

## Step 1 — Fresh build of the surface under test

- Run: `npm run build` (repo root).
- Verify: exit 0; `dist/client/index.html` contains exactly one
  `clay-button` element, the string "Ask for a fresh note", and
  `href="/backstage"` — i.e. dist reflects `c6a8045`'s recomposition, not a
  stale build.
- Failure mode → stop and report; nothing downstream is meaningful against
  a broken or stale build.

## Step 2 — Serve the built worker

- Run (background, PID captured):
  `npx wrangler dev --port 8791` (repo-root `wrangler.jsonc`; `.dev.vars`
  supplies `DEMO_SIGNING_KEY`; local D1 from `.wrangler/state` — unused by
  the index page but bound).
- Verify: poll until `curl -s http://127.0.0.1:8791/api/receipt` returns
  JSON with `issuedAt`/`nonce`/`signature` (budget ~30s). This separates
  "server broken" from "page broken" before any screenshot exists.
- Cleanup obligation registered now: kill the PID in step 6 regardless of
  intermediate failures.

## Step 3 — Write `capture.mjs`

- Per structure.md: two browser contexts —
  - projector: `viewport {1920,1080}`, `deviceScaleFactor 1` →
    `projector-1920x1080.png` (viewport), `projector-1920x1080-full.png`
    (fullPage);
  - phone: `viewport {375,667}`, `deviceScaleFactor 2`, `isMobile`,
    `hasTouch` → `phone-375-fold.png` (viewport), `phone-375-full.png`
    (fullPage).
- Each context: `goto` → wait for `#receipt-body` **visible** (15s) →
  shoot. Any timeout = process exits non-zero.
- Verify: `node --check` parses it (syntax gate before the run).

## Step 4 — Capture

- Run: `node docs/active/work/T-005-01-03/capture.mjs` from the repo root.
- Verify: exit 0; four PNGs exist in the work dir with plausible pixel
  dimensions (1920×1080; 1920×tall; 750×1334 — 375×667 at DSF 2; 750×tall).
  Check with `sips -g pixelWidth -g pixelHeight`.
- Eyeball each PNG (Read tool renders images) — receipt visibly filled in
  all four; no error-state capture shipped.

## Step 5 — Back-of-room resample

- Run: `sips --resampleWidth 480 projector-1920x1080.png --out
  projector-back-of-room.png` (in the work dir).
- Verify: file exists at 480px wide; then actually *look* at it — this is
  the distance proxy the projector questions are judged on.

## Step 6 — Kill the server

- `kill <PID>` from step 2; verify port 8791 no longer answers and no
  wrangler/workerd process from that PID tree lingers.
- This step runs even if 3–5 failed (single cleanup path).

## Step 7 — Write `cold-read.md`

- Structure per structure.md: rules of the read → provenance (commit hash,
  commands, viewport table, date) → the three AC questions judged strictly
  from the PNGs (projector questions against the back-of-room copy) →
  named follow-ups `F-005-01-03-<n>` for every fail/material borderline →
  honest-boundary note.
- Verify against the AC line by line: answers derived from screenshots
  alone; any unanswered question filed as a follow-up **instead of**
  checked off.

## Step 8 — Progress + commit

- Write `progress.md` (steps completed, deviations if any).
- Commit staging **only** `docs/active/work/T-005-01-03/` explicitly
  (never `-A`; Lisa-owned ticket/provenance modifications stay unstaged):
  `docs(demo): T-005-01-03 projector and phone cold-read evidence`.
- Verify: `git show --stat HEAD` touches only the work dir.

## Step 9 — Review phase

- Write `review.md`: what was created, how each AC clause is evidenced,
  test-coverage statement (this ticket adds evidence, not tests — say so
  and point at T-005-01-02 for the automated contract), open concerns
  (including any follow-ups the cold read filed), then stop. Lisa handles
  phase/status.

## Testing strategy (what "tested" means for an evidence ticket)

- **No unit/integration tests added** — the deliverable is judged evidence,
  and the story assigns the automated assertion to T-005-01-02. The
  repo's `npm test` / typecheck are untouched by construction (no source
  files change); running them here would only re-verify main.
- The evidence itself is tested by its gates: step 1 (right build), step 2
  (server answers before capture), capture-time wait on `#receipt-body`
  (right state), step 4 dimension check (right viewports), step 7 rules
  (right judgment discipline).

## Risks and contingencies

- **Port 8791 occupied** → pick 8793, record the change in progress.md and
  the provenance block.
- **`wrangler dev` unexpectedly interactive/hangs under agent env** → fall
  back to `astro dev` with the full agent-env strip from project memory
  (documented recipe), noting the dev-vs-built deviation in progress.md
  and review.md.
- **Receipt never fills** (server up but fetch fails in-page) → that is a
  real finding, not a capture bug: file it as a follow-up with the
  error-state screenshot, per the AC's fails-are-filed rule.
- **Cold read fails a question** → expected possible outcome; the ticket
  still completes (fails filed as `F-005-01-03-<n>`), and review.md flags
  them for the human gate.
