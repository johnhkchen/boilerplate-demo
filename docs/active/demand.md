# Vend — Demand (the pull board)

Thin demand **signals**, not epics — one line of "what + why it might matter." Epics are
**pulled** from here just-in-time when there's capacity; clearing (signal → epic →
stories/tickets) happens on pull, never ahead of demand. Cleared signals crystallize to
one line in `docs/archive/demand-cleared.md` and are deleted from here.

---

1. **Day 2 productization paths** — add users, admin access, billing, persistence, editable content, email, and monitoring without rebuilding the proven demo.
2. **Optional portfolio registry** — track demo health, analytics, versions, errors, and showcase metadata without becoming a runtime dependency.
3. **Collision-free go-public for copied projects** — deploy identity (Worker name, route, D1 id) is baked into `wrangler.jsonc`, so any non-generated copy that deploys risks overwriting the source project's production Worker.
4. **Agent-proof check environment** — the harness neutralizes only `CODEX_THREAD_ID` while Astro's agent detection daemonizes dev servers, making check evidence untrustworthy in exactly the sessions the playbook targets.
5. **Failure-status carry-through at the seam** — `operation-runner` collapses upstream 401/404/503 into `operation|timeout`, so replacement boundaries cannot stay status-faithful to their api-docs.
