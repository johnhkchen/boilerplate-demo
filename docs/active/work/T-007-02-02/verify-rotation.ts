import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';

import { guardPasscode, PASSCODE_HEADER } from '../../../../src/lib/passcode.ts';
import { parseAccessConfig } from '../../../../src/lib/session-access.ts';
import { parseRuntimeSecrets } from '../../../../src/lib/session-lifecycle.ts';

const APP_BINDINGS = ['DEMO_PASSCODE', 'DEMO_SIGNING_KEY'] as const;
const SESSION_BINDINGS = [
  'SESSION_ACCESS_EDITOR_AUD',
  'SESSION_ACCESS_PREVIEW_AUD',
  'SESSION_ACCESS_TEAM_DOMAIN',
  'SESSION_RUNTIME_SECRETS',
] as const;
const CI_BINDINGS = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'] as const;
const ALL_BINDINGS = [...APP_BINDINGS, ...SESSION_BINDINGS, ...CI_BINDINGS] as const;

const STORES: Record<(typeof ALL_BINDINGS)[number], string> = {
  DEMO_PASSCODE: 'app-worker',
  DEMO_SIGNING_KEY: 'app-worker',
  SESSION_ACCESS_EDITOR_AUD: 'sessions-worker',
  SESSION_ACCESS_PREVIEW_AUD: 'sessions-worker',
  SESSION_ACCESS_TEAM_DOMAIN: 'sessions-worker',
  SESSION_RUNTIME_SECRETS: 'sessions-worker',
  CLOUDFLARE_ACCOUNT_ID: 'github-actions',
  CLOUDFLARE_API_TOKEN: 'github-actions',
};

const AUTHOR_MARKERS: Array<[string, string]> = [
  ['D1 database_id', 'c95861d4-2cfe-47c0-8a9b-c5e081779e48'],
  ['App custom-domain route', '"pattern": "demo.b28.dev"'],
  ['session preview route', '"pattern": "demo-session.b28.dev"'],
  ['session editor route', '"pattern": "code-session.b28.dev"'],
  ['SESSION_DOMAIN', '"SESSION_DOMAIN": "b28.dev"'],
  ['SESSION_REPOSITORY_URL', 'johnhkchen/boilerplate-demo.git'],
];

const RUNTIME_PATHS = [
  'src',
  'wrangler.jsonc',
  'wrangler.sessions.jsonc',
  'Dockerfile.session',
  'astro.config.mjs',
  'migrations',
  'public',
  'scripts',
];
const FORBIDDEN_FRESH_OWNER_PATHS = ['.git', '.dev.vars', '.promote', '.wrangler'];

interface Options {
  context: string;
  repoRoot: string;
  secretFile: string;
  ownerZone: string;
  repositoryUrl: string;
  evidenceDir: string;
  mode: 'report' | 'scan';
}

type Secrets = Record<(typeof ALL_BINDINGS)[number], string>;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || !key.startsWith('--') || value === undefined) {
      fail('usage: verify-rotation.ts --context DIR --repo-root DIR --secret-file FILE --owner-zone DOMAIN --repository-url URL --evidence-dir DIR --mode report|scan');
    }
    values.set(key.slice(2), value);
  }
  const required = [
    'context',
    'repo-root',
    'secret-file',
    'owner-zone',
    'repository-url',
    'evidence-dir',
    'mode',
  ];
  for (const name of required) {
    if (!values.has(name)) fail(`missing --${name}`);
  }
  const mode = values.get('mode');
  if (mode !== 'report' && mode !== 'scan') fail('--mode must be report or scan');
  return {
    context: resolve(values.get('context')!),
    repoRoot: resolve(values.get('repo-root')!),
    secretFile: resolve(values.get('secret-file')!),
    ownerZone: values.get('owner-zone')!,
    repositoryUrl: values.get('repository-url')!,
    evidenceDir: resolve(values.get('evidence-dir')!),
    mode,
  };
}

function stripJsonComments(source: string): string {
  let output = '';
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        output += char;
      }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (char === '\n') {
        output += char;
      }
      continue;
    }
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
    } else if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else {
      output += char;
    }
  }
  if (inString || blockComment) fail('invalid JSONC: unterminated string or comment');
  return output;
}

function readJsonc(path: string): Record<string, unknown> {
  try {
    return JSON.parse(stripJsonComments(readFileSync(path, 'utf8'))) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`could not parse ${path}: ${detail}`);
  }
}

function sortedStrings(value: unknown, seam: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(`${seam} must be a string array`);
  }
  return [...value].sort();
}

