#!/usr/bin/env bash
# verify-runbook.sh — T-007-03-01
#
# Verifies the handoff runbook's acceptance mechanics:
#   pass 1  leak scan       — template-development vocabulary must be ABSENT
#   pass 2  seam presence   — every contracted seam string appears in the runbook
#   pass 3  seam reality    — every cited file/key/script resolves in the tree
#
# Usage (from repo root):
#   docs/active/work/T-007-03-01/verify-runbook.sh [RUNBOOK_PATH]
#
# Exit: 0 all passes green · 1 a pass failed · 2 misinvocation
set -euo pipefail

[[ -f package.json && -d docs/knowledge ]] || {
  echo "run from the repository root" >&2
  exit 2
}

RUNBOOK="${1:-docs/knowledge/handoff-runbook.md}"
[[ -f "$RUNBOOK" ]] || { echo "runbook not found: $RUNBOOK" >&2; exit 2; }

fail=0
banner() { printf '\n==> %s\n' "$*"; }

# ---------------------------------------------------------------- pass 1
banner "Pass 1 — leak scan (each pattern must have ZERO matches)"
# Template-development vocabulary barred from the portable artifact:
# workflow/board names, planning-trail paths, ticket/story/epic IDs, and
# development-history narration (word-bounded so e.g. 'history' != 'story').
LEAK_PATTERNS=(
  'RDSPI'
  '[Ll]isa'
  '\bVend\b'
  'docs/active'
  '\b[TSE]-0[0-9]'
  '\b[Dd]rills?\b'
  '\b[Rr]ehearsals?\b'
  '\b[Tt]ickets?\b'
  '\b[Ss]tory\b'
  '\b[Ss]tories\b'
  '\b[Ee]pics?\b'
  '\b[Ss]corecard\b'
)
for pat in "${LEAK_PATTERNS[@]}"; do
  if hits=$(grep -nE "$pat" "$RUNBOOK"); then
    echo "  [LEAK] /$pat/:"
    echo "$hits" | sed 's/^/         /'
    fail=1
  else
    echo "  [clean] /$pat/"
  fi
done

# ---------------------------------------------------------------- pass 2
banner "Pass 2 — seam presence (each string must appear in the runbook)"
SEAM_STRINGS=(
  # files
  wrangler.jsonc wrangler.sessions.jsonc test/promote.test.mjs
  migrations/0001_create_backstage_entries.sql
  src/lib/session-lifecycle.ts src/lib/backstage-store.ts .dev.vars
  # config keys / bindings
  routes database_id SESSION_DOMAIN SESSION_REPOSITORY_URL
  SESSION_COORDINATOR BACKSTAGE_DB
  # the eight secret seams
  DEMO_SIGNING_KEY DEMO_PASSCODE SESSION_RUNTIME_SECRETS
  SESSION_ACCESS_TEAM_DOMAIN SESSION_ACCESS_PREVIEW_AUD
  SESSION_ACCESS_EDITOR_AUD CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
  # npm scripts
  'deploy:dry' 'session:validate' 'integration:check' 'ops:check'
  'leak:check' 'test:flow:backstage'
  # check target vars
  DEMO_BASE_URL PLAYWRIGHT_BASE_URL
)
for s in "${SEAM_STRINGS[@]}"; do
  if grep -qF "$s" "$RUNBOOK"; then
    echo "  [present] $s"
  else
    echo "  [MISSING] $s"
    fail=1
  fi
done

# ---------------------------------------------------------------- pass 3
banner "Pass 3 — seam reality (cited files/keys/scripts resolve in the tree)"
for f in wrangler.jsonc wrangler.sessions.jsonc test/promote.test.mjs \
         migrations/0001_create_backstage_entries.sql \
         src/lib/session-lifecycle.ts src/lib/backstage-store.ts; do
  if [[ -f "$f" ]]; then echo "  [exists] $f"; else echo "  [MISSING FILE] $f"; fail=1; fi
done
# .dev.vars is gitignored local state; the real seam is the ignore rule.
if grep -q '\.dev\.vars' .gitignore; then
  echo "  [exists] .gitignore rule for .dev.vars"
else
  echo "  [MISSING] .dev.vars not in .gitignore"; fail=1
fi

check_key() { # file, key
  if grep -q "$2" "$1"; then echo "  [key ok] $1 : $2"
  else echo "  [MISSING KEY] $1 : $2"; fail=1; fi
}
check_key wrangler.jsonc '"routes"'
check_key wrangler.jsonc '"database_id"'
check_key wrangler.jsonc '"BACKSTAGE_DB"'
check_key wrangler.jsonc 'DEMO_SIGNING_KEY'
check_key wrangler.jsonc 'DEMO_PASSCODE'
check_key wrangler.sessions.jsonc '"routes"'
check_key wrangler.sessions.jsonc '"SESSION_DOMAIN"'
check_key wrangler.sessions.jsonc '"SESSION_REPOSITORY_URL"'
check_key wrangler.sessions.jsonc 'SESSION_COORDINATOR'
check_key wrangler.sessions.jsonc 'SESSION_RUNTIME_SECRETS'
check_key wrangler.sessions.jsonc 'SESSION_ACCESS_TEAM_DOMAIN'
check_key wrangler.sessions.jsonc 'SESSION_ACCESS_PREVIEW_AUD'
check_key wrangler.sessions.jsonc 'SESSION_ACCESS_EDITOR_AUD'
check_key test/promote.test.mjs "demo.b28.dev"

for script in deploy deploy:dry session:validate integration:check \
              ops:check leak:check test:flow:backstage; do
  if grep -q "\"$script\":" package.json; then
    echo "  [script ok] $script"
  else
    echo "  [MISSING SCRIPT] $script"; fail=1
  fi
done

# ---------------------------------------------------------------- verdict
banner "Verdict"
if [[ "$fail" -eq 0 ]]; then
  echo "  PASS — runbook is leak-clean and every cited seam is real"
else
  echo "  FAIL — see [LEAK]/[MISSING] lines above"
fi
exit "$fail"
