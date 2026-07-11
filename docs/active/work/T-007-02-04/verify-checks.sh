#!/usr/bin/env bash
# T-007-02-04: run the demo's own checks against the new-owner deployment.
#
# The drill's headline pass/fail. Stands up the T-007-02-01 fresh-owner context
# (scrubbed of author account/zone/repo/secret), fills a lowercase new-owner zone
# + repo and fresh new-owner secrets, then runs the demo's own checks —
# integration:check, ops:check, leak:check, and test:flow:backstage — against a
# locally-served instance under a sanitized, author-account-free environment.
#
# Honest boundary: the "new-owner deployment" here is the served-local context (no
# second live Cloudflare account on this machine). Running the same checks against a
# real deployed new-owner URL is the metered live leg — named, deferred, not faked.
#
# This script never mutates Cloudflare, GitHub, or the source working tree. It runs
# only local commands (astro build/dev, wrangler --local, playwright); no `deploy`,
# no `--remote`. Every write lands under a throwaway $CONTEXT or this ticket's
# evidence/ dir.
#
# Exit codes: 0 all four checks green · 1 a check red (row-7 gap; seam named) ·
#             2 misinvocation / environment error.
set -euo pipefail

REPO_ROOT="$(pwd)"
TICKET_DIR="$REPO_ROOT/docs/active/work/T-007-02-04"
HARNESS="$REPO_ROOT/docs/active/work/T-007-02-01/scrub-fresh-owner.sh"
CONTEXT="${TMPDIR:-/tmp}/demo-runway-checks-context"
OWNER_ZONE="new-owner.example"
REPOSITORY_URL="https://github.com/new-owner/demo-runway.git"
EVIDENCE_DIR="$TICKET_DIR/evidence"
SERVE_PORT=4337

usage() {
  echo "usage: $0 [--context DIR] [--owner-zone LOWERCASE_HOST] [--repository-url HTTPS_GITHUB_URL] [--evidence-dir DIR] [--serve-port PORT]" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --context) [ "$#" -ge 2 ] || usage; CONTEXT="$2"; shift 2 ;;
    --owner-zone) [ "$#" -ge 2 ] || usage; OWNER_ZONE="$2"; shift 2 ;;
    --repository-url) [ "$#" -ge 2 ] || usage; REPOSITORY_URL="$2"; shift 2 ;;
    --evidence-dir) [ "$#" -ge 2 ] || usage; EVIDENCE_DIR="$2"; shift 2 ;;
    --serve-port) [ "$#" -ge 2 ] || usage; SERVE_PORT="$2"; shift 2 ;;
    *) usage ;;
  esac
done

# Guards.
[ -d "$REPO_ROOT/.git" ] && [ -f "$REPO_ROOT/wrangler.jsonc" ] \
  || { echo "run from the repository root" >&2; exit 2; }
[ -f "$HARNESS" ] || { echo "missing T-007-02-01 fresh-owner harness" >&2; exit 2; }
# F-1: session-lifecycle DNS_NAME is lowercase-only. Reject an uppercase zone loudly.
[[ "$OWNER_ZONE" =~ ^[a-z0-9.-]+$ ]] && [[ "$OWNER_ZONE" != .* ]] && [[ "$OWNER_ZONE" != *. ]] \
  || { echo "--owner-zone must be a LOWERCASE hostname without scheme/path (F-1)" >&2; exit 2; }
