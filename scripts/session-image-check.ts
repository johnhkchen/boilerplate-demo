import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_IMAGE = 'demo-runway-session:local';
const DEFAULT_DOCKERFILE = 'Dockerfile.session';
const DEFAULT_BUDGET_MS = 60_000;
const EXPECTED_NODE = 'v24.18.0';
const EXPECTED_CODE_SERVER = '4.127.0';
const EXPECTED_MARKER = 'Demo Runway';

export interface ImageCheckOptions {
  image: string;
  dockerfile: string;
  budgetMs: number;
  skipBuild: boolean;
}

export interface VersionObservation {
  node: string;
  npm: string;
  codeServer: string;
}

export interface ColdStartEvidence {
  ticket: 'T-004-03-01';
  observedAt: string;
  scope: 'local-docker';
  budgetMs: number;
  elapsedMs: number;
  withinBudget: boolean;
  image: {
    tag: string;
    id: string;
    architecture: string;
  };
  docker: {
    serverVersion: string;
    architecture: string;
  };
  sandbox: {
    expected: '0.12.3';
    observed: string;
  };
  node: {
    expected: 'v24.18.0';
    observed: string;
  };
  npm: {
    observed: string;
  };
  codeServer: {
    expected: '4.127.0';
    observed: string;
  };
  entrypoint: string[];
  exposedPorts: string[];
  http: {
    status: number;
    marker: 'Demo Runway';
    markerFound: boolean;
  };
  configValidation: 'separate-command';
  cleanup: {
    containerRemoved: boolean;
  };
  limitations: string[];
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new TypeError(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv: string[]): ImageCheckOptions {
  const options: ImageCheckOptions = {
    image: DEFAULT_IMAGE,
    dockerfile: DEFAULT_DOCKERFILE,
    budgetMs: DEFAULT_BUDGET_MS,
    skipBuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--skip-build') {
      options.skipBuild = true;
      continue;
    }
    if (flag === '--image') {
      options.image = requireValue(argv, index, flag);
      index += 1;
      continue;
    }
    if (flag === '--dockerfile') {
      options.dockerfile = requireValue(argv, index, flag);
      index += 1;
      continue;
    }
    if (flag === '--budget-ms') {
      const raw = requireValue(argv, index, flag);
      const budgetMs = Number(raw);
      if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
        throw new RangeError('--budget-ms must be a positive finite number.');
      }
      options.budgetMs = budgetMs;
      index += 1;
      continue;
    }
    throw new TypeError(`Unknown option: ${flag}`);
  }

  return options;
}

export function parsePublishedPort(output: string): number {
  const match = output.trim().match(/:(\d+)$/);
  if (match === null) {
    throw new Error(`Could not parse Docker published port from: ${output.trim() || '<empty>'}`);
  }
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Docker published an invalid port: ${match[1]}`);
  }
  return port;
}

export function validateEntrypoint(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    value[0] !== '/container-server/sandbox'
  ) {
    throw new Error(
      `Session image must retain the Sandbox entrypoint; observed ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

export function validateVersions(observed: VersionObservation): VersionObservation {
  if (observed.node !== EXPECTED_NODE) {
    throw new Error(`Expected Node ${EXPECTED_NODE}; observed ${observed.node}.`);
  }
  if (observed.codeServer !== EXPECTED_CODE_SERVER) {
    throw new Error(
      `Expected code-server ${EXPECTED_CODE_SERVER}; observed ${observed.codeServer}.`,
    );
  }
  return observed;
}

export function parseVersionDiagnostics(output: string): VersionObservation {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const node = lines.find((line) => /^v\d+\.\d+\.\d+$/.test(line));
  const npm = lines.find((line) => /^\d+\.\d+\.\d+$/.test(line));
  const codeServerLine = lines.find((line) => /^\d+\.\d+\.\d+\s/.test(line));
  if (node === undefined || npm === undefined || codeServerLine === undefined) {
    throw new Error(`Incomplete version diagnostics: ${JSON.stringify(lines)}`);
  }
  return validateVersions({
    node,
    npm,
    codeServer: codeServerLine.split(/\s+/, 1)[0],
  });
}

export function formatEvidence(evidence: ColdStartEvidence): string {
  return `${JSON.stringify(evidence, null, 2)}\n`;
}

function run(
  command: string,
  args: string[],
  options: { timeout?: number; stderr?: 'inherit' | 'pipe' } = {},
): string {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', options.stderr ?? 'pipe'],
    timeout: options.timeout,
  });
}

function docker(args: string[], timeout = 120_000): string {
  return run('docker', args, { timeout });
}

function dockerInfo(): { serverVersion: string; architecture: string } {
  const value = JSON.parse(
    docker(['info', '--format', '{"serverVersion":{{json .ServerVersion}},"architecture":{{json .Architecture}}}']),
  ) as { serverVersion?: unknown; architecture?: unknown };
  if (typeof value.serverVersion !== 'string' || typeof value.architecture !== 'string') {
    throw new Error('Docker returned incomplete server information.');
  }
  return { serverVersion: value.serverVersion, architecture: value.architecture };
}

