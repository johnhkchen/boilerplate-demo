# Core moment — chosen for this packet

The single thing the audience must see work (playbook Beat 1, Step 3). This
file is the intake statement, pre-filled so a rehearsal starts from a
settled decision instead of improvising one.

## The moment

> A visitor at the public URL presses **"Track my parcel"** and, within the
> harness's time budget, sees parcel `FW-2417-DEMO`'s latest scan event —
> location, time, and event name — with its checksum verified against the
> documented rule. If the boundary breaks or stalls, the visitor sees a
> named, legible failure instead of a hang.

One labeled action, one boundary call, a bounded wait, verifiable evidence.
Shape-identical to the template's receipt exemplar, so Step 7 is a
replacement behind the same seam (`src/lib/operation-runner.ts`), not new
architecture.

## Intake statement fields

- **Stakeholders**: the Fernway Parcel sponsor booth (fictional), the event
  judges, one nontechnical Fernway PM persona who will submit feedback
  through the backstage door.
- **Personas**: "recipient checking on a package" — the demo is told from
  the recipient's side, not the warehouse's.
- **References**: `sponsor-site/homepage.md` (tone and product framing),
  `api-docs/parcel-status-api.md` (the boundary to build against),
  `design-brief/design-brief.md` (look), `code-examples/track-parcel.mjs`
  (the sponsor's own client idiom).
- **Providers**: one — the Fernway Parcel Status API, implemented locally
  as a stub per the api-docs note. No second provider; resisting a
  speculative one is charter guardrail N5 in miniature.
- **Unknowns**: the `sdk/` class is present but unusable by design (see
  `sdk/sdk-pointer.md`) — carried here as the intake's honest unknown;
  webhook push updates are mentioned by the sponsor site but undocumented,
  deferred as a demand signal, not built.
- **Acceptance evidence to show**: `npm run integration:check` exits 0
  within budget with the parcel slice in place of the receipt slice;
  `OPS_CHECK_URL=… npm run ops:check` green against the live hostname; the
  moment observed working in a fresh browser session at the public URL.
