import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  SESSION_PATCH_LIMIT_BYTES,
  SESSION_CONTROL_PREFIX,
  isCommitRevision,
  isPatchDigest,
  parseRuntimeSecrets,
  redactSecrets,
  type RuntimeSecrets,
  type SessionOperation,
} from '../src/lib/session-lifecycle.ts';

export type SessionCliCommand = {
  operation: SessionOperation;
  method: 'GET' | 'POST';
  path: string;
  revision?: string;
  force?: boolean;
};

export type SessionCommandOptions = {
  argv: string[];
  workerUrl?: string;
  fetchImpl?: typeof fetch;
  stdout?: Pick<NodeJS.WriteStream, 'write'>;
  stderr?: Pick<NodeJS.WriteStream, 'write'>;
  artifactDirectory?: string;
  writePatch?: (path: string, content: Uint8Array) => void;
  runtimeSecretsJson?: string;
};

export const SESSION_USAGE = `usage:
  npm run session -- up <40-character-commit-sha>
  npm run session -- status
  npm run session -- logs
  npm run session -- down
  npm run session -- down --force`;

export function parseSessionArguments(argv: string[]): SessionCliCommand {
  const [operation, ...rest] = argv;
  if (operation === 'up') {
    const revision = rest[0];
    if (rest.length !== 1 || !isCommitRevision(revision)) {
      throw new TypeError('up requires one full 40-character lowercase Git commit SHA');
    }
    return {
      operation,
      method: 'POST',
      path: `${SESSION_CONTROL_PREFIX}/up`,
      revision,
    };
  }
  if ((operation === 'status' || operation === 'logs') && rest.length === 0) {
    return {
      operation,
      method: 'GET',
      path: `${SESSION_CONTROL_PREFIX}/${operation}`,
    };
  }
  if (operation === 'down' && (rest.length === 0 || (rest.length === 1 && rest[0] === '--force'))) {
    return {
      operation,
      method: 'POST',
      path: `${SESSION_CONTROL_PREFIX}/down`,
      ...(rest[0] === '--force' ? { force: true } : {}),
    };
  }
  throw new TypeError('unknown or malformed session command');
}

export function parseSessionWorkerUrl(value: string | undefined): URL {
  if (value === undefined || value.trim() === '') {
    throw new TypeError('SESSION_WORKER_URL is required');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('SESSION_WORKER_URL must be an HTTP(S) origin');
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (url.pathname !== '' && url.pathname !== '/')
  ) {
    throw new TypeError('SESSION_WORKER_URL must be a credential-free HTTP(S) origin');
  }
  return url;
}

