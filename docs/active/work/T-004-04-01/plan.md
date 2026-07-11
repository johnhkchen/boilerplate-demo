# Plan — T-004-04-01 access-protects-private-surfaces

## Execution principles

- Execute every step in this session and continue through Implement and Review.
- Do not change ticket phase or status frontmatter.
- Re-read shared files before each edit to preserve concurrent sibling work.
- Use `apply_patch` for repository edits.
- Use path-scoped Git staging and incremental commits.
- Keep the public App Worker out of the change set.
- Fail closed whenever Access configuration or verification is uncertain.
- Never put a real team domain, audience, email, token, or account ID in committed code/tests.
- Distinguish local proof from remote Cloudflare/IdP evidence.

## Step 1 — initialize implementation tracking

Create `docs/active/work/T-004-04-01/progress.md`.

Record:

- Research, Design, Structure, and Plan artifact commits;
- starting worktree conditions;
- the pre-existing sibling/user paths that must remain untouched;
- implementation checklist;
- remote entitlement/account limitations;
- no ticket frontmatter mutation.

Verification:

- artifact exists;
- checklist matches this plan;
- only this ticket's Progress file is staged.

Commit unit:

- `docs(access): plan private surface implementation` may contain Plan plus initial Progress,
  or Plan may be committed alone before Implement begins.

## Step 2 — add the JWT runtime dependency

Re-read `package.json` and inspect current Git status for package-file changes.

Run npm's targeted install for `jose` without upgrading unrelated dependencies.

Update:

- `package.json` runtime dependencies;
- `package-lock.json` resolved package graph.

Verification:

- installed `jose` version is recorded;
- `npm ls jose` succeeds;
- lockfile contains only the expected dependency addition relative to the current baseline;
- unrelated sibling changes are preserved.

Commit unit:

- combine with the verifier implementation if dependency-only commit would not be useful;
- otherwise commit as `build(access): add JWT verifier dependency`.

## Step 3 — implement Access configuration parsing

Create `src/lib/session-access.ts` with configuration constants and pure parsing.

Implement:

- structural environment input containing the three binding names;
- canonical HTTPS Access team-domain validation;
- no credentials/path/query/fragment;
- `cloudflareaccess.com` hostname requirement;
- conservative non-empty audience validation;
- distinct preview/editor audiences;
- exact surface-to-audience mapping.

Failure messages may name the invalid binding for operator diagnostics, but never its value.

Verification:

- TypeScript compiles the module;
- tests accept one canonical configuration;
- tests reject missing, blank, non-HTTPS, credentialed, path-bearing, unrelated-domain, overly
  long, and equal-audience configurations;
- surface mapping is exhaustive.

## Step 4 — implement JWT verification

In `src/lib/session-access.ts`, add:

- remote JWK resolver construction from `${teamDomain}/cdn-cgi/access/certs`;
- optional test resolver injection;
- assertion-header extraction;
- `jwtVerify` call restricted to `RS256`;
- exact issuer and selected audience;
- registered time-claim validation through `jose`;
- `type === "app"` validation;
- non-empty string `email` and `sub` validation;
- a minimal verified identity result;
- bounded, token-free failure reasons.

Do not:

- decode and trust claims before signature verification;
- read the browser cookie as a fallback assertion;
- accept service-token claim shapes;
- log inside the library;
- cache request identity in global state.

Verification:

- valid preview and editor tokens pass;
- preview token on editor and editor token on preview fail;
- wrong issuer, expiry, future `nbf`, wrong algorithm, malformed token, missing token,
  service-token-shaped token, organization token, and missing identity claims fail;
- no failure result contains the token or email.

## Step 5 — implement credential sanitization

In `src/lib/session-access.ts`, implement a Request clone helper.

Remove:

- `Cf-Access-Jwt-Assertion`;
- `Cf-Access-Authenticated-User-Email`;
- `CF_Authorization` cookie pairs, case-insensitively by cookie name.

Preserve:

- unrelated cookies;
- method and URL;
- request body stream;
- `Upgrade` and `Sec-WebSocket-Protocol` headers;
- ordinary application headers.

Handle cookie edges:

- no Cookie header;
- only Access cookie;
- Access cookie first/middle/last;
- whitespace around pairs;
- similarly named non-Access cookie;
- empty remaining cookie set removes the header.

Verification:

- focused unit assertions inspect the sanitized Request;
- raw assertion and authorization-cookie values do not appear in serialized headers.

## Step 6 — add focused authentication tests

Create `test/session-access.test.mjs`.

Use `jose` test primitives:

- `generateKeyPair("RS256")`;
- `exportJWK(publicKey)`;
- `createLocalJWKSet({ keys: [...] })`;
- `SignJWT` for deterministic claim variants.

Set fixed logical issuer/audiences without using a real account.

Add the test file to the explicit `npm test` script.

Verification:

- run the new test file directly first;
- run the full `npm test` suite;
- no network call is made by unit tests;
- tests do not rely on wall-clock sleeps.

Commit unit:

- `feat(access): verify per-surface Access assertions` containing dependency, module, test,
  and test-script changes.

Update Progress with exact test counts and commit hash.

## Step 7 — update Sessions Worker configuration

Re-read `wrangler.sessions.jsonc` immediately before editing.

Change:

