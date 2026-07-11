# Design brief — Fernway Trace demo (stand-in for the Figma link)

What the sponsor's designer would have dropped in the event channel. These
are constraints, not pixel law: keep the template's structure and its
failure narration; dress the one screen that matters.

## The one screen

Recipient's view, single column:

1. A parcel ID, already filled with `FW-2417-DEMO`.
2. One primary action: **"Track my parcel"** — the words the booth staff
   say out loud, so keep them.
3. While waiting: honest progress ("asking the scan network…"), never a
   frozen spinner.
4. Result: a **scan event card** — event name in plain words ("Departed
   Rotterdam sort hub"), timestamp, and a small "verified ✓" mark only when
   the checksum recomputes.
5. On failure: say what failed in one sentence. Fernway's brand position is
   "honest events"; a vague error contradicts the product.

## Palette

| Role | Hex |
|---|---|
| Fernway green (primary action) | `#1f6f54` |
| Scan amber (in-transit accents) | `#d98e2b` |
| Signal red (exceptions only) | `#b3362c` |
| Paper (background) | `#f7f5f0` |
| Ink (text) | `#20241f` |

Use green for the action and the verified mark; amber only while a parcel
is moving; red only for `exception` states and failures. Never use red for
"loading."

## Type and tone

- Type: a friendly serif for the parcel status line, a plain sans for
  everything else — the sponsor's site pairs them this way.
- Tone words from marketing: *accounted for, honest, unhurried.*
- Voice: recipient-first ("Your parcel left Rotterdam this morning"), not
  logistics-first ("Line haul departure recorded").
