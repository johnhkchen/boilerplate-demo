import { pathToFileURL } from 'node:url';

import {
  SESSION_CONTROL_PREFIX,
  isCommitRevision,
  type SessionOperation,
} from '../src/lib/session-lifecycle.ts';

export type SessionCliCommand = {
  operation: SessionOperation;
  method: 'GET' | 'POST';
  path: string;
  revision?: string;
};

export type SessionCommandOptions = {
  argv: string[];
  workerUrl?: string;
  fetchImpl?: typeof fetch;
  stdout?: Pick<NodeJS.WriteStream, 'write'>;
  stderr?: Pick<NodeJS.WriteStream, 'write'>;
};

export const SESSION_USAGE = `usage:
  npm run session -- up <40-character-commit-sha>
  npm run session -- status
  npm run session -- logs
  npm run session -- down`;

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
  if (
    (operation === 'status' || operation === 'logs' || operation === 'down') &&
    rest.length === 0
  ) {
    return {
      operation,
      method: operation === 'down' ? 'POST' : 'GET',
      path: `${SESSION_CONTROL_PREFIX}/${operation}`,
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
  try {
    command = parseSessionArguments(options.argv);
    origin = parseSessionWorkerUrl(options.workerUrl ?? process.env.SESSION_WORKER_URL);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${message}\n${SESSION_USAGE}\n`);
    return 2;
  }

  const headers = new Headers({ accept: 'application/json' });
  const body =
    command.revision === undefined
      ? undefined
      : JSON.stringify({ revision: command.revision });
  if (body !== undefined) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(new URL(command.path, origin), {
      method: command.method,
      headers,
      body,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`session ${command.operation} failed: ${message}\n`);
    return 1;
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    stderr.write(
      `session ${command.operation} failed: Worker returned non-JSON HTTP ${response.status}\n`,
    );
    return 1;
  }

  const formatted = `${JSON.stringify(payload, null, 2)}\n`;
  if (!response.ok) {
    stderr.write(formatted);
    return 1;
  }
  stdout.write(formatted);
  return 0;
}

async function main(): Promise<void> {
  process.exitCode = await runSessionCommand({ argv: process.argv.slice(2) });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