function assertSame(actual: string[], expected: readonly string[], seam: string): void {
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${seam} inventory mismatch (expected ${wanted.join(', ')})`);
  }
}

function readSecrets(path: string): Secrets {
  if (!existsSync(path)) fail('private new-owner secret file is missing');
  const mode = statSync(path).mode & 0o777;
  if (mode !== 0o600) fail('private new-owner secret file mode must be 0600');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    fail('private new-owner secret file is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail('private new-owner secret file must be a JSON object');
  }
  const record = parsed as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  assertSame(actual, ALL_BINDINGS, 'generated secret');
  for (const name of ALL_BINDINGS) {
    if (typeof record[name] !== 'string' || record[name].trim() === '') {
      fail(`${name} is missing from generated new-owner secret set`);
    }
  }
  return record as Secrets;
}

function regularFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  const stats = lstatSync(path);
  if (stats.isSymbolicLink()) return [];
  if (stats.isFile()) return [path];
  if (!stats.isDirectory()) return [];
  return readdirSync(path, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => regularFiles(resolve(path, entry.name)));
}

function scanValues(
  roots: string[],
  markers: Array<[string, string]>,
  displayRoot: string,
): Array<{ name: string; path: string }> {
  const findings: Array<{ name: string; path: string }> = [];
  for (const path of roots.flatMap(regularFiles)) {
    const body = readFileSync(path);
    for (const [name, value] of markers) {
      if (body.includes(Buffer.from(value, 'utf8'))) {
        findings.push({
          name,
          path: relative(displayRoot, path).split('\\').join('/'),
        });
      }
    }
  }
  return findings;
}

function fingerprint(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex').slice(0, 12)}`;
}

function validateConfiguration(options: Options) {
  const appConfig = readJsonc(resolve(options.context, 'wrangler.jsonc'));
  const sessionConfig = readJsonc(resolve(options.context, 'wrangler.sessions.jsonc'));
  const appSecrets = (appConfig.secrets as Record<string, unknown> | undefined)?.required;
  const sessionSecrets = (sessionConfig.secrets as Record<string, unknown> | undefined)?.required;
  assertSame(sortedStrings(appSecrets, 'App secrets.required'), APP_BINDINGS, 'App secrets.required');
  assertSame(
    sortedStrings(sessionSecrets, 'Sessions secrets.required'),
    SESSION_BINDINGS,
    'Sessions secrets.required',
  );

  const workflow = readFileSync(resolve(options.context, '.github/workflows/deploy.yml'), 'utf8');
  for (const name of CI_BINDINGS) {
    if (!workflow.includes(`secrets.${name}`)) fail(`workflow destination missing for ${name}`);
  }

  const vars = sessionConfig.vars as Record<string, unknown> | undefined;
  if (vars?.SESSION_DOMAIN !== options.ownerZone) fail('SESSION_DOMAIN is not the selected new-owner value');
  if (vars?.SESSION_REPOSITORY_URL !== options.repositoryUrl) {
    fail('SESSION_REPOSITORY_URL is not the selected new-owner value');
  }
  const appRoutes = (appConfig.routes as Array<Record<string, unknown>> | undefined) ?? [];
  const sessionRoutes = (sessionConfig.routes as Array<Record<string, unknown>> | undefined) ?? [];
  const routePatterns = [...appRoutes, ...sessionRoutes].map((route) => route.pattern);
  const expectedRoutes = [
    `demo.${options.ownerZone}`,
    `demo-session.${options.ownerZone}`,
    `code-session.${options.ownerZone}`,
  ];
  assertSame(
    routePatterns.filter((item): item is string => typeof item === 'string').sort(),
    expectedRoutes,
    'custom-domain routes',
  );

  for (const forbidden of FORBIDDEN_FRESH_OWNER_PATHS) {
    if (existsSync(resolve(options.context, forbidden))) {
      fail(`${forbidden} present in fresh-owner context`);
    }
  }
  const authorFindings = scanValues(
    RUNTIME_PATHS.map((path) => resolve(options.context, path)),
    AUTHOR_MARKERS,
    options.context,
  );
  if (authorFindings.length > 0) {
    fail(`active author marker remains at ${authorFindings[0]!.path} (${authorFindings[0]!.name})`);
  }
  const placeholders = scanValues(
    [resolve(options.context, 'wrangler.jsonc'), resolve(options.context, 'wrangler.sessions.jsonc')],
    [
      ['owner-zone placeholder', 'NEW-OWNER-ZONE.example'],
      ['repository placeholder', 'NEW-OWNER/REPO'],
    ],
    options.context,
  );
  if (placeholders.length > 0) fail(`new-owner placeholder remains at ${placeholders[0]!.path}`);
  return { appBindings: [...APP_BINDINGS], sessionBindings: [...SESSION_BINDINGS], ciBindings: [...CI_BINDINGS] };
}

