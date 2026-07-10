# Demo Runway — Charter

## Value function

Allocate effort when it shortens the path to a trustworthy public demo, reveals broken
integrations sooner, improves stakeholder/developer synchronization, or makes a successful
demo easier to productize, preserve, and hand off. Prefer executable leverage that will be
reused across demos over speculative support for a particular product shape.

## Invariants (P1–P7)

- **P1 — public before deep ideation.** Put a functioning public site in the team's hands
  before errors, architectural guesses, and product discussion accumulate.
- **P2 — the demo works observably.** Prove the core moment end to end; stalled or broken
  boundaries become explicit evidence quickly instead of an indefinite spinner.
- **P3 — the room and phone both work safely.** The demo is legible on a projector, usable
  on a phone, and keeps every server-side key out of browser bundles and ordinary feedback.
- **P4 — collaboration has no workplace tax.** Teammates, stakeholders, and their agents
  exchange structured context with little setup and without mandatory new accounts.
- **P5 — interest has a short revenue path.** A proven demo can add registered users, admin
  access, persistence, and billing without rebuilding its core.
- **P6 — every project is sovereign.** Idle hosting is effectively free; the project remains
  independently ownable, operable, and transferable without the author's central services.
- **P7 — fleet support stays optional.** Portfolio analytics, uptime checks, and unified
  support may improve a fleet but never become an individual project's runtime dependency.

## Non-goals (N1–N5)

- **N1 — not a universal application framework.** The idea drives product code.
- **N2 — not an all-provider abstraction layer.** Prepare seams and playbooks only where
  repeated evidence earns them.
- **N3 — not a mandatory SaaS control plane.** Central collaboration and registry services
  are optional implementations of portable contracts.
- **N4 — not automated theater.** Checks discover hangs and regressions; they do not replace
  human judgment about whether a demo is convincing.
- **N5 — not framework-by-inertia.** React, Tailwind, databases, storage, authentication,
  and CMS products enter only for a concrete idea-driven reason.

## Admission tests

Work is valuable when it does at least one of the following without materially weakening
an earlier priority:

- removes setup repeatedly performed across hackathons;
- reduces time to discover an integration, deployment, or UX failure;
- replaces stale explanatory state with tests, traces, or machine-checkable contracts;
- improves the golden few-shot context before Lisa's heavier RDSPI loop is worthwhile;
- gives an agent a reliable seam or playbook while allowing idea-driven implementation;
- makes collaboration work for entrepreneurs, designers, or PMs without requiring a new
  workplace or account;
- enables authentication, billing, persistence, editable content, monitoring, or handoff
  after the demo proves demand.

## Guardrails

- Cloudflare-first is allowed; mandatory dependence on a centrally maintained platform is
  not.
- Shared primitives must use composition over inheritance and remain light when unused.
- Do not pre-bake domain behavior or create a universal provider abstraction layer.
- React, Tailwind, databases, storage, authentication, and CMS products are choices, not
  defaults introduced by inertia.
- Automated checks catch hangs and obvious regressions; they do not claim to replace human
  judgment of demo quality.
- Agents run tests, inspect traces, and reproduce issues before asking a human to find bugs.
- Secrets never enter browser bundles, repositories, stakeholder comments, or ordinary chat.
- Template-development plans, history, and demand must not leak into generated projects.
- New projects initialize Vend and Lisa fresh; the template provides compatible seams only.

## Evidence of value

- A new repository reaches a working public URL before deep product ideation.
- The initial page has no long compute cold start and idle hosting is effectively free.
- The main Playwright flow cannot wait forever; long operations report progress or fail
  explicitly under a defined time budget.
- A semi-technical teammate can ask an agent to create a feature branch and open a PR.
- A stakeholder can submit structured context through a shared-passcode surface without
  registering, and a coding agent can retrieve it.
- A successful project can add users and revenue or transfer to a new owner without a rewrite.
