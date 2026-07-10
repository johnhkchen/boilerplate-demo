// Pure core of the promote/rollback commands (scripts/promote.ts,
// scripts/rollback.ts). Everything decidable from strings and objects lives
// here — argument parsing, refusal rules, wrangler output parsing, rollback
// target selection, record and message formats — so the branching is unit
// tested without git, wrangler, or the network. The scripts own subprocesses,
// env, fs, stdout, and exit codes; this module never touches any of them.
//
// Promotion model (docs/knowledge/demo-environments-decisions.md): a release
// is `wrangler versions upload` (immutable version, tagged with the commit)
// followed by `wrangler versions deploy` (atomic pointer-move). Rollback is
// the same pointer-move at a prior version — never a rebuild.

// Exit-code contract, extending the ops-check convention (0/1/2) with one
// promotion-specific state: the pointer moved but the hostname could not be
// verified — production changed and needs operator eyes.
export const EXIT = {
  OK: 0,
  REFUSED: 1, // refused or failed BEFORE the pointer-move; production untouched
  MISCONFIGURED: 2, // bad invocation (args, auth, non-TTY without --yes)
  UNVERIFIED: 3, // pointer moved; post-deploy hostname verification failed
} as const;

export interface PromoteArgs {
  commitish: string;
  yes: boolean;
  skipVerify: boolean;
  dryRun: boolean;
}

export interface RollbackArgs {
  versionId?: string;
  yes: boolean;
  dryRun: boolean;
}

export interface UsageError {
  error: string;
}

export function isUsageError(v: unknown): v is UsageError {
  return typeof v === 'object' && v !== null && 'error' in v;
}

const COMMON_FLAGS: Record<string, 'yes' | 'dryRun'> = {
  '--yes': 'yes',
  '-y': 'yes',
  '--dry-run': 'dryRun',
};

// argv is everything after the script path. One positional; flags anywhere.
export function parsePromoteArgs(argv: string[]): PromoteArgs | UsageError {
  const args: PromoteArgs = {
    commitish: '',
    yes: false,
    skipVerify: false,
    dryRun: false,
  };
  for (const a of argv) {
    if (a in COMMON_FLAGS) args[COMMON_FLAGS[a]] = true;
    else if (a === '--skip-verify') args.skipVerify = true;
    else if (a.startsWith('-')) return { error: `unknown flag: ${a}` };
    else if (args.commitish === '') args.commitish = a;
    else return { error: `unexpected extra argument: ${a}` };
  }
  if (args.commitish === '') {
    return { error: 'missing required <commit-ish> (e.g. HEAD, a sha, a tag)' };
  }
  return args;
}

export function parseRollbackArgs(argv: string[]): RollbackArgs | UsageError {
  const args: RollbackArgs = { yes: false, dryRun: false };
  for (const a of argv) {
    if (a in COMMON_FLAGS) args[COMMON_FLAGS[a]] = true;
    else if (a.startsWith('-')) return { error: `unknown flag: ${a}` };
    else if (args.versionId === undefined) args.versionId = a;
    else return { error: `unexpected extra argument: ${a}` };
  }
  return args;
}

// ---------------------------------------------------------------------------
// Refusal rules: what may be dirty when promoting.
//
// The promise the record makes is that the ARTIFACT was built from the named
// commit, so cleanliness is judged by whether a change can reach the build:
// anything touching build-input directories or the repo root (where config
// lives) blocks, tracked or untracked alike. Changes elsewhere (docs/,
// .lisa/ — a working Lisa checkout always carries some) are surfaced as
// warnings, not refusals; refusing on them would make promote unusable from
// the checkout Lisa actually works in.

export interface TreeStatus {
  blocking: string[];
  warnings: string[];
}

const BUILD_INPUT_PREFIXES = [
  'src/',
  'public/',
  'scripts/',
  'test/',
  'tests/',
  'migrations/',
];

