export const SESSION_COORDINATOR_NAME = 'primary';
export const SESSION_SANDBOX_ID = 'demo-runway-session';
export const SESSION_STORAGE_KEY = 'desired-session';
export const SESSION_CONTROL_PREFIX = '/__session';
export const SESSION_GIT_DIR = '/workspace/repository.git';
export const SESSION_WORKTREE = '/workspace/session';
export const SESSION_RUNTIME_DIR = '/workspace/session-runtime';
export const SESSION_ASTRO_CONFIG_PATH = `${SESSION_RUNTIME_DIR}/astro.config.mjs`;
export const BAKED_PROJECT = '/opt/demo-runway';
export const ASTRO_PROCESS_ID = 'astro-dev';
export const CODE_SERVER_PROCESS_ID = 'code-server';
export const ASTRO_PORT = 4321;
export const CODE_SERVER_PORT = 8080;
export const SESSION_READY_TIMEOUT_MS = 60_000;
export const SESSION_PROVISION_TIMEOUT_MS = 180_000;
export const SESSION_LOG_LIMIT_BYTES = 32 * 1024;
export const SESSION_PROXY_TARGET_HEADER = 'x-demo-runway-session-target';

export type SessionPhase =
  | 'provisioning'
  | 'ready'
  | 'failed'
  | 'stopping';

export type SessionRecord = {
  version: 1;
  slug: string;
  revision: string;
  phase: SessionPhase;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type SessionConfig = {
  slug: string;
  domain: string;
  repositoryUrl: string;
  previewHost: string;
  editorHost: string;
};

export type SessionUpInput = { revision: string };
export type ProxyTarget = 'preview' | 'editor';
export type SessionOperation = 'up' | 'status' | 'logs' | 'down';

export type SessionProcessSnapshot = {
  id: string;
  status: string;
  pid?: number;
  exitCode?: number;
};

export type SessionPublicError = {
  code: string;
  message: string;
};

export type SessionOperationResult<T> =
  | { ok: true; status: number; value: T }
  | { ok: false; status: number; error: SessionPublicError };

export type ControlRequest =
  | { kind: 'operation'; operation: SessionOperation }
  | { kind: 'method-not-allowed'; allow: string }
  | { kind: 'not-control' };

export type BoundedLog = {
  value: string;
  truncated: boolean;
  originalBytes: number;
};

const COMMIT_REVISION = /^[0-9a-f]{40}$/;
const DNS_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const DNS_NAME = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

export function isCommitRevision(value: unknown): value is string {
  return typeof value === 'string' && COMMIT_REVISION.test(value);
}

export function parseUpInput(value: unknown): SessionOperationResult<SessionUpInput> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !('revision' in value) ||
    !isCommitRevision(value.revision)
  ) {
    return failure(
      400,
      'invalid_revision',
      'revision must be one full 40-character lowercase Git commit SHA',
    );
  }

  return success({ revision: value.revision });
}

export function parseSessionConfig(input: {
  SESSION_SLUG?: unknown;
  SESSION_DOMAIN?: unknown;
  SESSION_REPOSITORY_URL?: unknown;
}): SessionConfig {
  const slug = input.SESSION_SLUG;
  const domain = input.SESSION_DOMAIN;
  const repositoryUrl = input.SESSION_REPOSITORY_URL;

  if (typeof slug !== 'string' || !DNS_LABEL.test(slug)) {
    throw new Error('SESSION_SLUG must be a lowercase DNS label');
  }
  if (typeof domain !== 'string' || !DNS_NAME.test(domain)) {
    throw new Error('SESSION_DOMAIN must be a lowercase DNS name');
  }
  if (typeof repositoryUrl !== 'string') {
    throw new Error('SESSION_REPOSITORY_URL must be an HTTPS URL');
  }

  let parsedRepository: URL;
  try {
    parsedRepository = new URL(repositoryUrl);
  } catch {
    throw new Error('SESSION_REPOSITORY_URL must be an HTTPS URL');
  }
  if (
    parsedRepository.protocol !== 'https:' ||
    parsedRepository.username !== '' ||
    parsedRepository.password !== '' ||
    parsedRepository.search !== '' ||
    parsedRepository.hash !== ''
  ) {
    throw new Error('SESSION_REPOSITORY_URL must be a credential-free HTTPS URL');
  }

  return {
    slug,
    domain,
    repositoryUrl: parsedRepository.toString(),
    previewHost: `demo-${slug}.${domain}`,
    editorHost: `code-${slug}.${domain}`,
  };
}

