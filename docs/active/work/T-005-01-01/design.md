# T-005-01-01 — verb-forward-index-recomposition — Design

Options considered, tradeoffs, and the decided shape. Grounded in
`research.md`; no code yet.

## The three design questions

1. **What is the one primary action, and what does it do?**
2. **Where does the backstage path live, and what does it look like?**
3. **How are the template slots marked in frontmatter?**

Plus a cross-cutting one: how do the labels go verb-forward without breaking
the Playwright heading contract (`h1` must render "Demo Runway")?

## Q1 — the primary action

### Option A: clay-button anchor that scrolls to the receipt card

Cheap, static, zero script change. Rejected: on a one-viewport page the
scroll is a no-op, so the button *looks* pressable but does nothing — a
direct violation of the kit's "what looks pressable is pressable" rule, and
it gives T-005-01-02 nothing observable to assert ("exists and **responds**
within the flow budget").

### Option B: clay-button routes to /backstage

Makes the stakeholder path the hero. Rejected: the AC treats the primary
action and the leave-a-note link as two distinct things ("exactly one
element styled as the clay-button primary action is present, **a link**
labeled in leave-a-note terms routes to /backstage"). Collapsing them leaves
the page's own demonstrable capability (the live server answer) without an
affordance, and makes the template slot mean "the stakeholder path" rather
than "the demo's action" — the wrong inheritance for generated demos.

### Option C (chosen): clay-button asks the server for a fresh signed note

A `<button type="button" id="primary-action" class="clay-button">` inside
the receipt card, labeled from the frontmatter slot ("Ask for a fresh
note"). Clicking re-runs the existing receipt fetch: status returns to
"Asking the server…", the well refills with a new nonce/signature.

Why this wins:

- **Genuinely responds.** The press has a visible, server-backed
  consequence — exactly what T-005-01-02 needs to assert within the flow
  budget, and honest per N4 (it proves the action responds, nothing more).
- **Right template semantics.** In a generated demo, "the primary action"
  is *the demo's one thing* (run the query, plan the garden, deal a hand).
  The slot's placeholder should therefore act on the demo's live boundary,
  which here is `/api/receipt`.
- **Cheap and contained.** The fetch logic already exists; wrapping it in a
  reusable function and wiring one click listener is the whole script
  change. No new API, no lib changes (both out of scope anyway).
- **Stalled-project safe.** The button is static HTML; the stalled
  Playwright project only stalls the fetch, and the initial-load behavior
  (status text holds) is unchanged.

In-flight handling: disable the button while a request is pending (mirrors
backstage's "Sending…" submit pattern) so double-taps don't race, re-enable
in `finally`. On refetch, hide `#receipt-body` and show `#receipt-status`
again so the `aria-live="polite"` region narrates the round trip.

## Q2 — the backstage path

### Option A: a line + link inside the identity card

Compact, but buries the stakeholder path in prose — on a projector it reads
as body text, and the identity card ends up labeling two different "do"s
(read who this is + go leave a note), muddying the verb-forward frame.

### Option B (chosen): a third compact clay-surface card

The page keeps its established vocabulary — each section is a card, each
card carries one verb-forward label and one job:

1. Identity card — *orient* ("Start here" / name / what this page is).
2. Receipt card — *watch and act* ("Watch the server answer" + the button).
3. Note card — *leave a note* ("Leave a note for the team" → `/backstage`).

The link is a plain styled anchor (`id="backstage-link"`), accent-colored
and underlined, **not** `.clay-button` — AC 2 caps the page at exactly one
clay-button. Its text is in leave-a-note terms ("Leave a note for the
team"), matching backstage's own warm vocabulary ("pass a link or a note
straight to the team"); the word "backstage" may appear in supporting copy
as wayfinding (it's the destination page's actual name) but the label leads
with the verb.

Rejected: a footer/nav treatment — the page has no nav shell, and inventing
one for a single link is scope creep into BaseLayout (untouched by this
story).

## Q3 — the template slots

A clearly-fenced block at the top of the frontmatter, comment-marked so a
generated project (or its coding agent) cannot miss it:

```ts
// ─── Template slots ─────────────────────────────────────────────
// Every generated demo names these from its idea. The rest of the
// page copy leans on them, so renaming here reshapes the surface.
const DEMO_NAME = 'Demo Runway';
const PRIMARY_ACTION_LABEL = 'Ask for a fresh note';
// ────────────────────────────────────────────────────────────────
```

- `DEMO_NAME` replaces today's `name` const; `<h1>{DEMO_NAME}</h1>` renders
  the same string, so the Playwright heading assertion stays green.
- `PRIMARY_ACTION_LABEL` renders as the clay-button's text — one string,
  one slot, the exact hook T-005-01-02 will read from the contract side.
- `tagline` / `title` / `description` stay as ordinary consts below the
  fence (title derives from `DEMO_NAME` via template literal), because the
  AC names exactly two slot strings: the demo name and the primary-action
  label. Fencing more than asked would dilute "clearly marked".

Rejected: a separate config module (`src/demo.config.ts`). Cleaner in
theory, but the story scopes changes to `index.astro`, N5 forbids content
tooling, and a second file weakens the "obvious slot in the page you're
already editing" property the ticket asks for.

## Cross-cutting — verb-forward labels without breaking contracts

Division of labor: **eyebrows carry the verbs, the h1 carries the name.**
AC 1 accepts "eyebrow/heading" — either may state the action — and the
brand rule "names are wayfinding" plus the pinned heading assertion both
argue the h1 stays `{DEMO_NAME}`.

| Section | Eyebrow (verb-forward) | Heading |
| --- | --- | --- |
| Identity | "Start here" | `{DEMO_NAME}` (h1, pinned by test) |
| Receipt | "Watch the server answer" (ticket's own example) | "A signed note, made just now" (kept) |
| Note | "Leave a note" | "Pass the team a thought" (h2, verb-forward) |

Ledes get a visitor-first rewrite (parlor voice): the identity lede tells
the visitor what they can do on this page (watch the card below answer,
leave the team a note) instead of describing the template to its maker.
Agent-facing sentences ("point your coding agent at it") move out of
visitor copy — that instruction lives in README/CLAUDE.md, not on the
public page. No passcode value, no team-internal detail enters the copy;
the note card may say the team gave you a passcode only in the same public
terms backstage already uses — and the safer default is to leave passcode
mention to backstage itself.

## What deliberately does not change

- Receipt well DOM: `#receipt-status`, `#receipt-body`, `#receipt-issued`,
  `#receipt-nonce`, `#receipt-signature` — Playwright contract.
- The one-shot fetch on page load (stalled-project behavior intact); the
  payload validation (`isReceiptPayload`) is reused, not rewritten.
- `BaseLayout`, styles files, backstage, all of `src/lib/*`, tests.
- Token-only styling invariant: all new CSS values resolve from `var(--…)`.

## Risks and mitigations

- **Two clay-buttons by accident** (e.g. styling the backstage link as a
  button for visual balance): guarded by an explicit grep of built HTML in
  the plan's verification step (`clay-button` count = 1 in `dist/index.html`).
- **Refetch races / double-click**: button disabled while in flight.
- **Copy drift into jargon**: final copy pass checked against the brand
  voice test (kitchen-table read, verb-forward, no category words).
- **Leak check needs a live server**: run `wrangler dev` (preview script)
  in the background for the response half; asset half runs off `dist/`.