const canReachBuild = (path: string): boolean =>
  !path.includes('/') || // repo root: config lives here
  BUILD_INPUT_PREFIXES.some((p) => path.startsWith(p));

export function classifyPorcelain(porcelain: string): TreeStatus {
  const blocking: string[] = [];
  const warnings: string[] = [];
  for (const line of porcelain.split('\n')) {
    if (line.trim() === '') continue;
    // "XY path" — for renames the path field is "old -> new"; either side
    // touching a build input taints the artifact.
    const paths = line.slice(3).trim().split(' -> ');
    if (paths.some(canReachBuild)) blocking.push(line.trim());
    else warnings.push(line.trim());
  }
  return { blocking, warnings };
}

// ---------------------------------------------------------------------------
// Wrangler output capture. Primary: the ND-JSON file wrangler writes when
// WRANGLER_OUTPUT_FILE_PATH is set (entry type "version-upload" carries
// version_id; null on --dry-run). Fallback: the human stdout, which also
// carries the preview URL that the output file does not.

export interface UploadResult {
  versionId?: string;
  previewUrl?: string;
}

export function parseWranglerOutputFile(ndjson: string): UploadResult {
  const result: UploadResult = {};
  for (const line of ndjson.split('\n')) {
    if (line.trim() === '') continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a torn or non-JSON line never sinks the parse
    }
    if (
      typeof entry === 'object' &&
      entry !== null &&
      (entry as { type?: unknown }).type === 'version-upload'
    ) {
      const id = (entry as { version_id?: unknown }).version_id;
      if (typeof id === 'string' && id !== '') result.versionId = id;
    }
  }
  return result;
}

export function parseUploadStdout(stdout: string): UploadResult {
  const result: UploadResult = {};
  const id = stdout.match(/Worker Version ID:\s*([0-9a-f-]{36})/i);
  if (id) result.versionId = id[1];
  const preview = stdout.match(/Version Preview URL:\s*(https:\/\/\S+)/i);
  if (preview) result.previewUrl = preview[1];
  return result;
}

// ---------------------------------------------------------------------------
// Deployment history. `wrangler deployments list --json` returns entries
// OLDEST-first (verified against wrangler 4.110); normalize to newest-first
// and to the one version a percentage deployment actually serves.

export interface DeploymentInfo {
  deploymentId: string;
  createdOn: string;
  versionId: string;
  message?: string;
}

export function parseDeploymentsList(json: unknown): DeploymentInfo[] {
  if (!Array.isArray(json)) return [];
  const out: DeploymentInfo[] = [];
  for (const raw of json) {
    if (typeof raw !== 'object' || raw === null) continue;
    const d = raw as {
      id?: unknown;
      created_on?: unknown;
      versions?: unknown;
      annotations?: { 'workers/message'?: unknown };
    };
    const versions = Array.isArray(d.versions) ? d.versions : [];
    // The serving version: highest percentage wins (always 100% in this
    // project — gradual rollouts are out of scope).
    let best: { version_id?: unknown; percentage?: unknown } | undefined;
    for (const v of versions) {
      if (typeof v !== 'object' || v === null) continue;
      const vv = v as { version_id?: unknown; percentage?: unknown };
      if (
        best === undefined ||
        (Number(vv.percentage) || 0) > (Number(best.percentage) || 0)
      ) {
        best = vv;
      }
    }
    if (
      typeof d.id !== 'string' ||
      typeof d.created_on !== 'string' ||
      typeof best?.version_id !== 'string'
    ) {
      continue;
    }
    const message = d.annotations?.['workers/message'];
    out.push({
      deploymentId: d.id,
      createdOn: d.created_on,
      versionId: best.version_id,
      ...(typeof message === 'string' ? { message } : {}),
    });
  }
  out.sort((a, b) => (a.createdOn < b.createdOn ? 1 : -1));
  return out;
}

