#!/usr/bin/env bash
# scrub-fresh-owner.sh — T-007-02-01 fresh-owner drill harness.
#
# Produces and PROVES a fresh-owner context from the current repo HEAD: a clean
# tree with the author's account/zone/repo couplings scrubbed to loud new-owner
# placeholders, and with no author credential or secret on the runtime path.
#
# Honest boundary (PE-7): this is a scrubbed LOCAL simulation. It stands up no
# live Cloudflare resource and reads no author credential. Deploying the scrubbed
# context under a real second account is the metered manual leg named in
# fresh-owner-harness.md and attempted by T-007-02-02/03/04 — not by this script.
#
#   docs/active/work/T-007-02-01/scrub-fresh-owner.sh [DEST_DIR]
#
# Exit: 0 context produced and proven clean · 1 a residual author coupling or
# dropped-secret file remained (named) · 2 misinvoked (not repo root / archive
# failed).
set -euo pipefail

REPO_ROOT="$(pwd)"
DEST_DIR="${1:-${TMPDIR:-/tmp}/fresh-owner-context}"

banner() { printf '\n==> %s\n' "$*"; }
fail()   { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# --- preconditions -----------------------------------------------------------
[ -f "$REPO_ROOT/wrangler.jsonc" ] && [ -d "$REPO_ROOT/.git" ] \
  || { echo "run from the repo root (needs wrangler.jsonc + .git)" >&2; exit 2; }

# The active author-account/zone/repo couplings flagged by T-007-01-02. These
# exact strings — not brand tokens or comments — are what must be gone after the
# scrub. Kept as (label, literal) pairs so the verdict can name any residual.
ACTIVE_COUPLINGS=(
  'D1 database_id (account-bound)|c95861d4-2cfe-47c0-8a9b-c5e081779e48'
  'App route (author zone)|"pattern": "demo.b28.dev"'
  'Session preview route (author zone)|"pattern": "demo-session.b28.dev"'
  'Session editor route (author zone)|"pattern": "code-session.b28.dev"'
  'SESSION_DOMAIN var (author zone)|"SESSION_DOMAIN": "b28.dev"'
  'SESSION_REPOSITORY_URL var (author repo)|johnhkchen/boilerplate-demo.git'
)
# Files/paths that actually run when the demo is deployed (see research.md).
RUNTIME_PATHS=(src wrangler.jsonc wrangler.sessions.jsonc Dockerfile.session
               astro.config.mjs migrations public scripts)
# Author-secret / local-state files that a fresh-owner tree must NOT contain.
FORBIDDEN=(.git .dev.vars .promote .wrangler)

scan_active() {  # print any active-coupling literal still present under $DEST_DIR
  local dir="$1" hit=0 pair label lit
  for pair in "${ACTIVE_COUPLINGS[@]}"; do
    label="${pair%%|*}"; lit="${pair#*|}"
    if grep -rqF -- "$lit" "$dir/wrangler.jsonc" "$dir/wrangler.sessions.jsonc" 2>/dev/null; then
      printf '  [coupled] %s  ->  %s\n' "$label" "$lit"; hit=1
    fi
  done
  return $hit
}

# --- 1. clean tree from committed content only -------------------------------
banner "Building clean tree at $DEST_DIR (git archive HEAD — drops .git/.dev.vars/.promote/.wrangler)"
rm -rf "$DEST_DIR"; mkdir -p "$DEST_DIR"
git -C "$REPO_ROOT" archive HEAD | tar -x -C "$DEST_DIR" || { echo "git archive failed" >&2; exit 2; }

# --- 2. strip the template planning trail (E-007 leak guardrail) -------------
banner "Removing template planning trail (docs/active/**); keeping docs/knowledge as reference"
rm -rf "$DEST_DIR/docs/active"

# --- 3. scan BEFORE — prove the couplings were really there ------------------
banner "Scan BEFORE scrub — active author couplings on the runtime path"
scan_active "$DEST_DIR" || true

# --- 4. scrub the five active couplings to loud new-owner placeholders --------
banner "Scrubbing active config couplings -> NEW-OWNER placeholders"
# Remove database_id AND the now-dangling trailing comma on the prior line.
perl -0777 -pi -e 's/"migrations_dir": "\.\/migrations",\n(\s*)"database_id": "c95861d4-2cfe-47c0-8a9b-c5e081779e48"\n/"migrations_dir": ".\/migrations"\n/' "$DEST_DIR/wrangler.jsonc"
perl -pi -e 's/"pattern": "demo\.b28\.dev"/"pattern": "demo.NEW-OWNER-ZONE.example"/' "$DEST_DIR/wrangler.jsonc"
perl -pi -e 's/"pattern": "demo-session\.b28\.dev"/"pattern": "demo-session.NEW-OWNER-ZONE.example"/' "$DEST_DIR/wrangler.sessions.jsonc"
perl -pi -e 's/"pattern": "code-session\.b28\.dev"/"pattern": "code-session.NEW-OWNER-ZONE.example"/' "$DEST_DIR/wrangler.sessions.jsonc"
perl -pi -e 's/"SESSION_DOMAIN": "b28\.dev"/"SESSION_DOMAIN": "NEW-OWNER-ZONE.example"/' "$DEST_DIR/wrangler.sessions.jsonc"
perl -pi -e 's{"SESSION_REPOSITORY_URL": "https://github\.com/johnhkchen/boilerplate-demo\.git"}{"SESSION_REPOSITORY_URL": "https://github.com/NEW-OWNER/REPO.git"}' "$DEST_DIR/wrangler.sessions.jsonc"

# --- 5. scan AFTER + assert the forbidden files are absent -------------------
banner "Scan AFTER scrub — active author couplings on the runtime path"
if scan_active "$DEST_DIR"; then
  echo "  (none — all five active couplings scrubbed)"
else
  scan_active "$DEST_DIR"
  fail "an active author coupling survived the scrub (named above)"
fi

banner "Asserting author-secret / local-state files are absent from the context"
for f in "${FORBIDDEN[@]}"; do
  if [ -e "$DEST_DIR/$f" ]; then fail "$f present in fresh-owner context (author state leaked)"; fi
  printf '  [absent] %s\n' "$f"
done

# --- 6. allowed residue (brand tokens / comments) — named, not scrubbed ------
banner "Allowed residue on runtime path (shared b28 brand + narrative comments — NOT couplings)"
( cd "$DEST_DIR" && grep -rnE 'b28\.dev|--b28-' "${RUNTIME_PATHS[@]}" 2>/dev/null \
    | grep -vE '"pattern"|"SESSION_DOMAIN"' || true ) | sed 's/^/  /'

banner "VERDICT"
echo "  PASS — fresh-owner context at $DEST_DIR"
echo "  - zero active author couplings on the runtime path"
echo "  - .git / .dev.vars / .promote / .wrangler absent (no author secret/state)"
echo "  - docs/active/** removed (no template planning trail)"
echo "  - deferred: live deploy under a real second Cloudflare account (see fresh-owner-harness.md)"
exit 0
