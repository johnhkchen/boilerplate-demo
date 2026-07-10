# Plan — T-004-01-01 spike-sandbox-runs-dev-and-editor

Ordered implementation and verification plan. Each checkpoint can fail independently and is
recorded before proceeding; the workflow continues through Review in the same session.

## Success condition

The spike passes only if an edit saved through code-server’s browser UI changes an already-open
Astro preview without navigation/reload and the preview has a successful Vite HMR WebSocket
whose public endpoint traverses the disposable Worker’s `proxyToSandbox()` route.

Deployability, separate page refreshes, or a Sandbox API `writeFile()` are insufficient.

## Step 1 — Freeze baseline and prerequisites

1. Record `git status --short`.
2. Confirm all pre-existing dirty paths and exclude them from ticket staging.
3. Confirm Node/npm/Wrangler versions.
4. Confirm Wrangler authentication and Containers permission without printing credentials.
5. Confirm Docker daemon availability.
6. Record current latest `@cloudflare/sandbox` and code-server package versions.
7. Fetch current Sandbox SDK types and Worker best-practice references.
8. Confirm the two intended custom domains do not already resolve or serve another app.

Verification:

- Docker reports a server version.
- `wrangler whoami` succeeds.
- both hosts are unused before deploy.
- no repository files have changed outside the ticket artifacts.

## Step 2 — Commit the pre-implementation RDSPI artifacts

1. Review `research.md` for descriptive-only language.
2. Review `design.md` for considered alternatives and a grounded decision.
3. Review `structure.md` for file/interface/ordering completeness.
4. Review this `plan.md` for implementation and cleanup coverage.
5. Count/check artifacts for non-empty, readable Markdown.
6. Stage only these four files.
7. Inspect `git diff --cached --stat` and `git diff --cached`.
8. Commit as the first meaningful unit.

Verification:

- the commit contains only `docs/active/work/T-004-01-01/{research,design,structure,plan}.md`;
- ticket phase/status frontmatter remains byte-for-byte untouched.

## Step 3 — Scaffold the disposable Worker project

1. Create `/tmp/t004-sandbox-spike` using file patches.
2. Add an outer package manifest with pinned Sandbox SDK, Wrangler, TypeScript, and Worker
   types.
3. Install outer dependencies and retain the generated temporary lockfile.
4. Add `wrangler.jsonc` with:
   - unique Worker name;
   - current compatibility date;
   - `nodejs_compat`;
   - exact preview/editor custom domains;
   - Sandbox container, DO binding, and SQLite migration;
   - single-instance limit and observability.
5. Add a minimal `tsconfig.json`.
6. Add `src/worker.ts` with `proxyToSandbox` first, `/setup`, `/status`, `/destroy`, and 404.
7. Re-export the SDK `Sandbox` class.
8. Generate binding types with `wrangler types`.

Verification:

- `tsc --noEmit` succeeds against generated bindings;
- `wrangler deploy --dry-run` validates config and bundles Worker source;
- a static review finds no hardcoded secret, broad wildcard route, unawaited promise, mutable
  request-global state, or buffered proxied response.

## Step 4 — Build the embedded Astro/editor image

1. Add the inner `demo/package.json` with pinned Astro and `dev` script.
2. Generate its lockfile.
3. Add `demo/src/pages/index.astro` with `HMR BEFORE` and `id="hmr-marker"`.
4. Add `demo/astro.config.mjs` with the exact target `server` configuration.
5. Add a Dockerfile based on the SDK-matched published Sandbox image.
6. Install pinned code-server in the image.
7. Bake the demo dependencies and source under `/workspace/demo`.
8. Expose 4321 and 8080 without changing the base entrypoint.
9. Build the image locally through Docker.

Verification:

- Docker build exits zero;
- image inspection shows ports 4321/8080 and the Sandbox base entrypoint;
- an image shell reports installed Node, Astro, and code-server versions;
- a grep over the build context finds no API token, account secret, `.dev.vars`, or `.git`.

## Step 5 — Deploy the isolated spike Worker

1. Reconfirm no conflicting live hostnames.
2. Run `wrangler deploy` from the temporary project.
3. Record deployment/version identifier and timing.
4. Wait for container/custom-domain provisioning, polling in intervals below 60 seconds.
5. Call `POST /setup` on the unique workers.dev control endpoint.
6. If cold provisioning returns a documented transient error, retry with bounded attempts.
7. Save the returned process states and URLs in transient scratch output.
8. Verify `GET /status` reports both processes running and both ports exposed.

Verification:

- Worker deployment succeeds under `demo-runway-t004-sandbox-spike`;
- stable App Worker `demo-runway` is not modified;
- setup returns exactly the two deterministic hosts;
- no broad wildcard route exists.

## Step 6 — Verify both proxied surfaces over HTTP

1. Request the preview URL with `curl -I`/bounded body check.
2. Confirm status 200 and `HMR BEFORE` in the initial HTML.
3. Request the code-server URL.
4. Confirm status 200 or the expected application redirect followed by 200.
5. Inspect response/Worker logs for proxy or host-check errors.
6. Confirm status still shows both background processes running.

Verification:

- preview HTML is served through the exact custom-domain Worker route;
- code-server UI assets load through its exact custom-domain Worker route;
- Vite does not reject the preview host (`allowedHosts` is effective).

## Step 7 — Establish browser evidence

1. Connect to the supported interactive browser.
2. Open the preview tab and wait for `#hmr-marker` to show `HMR BEFORE`.
3. Record the tab’s navigation/performance baseline.
4. Identify the Vite HMR WebSocket:
   - public scheme `wss`;
   - public preview host;
   - successful/open upgrade rather than reconnect failure.
