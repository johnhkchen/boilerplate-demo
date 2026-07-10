# Structure — T-003-02-02 phone-friendly-backstage-form

File-level blueprint. Not code — the shape of the code, its boundaries, and change ordering.
No server module changes; the route/gate/store/seam are consumed as shipped.

## Files created

### `src/pages/backstage.astro` (new page, the deliverable)

Static-first page (no `prerender` opt-out → prerendered asset). Three parts, matching
`index.astro`'s shape:

1. **Frontmatter** — `import BaseLayout`; local consts for `title`, `description`, and the
   entry-type option list (`[{ value:'reference', … }, { value:'feedback', … }]`) so markup and
   the client hint logic share one source. No secrets, no env reads.

2. **Markup** — inside `<BaseLayout>`:
   - A `<main>` with one intro `.clay-surface` card: eyebrow, `<h1>Backstage</h1>`, tagline, a
     plain lede, and the honest security-level line (shared low-stakes knock; don't paste
     passwords/keys).
   - A second `.clay-surface` card containing the `<form id="backstage-form" novalidate>`:
     - Passcode: `<label for="bs-passcode">` + `<input id="bs-passcode" type="password"
       autocomplete="off" inputmode="text" required>` + helper text.
     - Type: `<fieldset>` + `<legend>` + two `<label><input type="radio" name="bs-type"
       value="reference|feedback"></label>` controls (reference default-checked).
     - Link: `<label for="bs-url">` + `<input id="bs-url" type="url" inputmode="url"
       autocapitalize="none" autocorrect="off">` + a helper whose text distinguishes
       "required for a reference / optional for feedback".
     - Note: `<label for="bs-text">` + `<textarea id="bs-text" required>` + helper.
     - An inline error region `<p id="bs-error" role="alert" aria-live="assertive" hidden>`.
     - Submit: `<button type="submit" class="clay-button">Send it over</button>`.
   - A confirmation panel `<section id="bs-confirm" class="clay-well" aria-live="polite" hidden>`
     with a heading (focus target), a short "with the team now" line, an echo of what was sent
     (type + optional link + note, in a `<dl>` like the receipt card), and a
     `<button id="bs-again" type="button">Send another</button>`.

3. **`<script>`** (browser module, no secret) — progressive-enhancement controller:
   - Grab elements by id; if the form is absent, no-op.
   - `updateUrlHint()` reacts to the selected type (reference ⇒ link required/emphasized).
   - On `submit`: `preventDefault`; read fields; run light client validation (non-blank text;
     for `reference` a non-empty http(s) link; length ceilings mirroring the server) and, on
     failure, show `#bs-error` and focus the first bad field — no network call.
   - Build the exact payload `{ type, url, text }` (url = trimmed value or `''`). POST to
     `/api/backstage/entries` with headers `content-type: application/json` and
     `x-demo-passcode: <passcode>`. Disable the button + set a "sending…" state while in flight.
   - On 201: read `{ entry }`, fill the confirmation `<dl>`, hide the form, reveal `#bs-confirm`,
     move focus to its heading. On 401/403: inline "that passcode didn't work" near passcode.
     On 422: show the server `issues`. On other/network failure: a friendly retry message.
     Always re-enable the button on any non-success path.
   - "Send another": clear text/url (keep passcode in memory via the field), hide confirmation,
     reveal the form, focus the note field.

4. **`<style>`** (scoped) — page-only rules, token-valued exactly like `index.astro` (every
   color/space/radius/shadow/font is `var(--…)`; only `1px` hairlines allowed bare). Styles the
   new form controls (input/textarea/radio/fieldset) as clay wells/surfaces with 44px min touch
   targets via `--control-height`, full-width on a phone, `--focus-ring` inherited globally.

### `tests/backstage-flow.spec.ts` (new Playwright spec)

Phone-viewport proof, mirroring `demo-flow.spec.ts`'s `test.step` + budget style:
- Guard: runs only under the `backstage` project (skip otherwise), so healthy/stalled never
  execute it at a desktop viewport.
- Step "open the backstage form" — `page.goto('/backstage')`, assert the `Backstage` heading and
  the passcode field are visible.
- Step "submit a reference from a phone" — fill passcode (`BACKSTAGE_PASSCODE` from the
  contract), pick the reference radio, fill a unique link + a unique nonce note, tap Send, assert
  the confirmation panel and its echoed note become visible.
- Step "confirm it reached the store" — `request.get('/api/backstage/feed', { headers: {
  [PASSCODE_HEADER]: BACKSTAGE_PASSCODE } })`, parse JSON, assert an entry whose `text` equals the
  unique nonce exists with `type: 'reference'` and the submitted `url`.
- Imports `PASSCODE_HEADER` from `src/lib/passcode.ts` (reuse, no literal drift) and the flow
  constants from the contract.

## Files modified

### `tests/support/flow-contract.ts`

- Add `backstage: 'backstage'` to `FLOW_PROJECT`.
- Add `BACKSTAGE_STEP` labels (or extend `FLOW_STEP`) for the three backstage steps.
- Add `BACKSTAGE_PASSCODE` (a fixed local test passcode string) — the single value the
  webServer env and the spec both read, so they cannot drift.
- Bump `FLOW_BUDGET_MS.serverStartup` to absorb the migration step before `astro dev` is ready
  (e.g. 30_000); add a `backstageStep` budget if the receipt budget doesn't fit.

### `playwright.config.ts`

- Add a `backstage` project: `use: { ...devices['Pixel 5'] }`, `testMatch:
  /backstage-flow\.spec\.ts/`.
- Pin `healthy`/`stalled` to `testMatch: /demo-flow\.spec\.ts/` so they don't pick up the new
  spec.
- In the local `webServer` block: prefix the command with
  `npx wrangler d1 migrations apply BACKSTAGE_DB --local &&` before `npm run dev …`; add
  `DEMO_PASSCODE: env.DEMO_PASSCODE ?? BACKSTAGE_PASSCODE` to `webServer.env`.
- Keep the external-baseURL path (`PLAYWRIGHT_BASE_URL`) unchanged so integration-check runs
  against an already-running server are unaffected.

### `package.json`

- Add script `"test:flow:backstage": "playwright test --project=backstage"`.
- Leave `test:flow` / `test:flow:stalled` as-is (they now match only `demo-flow.spec.ts`).

## Files deliberately NOT changed

- `src/pages/index.astro` — the backstage stays visually separate and invite-by-link; no nav
  link added.
- Any `src/lib/**` or `src/pages/api/**` — no server behavior changes.
- The ticket frontmatter — Lisa owns phase/status.
- Unrelated dirty/untracked files from other tickets.

## Module boundaries and interfaces (unchanged, consumed as-is)

- HTTP write contract: `POST /api/backstage/entries`, `application/json`, header
  `x-demo-passcode`, body EXACTLY `{ type, url, text }` → 201 `{ entry }` | 401/403/415/422/500.
- HTTP read contract: `GET /api/backstage/feed`, header `x-demo-passcode` → `{ schemaVersion,
  gate, count, entries }`.
- `PASSCODE_HEADER` constant is the one shared token between page script, test, and server.

## Change ordering

1. Page (`backstage.astro`) — the deliverable; buildable/typecheckable on its own.
2. Contract + config + `package.json` — the test harness plumbing (passcode, project, migration).
3. Spec (`backstage-flow.spec.ts`) — depends on 1 and 2 existing.

Each step is independently committable; the spec is last so it can be run green immediately.