[[ "$REPOSITORY_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$ ]] \
  || { echo "--repository-url must be a credential-free HTTPS GitHub clone URL ending in .git" >&2; exit 2; }

PRIVATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/owner-checks.XXXXXX")"
SECRET_FILE="$PRIVATE_DIR/new-owner-secrets.json"
RUNTIME_CONFIG="$PRIVATE_DIR/runtime.wrangler.json"
SERVER_PID=""

stop_server() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # The astro dev child can daemonize/orphan (the documented daemonization hazard),
  # surviving the parent kill and holding the port + astro's global dev lock. Clear
  # it explicitly by port and via astro's own stop so the next server can bind.
  pkill -f "astro.mjs dev --host 127.0.0.1 --port $SERVE_PORT" 2>/dev/null || true
  ( cd "$CONTEXT" 2>/dev/null && "${SANITIZED_ENV[@]}" npx astro dev stop >/dev/null 2>&1 ) || true
  SERVER_PID=""
}
cleanup() {
  stop_server
  # Local Wrangler state was created by this drill, not inherited — remove it so the
  # context does not retain drill state.
  rm -rf "$CONTEXT/.wrangler" 2>/dev/null || true
  rm -rf "$PRIVATE_DIR"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$EVIDENCE_DIR"
rm -f "$EVIDENCE_DIR"/*.txt "$EVIDENCE_DIR"/*.json 2>/dev/null || true

# Sanitized environment: no CLOUDFLARE_*/OAuth, no coding-agent markers. This is the
# "author accounts removed from the runtime path" contract AND the de-daemonization
# fix for the dev-server-owning checks.
SANITIZED_ENV=(env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}")

# Per-check result accounting.
declare -a CHECK_NAMES=() CHECK_CMDS=() CHECK_RESULTS=() CHECK_CODES=()
record() { CHECK_NAMES+=("$1"); CHECK_CMDS+=("$2"); CHECK_RESULTS+=("$3"); CHECK_CODES+=("$4"); }

echo "T-007-02-04 new-owner checks run"
echo "mode: served-local new-owner stand-in (no second Cloudflare account; live-URL run deferred)"
echo "context: $CONTEXT"
echo "owner zone: $OWNER_ZONE"

# ── stage 1: proven-clean fresh-owner context ────────────────────────────────
echo "stage 1/8: build proven-clean fresh-owner context"
bash "$HARNESS" "$CONTEXT" > "$PRIVATE_DIR/harness.txt" 2>&1 \
  || { echo "harness failed to produce a clean context" >&2; sed 's/[[:space:]]*$//' "$PRIVATE_DIR/harness.txt" >&2; exit 2; }
echo "  ok: author secret/state stores absent from context"

# ── stage 2: fill new-owner config placeholders (lowercase zone) ─────────────
echo "stage 2/8: fill new-owner configuration placeholders"
OWNER_ZONE="$OWNER_ZONE" REPOSITORY_URL="$REPOSITORY_URL" CONTEXT="$CONTEXT" node <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const context = process.env.CONTEXT;
const zone = process.env.OWNER_ZONE;
const repository = process.env.REPOSITORY_URL;
if (!context || !zone || !repository) throw new Error('config substitution inputs missing');
for (const name of ['wrangler.jsonc', 'wrangler.sessions.jsonc']) {
  const path = resolve(context, name);
  const updated = readFileSync(path, 'utf8')
    .replaceAll('NEW-OWNER-ZONE.example', zone)
    .replace('https://github.com/NEW-OWNER/REPO.git', repository);
  writeFileSync(path, updated, 'utf8');
}
NODE
echo "  ok: SESSION_DOMAIN, SESSION_REPOSITORY_URL, and route placeholders replaced"

# ── stage 3: generate fresh new-owner secrets in a private 0600 store ────────
echo "stage 3/8: generate fresh new-owner secrets (private 0600 store; never printed)"
SECRET_FILE="$SECRET_FILE" node <<'NODE'
import { randomBytes } from 'node:crypto';
import { chmodSync, writeFileSync } from 'node:fs';
const path = process.env.SECRET_FILE;
if (!path) throw new Error('SECRET_FILE missing');
const hex = (n) => randomBytes(n).toString('hex');
const values = {
  DEMO_SIGNING_KEY: hex(32),
  DEMO_PASSCODE: hex(24),
  SESSION_RUNTIME_SECRETS: JSON.stringify({ NEW_OWNER_DEMO_API_KEY: hex(24) }),
};
writeFileSync(path, `${JSON.stringify(values)}\n`, { encoding: 'utf8', mode: 0o600 });
chmodSync(path, 0o600);
NODE
# Deliberately do NOT write a .dev.vars into the context: astro build would package it
# into dist/server/.dev.vars and the leak check would (correctly) flag it — the operator
# rule T-007-02-02 discovered ("do not package/deploy from a tree containing .dev.vars").
# The served instance gets its vars from the private runtime wrangler config (stage 6);
# the standalone ops/leak checks get DEMO_SIGNING_KEY from the environment.
echo "  ok: fresh signing key + passcode generated (no .dev.vars in the build tree)"

# ── stage 4: link deps + clean build under the sanitized env ─────────────────
echo "stage 4/8: link node_modules and clean-build the context (author-free env)"
[ -e "$CONTEXT/node_modules" ] || ln -s "$REPO_ROOT/node_modules" "$CONTEXT/node_modules"
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" npm run build ) > "$EVIDENCE_DIR/0-context-build.txt" 2>&1 \
  || { echo "  FAIL: context build failed (see evidence/0-context-build.txt)" >&2; exit 1; }
echo "  ok: context built clean under env -i"

SIGNING_KEY="$(SECRET_FILE="$SECRET_FILE" node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(process.env.SECRET_FILE,'utf8')).DEMO_SIGNING_KEY)")"
PASSCODE="$(SECRET_FILE="$SECRET_FILE" node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(process.env.SECRET_FILE,'utf8')).DEMO_PASSCODE)")"