export async function runSessionCommand(options: SessionCommandOptions): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  let command: SessionCliCommand;
  let origin: URL;
  let runtimeSecrets: RuntimeSecrets;
  try {
    command = parseSessionArguments(options.argv);
    origin = parseSessionWorkerUrl(options.workerUrl ?? process.env.SESSION_WORKER_URL);
    const secretsJson = options.runtimeSecretsJson ?? process.env.SESSION_RUNTIME_SECRETS;
    runtimeSecrets = secretsJson === undefined ? {} : parseRuntimeSecrets(secretsJson);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${message}\n${SESSION_USAGE}\n`);
    return 2;
  }

  const request = async (bodyValue?: unknown): Promise<{ response: Response; payload: unknown }> => {
    const headers = new Headers({ accept: 'application/json' });
    const body = bodyValue === undefined ? undefined : JSON.stringify(bodyValue);
    if (body !== undefined) headers.set('content-type', 'application/json');
    const response = await (options.fetchImpl ?? fetch)(new URL(command.path, origin), {
      method: command.method,
      headers,
      body,
    });
    const responseText = await response.text();
    try {
      return { response, payload: JSON.parse(responseText) as unknown };
    } catch {
      throw new Error(`Worker returned non-JSON HTTP ${response.status}`);
    }
  };

  const fail = (message: unknown): number => {
    const safe = redactSecrets(message instanceof Error ? message.message : String(message), runtimeSecrets);
    stderr.write(`session ${command.operation} failed: ${safe}\n`);
    return 1;
  };

  try {
    if (command.operation !== 'down') {
      const body = command.revision === undefined ? undefined : { revision: command.revision };
      const result = await request(body);
      const formatted = `${redactSecrets(JSON.stringify(result.payload, null, 2), runtimeSecrets)}\n`;
      if (!result.response.ok) {
        stderr.write(formatted);
        return 1;
      }
      stdout.write(formatted);
      return 0;
    }

    if (command.force === true) {
      const result = await request({ mode: 'destroy', force: true });
      const formatted = `${redactSecrets(JSON.stringify(result.payload, null, 2), runtimeSecrets)}\n`;
      if (!result.response.ok) {
        stderr.write(formatted);
        return 1;
      }
      stdout.write(formatted);
      return 0;
    }

    const prepared = await request({ mode: 'preserve' });
    if (!prepared.response.ok) {
      stderr.write(`${redactSecrets(JSON.stringify(prepared.payload, null, 2), runtimeSecrets)}\n`);
      return 1;
    }
    const patch = parsePatchPayload(prepared.payload);
    if (patch === null) {
      stdout.write(`${redactSecrets(JSON.stringify(prepared.payload, null, 2), runtimeSecrets)}\n`);
      return 0;
    }

    const filename = `demo-runway-session-${patch.baseRevision.slice(0, 12)}-${patch.sha256.slice(0, 12)}.patch`;
    const artifactPath = resolve(options.artifactDirectory ?? process.cwd(), filename);
    const writePatch = options.writePatch ?? ((path: string, content: Uint8Array) => {
      writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
    });
    writePatch(artifactPath, patch.content);

    const destroyed = await request({
      mode: 'destroy',
      preservationSha256: patch.sha256,
    });
    if (!destroyed.response.ok) {
      stderr.write(`${redactSecrets(JSON.stringify(destroyed.payload, null, 2), runtimeSecrets)}\n`);
      stderr.write(`recoverable patch retained at ${artifactPath}\n`);
      return 1;
    }
    stdout.write(`${redactSecrets(JSON.stringify({
      ...(typeof destroyed.payload === 'object' && destroyed.payload !== null ? destroyed.payload : {}),
      preservation: {
        path: artifactPath,
        baseRevision: patch.baseRevision,
        sha256: patch.sha256,
        bytes: patch.content.byteLength,
      },
    }, null, 2), runtimeSecrets)}\n`);
    return 0;
  } catch (error: unknown) {
    return fail(error);
  }
}

function parsePatchPayload(payload: unknown): {
  baseRevision: string;
  sha256: string;
  content: Uint8Array;
} | null {
  if (typeof payload !== 'object' || payload === null || !('preservation' in payload)) return null;
  const preservation = payload.preservation;
  if (typeof preservation !== 'object' || preservation === null) {
    throw new Error('Worker returned invalid preservation metadata');
  }
  const { baseRevision, sha256, bytes, contentBase64 } = preservation as Record<string, unknown>;
  if (
    !isCommitRevision(baseRevision) ||
    !isPatchDigest(sha256) ||
    !Number.isSafeInteger(bytes) ||
    (bytes as number) <= 0 ||
    (bytes as number) > SESSION_PATCH_LIMIT_BYTES ||
    typeof contentBase64 !== 'string'
  ) {
    throw new Error('Worker returned invalid preservation metadata');
  }
  const content = Buffer.from(contentBase64, 'base64');
  if (content.toString('base64') !== contentBase64 || content.byteLength !== bytes) {
    throw new Error('Worker returned invalid preservation content');
  }
  const observed = createHash('sha256').update(content).digest('hex');
  if (observed !== sha256) throw new Error('Worker returned a mismatched preservation digest');
  return { baseRevision, sha256, content };
}

async function main(): Promise<void> {
  process.exitCode = await runSessionCommand({ argv: process.argv.slice(2) });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
