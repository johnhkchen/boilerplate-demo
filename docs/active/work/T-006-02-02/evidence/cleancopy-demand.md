# Vend — Demand (the pull board)

Thin demand **signals**, not epics — one line of "what + why it might matter." Epics are
**pulled** from here just-in-time when there's capacity; clearing (signal → epic →
stories/tickets) happens on pull, never ahead of demand. Cleared signals crystallize to
one line in `docs/archive/demand-cleared.md` and are deleted from here.

_Board minted by the S-006-02 playbook dry run (rehearsal session 2026-07-11); every
signal below is a leftover from that session's Step 11 sweep._

---

1. **Playbook Step 2 omits declaring a new credential** — a new sponsor secret placed only in `.dev.vars` is silently dropped by the dev runtime unless declared in `wrangler.jsonc`, so a first-time builder stalls on `boundary_misconfigured`.
2. **No collision-free clean-copy deploy** — `npm run deploy` from a copy would overwrite the source project's `demo-runway` Worker, `demo.b28.dev` route, and production D1; blocks going public (P1) for a rehearsal and risks production.
3. **Step 5 rename list is incomplete** — `tests/demo-flow.spec.ts` hardcodes the `Demo Runway` heading (lines 32, 101) outside the contract constants, so "rename in one change" is not yet true.
4. **The harness is receipt-bound** — `ops:check`/`integration:check`/`leak:check` hardcode `/api/receipt`, the receipt shape, and `DEMO_SIGNING_KEY`, so replacing the slice behind the seam (the core Day-1 move) silently invalidates the safety checks.
5. **Checks lie inside coding-agent sessions** — Astro daemonizes `astro dev` under agent environments and stale servers with per-run keys answer the probes, so red and green are both untrustworthy without stopping daemons and stripping agent markers first.
6. **A clean copy has no demand board until one is minted** — `docs/active/demand.md` (this file) had to be created by hand before Beat 4 had anywhere to write; `vend init` covers generated projects only.
7. **`npm install` is not turnkey where postinstall scripts are blocked** — `workerd`/`sharp`/`esbuild` need approving on stricter setups or `wrangler` may not run.
8. **`ops:check` reports a stalled boundary as `[operation]`, not `[timeout]`, under `astro dev`** — the `[timeout]` evidence comes only from the flow check, so the exit-gate wording overstates what the ops probe proves.
9. **Replacement boundaries lose upstream status granularity** — `operation-runner` collapses 401/404/503 into `operation|timeout` (the parcel slice returns 502 where the api-doc says 404).
10. **Webhook push updates are mentioned on the sponsor site but undocumented** — the packet's honest unknown; not built in the slice, might matter to a live sponsor demo.
11. **The `sdk/` input class is unusable by design** — the packet's intake unknown; no SDK path was exercised, so an SDK-first sponsor would hit unmapped ground.