- private `workers_dev` to false;
- private `preview_urls` to false;
- required secrets/bindings to include team domain and both audiences;
- comments explaining why alternate origins are disabled and how to set bindings.

Do not change:

- the two exact custom domains;
- public `wrangler.jsonc`;
- container sizing/image;
- Durable Object bindings/migrations;
- current observability.

Run `npm run session:types` to regenerate `worker-configuration.sessions.d.ts`.

Verification:

- generated type file contains all three string bindings;
- `npm run session:types:check` passes;
- Wrangler schema/dry run accepts both false flags and required secret declarations;
- no account-specific value is committed.

## Step 8 — integrate origin authentication

Re-read full `src/session-worker.ts` before editing.

Add:

- Access module imports;
- Access config parsing only for exact proxy hosts;
- verification before coordinator fetch;
- stable generic 403 response;
- structured safe denial log;
- credential sanitization before setting the internal target header.

Ordering assertions:

- control operation behavior stays compatible;
- method errors stay compatible;
- unknown host/root behavior stays compatible;
- exact proxy host is known before the expected audience is selected;
- authentication precedes coordinator readiness/process checks;
- the same code authenticates WebSocket and HTTP requests;
- sanitized Request reaches the coordinator;
- the coordinator continues deleting the internal target header.

Avoid:

- parsing unverified payloads for routing;
- forwarding verified email as a trusted custom header;
- changing DO RPC/state shape;
- holding authentication state globally;
- logging user identity.

Verification:

- isolated TypeScript passes;
- full unit suite passes;
- bundle dry run resolves `jose` on Workers;
- generated bindings match all `env` reads.

Commit unit:

- `feat(access): enforce origin assertions on session surfaces` containing Worker config,
  generated types, and handler integration.

Update Progress with commit and verification results.

## Step 9 — author operator runbook

Create `docs/knowledge/session-access.md` after executable contracts stabilize.

Document exact steps:

1. confirm an identity login method exists;
2. create preview self-hosted application for exact preview hostname;
3. create exact-email preview Allow policy;
4. create editor self-hosted application for exact editor hostname;
5. create exact-email editor Allow policy;
6. ensure no Bypass/Everyone/all-valid-email policy exists;
7. copy each stable audience tag;
8. set three bindings with Wrangler secrets;
9. deploy Access policy before exposing/deploying the unauthenticated code-server origin;
10. execute clean-browser positive and negative tests;
11. execute wrong-audience origin tests with local cryptographic coverage as baseline;
12. remove an invite, revoke session, and retest after propagation;
13. inspect Access authentication logs;
14. roll back by disabling routes/deployment, never with Bypass.

Update `docs/knowledge/session-lifecycle.md` minimally to point at this boundary.

Verification:

- commands use placeholders rather than live identifiers;
- public/private distinction is unambiguous;
- revocation distinguishes policy removal, user token revocation, and IdP disablement;
- runbook does not claim remote execution.

Commit unit:

- `docs(access): add session Access runbook`.

Update Progress.

## Step 10 — run proportional verification

Run in this order so failures are localized:

1. `node --experimental-strip-types --test test/session-access.test.mjs`;
2. `npm test`;
3. `npm run session:types:check`;
4. `npx tsc --noEmit --project tsconfig.sessions.json`;
5. `npm run session:validate`;
6. `npm run typecheck`;
7. `git diff --check`;
8. inspect `git status --short`;
9. inspect ticket-scoped and source diffs;
10. inspect the final bundle size reported by Wrangler.

If a failure reveals an implementation defect:

- document the deviation before changing the plan's implementation details;
- fix in a narrow commit;
- rerun the failed layer and all downstream layers.

If a failure is only unavailable remote entitlement:

- do not weaken authentication;
- record it as an open production gate.

## Step 11 — adversarial self-review

Read full final versions of:

- `src/lib/session-access.ts`;
- `src/session-worker.ts`;
- `wrangler.sessions.jsonc`;
- `worker-configuration.sessions.d.ts`;
- `test/session-access.test.mjs`;
- `docs/knowledge/session-access.md`;
- affected package files.

Check:

- signature, issuer, audience, expiry, not-before, type, and identity validation;
- separate audience selection cannot default or fall through;
- Access values never reach logs, storage, error responses, or the Sandbox;
- WebSocket path cannot skip verification;
- `workers.dev` and preview URLs are disabled only for the private Worker;
- no floating promise or request-scoped module mutation exists;
- binding types are generated and exact;
- public demo code/config is untouched;
- tests cover failure paths, not only success;
- runbook uses no Bypass;
- ticket frontmatter remains unchanged.

## Step 12 — complete Progress and Review

Update `progress.md` to mark every completed item, list commits, exact command outcomes,
deviations, and remaining remote evidence.

Create `review.md` with:

- outcome summary;
- acceptance-criterion matrix;
- architecture and trust boundaries;
- files created/modified/deleted;
- test coverage and exact counts;
- origin/JWT security assessment;
- Access setup/revocation handoff;
- effect of `cloudflare-one` and `workers-best-practices` guidance;
- open concerns and severity;
- remote go-live checklist;
- explicit statement that ticket frontmatter and public App Worker were untouched.

Run final whitespace/status checks, then commit Review and completed Progress path-scoped.

Final commit unit:

- `docs(access): review private surface protection`.

After `review.md` exists and is committed, stop. Lisa handles ticket transitions.
