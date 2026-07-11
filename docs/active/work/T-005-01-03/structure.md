# T-005-01-03 — projector-and-phone-cold-read-pass — Structure

The blueprint: every file this ticket creates, what each contains, and the
order that matters. **No repo file outside `docs/active/work/T-005-01-03/`
is created, modified, or deleted.**

## Final contents of `docs/active/work/T-005-01-03/`

```
research.md                     # phase artifact (done)
design.md                       # phase artifact (done)
structure.md                    # this file
plan.md                         # phase artifact
progress.md                     # phase artifact (Implement)
review.md                       # phase artifact (Review)
capture.mjs                     # the screenshot harness (committed evidence-maker)
projector-1920x1080.png         # 1080p viewport capture, receipt filled
projector-1920x1080-full.png    # 1080p full-page capture
projector-back-of-room.png      # the viewport capture resampled to 480px wide
phone-375-fold.png              # 375×667 DSF2 viewport capture (first screen)
phone-375-full.png              # 375×667 DSF2 full-page capture
cold-read.md                    # the checklist — the ticket's real deliverable
```

## `capture.mjs` — internal organization

Single-file ES module, no dependencies beyond the repo's installed
`@playwright/test`. Runs from the repo root; hard-fails (non-zero exit, no
partial PNGs left behind on the failing step) rather than emitting
ambiguous evidence.

```
const BASE_URL   = 'http://127.0.0.1:8791'   // wrangler dev, started outside
const OUT_DIR    = new URL('.', import.meta.url)  // PNGs land beside the script

async function captureContext(browser, name, contextOpts, shots)
  // newContext(contextOpts) → page.goto(BASE_URL)
  // → expect #receipt-body visible (15s budget; receipt filled = the demo
  //   observably worked at capture time)
  // → for each shot: page.screenshot({ path, fullPage? })
  // → context.close()

main():
  chromium.launch()
  captureContext('projector', { viewport: 1920×1080, deviceScaleFactor: 1 },
                 [viewport shot, fullPage shot])
  captureContext('phone',     { viewport: 375×667, deviceScaleFactor: 2,
                                isMobile: true, hasTouch: true },
                 [viewport shot, fullPage shot])
  browser.close()
```

Interface contract with the outside: the server at `:8791` must already be
up; the script owns nothing but the browser. This keeps process lifecycle
(build → serve → capture → kill) in the operator's hands, where the PID is
known — the lesson from this repo's daemonization history.

The back-of-room resample is **not** in `capture.mjs` (macOS-only `sips`
would poison an otherwise portable script); it is a one-line shell step
recorded in `cold-read.md` provenance:
`sips --resampleWidth 480 projector-1920x1080.png --out projector-back-of-room.png`.

## `cold-read.md` — internal organization

1. **Rules of the read** — screenshots only; distance questions judged
   against the back-of-room copy; fails are filed, not fixed (per
   design Q2/checklist section).
2. **Provenance block** — commit hash the build came from, exact commands
   (build / serve / capture / resample), viewport + DSF table, capture
   date.
3. **The three questions**, verbatim from the AC, each with: answer as
   read, source screenshot(s), PASS / FAIL.
4. **Follow-ups** — `F-005-01-03-<n>` entries for every FAIL or material
   borderline; each names the symptom, the screenshot showing it, and a
   one-line seed for a ticket. Empty section stated explicitly if no fails.
5. **Honest-boundary note** — this is the implementing session's cold-read
   proxy, not the epic's human gate.

## Ordering (where it matters)

1. `plan.md` (next phase) before any execution.
2. Fresh `npm run build` **before** starting `wrangler dev` — wrangler
   serves `dist/`; a stale dist silently screenshots the wrong page.
3. Server up + `/api/receipt` probed **before** `capture.mjs` — separates
   "server broken" from "page broken" at failure time.
4. All five PNGs exist **before** `cold-read.md` is written — the checklist
   must be a read of the evidence, not a memory of the page.
5. Server killed by PID after capture (leave no orphan on 8791).
6. `progress.md` updated, then a single commit staging **only**
   `docs/active/work/T-005-01-03/` (git status carries Lisa-owned ticket /
   provenance modifications that must not be swept in), message
   `docs(demo): T-005-01-03 projector and phone cold-read evidence`.
7. `review.md` last.

## Boundaries

- **Read-only**: `src/pages/index.astro`, layouts, styles, `wrangler.jsonc`,
  `.dev.vars` (its *values* appear in no artifact), `tests/**` (sibling
  T-005-01-02's territory), `scripts/**`.
- **Processes**: one `wrangler dev --port 8791` (background, PID-tracked),
  one short-lived chromium. Nothing on 4323/8787.
- **Git**: one evidence commit + one review commit at most; explicit paths,
  never `git add -A`. Ticket frontmatter untouched (Lisa owns transitions).
