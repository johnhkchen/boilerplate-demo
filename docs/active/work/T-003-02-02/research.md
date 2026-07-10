# Research — T-003-02-02 phone-friendly-backstage-form

Descriptive map of the repository surfaces relevant to the phone-friendly backstage form.
This phase records what exists and the constraints it establishes; it does not choose an
implementation.

## Ticket contract and position

- Ticket: `T-003-02-02`, high-priority task in story `S-003-02`.
- Current phase in ticket frontmatter: `research`. Status `open`. Lisa owns transitions.
- Context: ship the passcode-gated page where a nontechnical stakeholder submits a reference
  or feedback from a phone with zero account setup.
- Advances charter P4 (collaboration has no workplace tax) and P3 (the room and phone both
  work safely).
- `depends_on: [T-003-02-01]`, the submission route, which is phase `done`.
- Acceptance: on a phone viewport a visitor enters the passcode, submits a reference or
  feedback, and sees a confirmation; the submission then appears in the store — verifiable
  via a mobile-viewport UI check against the running demo.
- The ticket is the client/UI half; the server route, gate, store, and read seam already exist.

## Product and epic context

- Epic E-003 "stakeholder-backstage": a passcode-gated surface where nontechnical collaborators
  submit references, links, and feedback, plus one documented retrieval seam. Advances P4.
- Product spec "Stakeholder backstage": visually separate from the audience demo; inviteable by
  airdropped/emailed/spoken project link plus a shared Day 1 passcode; NO account registration
  for Day 1; accepts text, links, references, feature requests, comments; supports a one-to-two-
  minute refresh cycle (no hard real-time); clearly labels its known security level and refuses
  secrets, directing collaborators to a separate secure exchange.
- Charter P3 guardrail: the shared passcode is a low-stakes gate, not a server secret; real keys
  stay out of browser bundles and must not be solicited in feedback.
- "Done looks like" (E-003): a stakeholder given only the URL + passcode submits from a phone;
  an agent later retrieves that exact submission through the documented seam; no account made.

## The write route this form drives (T-003-02-01, done)

- `src/pages/api/backstage/entries.ts` exports `POST` (`export const prerender = false`).
- Order of checks: gate first (`guardPasscode`), then `content-type` must be `application/json`
  (else 415 `json_required`), then `request.json()` (else 400 `invalid_json`), then
  `validateBackstageSubmission` (else 422 `invalid_entry` with an `issues` array), then store
  presence (else 500 `store_misconfigured`), then `saveEntry` (else 500 `entry_write_failed`).
- Success: HTTP 201 with body `{ entry }`, where `entry` is the persisted `BackstageEntry`
  (four fields incl. the server-stamped `submittedAt`).
- Error bodies: `{ boundary: 'backstage_entries', error: slug, detail, issues? }`.
- The route stamps `submittedAt` server-side; the client must NOT send it.

## Submission validation (`src/lib/backstage-submission.ts`)

- `validateBackstageSubmission(value)` requires an object with EXACTLY the keys
  `type`, `url`, `text` (sorted-key equality — extra or missing keys fail).
- `type` must be `reference` or `feedback` (`BACKSTAGE_ENTRY_TYPES`).
- `url` must be a string, ≤ `MAX_BACKSTAGE_URL_LENGTH` (2048), and either `''` or an http(s)
  URL. Non-web schemes (javascript:, data:, file:, mailto:) are rejected. Empty is valid, so
  feedback need not carry a link.
