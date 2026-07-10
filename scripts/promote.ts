// Promote an exact commit to the stable demo as an immutable Workers version.
//
//   npm run promote -- <commit-ish> [--yes] [--skip-verify] [--dry-run]
//
// Sequence: resolve the commit and require the working tree to BE it → run the
// verify gate → build → `wrangler versions upload` (tagged with the commit) →
// smoke-test the version's preview URL → atomic pointer-move with
// `wrangler versions deploy` → prove the hostname serves the new version →
// record commit + prior version (Cloudflare deployment message and .promote/).
//
// Rollback is the sibling command (scripts/rollback.ts): the same pointer-move
// at the recorded prior version, no rebuild. All decision logic lives in
// src/lib/promote.ts; this file owns git, npm, wrangler, network, and exit.
//
// Exit codes: 0 promoted + hostname verified · 1 refused/failed before the
// pointer-move (production untouched) · 2 misconfigured invocation ·
// 3 pointer moved but hostname verification failed (needs operator eyes).

import {
  EXIT,
  classifyPorcelain,
  formatPromoteDeployMessage,
  formatVersionMessage,
  formatVersionTag,
  isUsageError,
  parsePromoteArgs,
  type PromotionRecord,
} from '../src/lib/promote.ts';
import {
  confirmOrExplain,
  fetchDeployments,
  git,
  previewSmoke,
  resolveHostname,
  runInherit,
  verifyHostname,
  versionsDeploy,
  versionsUpload,
  writeRecord,
} from './release-shared.ts';

const USAGE =
  'usage: npm run promote -- <commit-ish> [--yes] [--skip-verify] [--dry-run]';

async function main(): Promise<number> {
  const args = parsePromoteArgs(process.argv.slice(2));
  if (isUsageError(args)) {
    console.error(`${args.error}\n${USAGE}`);
    return EXIT.MISCONFIGURED;
  }

  // The named commit, exactly. HEAD must be it and nothing that can reach the
  // build may differ from it — otherwise the uploaded artifact would not be
  // the commit the record claims.
  const sha = git(['rev-parse', '--verify', `${args.commitish}^{commit}`]);
  if (sha === undefined) {
    console.error(`refused: ${args.commitish} does not resolve to a commit`);
    return EXIT.REFUSED;
  }
  const head = git(['rev-parse', 'HEAD']);
  if (head !== sha) {
    console.error(
      `refused: HEAD is ${head?.slice(0, 12)}, not ${sha.slice(0, 12)} — ` +
        `check out the commit first (git checkout ${sha.slice(0, 12)})`,
    );
    return EXIT.REFUSED;
  }
  const porcelain = git(['status', '--porcelain']) ?? '';
  const tree = classifyPorcelain(porcelain);
  for (const w of tree.warnings) {
    console.warn(`note: untracked outside build inputs: ${w}`);
  }
  if (tree.blocking.length > 0) {
    console.error('refused: the working tree is not exactly this commit:');
    for (const b of tree.blocking) console.error(`  ${b}`);
    console.error('commit, stash, or remove these first.');
    return EXIT.REFUSED;
  }

  // The verify gate. --skip-verify exists for CI, where the same tree passed
  // the workflow's dedicated verify step moments earlier.
  if (args.skipVerify) {
    console.warn('⚠ verify gate SKIPPED (--skip-verify) — CI-only escape hatch');
  } else {
    console.log('running the verify gate (npm run verify)…');
    if (runInherit('npm', ['run', 'verify']) !== 0) {
      console.error('refused: the verify gate failed; nothing was uploaded');
      return EXIT.REFUSED;
    }
  }

  if (runInherit('npm', ['run', 'build']) !== 0) {
    console.error('refused: build failed; nothing was uploaded');
    return EXIT.REFUSED;
  }

  // Upload the immutable version, commit-addressed via tag + message.
  const subject = git(['log', '-1', '--format=%s', sha]) ?? '';
  const uploadArgs = [
    '--tag',
    formatVersionTag(sha),
    '--message',
    formatVersionMessage(sha, subject),
    ...(args.dryRun ? ['--dry-run'] : []),
  ];
  const upload = versionsUpload(uploadArgs);
  if (upload.status !== 0) {
    console.error('refused: versions upload failed; the pointer never moved');
    return EXIT.REFUSED;
  }
  if (args.dryRun) {
    console.log(`dry run complete for ${sha} — nothing uploaded or deployed`);
    return EXIT.OK;
  }
  const versionId = upload.result.versionId;
  if (versionId === undefined) {
    console.error(
      'refused: could not identify the uploaded version id from wrangler ' +
        'output; deploy it manually with `npx wrangler versions deploy` if ' +
        'intended — the pointer has not moved',
    );
    return EXIT.REFUSED;
  }

  // Pre-promotion smoke on the version preview URL: a failing version simply
  // never serves.
  if (upload.result.previewUrl === undefined) {
    console.warn(
      'note: wrangler reported no preview URL (preview_urls disabled?); ' +
        'skipping the pre-promotion smoke test',
    );
  } else if (!(await previewSmoke(upload.result.previewUrl))) {
    console.error(
      `refused: version ${versionId} failed its preview smoke test; ` +
        'the pointer never moved',
    );
    return EXIT.REFUSED;
  }

  const prior = fetchDeployments()[0]?.versionId ?? null;

  const hostname = resolveHostname();
  if (!args.yes) {
    const answer = await confirmOrExplain(
      `deploy version ${versionId} (commit ${sha.slice(0, 12)}) to ${
        hostname ?? 'the Worker'
      }?`,
    );
    if (answer === 'no-tty') {
      console.error('non-interactive run requires --yes');
      return EXIT.MISCONFIGURED;
    }
    if (answer === 'declined') {
      console.error('aborted by operator; the pointer never moved');
      return EXIT.REFUSED;
    }
  }

  // The atomic pointer-move.
  const deployMessage = formatPromoteDeployMessage(formatVersionTag(sha), prior);
  if (versionsDeploy(versionId, deployMessage) !== 0) {
    console.error('versions deploy failed; check `wrangler deployments status`');
    return EXIT.REFUSED;
  }

  let hostVerified = false;
  if (hostname === undefined) {
    console.warn(
      'note: no custom domain in wrangler.jsonc and no PROMOTE_HOSTNAME set; ' +
        'skipping hostname verification',
    );
  } else {
    hostVerified = await verifyHostname(hostname, versionId);
  }

  const record: PromotionRecord = {
    action: 'promote',
    commit: sha,
    versionId,
    priorVersionId: prior,
    deployedAt: new Date().toISOString(),
    hostname: hostname ?? null,
    hostVerified,
    skippedVerify: args.skipVerify,
  };
  writeRecord(record);

  if (hostname !== undefined && !hostVerified) {
    console.error(
      `version ${versionId} is deployed but ${hostname} could not be ` +
        `verified — investigate, or roll back with: npm run rollback`,
    );
    return EXIT.UNVERIFIED;
  }
  console.log(`promoted ${sha.slice(0, 12)} → version ${versionId}`);
  return EXIT.OK;
}

process.exit(await main());
