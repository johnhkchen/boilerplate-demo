# Design — T-007-01-01 map-transfer-surface

_Options, tradeoffs, decision. Grounded in research.md and the actual repo._

## The decision to make

This ticket produces a documentation artifact, not code. The real design questions
are: (a) what SHAPE the inventory takes so it is genuinely useful to the rehearsal
and the coupling pass that extends it, (b) where it lives and what it is named, and
(c) how much it says now vs. leaves for T-007-01-02.

## Constraints carried from Research

1. **Seven fixed categories** — repo, Cloudflare resources, domain, data,
   configuration, secrets, checks. The story's acceptance enumerates them; the
   artifact must cover all seven, in this vocabulary.
2. **Every entry cited** — a real file, binding name, or config key. No abstract
   claims. This is the story's hard line ("never asserted in the abstract").
3. **The coupling pass extends this file** — S-007-01 DAG: T-007-01-02
   (flag-author-couplings) "then extends the same artifact." So the structure must
   leave an obvious, per-category slot for a coupling entry that a second pass fills.
4. **No runtime code touched** — docs only.
5. **Two deployables** — the map must span `wrangler.jsonc` and
   `wrangler.sessions.jsonc`, not assume one Worker.

## Option A — Seven prose sections, one per category

A narrative paragraph per category naming its seams.

- **For**: readable; low ceremony.
- **Against**: prose hides whether every seam is actually cited; hard for the
  coupling pass to attach a structured entry per category; skimming for "what binds
  to the author" is slow. Weak against the "cited, not abstract" bar because prose
  invites hand-waving.

## Option B — One table, rows = categories, columns = seam / citation / (coupling)

A single seven-row table. Columns: Category · Concrete seam(s) · Citation
(file/binding/key) · Coupling-to-author (reserved for T-007-01-02).

- **For**: forces a citation cell per row — you can SEE a blank; directly serves the
  "cited" bar. Reserves a coupling column the sibling ticket fills without
  restructuring. Fast to skim.
- **Against**: several categories have many seams (Cloudflare resources, secrets); a
  single cell per row gets cramped and loses the app-vs-session distinction.

## Option C — Per-category subsection, each with a citation table + a reserved "Author coupling" line

Hybrid: one `##` per category. Inside each, a small table of `seam → citation →
what it is`, plus a standing **"Author coupling (T-007-01-02):"** line marked
_pending_. A short header maps the two-Worker split once.

- **For**: keeps every seam individually cited (Option B's rigor) without cramming
  many seams into one cell (fixes B's weakness); the explicit pending line makes the
  hand-off to the coupling pass unmissable and satisfies its "each category carries a
  cited coupling entry" acceptance by pre-cutting the slot. Handles the app/session
  split cleanly per category.
- **Against**: longer than A or B. Acceptable — ~200-line budget covers it.

## Decision — Option C

Per-category subsections, each with a citation table and a reserved coupling line.

**Why:** it is the only option that structurally enforces the story's non-negotiable
("every category mapped to a real file/binding/config key") while making the sibling
ticket's job mechanical rather than a rewrite. Option B's single table is close but
would flatten the Cloudflare-resources and secrets rows — precisely the categories
with the most seams and, later, the most author couplings — into unreadable cells.
Option A fails the citation bar by construction. The reserved "Author coupling"
line is the load-bearing design choice: S-007-01 says T-007-01-02 *extends this same
artifact*, so pre-cutting a labeled, empty slot per category is the difference
between "extend" and "restructure."

## Artifact name and location

- Location: `docs/active/work/T-007-01-01/` (acceptance names this dir).
- Name: **`transfer-surface-inventory.md`**. Rationale: "inventory" is the story's
  own word ("An inventory artifact exists…"); the name says what it is. It sits
  alongside the RDSPI artifacts (research/design/…); those describe the *work*, this
  IS the deliverable the acceptance checks.

## What this artifact does NOT do (deferred to T-007-01-02)

- It does not *judge* couplings (which seam breaks on handoff, why). It records the
  seam and the fact of a binding; the coupling column is left `pending`. Writing the
  coupling verdict is the sibling ticket's acceptance, not this one's, and that
  ticket is routed `agent: codex` for the adversarial read — respect that boundary.
- It does not rotate, transfer, or call any Cloudflare API (story boundary).

## Shape of each category entry (blueprint for Structure)

```
## N. <Category>
<one-line: what "transferring" this category means>

| Seam | Cited at | What it is |
| ---- | -------- | ---------- |
| ...  | file:key | ...        |

**Author coupling (T-007-01-02):** _pending — the sibling ticket flags the exact
binding to the author's account/zone/central services._
```

Plus a top matter block: title, the two-Worker split, a legend for citation style
(`file` · `file:binding` · `file:key`), and a one-line honest-boundary note.

## Verification thinking (for Plan)

"Done" is checkable statically: seven categories present, each with ≥1 cited seam
that resolves to a real file/binding/key in the repo. The Plan defines a grep-style
self-audit that confirms every citation names something that exists.