export function classifyControlRequest(method: string, pathname: string): ControlRequest {
  const operations: Record<string, { operation: SessionOperation; method: string }> = {
    [`${SESSION_CONTROL_PREFIX}/up`]: { operation: 'up', method: 'POST' },
    [`${SESSION_CONTROL_PREFIX}/status`]: { operation: 'status', method: 'GET' },
    [`${SESSION_CONTROL_PREFIX}/logs`]: { operation: 'logs', method: 'GET' },
    [`${SESSION_CONTROL_PREFIX}/down`]: { operation: 'down', method: 'POST' },
  };
  const route = operations[pathname];

  if (route === undefined) {
    return pathname === SESSION_CONTROL_PREFIX || pathname.startsWith(`${SESSION_CONTROL_PREFIX}/`)
      ? { kind: 'method-not-allowed', allow: '' }
      : { kind: 'not-control' };
  }
  if (method.toUpperCase() !== route.method) {
    return { kind: 'method-not-allowed', allow: route.method };
  }
  return { kind: 'operation', operation: route.operation };
}

export function classifyProxyHost(
  hostname: string,
  config: SessionConfig,
): ProxyTarget | null {
  const normalized = hostname.toLowerCase();
  if (normalized === config.previewHost) return 'preview';
  if (normalized === config.editorHost) return 'editor';
  return null;
}

export function isWebSocketUpgrade(request: Request): boolean {
  return request.headers.get('upgrade')?.toLowerCase() === 'websocket';
}

export function sessionUrls(config: SessionConfig): {
  previewUrl: string;
  editorUrl: string;
} {
  return {
    previewUrl: `https://${config.previewHost}`,
    editorUrl: `https://${config.editorHost}`,
  };
}

export function boundedLog(
  value: string,
  limit = SESSION_LOG_LIMIT_BYTES,
): BoundedLog {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('log limit must be a positive integer');
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  if (bytes.byteLength <= limit) {
    return { value, truncated: false, originalBytes: bytes.byteLength };
  }
  const tail = bytes.slice(bytes.byteLength - limit);
  return {
    value: new TextDecoder().decode(tail),
    truncated: true,
    originalBytes: bytes.byteLength,
  };
}

export function buildProvisionCommand(): string {
  return `set -eu
if [ -e "${SESSION_WORKTREE}/.git" ]; then
  actual_revision="$(git -C "${SESSION_WORKTREE}" rev-parse HEAD)"
  if [ "$actual_revision" != "$SESSION_REVISION" ]; then
    echo "existing worktree revision conflicts with requested revision" >&2
    exit 42
  fi
  convergence=existing
else
  rm -rf "${SESSION_GIT_DIR}" "${SESSION_WORKTREE}"
  git init --bare "${SESSION_GIT_DIR}"
  git --git-dir="${SESSION_GIT_DIR}" remote add origin "$SESSION_REPOSITORY_URL"
  git --git-dir="${SESSION_GIT_DIR}" fetch --depth=1 origin "$SESSION_REVISION"
  git --git-dir="${SESSION_GIT_DIR}" worktree add --detach "${SESSION_WORKTREE}" FETCH_HEAD
  actual_revision="$(git -C "${SESSION_WORKTREE}" rev-parse HEAD)"
  test "$actual_revision" = "$SESSION_REVISION"
  convergence=created
fi
if [ ! -e "${SESSION_WORKTREE}/node_modules" ]; then
  if cmp -s "${SESSION_WORKTREE}/package.json" "${BAKED_PROJECT}/package.json" \
    && cmp -s "${SESSION_WORKTREE}/package-lock.json" "${BAKED_PROJECT}/package-lock.json"; then
    ln -s "${BAKED_PROJECT}/node_modules" "${SESSION_WORKTREE}/node_modules"
    dependencies=baked
  else
    npm ci --prefix "${SESSION_WORKTREE}"
    dependencies=installed
  fi
else
  dependencies=existing
fi
printf 'convergence=%s dependencies=%s revision=%s\\n' "$convergence" "$dependencies" "$actual_revision"`;
}

export function buildAstroConfig(config: SessionConfig): string {
  const host = JSON.stringify(config.previewHost);
  return `import baseConfig from 'file://${SESSION_WORKTREE}/astro.config.mjs';

export default {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    host: '0.0.0.0',
    port: ${ASTRO_PORT},
    strictPort: true,
    allowedHosts: [${host}],
    hmr: {
      protocol: 'wss',
      host: ${host},
      clientPort: 443,
    },
  },
};
`;
}

export function buildAstroCommand(): string {
  return `./node_modules/.bin/astro --root ${SESSION_WORKTREE} --config ${SESSION_ASTRO_CONFIG_PATH} dev`;
}

export function buildCodeServerCommand(): string {
  return `code-server --bind-addr 0.0.0.0:${CODE_SERVER_PORT} --auth none --disable-telemetry ${SESSION_WORKTREE}`;
}

export function safeErrorMessage(error: unknown, limit = 500): string {
  const source = error instanceof Error ? error.message : String(error);
  const singleLine = source.replace(/[\r\n\t]+/g, ' ').trim();
  return singleLine.slice(0, limit) || 'unknown session error';
}

export function success<T>(value: T, status = 200): SessionOperationResult<T> {
  return { ok: true, status, value };
}

export function failure(
  status: number,
  code: string,
  message: string,
): SessionOperationResult<never> {
  return { ok: false, status, error: { code, message } };
}

export function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(`${JSON.stringify(value)}\n`, { ...init, headers });
}
