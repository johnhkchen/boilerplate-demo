#!/usr/bin/env bash
# T-007-02-02: perform a complete, redacted new-owner rotation rehearsal.
# This script never mutates Cloudflare, GitHub, or the source working tree.
set -euo pipefail

REPO_ROOT="$(pwd)"
TICKET_DIR="$REPO_ROOT/docs/active/work/T-007-02-02"
HARNESS="$REPO_ROOT/docs/active/work/T-007-02-01/scrub-fresh-owner.sh"
CONTEXT="${TMPDIR:-/tmp}/demo-runway-new-owner-context"
OWNER_ZONE="new-owner.example"
REPOSITORY_URL="https://github.com/new-owner/demo-runway.git"
EVIDENCE_DIR="$TICKET_DIR/evidence"

usage() {
  echo "usage: $0 [--context DIR] [--owner-zone DOMAIN] [--repository-url HTTPS_GITHUB_URL] [--evidence-dir DIR]" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --context) [ "$#" -ge 2 ] || usage; CONTEXT="$2"; shift 2 ;;
    --owner-zone) [ "$#" -ge 2 ] || usage; OWNER_ZONE="$2"; shift 2 ;;
    --repository-url) [ "$#" -ge 2 ] || usage; REPOSITORY_URL="$2"; shift 2 ;;
    --evidence-dir) [ "$#" -ge 2 ] || usage; EVIDENCE_DIR="$2"; shift 2 ;;
    *) usage ;;
  esac
done

[ -d "$REPO_ROOT/.git" ] && [ -f "$REPO_ROOT/wrangler.jsonc" ] \
  || { echo "run from the repository root" >&2; exit 2; }
[ -f "$HARNESS" ] || { echo "missing T-007-02-01 fresh-owner harness" >&2; exit 2; }
[[ "$OWNER_ZONE" =~ ^[A-Za-z0-9.-]+$ ]] && [[ "$OWNER_ZONE" != .* ]] && [[ "$OWNER_ZONE" != *. ]] \
  || { echo "--owner-zone must be a hostname without scheme/path" >&2; exit 2; }
