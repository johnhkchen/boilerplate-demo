# Plan — T-004-01-02 spike-container-sleep-wake-survival

Ordered implementation and verification plan for the forced ten-minute idle cycle. Each step
has an explicit gate so the first-wake evidence cannot be contaminated by repair actions.

## Step 1 — freeze repository scope

1. Capture `git status --short`.
2. Identify pre-existing and concurrent changes.
3. Confirm the ticket frontmatter still says `phase: research` and `status: open`.
4. Confirm no `docs/active/work/T-004-01-02` artifact existed before this run.
5. Restrict edits to this ticket’s work directory and the new durable knowledge note.
6. Never stage with `git add .` or another broad path.

**Gate:** unrelated work is inventoried and preserved; ticket frontmatter is untouched.

## Step 2 — confirm platform prerequisites

1. Record Node and npm versions.
2. Run `npx wrangler --version`.
3. Run `docker info` without printing host-sensitive configuration.
4. Confirm the retained prerequisite image exists.
5. Run `npx wrangler containers list` only as a read-only entitlement check.
6. Record the entitlement result without account identity or local credential paths.
7. Do not attempt a plan upgrade or production deployment.

**Gate:** Docker is usable locally; remote evidence is classified as available or unavailable.

## Step 3 — create the disposable harness

1. Create a ticket-specific temporary directory outside the repository.
2. Add a pinned `package.json` for Sandbox SDK `0.12.3`, Wrangler `4.110.0`, and TypeScript.
3. Install dependencies in the temporary tree.
4. Add a one-line Dockerfile based on the retained prerequisite image.
5. Add `wrangler.jsonc` with one local Sandbox container, binding, and migration.
6. Add `tsconfig.json` suitable for a Worker entrypoint.
7. Add `src/worker.ts` and re-export the Sandbox class.
8. Centralize `sleepAfter: "10m"` and `keepAlive: false`.
9. Add `/health`, `/setup`, `/wake`, `/relaunch`, and `/destroy`.

**Gate:** dependency versions match the prerequisite image and no production route/binding
appears in the transient config.

## Step 4 — implement safe snapshots

1. Implement process listing with command, ID, status, and PID when exposed.
2. Implement bounded port checks for 4321 and 8080.
3. Implement absence-safe sentinel read.
4. Implement Astro source marker extraction and checksum.
5. Implement shell/session marker inspection if supported by the current API.
6. Ensure `captureSnapshot()` never starts a process or rewrites a file.
7. Serialize expected absence as structured evidence.
8. Redact arbitrary command errors before returning them.

**Gate:** source inspection confirms `/wake` has no call path to `startProcess()`, file writes,
or state restoration.

## Step 5 — implement setup and relaunch

1. In setup, clear only processes in the disposable Sandbox.
2. Write a non-secret sentinel under `/workspace`.
3. mutate a known marker in the baked Astro source.
4. Create a named shell session and environment marker if supported.
5. Start Astro with `npm run dev` in `/workspace/demo`.
6. Start code-server on `0.0.0.0:8080` with local-only auth disabled, matching the prerequisite
   spike.
7. Wait for both ports.
8. Return the complete pre-idle snapshot.
9. In relaunch, start only missing services.
10. Wait for both ports and return elapsed time plus a post-relaunch snapshot.

**Gate:** setup proves both services ready and all post-boot markers present before the long
wait.

## Step 6 — validate the harness statically

1. Generate Worker binding types if required by the current Wrangler config.
2. Run TypeScript checking in the temporary tree.
3. Run `wrangler deploy --dry-run` against the disposable config.
4. Inspect the bundle/build output for binding or migration errors.
5. Inspect the Docker image entrypoint and baked paths if startup assumptions are uncertain.
6. Correct the harness before starting the acceptance clock.

**Gate:** typecheck and dry-run pass; the retained image builds successfully as the local base.

## Step 7 — start local Wrangler

1. Start `wrangler dev --local` on an unused fixed port.
2. Keep the process in an interactive session owned by this run.
3. Wait for the Worker-ready log line.
4. Call `GET /health`.
5. Confirm the health request does not instantiate or touch the Sandbox.
6. Record only non-sensitive startup versions and status.

**Gate:** Worker health returns 200 and local container tooling reports no fatal error.

## Step 8 — run setup and validate pre-idle state

1. Call `POST /setup` once.
2. Save the raw JSON response in temporary storage.
3. Assert Astro appears as running.
4. Assert code-server appears as running.
5. Assert port 4321 is listening.
6. Assert port 8080 is listening.
7. Assert sentinel exists with the run marker.
8. Assert the source contains the post-boot mutation.
9. Assert shell/session marker exists if the API supports this observation.
10. Record process IDs and PIDs.
11. Record the response timestamp as the last Sandbox activity.

**Abort condition:** if either service or core marker is absent, fix the harness and restart
from a destroyed clean Sandbox; do not begin an ambiguous idle window.

## Step 9 — enforce the idle window

1. After setup returns, issue no request that obtains the Sandbox.
2. Do not call `/wake`, `/relaunch`, or `/destroy`.
3. Do not open preview or editor HTTP routes.
4. Do not stream logs.
5. Do not poll processes.
6. Do not maintain a WebSocket or tunnel.
7. Do not run `docker exec` against the container.
8. Keep the Wrangler process alive so the inactivity mechanism, not dev-server teardown,
   causes the lifecycle transition.
9. Wait until at least ten minutes and fifteen seconds after the last-activity timestamp.
10. During the wait, update the user through commentary without touching the Sandbox.

**Gate:** measured idle interval exceeds ten minutes and no activity source occurred.

## Step 10 — capture the first wake