- `text` must be a non-blank string (trimmed) ≤ `MAX_BACKSTAGE_TEXT_LENGTH` (20000).
- Returns `{ valid: true, value }` or `{ valid: false, issues: string[] }`. The route narrows
  on `'issues' in validation` (a documented TS-narrowing quirk of this repo's config).
- The client should mirror these rules to give friendly inline errors, but the server remains
  the authority; the form is untrusted.

## The shared gate (`src/lib/passcode.ts`, done)

- The passcode is presented in the `x-demo-passcode` request header (`PASSCODE_HEADER`), never
  in the URL, body, or persisted entry.
- Server env var is `DEMO_PASSCODE` (`PASSCODE_ENV`), not `PUBLIC_`-prefixed, so it never
  reaches client bundles. Blank server value → gate fails closed with 500 `gate_misconfigured`.
- Denials: 401 `passcode_missing`, 403 `passcode_mismatch`, 500 `gate_misconfigured`; bodies
  carry `{ gate: 'backstage', error, detail }` and never echo the configured passcode.
- Comparison is exact (no trim/case-fold).

## The read seam used to prove persistence (`feed.ts` + `backstage-retrieval.ts`, done)

- `GET /api/backstage/feed` with header `x-demo-passcode` returns `{ schemaVersion: 1, gate,
  count, entries }`, entries verbatim and oldest-first (insertion order).
- This is the documented seam an agent/CLI uses. A UI test can POST via the form then GET the
  feed with the passcode header to confirm the exact submission landed — closing E-003's loop
  end to end without touching the database directly.

## Persistence and storage (`backstage-store.ts` + D1)

- `saveEntry` / `listEntries` take a D1-shaped handle (`EntryStoreDatabase`) as an argument;
  framework-free. Bound in production/dev as `Astro.locals.runtime.env.BACKSTAGE_DB`.
- Migration `migrations/0001_create_backstage_entries.sql` defines the table with a CHECK on
  `type` and NOT NULL columns; `id` is storage-private and never returned.
- Local dev D1 lives in `.wrangler/state/v3/d1/...` (miniflare), created by
  `wrangler d1 migrations apply BACKSTAGE_DB --local`. The current worktree already has this
  local DB with the table applied and 2 rows from prior tickets' testing.

## Frontend surfaces and conventions

- `src/pages/index.astro` is the only page: a static-first page using `BaseLayout`, clay
  primitives, and tokens. Its live boundary (`/api/receipt`) is fetched by an inline
  `<script>` in the browser and rendered into a `.clay-well` panel with an `aria-live`
  status. This is the exact pattern a static page that talks to an `/api/*` route follows.
- `src/layouts/BaseLayout.astro` owns the document shell, imports `tokens.css` then `base.css`,
  and sets the responsive viewport meta. Every page inherits `.page` (fills viewport, centers,
  gutter, no horizontal scroll on a phone).
- `src/styles/tokens.css`: the single retheme surface. Literal values only here. Relevant:
  `--control-height: 2.75rem` (44px touch target, explicitly "P3"), `--control-padding-x`,
  `--control-radius`, `--focus-ring-*`, spacing scale, `--measure: 34rem`, fluid `--root-font`
  (phone floor 16px → projector ceiling 24px).
- `src/styles/base.css`: clay primitives — `.clay-surface` (raised card), `.clay-well` (inset),
  `.clay-button` (pressable, `:active` recesses), `.clay-chip`. INVARIANT: no literal color/
  radius/shadow/font in base.css or pages — every such value is a `var(--…)` token. Focus-
  visible ring is global. No input/textarea/radio primitive exists yet — the form introduces
  the first form controls in the template.
- Astro config `output: 'static'`: pages prerender to assets; only `/api/*` invokes the Worker.
  A new page under `src/pages/` is a static asset by default (no `prerender` opt-out needed).

## Test infrastructure

- Unit/route tests: Node's built-in runner over `test/*.test.mjs`, importing `.ts` under
  `--experimental-strip-types`. `test/backstage-route.test.mjs` already drives the POST handler
  against real in-memory SQLite running the committed migration — proves both HTTP outcomes and
  post-request store contents, but does not exercise a browser or the page.
- Browser flow: Playwright (`tests/demo-flow.spec.ts`, config `playwright.config.ts`). Two
  projects today — `healthy` and `stalled` — both Desktop Chrome, sharing ONE `webServer`
  (`npm run dev` on port 4323) whose env sets `DEMO_SIGNING_KEY` and
  `CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true'` (which surfaces process env into
  `locals.runtime.env`). Budgets/labels live in `tests/support/flow-contract.ts`.
- No mobile/phone-viewport project exists yet. `devices` from `@playwright/test` provides mobile
  presets (e.g. `Pixel 5`) with `isMobile`, touch, and a phone viewport.
- The webServer env does NOT currently set `DEMO_PASSCODE`, and nothing applies the D1 migration
  before the Playwright dev server starts. Both are prerequisites for a form submission to
  actually persist during a browser test.

## Constraints, assumptions, and open questions

- The passcode gates the *submission* (server-side header check), not the *page view*: the page
  is a static asset served to anyone, consistent with the low-stakes model and static-first
  architecture. Whether the passcode is a persistent "unlock" step or just a form field is a
  design decision, not a server constraint.
- The client must send exactly `{ type, url, text }` as `application/json` with the passcode
  header, and must not fabricate `submittedAt`.
- The backstage is "visually separate" and invite-by-link; the homepage need not link to it.
- The security-level label and secrets-refusal copy are a product-spec requirement for this
  surface, so the page must carry that plain-English notice.
- The worktree has unrelated dirty/untracked files from other tickets; this work should touch
  only new files plus the Playwright config/contract/scripts it must extend, and must not edit
  the ticket frontmatter.
- Open: exact phone device preset, whether to add a dedicated Playwright project vs. reuse, and
  how to guarantee the local D1 schema exists before the browser test — resolved in Design.
