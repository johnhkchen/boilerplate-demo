# Vend — Demand (the pull board)

Thin demand **signals**, not epics — one line of "what + why it might matter." Epics are
**pulled** from here just-in-time when there's capacity; clearing (signal → epic →
stories/tickets) happens on pull, never ahead of demand. Cleared signals crystallize to
one line in `docs/archive/demand-cleared.md` and are deleted from here.

---

1. **Rapid-assembly playbook** — guide the golden few-shot context from sponsor material and core demo moment into tested code and Vend-ready follow-up signals.
2. **Day 2 productization paths** — add users, admin access, billing, persistence, editable content, email, and monitoring without rebuilding the proven demo.
3. **Independent project handoff** — rehearse transfer of code, Cloudflare resources, domains, data, configuration, checks, and rotated secrets to a new owner.
4. **Optional portfolio registry** — track demo health, analytics, versions, errors, and showcase metadata without becoming a runtime dependency.
5. **Boundary-agnostic integration harness** — the checks hardcode the receipt exemplar's path, shape, secret, and page heading, so Day 1's core move (replace the slice behind the seam) silently invalidates them.
6. **Collision-free go-public for copied projects** — deploy identity (Worker name, route, D1 id) is baked into `wrangler.jsonc`, so any non-generated copy that deploys risks overwriting the source project's production Worker.
7. **Agent-proof check environment** — the harness neutralizes only `CODEX_THREAD_ID` while Astro's agent detection daemonizes dev servers, making check evidence untrustworthy in exactly the sessions the playbook targets.
8. **Failure-status carry-through at the seam** — `operation-runner` collapses upstream 401/404/503 into `operation|timeout`, so replacement boundaries cannot stay status-faithful to their api-docs.