1. Call `POST /wake` exactly once.
2. Save the full response immediately in temporary storage.
3. Record the request/response timestamps.
4. Confirm the reported idle duration.
5. Inspect whether the pre-idle process IDs exist.
6. Inspect current process list.
7. Inspect port states.
8. Inspect sentinel presence/value.
9. Inspect source marker/hash.
10. Inspect shell/session marker.
11. Do not call relaunch until the response is safely saved.

**Gate:** a complete before-relaunch wake snapshot exists even if all runtime state is absent.

## Step 11 — test relaunch requirements

1. Call `POST /relaunch` after the wake evidence is saved.
2. Record start time and completion time.
3. Assert both services acquire new managed process records.
4. Assert both ports become ready.
5. Compare new IDs/PIDs to pre-idle values.
6. Confirm whether the baked Astro source returned.
7. Confirm the post-boot source mutation and sentinel were not silently restored by relaunch.
8. Classify whether workspace restoration is required before a useful relaunch.

**Gate:** the test can distinguish “services can relaunch from image” from “the collaborative
workspace survived.”

## Step 12 — determine verdict

Use the Design decision rule:

1. Same processes plus state → `resume`, GO.
2. Fresh state plus successful relaunch → `relaunch-required`, conditional GO.
3. Fresh state plus failed/unreliable relaunch → `unusable`, NO-GO.

Record separately:

- process outcome;
- filesystem outcome;
- shell/session outcome;
- port outcome;
- relaunch outcome;
- production evidence limitation.

**Gate:** every acceptance clause has a direct observation or an explicitly named limitation.

## Step 13 — write durable evidence

1. Create `sleep-wake-evidence.json` from the saved pre-idle, wake, and relaunch responses.
2. Normalize timestamps to UTC ISO 8601.
3. Calculate idle duration mechanically.
4. Include version pins.
5. Include explicit local scope.
6. Include lost-state list and boolean comparisons.
7. Exclude account identity, credentials, paths, and raw tokens.
8. Write `docs/knowledge/sandbox-sleep-wake-spike.md`.
9. Lead with verdict and go/no-go.
10. Explain the downstream `S-004-03` lifecycle consequence.
11. Cite current official Sandbox lifecycle/background-process/options documentation.
12. Preserve the prerequisite ticket’s separate PARTIAL / NO-GO status.

**Gate:** human-readable and machine-readable artifacts agree on every outcome.

## Step 14 — update Progress before cleanup

1. Record actual setup results.
2. Record exact idle timestamps and duration.
3. Record the first-wake state before relaunch.
4. Record deviations from the plan.
5. Record the verdict rationale.
6. State what remains before Review.

**Gate:** the empirical result survives even if cleanup terminates the local runtime.

## Step 15 — cleanup

1. Call `POST /destroy` and wait for success.
2. Stop the Wrangler interactive process cleanly.
3. Inspect Docker for ticket-specific running containers.
4. Stop residual Wrangler proxy helpers only if they belong to this run.
5. Remove the transient experiment tree.
6. Preserve the retained prerequisite image unless it causes a conflict.
7. Verify no remote Worker, route, DNS, or container was created.
8. Record cleanup outcomes in evidence and Progress.

**Gate:** no running or exposed ticket resource remains.

## Step 16 — repository verification

1. Run `git diff --check` for ticket artifacts and the knowledge note.
2. Parse `sleep-wake-evidence.json` with a standard JSON parser.
3. Search new artifacts for credential/token/private-key patterns.
4. Run `npm test` because the ticket shares the repository and must not regress existing code.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Run `npm run deploy:dry` to validate the stable App Worker remains packageable without any
   session-runtime changes.
8. Record warnings separately from failures.

**Gate:** existing project verification passes or every failure is classified with evidence.

## Step 17 — commit safely if possible

1. Inspect the shared worktree again.
2. Stage only explicit files owned by this ticket.
3. Do not stage the untracked ticket file unless it is already committed/owned by the current
   workflow and safe to include.
4. Commit planning artifacts as one unit if concurrency permits.
5. Commit durable finding/evidence/Progress as a second unit.
6. Commit Review as the final unit.
7. If another agent/workflow has changed overlapping paths or a safe commit would absorb
   unrelated work, do not force it; record the constraint.

**Gate:** commits, if made, contain no unrelated changes.

## Step 18 — Review

1. Inspect every persistent diff.
2. Confirm the ticket frontmatter is unchanged.
3. Map the acceptance criterion clause by clause.
4. Summarize files created, modified, and deleted.
5. Summarize empirical and repository test coverage.
6. Flag the remote entitlement limitation.
7. Flag the prerequisite browser/remote gate.
8. State the exact `S-004-03` lifecycle requirements.
9. State open concerns and human actions.
10. Write `review.md` last and stop without changing ticket phase/status.

## Verification criteria

The implementation phase is successful when:

- the measured idle window is approximately ten minutes and exceeds `sleepAfter`;
- both services were demonstrably ready before idle;
- the first wake snapshot occurs before relaunch;
- process survival is unambiguous;
- state loss is itemized;
- relaunch success/failure is measured;
- go/no-go follows the predefined rule;
- downstream consequences are concrete;
- evidence is committed or ready as scoped repository work;
- local scope and production limitations are explicit;
- cleanup is complete;
- existing repository checks still pass;
- `review.md` is the final phase artifact.

## Expected result, not a claim

Current official documentation predicts a fresh container: both processes terminate, ordinary
files and shell state disappear, and the image baseline returns. The experiment is designed
to falsify or confirm that prediction. The final finding must use the observed snapshots,
never this expectation, as its evidence.