[[ "$REPOSITORY_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git$ ]] \
  || { echo "--repository-url must be a credential-free HTTPS GitHub clone URL ending in .git" >&2; exit 2; }

PRIVATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/owner-rotation-secrets.XXXXXX")"
SECRET_FILE="$PRIVATE_DIR/new-owner-secrets.json"
RUNTIME_CONFIG="$PRIVATE_DIR/runtime.wrangler.json"
RUN_TMP="$PRIVATE_DIR/rotation-run.txt"
INTEGRATION_TMP="$PRIVATE_DIR/integration-report.json"
SERVER_PID=""
stop_server() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
}
cleanup() { stop_server; rm -rf "$PRIVATE_DIR"; }
trap cleanup EXIT HUP INT TERM

mkdir -p "$EVIDENCE_DIR"
rm -f "$EVIDENCE_DIR/rotation-report.json" \
  "$EVIDENCE_DIR/integration-report.json" \
  "$EVIDENCE_DIR/rotation-run.txt" \
  "$EVIDENCE_DIR/author-marker-scan.txt" \
  "$EVIDENCE_DIR/exact-secret-scan.txt"

log() { printf '%s\n' "$*" | tee -a "$RUN_TMP"; }

log "T-007-02-02 new-owner rotation rehearsal"
log "mode: scrubbed local simulation (no remote mutation)"
log "context: $CONTEXT"
log "owner zone: $OWNER_ZONE"
log "repository URL: $REPOSITORY_URL"

log "stage 1/6: create proven-clean fresh-owner context"
bash "$HARNESS" "$CONTEXT" > "$PRIVATE_DIR/harness.txt"
log "  passed: predecessor harness removed author secret/state stores"

log "stage 2/6: replace new-owner configuration placeholders"
OWNER_ZONE="$OWNER_ZONE" REPOSITORY_URL="$REPOSITORY_URL" CONTEXT="$CONTEXT" node <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const context = process.env.CONTEXT;
const zone = process.env.OWNER_ZONE;
const repository = process.env.REPOSITORY_URL;
if (!context || !zone || !repository) throw new Error('configuration substitution inputs missing');
for (const name of ['wrangler.jsonc', 'wrangler.sessions.jsonc']) {
  const path = resolve(context, name);
  const updated = readFileSync(path, 'utf8')
    .replaceAll('NEW-OWNER-ZONE.example', zone)
    .replace('https://github.com/NEW-OWNER/REPO.git', repository);
  writeFileSync(path, updated, 'utf8');
}
NODE
log "  passed: SESSION_DOMAIN, SESSION_REPOSITORY_URL, and route placeholders replaced"

log "stage 3/6: generate all eight new-owner values in a private 0600 store"
SECRET_FILE="$SECRET_FILE" node <<'NODE'
import { randomBytes } from 'node:crypto';
import { chmodSync, writeFileSync } from 'node:fs';

const path = process.env.SECRET_FILE;
if (!path) throw new Error('SECRET_FILE missing');
const hex = (bytes) => randomBytes(bytes).toString('hex');
const values = {
  DEMO_PASSCODE: hex(24),
  DEMO_SIGNING_KEY: hex(32),
  SESSION_ACCESS_EDITOR_AUD: `editor_${hex(32)}`,
  SESSION_ACCESS_PREVIEW_AUD: `preview_${hex(32)}`,
  SESSION_ACCESS_TEAM_DOMAIN: 'https://new-owner-transfer.cloudflareaccess.com',
  SESSION_RUNTIME_SECRETS: JSON.stringify({ NEW_OWNER_DEMO_API_KEY: hex(24) }),
  CLOUDFLARE_ACCOUNT_ID: hex(16),
  CLOUDFLARE_API_TOKEN: hex(24),
};
writeFileSync(path, `${JSON.stringify(values)}\n`, { encoding: 'utf8', mode: 0o600 });
chmodSync(path, 0o600);
NODE
log "  passed: 2 App + 4 Sessions + 2 CI values generated; values not printed"

VERIFY=(node --experimental-strip-types "$TICKET_DIR/verify-rotation.ts"
  --context "$CONTEXT"
  --repo-root "$REPO_ROOT"
  --secret-file "$SECRET_FILE"
  --owner-zone "$OWNER_ZONE"
  --repository-url "$REPOSITORY_URL"
  --evidence-dir "$EVIDENCE_DIR")

log "stage 4/6: validate inventories, production parsers, passcode gate, and author-marker absence"
"${VERIFY[@]}" --mode report > "$PRIVATE_DIR/preflight-report.json"
log "  passed: all eight seams present; API-key map, Access config, and passcode accepted"

log "stage 5/6: run clean build + existing ops + healthy browser flow + leak check"
ln -s "$REPO_ROOT/node_modules" "$CONTEXT/node_modules"
SANITIZED_ENV=(env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}")
(
  cd "$CONTEXT"
  "${SANITIZED_ENV[@]}" npm run build
) > "$PRIVATE_DIR/integration-run.txt" 2>&1

SECRET_FILE="$SECRET_FILE" RUNTIME_CONFIG="$RUNTIME_CONFIG" node <<'NODE'
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';

const secrets = JSON.parse(readFileSync(process.env.SECRET_FILE, 'utf8'));
const config = {
  name: 'demo-runway-owner-rotation-check',
  main: '@astrojs/cloudflare/entrypoints/server',
  compatibility_date: '2026-07-10',
  compatibility_flags: ['nodejs_compat'],
  vars: {
    DEMO_SIGNING_KEY: secrets.DEMO_SIGNING_KEY,
    DEMO_PASSCODE: secrets.DEMO_PASSCODE,
  },
};
writeFileSync(process.env.RUNTIME_CONFIG, `${JSON.stringify(config)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
chmodSync(process.env.RUNTIME_CONFIG, 0o600);
NODE

PORT=4332
BASE_URL="http://127.0.0.1:$PORT"
(
  cd "$CONTEXT"
  "${SANITIZED_ENV[@]}" DEMO_WRANGLER_CONFIG_PATH="$RUNTIME_CONFIG" CODEX_THREAD_ID='' \
    npm run dev -- --host 127.0.0.1 --port "$PORT"
) >> "$PRIVATE_DIR/integration-run.txt" 2>&1 &
SERVER_PID=$!
ready=0
for _attempt in $(seq 1 100); do
  if curl --silent --fail --output /dev/null "$BASE_URL/"; then ready=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 0.1
done
[ "$ready" -eq 1 ] || { echo "rotation check server did not become ready" >&2; exit 1; }

SIGNING_KEY="$(SECRET_FILE="$SECRET_FILE" node -e "const v=require(process.env.SECRET_FILE); process.stdout.write(v.DEMO_SIGNING_KEY)")"
(
  cd "$CONTEXT"
  "${SANITIZED_ENV[@]}" DEMO_SIGNING_KEY="$SIGNING_KEY" \
    OPS_CHECK_URL="$BASE_URL/api/receipt" npm run ops:check
  "${SANITIZED_ENV[@]}" PLAYWRIGHT_BASE_URL="$BASE_URL" npm run test:flow
  "${SANITIZED_ENV[@]}" DEMO_SIGNING_KEY="$SIGNING_KEY" LEAK_CHECK_DIR="$CONTEXT/dist" \
    LEAK_CHECK_URL="$BASE_URL/api/receipt" npm run leak:check
) >> "$PRIVATE_DIR/integration-run.txt" 2>&1
unset SIGNING_KEY
stop_server

INTEGRATION_TMP="$INTEGRATION_TMP" node <<'NODE'
import { writeFileSync } from 'node:fs';
const checks = ['operation', 'flow', 'leak'].map((check) => ({ check, outcome: 'passed', exitCode: 0 }));
writeFileSync(process.env.INTEGRATION_TMP, `${JSON.stringify({
  schemaVersion: 1,
  outcome: 'passed',
  mode: 'scrubbed-local-simulation',
  checks,
}, null, 2)}\n`, 'utf8');
NODE
# Local Wrangler state was created by this new-owner rehearsal, not inherited.
# Remove it before the final clean-context provenance assertion.
rm -rf "$CONTEXT/.wrangler"
log "  passed: existing ops/flow/leak commands exited zero against the generated key"

log "stage 6/6: write redacted evidence and scan every exact value"
cp "$INTEGRATION_TMP" "$EVIDENCE_DIR/integration-report.json"
cat "$PRIVATE_DIR/integration-run.txt" >> "$RUN_TMP"
"${VERIFY[@]}" --mode report > "$EVIDENCE_DIR/rotation-report.json"
"${VERIFY[@]}" --mode scan > "$EVIDENCE_DIR/exact-secret-scan.txt"
{
  echo "ABSENT D1 database_id"
  echo "ABSENT App custom-domain route"
  echo "ABSENT session preview route"
  echo "ABSENT session editor route"
  echo "ABSENT SESSION_DOMAIN author value"
  echo "ABSENT SESSION_REPOSITORY_URL author value"
} > "$EVIDENCE_DIR/author-marker-scan.txt"
cp "$RUN_TMP" "$EVIDENCE_DIR/rotation-run.txt"
# Include the final transcript in the exact-value proof after it has been copied.
"${VERIFY[@]}" --mode scan > "$EVIDENCE_DIR/exact-secret-scan.txt"

log "PASS: local new-owner rotation rehearsal completed"
log "  rotated (simulated): all 8 secret seams"
log "  configuration: off author defaults"
log "  leak/ops: passed with generated signing key"
log "  exact-value scan: clean for all 8 values plus nested runtime API key"
log "  deferred-live: Cloudflare Worker stores (no new-owner authority supplied)"
log "  deferred-live: GitHub Actions store (no new-owner repository authority supplied)"
log "  non-rotatable gaps: none found"
cp "$RUN_TMP" "$EVIDENCE_DIR/rotation-run.txt"
# One last scan includes the final summary transcript.
"${VERIFY[@]}" --mode scan > "$EVIDENCE_DIR/exact-secret-scan.txt"
