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
5. **Ephemeral collaborative demo environments** — hand a teammate a preview link and a browser IDE for an isolated, editable session, and promote the best session to the stable demo URL — turning "here's the repo, set it up" into "here's the app, here's your editor." (PRD in hand; decisions recorded in `docs/knowledge/demo-environments-decisions.md`; a proposed E-004 board is staged in `docs/active/pm/`.)
