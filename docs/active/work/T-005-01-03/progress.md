# T-005-01-03 — progress

Tracking against plan.md. All steps ran in one session, 2026-07-10.

## Completed

- [x] **Step 1 — fresh build.** `npm run build` clean. Verified
  `dist/client/index.html` carries the recomposition: exactly one
  `class="clay-button …"` element (the second string hit is an inlined CSS
  selector, as T-005-01-01's review documented), the "Ask for a fresh
  note" label, and `href="/backstage"`. Tree = `2ad2e2d`, `src/` unchanged
  since `c6a8045`.
- [x] **Step 2 — serve.** `npx wrangler dev --port 8791` (background,
  harness-tracked). `/api/receipt` answered valid JSON
  (issuedAt/nonce/signature) on the first poll (~1s).
- [x] **Step 3 — capture.mjs.** Written to the work dir per structure.md;
  `node --check` clean.
- [x] **Step 4 — capture.** Exit 0; four PNGs at expected dimensions
  (1920×1080, 1920×2045, 750×1334, 750×3446 — the phone pair is 375-wide
  at DSF 2). Each visually inspected: receipt filled in all captures, no
  loading/error state shipped.
- [x] **Step 5 — back-of-room resample.** `sips --resampleWidth 480` →
  480×270; inspected — this copy drove the projector-distance judgments.
- [x] **Step 6 — server killed.** Background task stopped; port 8791
  released.
- [x] **Step 7 — cold-read.md.** Three AC questions judged from the PNGs
  alone. Q1 pass, Q3 pass, Q2 pass-on-phone but **not checked off** at
  projector distance; two named follow-ups filed (F-005-01-03-1
  below-the-fold primary action, F-005-01-03-2 eyebrow legibility at
  distance) per the AC's fails-are-filed rule.
- [x] **Step 8 — this file + evidence commit** (staging only
  `docs/active/work/T-005-01-03/`; Lisa-owned ticket/provenance
  modifications left unstaged).

## Remaining

- Step 9 — review.md (next, then stop; Lisa owns phase/status).

## Deviations from plan

- None material. Port 8791 was free; no fallback needed. The receipt
  filled on first load in both contexts, so the error-state contingency
  never triggered.
- The cold read produced two follow-ups rather than zero or one — that is
  an expected outcome class (plan §Risks), not a deviation: the ticket
  files findings, it does not fix them.
