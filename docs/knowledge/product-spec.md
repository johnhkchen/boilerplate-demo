# Demo Runway — Product specification

## Problem

Hackathon demos repeatedly spend their best early context on undifferentiated setup: choosing
a web framework, establishing a deployment, deciding where generated media belongs, hiding
API keys, translating a design brief, and inventing browser-to-server-to-provider connectors.
Fresh or changing sponsor APIs then require live documentation research and several attempts.
An agent can eventually build the system, but a planning-heavy loop charges roughly the same
five-to-ten-minute overhead for tiny fixes as for meaningful tasks.

Demo Runway reserves the golden first one or two contexts for high-agency, few-shot work on a
known foundation. Vend captures what remains; Lisa's RDSPI loop begins once work is substantial
enough to justify its research and planning overhead.

## Primary user and setting

The initial user is the template author: a technically strong hackathon attendee who commonly
teams with entrepreneurs, designers, and product managers. Collaborators may operate their own
coding agents but should not need repository expertise or a newly provisioned communication
workspace to contribute.

Inputs commonly include sponsor websites, current API documentation, GitHub examples, a Figma
brief or screenshots, SDKs, and temporary API credentials. The product idea and provider mix
change every event.

## Lifecycle

### Prepare

Maintain the template, executable tests, assembly playbook, and optional provider recipes before
an event. New projects are created as clean GitHub template repositories without this template's
commit history or planning artifacts. The user runs `lisa init` and `vend init` themselves.

### Day 1: prove and present

1. Create the repository and deploy the already functioning generic site through Cloudflare's
   happy path using the user's account.
2. Identify the core feature or demo moment and point the coding agent at sponsor references.
3. Share the live site and repository early so teammates can branch, contribute, and share the
   useful results of their own agent conversations.
4. Implement one real end-to-end vertical slice in one or two high-agency contexts.
5. Use tests, traces, time budgets, and visible failure states to find broken boundaries early.
6. Put unresolved work onto Vend's pull board and let Lisa build graph-ready tickets.

Day 1 is complete when the app has a public responsive URL, a convincing core path, no exposed
keys, a stakeholder feedback link, an automated smoke path, explicit timeout/failure behavior,
and analytics readiness.

### Day 2: productize

When people want to try the demo, add real users and potential revenue without rebuilding the
application. The assembly playbook should support custom domains, authentication, admin access,
billing, durable user data, editable content, transactional email, error monitoring, analytics,
and portfolio registration. Integrations must not block the revenue path.

### Preserve or hand off

Each project is sovereign. It may optionally join a central portfolio, analytics, or support
service, but must continue to function without that service. A rehearsed handoff transfers or
recreates the repository, Cloudflare resources, domain, data, configuration, and operational
checks. Secret values are rotated and re-entered by the recipient rather than copied through
ordinary collaboration channels.

## Product surfaces

### Public demo

- Astro foundation with a Cloudflare deployment adapter.
- Static-first initial page with effectively free idle hosting and no long compute cold start.
- Projector-readable typography, contrast, controls, progress, and results.
- Mobile-first responsive layout and touch targets.
- A polished default design system that can yield to stakeholder Figma direction.
- No mandatory React application; Tailwind or client islands are added only when they earn their
  place.

### Integration harness

- Secret-safe server endpoint boundaries with environment validation.
- Composable primitives for submit, progress or heartbeat, polling, timeout, retry, failure, and
  browser-compatible results.
- A fake slow integration proving success, failure, and stalled-operation behavior before real
  credentials arrive.
- Expected-duration and hard-time-budget support so a subroutine cannot silently run forever.
- Structured tracing with correlation identifiers, boundary timings, safe summaries, and redaction.
- User-visible errors useful enough for an agent to search without exposing sensitive details.
- Clean seams for text, images, video or other embeddable output; object storage, relational,
  vector, and graph data; analytics; content; identity; and payments.

These are capability seams and assembly guidance, not preselected provider implementations.

### Stakeholder backstage

- Visually separate from the audience-facing demo.
- Inviteable by airdropped, emailed, or spoken project link plus a shared Day 1 passcode.
- No account registration for initial collaboration; magic links and roles may arrive on Day 2.
- Accept text, pasted images, links, API/document references, personas, feature requests, and
  comments tied to a page or section.
- Support a one-to-two-minute refresh cycle; hard real-time delivery is unnecessary.
- Make new input available through stable machine-readable interfaces suitable for a repo-local
  CLI, JSON API, or later MCP adapter.
- Clearly label its known security level. Refuse secrets and direct collaborators to a separate
  secure exchange; initially, the owner enters credentials directly in Cloudflare.
- Permit either per-project hosting or an optional central implementation of the same portable
  contract.

### Agent and teammate workflow

- One-command local development after cloning and a checked-in environment-variable template
  containing no secrets.
- Formatting, linting, type checks, Playwright, and PR validation on a feature branch.
- Previewable work so a semi-technical teammate can tell an agent to implement a feature and open
  a pull request.
- Tests and programs carry current truth where possible. Prose captures durable intent, security
  boundaries, and playbook guidance rather than narrating transient implementation state.
- Structured intake forms help the user and agent identify the demo moment, stakeholders,
  references, providers, personas, unknowns, and acceptance evidence.
- Vend-ready signals capture unfinished integrations, disproven assumptions, UX gaps, reliability
  work, deployment concerns, and opportunities found during implementation.

## Testing philosophy

Human testing is the gold standard for whether a demo is convincing. Automated evaluation is a
fast issue-discovery system, not a substitute and not a score easily optimized without delivering
value.

- Use TDD to wear in the intended template path.
- Test the public happy path and meaningful failure/timeout states with Playwright.
- Make waits bounded and collect actionable traces on failure.
- Check the deployed surface rather than only a mocked local implementation when feasible.
- Require the coding agent to execute checks and inspect evidence before delegating discovery to
  a human.
- Add smoke monitoring through the future portfolio registry so dormant demos do not silently rot.

## Explicit non-goals

- A universal application framework.
- An all-provider abstraction layer.
- A mandatory SaaS control plane or central Phoenix application.
- A catalog of speculative, pre-baked product integrations.
- Automatic proof that a subjective demo experience is good.
- Always-on servers, paid idle machines, or ninety-second initial-page cold starts.
- Framework choices justified only by industry habit or agent familiarity.

## Initial delivery sequence

1. Deployable Astro/Cloudflare foundation and adaptable design system.
2. Executable integration harness, tracing, timeouts, and Playwright.
3. Stakeholder backstage surface and portable agent-readable protocol.
4. Rapid-assembly discovery and build playbook.
5. Day 2 authentication, payments, persistence, CMS, email, monitoring, and handoff playbooks.
6. Optional portfolio registry, analytics, uptime checks, and fleet support.