# ── stage 5: CHECK 1 — integration:check (owns its own build+server+trio) ────
echo "stage 5/8: CHECK 1 integration:check"
set +e
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" CODEX_THREAD_ID='' npm run integration:check ) \
  > "$EVIDENCE_DIR/1-integration.txt" 2>&1
INT_CODE=$?
set -e
if [ "$INT_CODE" -eq 0 ]; then
  echo "  green: integration:check exit 0"
  record "integration:check" "npm run integration:check (in context)" "green" "$INT_CODE"
else
  echo "  RED: integration:check exit $INT_CODE (see evidence/1-integration.txt)"
  record "integration:check" "npm run integration:check (in context)" "red" "$INT_CODE"
fi
[ -f "$CONTEXT/test-results/integration-report.json" ] && \
  cp "$CONTEXT/test-results/integration-report.json" "$EVIDENCE_DIR/integration-report.json" || true

# ── stage 6: serve the context; CHECK 2 ops + CHECK 3 leak ───────────────────
echo "stage 6/8: serve context on 127.0.0.1:$SERVE_PORT for ops + leak"
SECRET_FILE="$SECRET_FILE" RUNTIME_CONFIG="$RUNTIME_CONFIG" node <<'NODE'
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(process.env.SECRET_FILE, 'utf8'));
const config = {
  name: 'demo-runway-checks',
  main: '@astrojs/cloudflare/entrypoints/server',
  compatibility_date: '2026-07-10',
  compatibility_flags: ['nodejs_compat'],
  vars: { DEMO_SIGNING_KEY: s.DEMO_SIGNING_KEY, DEMO_PASSCODE: s.DEMO_PASSCODE },
};
writeFileSync(process.env.RUNTIME_CONFIG, `${JSON.stringify(config)}\n`, { encoding: 'utf8', mode: 0o600 });
chmodSync(process.env.RUNTIME_CONFIG, 0o600);
NODE

BASE_URL="http://127.0.0.1:$SERVE_PORT"
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" DEMO_WRANGLER_CONFIG_PATH="$RUNTIME_CONFIG" CODEX_THREAD_ID='' \
    npm run dev -- --host 127.0.0.1 --port "$SERVE_PORT" ) > "$EVIDENCE_DIR/serve.txt" 2>&1 &
SERVER_PID=$!
ready=0
for _ in $(seq 1 150); do
  if curl --silent --fail --output /dev/null "$BASE_URL/"; then ready=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 0.1
done
[ "$ready" -eq 1 ] || { echo "  FAIL: context server did not become ready" >&2; sed 's/[[:space:]]*$//' "$EVIDENCE_DIR/serve.txt" >&2; exit 2; }
echo "  ok: context served at $BASE_URL (off b28.dev)"

echo "stage 6/8: CHECK 2 ops:check"
set +e
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" DEMO_SIGNING_KEY="$SIGNING_KEY" \
    OPS_CHECK_URL="$BASE_URL/api/receipt" npm run ops:check ) > "$EVIDENCE_DIR/2-ops.txt" 2>&1
OPS_CODE=$?
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" DEMO_SIGNING_KEY="$SIGNING_KEY" \
    LEAK_CHECK_DIR="$CONTEXT/dist" LEAK_CHECK_URL="$BASE_URL/api/receipt" npm run leak:check ) > "$EVIDENCE_DIR/3-leak.txt" 2>&1
LEAK_CODE=$?
set -e
stop_server
if [ "$OPS_CODE" -eq 0 ]; then echo "  green: ops:check exit 0"; record "ops:check" "OPS_CHECK_URL=\$BASE/api/receipt npm run ops:check" "green" "$OPS_CODE"
else echo "  RED: ops:check exit $OPS_CODE"; record "ops:check" "OPS_CHECK_URL=\$BASE/api/receipt npm run ops:check" "red" "$OPS_CODE"; fi
if [ "$LEAK_CODE" -eq 0 ]; then echo "  green: leak:check exit 0"; record "leak:check" "LEAK_CHECK_URL=\$BASE/api/receipt npm run leak:check" "green" "$LEAK_CODE"
else echo "  RED: leak:check exit $LEAK_CODE"; record "leak:check" "LEAK_CHECK_URL=\$BASE/api/receipt npm run leak:check" "red" "$LEAK_CODE"; fi