// ---------------------------------------------------------------------------
// Rollback target selection. Explicit version id wins (it may legitimately be
// a never-deployed version, so absence from history only warns). Otherwise
// the previous deployment's version. The deployments API is authoritative;
// the local record only cross-checks.

export interface PromotionRecord {
  action: 'promote' | 'rollback';
  commit?: string; // full sha (promote only)
  versionId: string;
  priorVersionId: string | null;
  deployedAt: string; // ISO 8601
  hostname: string | null;
  hostVerified: boolean;
  skippedVerify?: boolean;
}

export type TargetChoice =
  | { versionId: string; warnings: string[] }
  | { refusal: string };

export function pickRollbackTarget(
  deployments: DeploymentInfo[],
  explicitId?: string,
  lastRecord?: PromotionRecord,
): TargetChoice {
  const active = deployments[0]?.versionId;
  if (explicitId !== undefined) {
    if (explicitId === active) {
      return { refusal: `version ${explicitId} is already active` };
    }
    const warnings: string[] = [];
    if (!deployments.some((d) => d.versionId === explicitId)) {
      warnings.push(
        `version ${explicitId} does not appear in recent deployment history; ` +
          'deploying it anyway (explicit target)',
      );
    }
    return { versionId: explicitId, warnings };
  }
  if (deployments.length < 2) {
    return {
      refusal:
        'no prior deployment to roll back to (deployment history has fewer than two entries)',
    };
  }
  const target = deployments[1].versionId;
  if (target === active) {
    return {
      refusal: `previous deployment serves the same version (${target}) — nothing to roll back to`,
    };
  }
  const warnings: string[] = [];
  if (
    lastRecord?.action === 'promote' &&
    lastRecord.priorVersionId !== null &&
    lastRecord.priorVersionId !== undefined &&
    lastRecord.priorVersionId !== target
  ) {
    warnings.push(
      `local record expected prior version ${lastRecord.priorVersionId}, ` +
        `but deployment history says ${target}; trusting the API`,
    );
  }
  return { versionId: target, warnings };
}

// ---------------------------------------------------------------------------
// Records and messages. The durable ledger is Cloudflare-side: the version
// tag (short sha), the version message (full sha + subject), the deployment
// message (action + prior). The local .promote/ files are a convenience cache.

const VERSION_TAG_LENGTH = 12;
const MESSAGE_BUDGET = 100; // stay under the API's message length limits

export function formatVersionTag(sha: string): string {
  return sha.slice(0, VERSION_TAG_LENGTH);
}

export function formatVersionMessage(sha: string, subject: string): string {
  const msg = `${sha} ${subject}`;
  return msg.length <= MESSAGE_BUDGET ? msg : `${msg.slice(0, MESSAGE_BUDGET - 1)}…`;
}

export function formatPromoteDeployMessage(
  shortSha: string,
  priorVersionId: string | null,
): string {
  return `promote ${shortSha} prior=${priorVersionId ?? 'none'}`;
}

export function formatRollbackDeployMessage(target: string, from: string): string {
  return `rollback to ${target} from ${from}`;
}

// ---------------------------------------------------------------------------
// Hostname discovery: read the custom domain out of wrangler.jsonc text
// without a JSONC parser. Tolerant by design — a template adopter with no
// custom domain gets undefined, and the scripts fall back to PROMOTE_HOSTNAME
// or skip hostname verification with a warning.

export function extractCustomDomain(wranglerJsonc: string): string | undefined {
  const patternFirst =
    /"pattern"\s*:\s*"([^"]+)"\s*,\s*"custom_domain"\s*:\s*true/.exec(
      wranglerJsonc,
    );
  if (patternFirst) return patternFirst[1];
  const domainFirst =
    /"custom_domain"\s*:\s*true\s*,\s*"pattern"\s*:\s*"([^"]+)"/.exec(
      wranglerJsonc,
    );
  return domainFirst?.[1];
}