function validateContracts(secrets: Secrets): { runtimeApiKeys: string[]; passcode: string } {
  const runtime = parseRuntimeSecrets(secrets.SESSION_RUNTIME_SECRETS);
  if (!Object.hasOwn(runtime, 'NEW_OWNER_DEMO_API_KEY')) {
    fail('SESSION_RUNTIME_SECRETS does not include NEW_OWNER_DEMO_API_KEY');
  }
  parseAccessConfig(secrets);
  const accepted = guardPasscode(
    new Request('https://new-owner.example/backstage', {
      headers: { [PASSCODE_HEADER]: secrets.DEMO_PASSCODE },
    }),
    secrets.DEMO_PASSCODE,
  );
  if (accepted !== null) fail('generated DEMO_PASSCODE was not accepted by production gate');
  const rejected = guardPasscode(
    new Request('https://new-owner.example/backstage', {
      headers: { [PASSCODE_HEADER]: 'deliberately-wrong-passcode' },
    }),
    secrets.DEMO_PASSCODE,
  );
  if (rejected?.status !== 403) fail('production gate did not reject the wrong passcode');
  return { runtimeApiKeys: Object.keys(runtime).sort(), passcode: 'accepted-and-wrong-value-rejected' };
}

function secretMarkers(secrets: Secrets): Array<[string, string]> {
  const markers: Array<[string, string]> = ALL_BINDINGS.map((name) => [name, secrets[name]]);
  const runtime = parseRuntimeSecrets(secrets.SESSION_RUNTIME_SECRETS);
  for (const [name, value] of Object.entries(runtime)) {
    markers.push([`SESSION_RUNTIME_SECRETS.${name}`, value]);
  }
  return markers;
}

function exactValueFindings(options: Options, secrets: Secrets) {
  const contextRoots = RUNTIME_PATHS.map((path) => resolve(options.context, path));
  const optionalRoots = [resolve(options.context, 'dist'), options.evidenceDir];
  return scanValues([...contextRoots, ...optionalRoots], secretMarkers(secrets), options.repoRoot);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const secrets = readSecrets(options.secretFile);
  const configuration = validateConfiguration(options);
  const contracts = validateContracts(secrets);
  const findings = exactValueFindings(options, secrets);

  if (options.mode === 'scan') {
    if (findings.length > 0) {
      for (const finding of findings) console.log(`LEAK ${finding.name} ${finding.path}`);
      process.exitCode = 1;
    } else {
      for (const name of ALL_BINDINGS) console.log(`CLEAN ${name}`);
      console.log('CLEAN SESSION_RUNTIME_SECRETS.NEW_OWNER_DEMO_API_KEY');
    }
    return;
  }

  if (findings.length > 0) {
    fail(`exact new-owner secret reached ${findings[0]!.path} (${findings[0]!.name})`);
  }
  const fingerprints = ALL_BINDINGS.map((name) => fingerprint(secrets[name]));
  if (new Set(fingerprints).size !== fingerprints.length) {
    fail('generated new-owner secret fingerprints are not pairwise distinct');
  }

  const report = {
    ticket: 'T-007-02-02',
    outcome: 'passed',
    mode: 'scrubbed-local-simulation',
    configuration: {
      outcome: 'passed',
      ownerZone: options.ownerZone,
      repositoryUrl: options.repositoryUrl,
      inventories: configuration,
      activeAuthorMarkers: [],
      placeholders: [],
    },
    contracts: {
      runtimeApiKeys: contracts.runtimeApiKeys,
      accessConfiguration: 'accepted',
      passcode: contracts.passcode,
    },
    secrets: ALL_BINDINGS.map((name, index) => ({
      name,
      store: STORES[name],
      fingerprint: fingerprints[index],
      contract: 'passed',
      installation: 'simulated',
    })),
    authorSecretProvenance: 'absent-from-clean-source',
    exactValueScan: { outcome: 'passed', findings: [] },
    liveStores: [
      {
        store: 'cloudflare-workers',
        state: 'deferred-live',
        reason: 'no genuine new-owner Cloudflare authority or target account supplied',
      },
      {
        store: 'github-actions',
        state: 'deferred-live',
        reason: 'no genuine new-owner GitHub repository authority supplied',
      },
    ],
    nonRotatableGaps: [],
  };
  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`rotation verification failed: ${message}`);
  process.exitCode = 1;
}
