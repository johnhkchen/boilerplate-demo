// Roll the stable demo back to a prior Workers version — the same atomic
// pointer-move as promotion, aimed backwards. Never rebuilds and never runs
// the verify gate: the target is an immutable version that already passed the
// gate when it was promoted.
//
//   npm run rollback [-- <version-id>] [--yes] [--dry-run]
//
// Without a version id, the target is the previous deployment's version from
// `wrangler deployments list` (the local .promote/last.json record only
// cross-checks; the API is authoritative). Exit codes match promote:
// 0 rolled back + hostname verified · 1 refused/failed before the pointer-move ·
// 2 misconfigured invocation · 3 pointer moved but hostname unverified.

import {
  EXIT,
  formatRollbackDeployMessage,
  isUsageError,
  parseRollbackArgs,
  pickRollbackTarget,
  type PromotionRecord,
} from '../src/lib/promote.ts';
import {
  confirmOrExplain,
  fetchDeployments,
  readLastRecord,
  resolveHostname,
  verifyHostname,
  versionsDeploy,
  writeRecord,
} from './release-shared.ts';

const USAGE = 'usage: npm run rollback [-- <version-id>] [--yes] [--dry-run]';

async function main(): Promise<number> {
  const args = parseRollbackArgs(process.argv.slice(2));
  if (isUsageError(args)) {
    console.error(`${args.error}\n${USAGE}`);
    return EXIT.MISCONFIGURED;
  }

  const deployments = fetchDeployments();
  const active = deployments[0]?.versionId;
  const choice = pickRollbackTarget(deployments, args.versionId, readLastRecord());
  if ('refusal' in choice) {
    console.error(`refused: ${choice.refusal}`);
    return EXIT.REFUSED;
  }
  for (const w of choice.warnings) console.warn(`note: ${w}`);
  const target = choice.versionId;

  console.log(
    `rollback plan: ${active ?? '(none active)'} → ${target} (no rebuild)`,
  );
  if (args.dryRun) {
    console.log('dry run — the pointer has not moved');
    return EXIT.OK;
  }

  const hostname = resolveHostname();
  if (!args.yes) {
    const answer = await confirmOrExplain(
      `roll ${hostname ?? 'the Worker'} back to version ${target}?`,
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

  const message = formatRollbackDeployMessage(target, active ?? 'none');
  if (versionsDeploy(target, message) !== 0) {
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
    hostVerified = await verifyHostname(hostname, target);
  }

  const record: PromotionRecord = {
    action: 'rollback',
    versionId: target,
    priorVersionId: active ?? null,
    deployedAt: new Date().toISOString(),
    hostname: hostname ?? null,
    hostVerified,
  };
  writeRecord(record);

  if (hostname !== undefined && !hostVerified) {
    console.error(
      `version ${target} is deployed but ${hostname} could not be verified — ` +
        'investigate before relying on the rollback',
    );
    return EXIT.UNVERIFIED;
  }
  console.log(`rolled back to version ${target}`);
  return EXIT.OK;
}

process.exit(await main());