5. Capture `hmr-before.png` if safe.
6. Open the editor URL in a second tab.
7. Wait for code-server workbench readiness.
8. Open `src/pages/index.astro` through the UI.
9. Replace `HMR BEFORE` with `HMR AFTER` using editor keyboard input.
10. Save through the UI.
11. Capture `browser-ide-edit.png` if safe.
12. Return to or inspect the original preview tab without navigation/reload.
13. Wait for `#hmr-marker` to become `HMR AFTER`.
14. Confirm the preview document navigation timestamp/identity did not change.
15. Confirm the HMR WebSocket remained successful or exchanged the update.
16. Capture `hmr-after.png`.

Verification:

- editor UI visibly contains the saved after-marker;
- preview marker changes in the original document;
- there is no `reload()`/`goto()` between before and after observation;
- WebSocket URL and status identify Vite HMR through the preview host.

## Step 8 — Gather server-side corroboration

1. Call `GET /status` after the edit.
2. Read bounded Astro process logs.
3. Read bounded code-server process logs.
4. Confirm Vite logged the changed source and HMR update if exposed by its normal log level.
5. Confirm both processes remain running.
6. Record exact successful Vite configuration from the image source.
7. Record exact versions from inside the container.

Verification:

- server log or process state agrees with browser observation;
- the note will not rely solely on a screenshot;
- logs are scanned for secrets/capability URLs before committing excerpts.

## Step 9 — Write the durable spike note

1. Create `docs/knowledge/sandbox-session-spike.md` from observed data.
2. Start with PASS or FAIL and the tested scope.
3. Reproduce the exact successful Vite `server` block.
4. Include minimal Worker `proxyToSandbox` excerpt and route/config shape.
5. Include process commands and version pins.
6. Describe the browser edit and no-reload HMR observation.
7. Link supporting screenshots using relative repository paths.
8. Map evidence line-by-line to the acceptance criterion.
9. State deferred risks, especially sleep/wake.
10. Avoid active random tokens, OAuth data, account IDs, and unrelated user identity.
11. Create/update `progress.md` with completed steps and observed verification.

Verification:

- the note is repeatable and distinguishes observation from inference;
- exact `allowedHosts` and `hmr` values are copyable;
- no statement claims sleep/wake or production auth is solved;
- repository leak check/targeted grep finds no credentials.

## Step 10 — Clean up remote and local spike resources

1. Call `POST /destroy` and wait for success.
2. Delete the disposable Worker with Wrangler using the temporary config.
3. Confirm the Worker no longer appears in a targeted deployment lookup.
4. Confirm the workers.dev endpoint does not serve the spike.
5. Confirm the exact preview/editor domains no longer serve the spike; allow DNS cleanup delay
   and report residual DNS if Cloudflare retains records briefly.
6. Remove `/tmp/t004-sandbox-spike` after preserving only non-sensitive evidence.
7. Record all cleanup outcomes in `progress.md` and the durable note.

Verification:

- no live disposable editor remains unauthenticated;
- no active container/session is intentionally retained;
- no temporary build tree remains inside the repository.

## Step 11 — Commit the empirical finding

1. Stage only:
   - `docs/knowledge/sandbox-session-spike.md`;
   - ticket work screenshots;
   - `docs/active/work/T-004-01-01/progress.md`.
2. Inspect the complete staged diff and image paths.
3. Run a credential/token grep over staged text.
4. Commit as the empirical implementation unit.

Verification:

- no unrelated E-004 planning files are included;
- no temporary Worker source is accidentally committed;
- the commit is self-contained evidence for the acceptance criterion.

## Step 12 — Repository verification

Run checks in increasing scope:

1. Markdown/artifact existence and non-empty checks.
2. `git diff --check`.
3. repository leak check (`npm run leak:check`) if its runtime prerequisites permit; otherwise
   use its documented offline/static mode and record the limitation.
4. `npm test`.
5. `npm run typecheck`.
6. `npm run build`.
7. `npm run deploy:dry` if not already covered by typecheck/build.
8. `git status --short` and `git show --stat` to verify scope.

Because only documentation/evidence is committed, failures in existing application checks are
not automatically caused by this ticket. Any failure is triaged against the baseline and
reported, not hidden.

## Step 13 — Review and finish

1. Inspect every ticket-created file in full.
2. Inspect commits and compare them with the pre-existing dirty worktree.
3. Confirm the ticket frontmatter phase and status were not edited.
4. Confirm the acceptance criterion is supported by direct evidence.
5. Write `review.md` with:
   - summary of files created/modified/deleted;
   - test and evidence coverage;
   - cleanup result;
   - gaps and open concerns;
   - critical human-attention items;
   - follow-on implications for `T-004-01-02` and later session tickets.
6. Update `progress.md` one last time if verification outcomes changed.
7. Commit final Progress/Review as the handoff unit.
8. Stop. Do not update the ticket phase, status, or acceptance checkbox.

## Rollback/abort criteria

The implementation continues through Review even on a failed experiment, but the result is
marked FAIL rather than being papered over. Abort remote exposure and clean up immediately if:

- a custom domain overlaps an existing application;
- code-server becomes reachable at any unexpected hostname;
- a secret or credential appears in image/log/output;
- the Worker name resolves to the stable App Worker;
- `proxyToSandbox` cannot distinguish the two deterministic exposed hosts;
- unexpected zone-wide routing is created.

A failed spike is still documented fully, with the blocker and next experiment, but it does
not satisfy the ticket acceptance criterion.
