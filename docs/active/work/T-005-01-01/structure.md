# T-005-01-01 — verb-forward-index-recomposition — Structure

The blueprint: exactly what changes where, in what order, with what
interfaces. One product file changes; everything else is verification.

## File-level change map

| File | Change |
| --- | --- |
| `src/pages/index.astro` | **Modified** — the whole ticket |
| `docs/active/work/T-005-01-01/*` | Created — RDSPI artifacts (this set) |
| everything else | Untouched (styles, layout, backstage, lib, tests, scripts) |

No files are created or deleted in `src/`. No dependency, config, or route
changes.

## src/pages/index.astro — internal organization after the change

The file keeps its four-block Astro shape (frontmatter → markup → script →
style). Block by block:

### 1. Frontmatter

```
import BaseLayout …                       (unchanged)

// ─── Template slots ─────────────────────────────────────────
// Every generated demo names these from its idea. The page copy
// leans on them, so renaming here reshapes the surface.
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
// ────────────────────────────────────────────────────────────

const tagline = 'The starting line every demo inherits.';
const title = `${DEMO_NAME} — the starting line every demo inherits`;
const description = …                     (reworded, visitor-first)
```

Public interface of the frontmatter (what other tickets read): the two
fenced const names `DEMO_NAME` and `PRIMARY_ACTION_LABEL`. T-005-01-02 will
assert against the rendered label; T-005-01-03 reads the built page. The old
`name` const is renamed to `DEMO_NAME` (same value) — no other reference
exists.

### 2. Markup — three sections inside `<main>`

**Section 1 — identity card** (`.clay-surface`, `aria-labelledby="title"`)

- eyebrow: `Start here`
- `<h1 id="title">{DEMO_NAME}</h1>` — string unchanged → heading test green
- `.tagline` unchanged
- `.lede` rewritten visitor-first; tells the visitor the page's two moves
  (watch the card below answer; leave the team a note further down). No
  agent-facing copy.

**Section 2 — receipt card** (`.clay-surface.receipt`,
`aria-labelledby="receipt-heading"`, `aria-live="polite"`)

- eyebrow: `Watch the server answer`
- h2: `A signed note, made just now` (unchanged)
- `.lede` trimmed (shorter, same honest content: static page, live card,
  key never leaves the server)
- `.clay-well.receipt-panel` — **byte-for-byte unchanged** (status + dl ids
  are the Playwright contract)
- new, after the well:
  `<button type="button" id="primary-action" class="clay-button primary-action">{PRIMARY_ACTION_LABEL}</button>`
  — the page's only `.clay-button`.

**Section 3 — note card** (`.clay-surface`, `aria-labelledby="note-heading"`)
— new

- eyebrow: `Leave a note`
- `<h2 id="note-heading">Pass the team a thought</h2>`
- `.lede`: one or two sentences — got a link or a bit of feedback for the
  people building this? there's a page for that, no account needed.
- `<a id="backstage-link" class="backstage-link" href="/backstage">Leave a
  note for the team</a>` — plain styled anchor, **not** clay-button.

DOM hooks this ticket exports for the sibling tickets:
`#primary-action` (button), `#backstage-link` (anchor), plus the untouched
receipt ids.

### 3. Script (inline `<script>`, browser-side)

Reorganized from run-once top-level to load-plus-replay, minimal diff:

```
statusEl / bodyEl / set / ReceiptPayload / isReceiptPayload   (unchanged)

async function loadReceipt(): Promise<void>
  — the existing try/catch fetch-validate-fill block, verbatim, plus:
    on entry: show #receipt-status ("Asking the server…"), hide #receipt-body

const button = document.getElementById('primary-action')
button?.addEventListener('click', async () => {
  button.disabled = true
  try { await loadReceipt() } finally { button.disabled = false }
})

await loadReceipt()                        (the initial load, as today)
```

Ordering constraint: listener wiring before the initial `await` so the
button works even while the first fetch is stalled (the stalled Playwright
project holds that promise forever). Initial-load behavior is otherwise
identical: status visible until the fetch resolves, error copy on failure.

### 4. Style block

Token-only additions; no primitive redefinition (`.clay-button` comes from
base.css):

- `.primary-action { margin-top: var(--space-md); }` — rhythm between well
  and button.
- `.backstage-link { … }` — accent color, bold, underlined
  (`text-underline-offset` for touch legibility), `display:inline-flex` +
  `min-height: var(--control-height)` alignment so the tap target meets the
  44px rule on phones without looking like a button.

Everything else in the style block stays; the in-file INVARIANT comment
(token-only values) continues to hold — review greps for literals.

## Invariants preserved (checklist for Implement)

1. `<h1>` renders exactly `Demo Runway`.
2. `#receipt-status`, `#receipt-body`, `#receipt-issued`, `#receipt-nonce`,
   `#receipt-signature` ids and initial hidden/visible states unchanged.
3. Exactly one `class="clay-button"` occurrence in built `dist/index.html`.
4. One `href="/backstage"` anchor with leave-a-note label text.
5. No literal colors/radii/shadows/fonts in the style block (tokens only).
6. No passcode value, signing key, or team-internal detail in any copy.
7. Script stays secret-free: relative fetch + DOM writes only.

## Ordering of changes

Single-file change, one commit is natural, but staged internally:

1. Frontmatter slots (rename `name` → `DEMO_NAME`, add
   `PRIMARY_ACTION_LABEL`, derive `title`).
2. Markup: eyebrow swaps + lede rewrites + button + note card.
3. Script: wrap fetch in `loadReceipt()`, wire button.
4. Style: two new rules.
5. Build + checks (see plan.md for the verification battery).

## Explicitly out of structure

- `tests/**` — T-005-01-02 adds the labeled-action assertion.
- `docs/active/work/T-005-01-03/**` — the cold-read pass artifact.
- Any change to `/api/receipt`, `src/lib/*`, styles files, BaseLayout,
  backstage — read-only context per story scope.