# ── stage 7: CHECK 4 — test:flow:backstage (self-hosts its webServer) ────────
echo "stage 7/8: CHECK 4 test:flow:backstage"
# The flow self-hosts its own astro dev (port 4323). Ensure no orphaned daemon (from
# the stage-6 serve or a prior run) holds astro's global dev lock, and start from a
# clean local D1 so the first submission hits a migrated table.
pkill -f 'astro.mjs dev' 2>/dev/null || true
( cd "$CONTEXT" 2>/dev/null && "${SANITIZED_ENV[@]}" npx astro dev stop >/dev/null 2>&1 ) || true
rm -rf "$CONTEXT/.wrangler" "$CONTEXT/tests/support/.wrangler" 2>/dev/null || true
# The backstage flow is gated on the public flow-contract passcode and uses Playwright's
# default local test key — it does NOT need (and must not embed) the new-owner signing
# key. Passing it would leak the secret into Playwright's serialized config.webServer.env
# in flow-report.json. Omit it; the flow self-hosts with the public test key.
set +e
( cd "$CONTEXT" && "${SANITIZED_ENV[@]}" CODEX_THREAD_ID='' \
    npm run test:flow:backstage ) > "$EVIDENCE_DIR/4-flow-backstage.txt" 2>&1
FLOW_CODE=$?
set -e
if [ "$FLOW_CODE" -eq 0 ]; then echo "  green: test:flow:backstage exit 0"; record "test:flow:backstage" "npm run test:flow:backstage (in context)" "green" "$FLOW_CODE"
else echo "  RED: test:flow:backstage exit $FLOW_CODE (see evidence/4-flow-backstage.txt)"; record "test:flow:backstage" "npm run test:flow:backstage (in context)" "red" "$FLOW_CODE"; fi
[ -f "$CONTEXT/test-results/flow-report.json" ] && \
  cp "$CONTEXT/test-results/flow-report.json" "$EVIDENCE_DIR/flow-report.json" || true

# ── stage 8: record the four-leg summary + verdict ───────────────────────────
echo "stage 8/8: write summary"
NAMES="${CHECK_NAMES[*]}" CMDS_N=${#CHECK_NAMES[@]} \
R0="${CHECK_RESULTS[0]:-}" R1="${CHECK_RESULTS[1]:-}" R2="${CHECK_RESULTS[2]:-}" R3="${CHECK_RESULTS[3]:-}" \
N0="${CHECK_NAMES[0]:-}" N1="${CHECK_NAMES[1]:-}" N2="${CHECK_NAMES[2]:-}" N3="${CHECK_NAMES[3]:-}" \
C0="${CHECK_CODES[0]:-}" C1="${CHECK_CODES[1]:-}" C2="${CHECK_CODES[2]:-}" C3="${CHECK_CODES[3]:-}" \
EVIDENCE_DIR="$EVIDENCE_DIR" node <<'NODE'
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const names = [process.env.N0, process.env.N1, process.env.N2, process.env.N3];
const results = [process.env.R0, process.env.R1, process.env.R2, process.env.R3];
const codes = [process.env.C0, process.env.C1, process.env.C2, process.env.C3];
const evid = ['1-integration.txt', '2-ops.txt', '3-leak.txt', '4-flow-backstage.txt'];
const checks = names.map((check, i) => ({ check, outcome: results[i], exitCode: Number(codes[i]), evidence: evid[i] }));
const allGreen = checks.every((c) => c.outcome === 'green');
const report = {
  schemaVersion: 1,
  ticket: 'T-007-02-04',
  mode: 'served-local-new-owner-stand-in',
  boundary: 'no second Cloudflare account on this machine; live deployed-URL run is deferred',
  verdict: allGreen ? 'pass' : 'gap',
  checks,
};
writeFileSync(resolve(process.env.EVIDENCE_DIR, 'checks-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
NODE

# Redact the generated secrets from EVERY evidence file (transcripts and JSON reports)
# belt-and-suspenders — the checks already redact the signing key in their own output,
# but Playwright's JSON reporter serializes config.webServer.env, and no generated value
# may linger anywhere in committed evidence.
for f in "$EVIDENCE_DIR"/*.txt "$EVIDENCE_DIR"/*.json; do
  [ -f "$f" ] || continue
  sed -i.bak "s/${SIGNING_KEY}/[REDACTED_SIGNING_KEY]/g; s/${PASSCODE}/[REDACTED_PASSCODE]/g" "$f" 2>/dev/null || true
  rm -f "$f.bak"
done

ALL_GREEN=1
for r in "${CHECK_RESULTS[@]}"; do [ "$r" = "green" ] || ALL_GREEN=0; done
echo ""
echo "── verdict ──"
for i in "${!CHECK_NAMES[@]}"; do
  printf '  %-22s %s (exit %s)\n' "${CHECK_NAMES[$i]}" "${CHECK_RESULTS[$i]}" "${CHECK_CODES[$i]}"
done
if [ "$ALL_GREEN" -eq 1 ]; then
  echo "PASS: all four demo checks green against the served-local new-owner context"
  echo "  deferred-live: the same checks against a real deployed new-owner URL"
  exit 0
else
  echo "GAP: at least one demo check is red against the new-owner context (seam named above)"
  exit 1
fi
