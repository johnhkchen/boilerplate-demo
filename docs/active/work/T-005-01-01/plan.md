# T-005-01-01 — verb-forward-index-recomposition — Plan

Ordered, independently verifiable steps. One product file changes
(`src/pages/index.astro`); the battery around it is the real work of proving
the acceptance criteria.

## Steps

### Step 1 — Frontmatter template slots

Edit `index.astro` frontmatter: fenced `// ─── Template slots ───` block with
`DEMO_NAME = 'Demo Runway'` and `PRIMARY_ACTION_LABEL = 'Ask for a fresh
note'`; rename the `name` usage in the h1; derive `title` from `DEMO_NAME`;
reword `description` visitor-first.

*Verify:* `npx astro check` clean for the file (or full `npm run typecheck`
at the end); `grep -c 'DEMO_NAME' src/pages/index.astro` ≥ 2.

### Step 2 — Markup recomposition

- Identity card: eyebrow → `Start here`; lede rewritten (visitor-first,
  names the page's two moves; no agent-facing copy).
- Receipt card: eyebrow → `Watch the server answer`; lede trimmed; add
  `<button type="button" id="primary-action" class="clay-button
  primary-action">{PRIMARY_ACTION_LABEL}</button>` after the well. Well DOM
  untouched.
- New note card: eyebrow `Leave a note`, h2 `Pass the team a thought`, short
  lede, `<a id="backstage-link" class="backstage-link"
  href="/backstage">Leave a note for the team</a>`.

*Verify:* visual read of the diff against structure.md's invariant checklist
(h1 text, receipt ids untouched, one clay-button, backstage anchor).

### Step 3 — Script: load-plus-replay

Wrap the existing fetch/validate/fill block in `async function
loadReceipt()`, add the status-reset lines at its top (show
`#receipt-status` with "Asking the server…", hide `#receipt-body`), wire the
`#primary-action` click listener (disable while in flight, `finally`
re-enable), then `await loadReceipt()` for the initial load. Listener wiring
precedes the initial await (stalled-fetch tolerance).

*Verify:* covered by the flow tests in step 6 (healthy + stalled) and a
manual replay click in step 7.

### Step 4 — Style additions

`.primary-action` margin rule; `.backstage-link` rule (accent, bold,
underline, 44px-aligned tap target). Tokens only.

*Verify:* `grep -nE '#[0-9a-fA-F]{3}|rgb\(|[0-9]+px' src/pages/index.astro`
shows no new literal values (the file's existing 0-hit state preserved;
`1px` hairline exemption not needed here).

### Step 5 — Build + static AC greps (AC 1–4)

```
npm run build
grep -o 'clay-button' dist/index.html | wc -l          # exactly 1
grep -c 'href="/backstage"' dist/index.html            # ≥ 1
grep -c 'Watch the server answer' dist/index.html      # 1
grep -c 'Leave a note for the team' dist/index.html    # 1
grep -c 'Ask for a fresh note' dist/index.html         # ≥ 1
```

(Astro may emit `class="clay-button primary-action"` — count the token, not
the exact attribute. If scoped-style hashing rewrites class attrs, adjust
the grep to the emitted form and note it in progress.md.)

### Step 6 — Existing test battery

```
npm run typecheck            # astro check + tsc + worker types check
npx playwright test --project=healthy --project=stalled
```

The flow specs are the contract this ticket must not break. (Full
`npm test` unit suite doesn't touch the page, but is cheap — run it if time
allows; it's unaffected by design.)

*Known local caveat:* memory notes Playwright flows can exit early under a
Claude Code agent environment; if that reproduces, rerun with the agent env
stripped per the memory note before concluding failure.

### Step 7 — Leak check + live replay (AC 5)

```
npm run preview   # wrangler dev on :4321, background
npm run leak:check
```

Leak check scans `dist/` assets + the raw `/api/receipt` body for
`DEMO_SIGNING_KEY` (from `.dev.vars`). Expect exit 0. While the server is
up, curl `/` and eyeball for passcode/team-internal strings; click-replay
the primary action manually if a browser is handy (optional — the stalled/
healthy specs already cover fetch behavior). Kill the background server
after.

### Step 8 — Commit + progress.md

One commit (single-file product change + artifacts):
`feat(index): verb-forward recomposition with primary action and backstage
path (T-005-01-01)`. Write `progress.md` as steps complete; note any
deviation from this plan with rationale.

## Testing strategy summary

- **No new unit tests**: the change is a prerendered page + inline browser
  script; the repo's unit suite (`test/*.mjs`) covers `src/lib/*`, which is
  untouched. The labeled-action Playwright assertion belongs to T-005-01-02
  by explicit story decomposition — writing it here would collide with that
  ticket's file scope (`tests/`).
- **Regression**: existing healthy + stalled flow projects must pass
  unmodified — they pin the h1 and the receipt lifecycle.
- **Acceptance**: step 5 greps prove AC 1–4 *in the built HTML* (the AC's
  own phrasing); step 7 proves AC 5.

## Rollback / risk notes

- Single file, single commit — rollback is `git revert`.
- If the stalled project fails on the status-reset lines (it shouldn't —
  initial load path is unchanged), the reset belongs inside the click
  handler instead of `loadReceipt()`; that fallback preserves identical
  initial-load semantics by construction. Decide by test output, note in
  progress.md.
- If `wrangler dev` port 4321 is occupied, set `DEMO_BASE_URL` to the port
  wrangler actually binds.