function inspectImage(image: string): {
  id: string;
  architecture: string;
  entrypoint: string[];
  exposedPorts: string[];
  sandboxVersion: string;
} {
  const documents = JSON.parse(docker(['image', 'inspect', image])) as Array<{
    Id?: unknown;
    Architecture?: unknown;
    Config?: { Entrypoint?: unknown; ExposedPorts?: unknown; Env?: unknown };
  }>;
  const document = documents[0];
  if (
    document === undefined ||
    typeof document.Id !== 'string' ||
    typeof document.Architecture !== 'string'
  ) {
    throw new Error(`Docker returned incomplete image inspection for ${image}.`);
  }
  const entrypoint = validateEntrypoint(document.Config?.Entrypoint);
  const exposedPorts = Object.keys(
    typeof document.Config?.ExposedPorts === 'object' && document.Config.ExposedPorts !== null
      ? document.Config.ExposedPorts
      : {},
  ).sort();
  const env = Array.isArray(document.Config?.Env) ? document.Config.Env : [];
  const sandboxValue = env.find(
    (item): item is string => typeof item === 'string' && item.startsWith('SANDBOX_VERSION='),
  );
  return {
    id: document.Id,
    architecture: document.Architecture,
    entrypoint,
    exposedPorts,
    sandboxVersion: sandboxValue?.slice('SANDBOX_VERSION='.length) ?? '<missing>',
  };
}

function observeVersions(image: string): VersionObservation {
  const output = docker([
    'run',
    '--rm',
    '--entrypoint',
    '/bin/sh',
    image,
    '-lc',
    'node --version; npm --version; code-server --version',
  ]);
  return parseVersionDiagnostics(output);
}

function removeContainer(name: string): boolean {
  const result = spawnSync('docker', ['rm', '--force', name], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return result.status === 0 || result.stderr.includes('No such container');
}

async function waitForReady(
  port: number,
  startedAt: number,
  budgetMs: number,
): Promise<{ elapsedMs: number; status: number; markerFound: boolean }> {
  const url = `http://127.0.0.1:${port}/`;
  while (performance.now() - startedAt < budgetMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      const body = await response.text();
      const markerFound = body.includes(EXPECTED_MARKER);
      if (response.status === 200 && markerFound) {
        return {
          elapsedMs: Math.round(performance.now() - startedAt),
          status: response.status,
          markerFound,
        };
      }
    } catch {
      // The container or workerd development runtime is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Real dev server did not become ready inside ${budgetMs} ms.`);
}

async function measure(options: ImageCheckOptions): Promise<ColdStartEvidence> {
  const host = dockerInfo();
  if (!options.skipBuild) {
    console.error(`Building ${options.image} from ${options.dockerfile}...`);
    const build = spawnSync(
      'docker',
      [
        'build',
        '--platform',
        'linux/amd64',
        '--file',
        options.dockerfile,
        '--tag',
        options.image,
        '.',
      ],
      { stdio: 'inherit', timeout: 10 * 60_000 },
    );
    if (build.status !== 0) {
      throw new Error(`Docker build failed with exit ${build.status ?? 'unknown'}.`);
    }
  }

  const image = inspectImage(options.image);
  const versions = observeVersions(options.image);
  if (image.architecture !== 'amd64') {
    throw new Error(`Expected linux/amd64 image; observed ${image.architecture}.`);
  }
  if (image.sandboxVersion !== '0.12.3') {
    throw new Error(`Expected Sandbox 0.12.3; observed ${image.sandboxVersion}.`);
  }
  if (!image.exposedPorts.includes('4321/tcp') || !image.exposedPorts.includes('8080/tcp')) {
    throw new Error(`Expected ports 4321/tcp and 8080/tcp; observed ${image.exposedPorts}.`);
  }

  const container = `demo-runway-session-check-${process.pid}-${Date.now()}`;
  let containerRemoved = false;
  let readiness: Awaited<ReturnType<typeof waitForReady>>;
  try {
    const startedAt = performance.now();
    docker(
      [
        'run',
        '--detach',
        '--name',
        container,
        '--publish',
        '127.0.0.1::4321',
        '--entrypoint',
        '/bin/sh',
        options.image,
        '-lc',
        'cd /opt/demo-runway && exec npm run dev -- --host 0.0.0.0 --port 4321',
      ],
      30_000,
    );
    const port = parsePublishedPort(docker(['port', container, '4321/tcp']));
    readiness = await waitForReady(port, startedAt, options.budgetMs);
  } catch (error) {
    try {
      const logs = docker(['logs', container], 30_000);
      if (logs.trim() !== '') console.error(logs.trimEnd());
    } catch {
      // Preserve the original failure when the container never started.
    }
    throw error;
  } finally {
    containerRemoved = removeContainer(container);
  }

  if (!containerRemoved) {
    throw new Error(`Could not remove measurement container ${container}.`);
  }

  return {
    ticket: 'T-004-03-01',
    observedAt: new Date().toISOString(),
    scope: 'local-docker',
    budgetMs: options.budgetMs,
    elapsedMs: readiness.elapsedMs,
    withinBudget: readiness.elapsedMs <= options.budgetMs,
    image: { tag: options.image, id: image.id, architecture: image.architecture },
    docker: host,
    sandbox: { expected: '0.12.3', observed: image.sandboxVersion },
    node: { expected: EXPECTED_NODE, observed: versions.node },
    npm: { observed: versions.npm },
    codeServer: { expected: EXPECTED_CODE_SERVER, observed: versions.codeServer },
    entrypoint: image.entrypoint,
    exposedPorts: image.exposedPorts,
    http: { status: readiness.status, marker: EXPECTED_MARKER, markerFound: readiness.markerFound },
    configValidation: 'separate-command',
    cleanup: { containerRemoved },
    limitations: [
      'Local Docker uses amd64 emulation on an arm64 host.',
      'Cloudflare image pull, placement, basic-instance resources, and production cold start were not measured.',
      'The account still requires Workers Paid Containers entitlement for a remote run.',
    ],
  };
}

async function main(): Promise<void> {
  const evidence = await measure(parseArgs(process.argv.slice(2)));
  process.stdout.write(formatEvidence(evidence));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`session image check failed: ${message}`);
    process.exitCode = 1;
  });
}
