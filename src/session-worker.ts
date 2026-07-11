import { getSandbox, type Process } from '@cloudflare/sandbox';
import { DurableObject } from 'cloudflare:workers';

import {
  ASTRO_PORT,
  ASTRO_PROCESS_ID,
  CODE_SERVER_PORT,
  CODE_SERVER_PROCESS_ID,
  SESSION_ASTRO_CONFIG_PATH,
  SESSION_COORDINATOR_NAME,
  SESSION_PROVISION_TIMEOUT_MS,
  SESSION_PROXY_TARGET_HEADER,
  SESSION_READY_TIMEOUT_MS,
  SESSION_RUNTIME_DIR,
  SESSION_SANDBOX_ID,
  SESSION_STORAGE_KEY,
  SESSION_WORKTREE,
  boundedLog,
  buildAstroCommand,
  buildAstroConfig,
  buildCodeServerCommand,
  buildProvisionCommand,
  classifyControlRequest,
  classifyProxyHost,
  failure,
  isWebSocketUpgrade,
  jsonResponse,
  parseSessionConfig,
  parseUpInput,
  safeErrorMessage,
  sessionUrls,
  success,
  type ProxyTarget,
  type SessionConfig,
  type SessionOperationResult,
  type SessionProcessSnapshot,
  type SessionRecord,
  type SessionUpInput,
} from './lib/session-lifecycle';

// The Sandbox Durable Object must be exported by the Worker module for the
// container and migration declarations in wrangler.sessions.jsonc to resolve.
export { Sandbox } from '@cloudflare/sandbox';

type UpPayload = {
  ok: true;
  operation: 'up';
  changed: boolean;
  session: SessionRecord & ReturnType<typeof sessionUrls>;
  processes: SessionProcessSnapshot[];
};

type StatusPayload = {
  ok: true;
  operation: 'status';
  session: (SessionRecord & ReturnType<typeof sessionUrls>) | null;
  phase: SessionRecord['phase'] | 'idle';
  processes: SessionProcessSnapshot[];
  placementId: string | null;
};

type ProcessLogPayload = SessionProcessSnapshot & {
  stdout: ReturnType<typeof boundedLog>;
  stderr: ReturnType<typeof boundedLog>;
};

type LogsPayload = {
  ok: true;
  operation: 'logs';
  session: (SessionRecord & ReturnType<typeof sessionUrls>) | null;
  processes: ProcessLogPayload[];
};

type DownPayload = {
  ok: true;
  operation: 'down';
  changed: boolean;
  phase: 'idle';
};

type EnsureProcessResult = { process: Process; changed: boolean };

class SessionRuntimeError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SessionRuntimeError';
  }
}

// One strongly consistent coordinator owns the desired state for the MVP's
// single session. The Sandbox Durable Object remains the execution runtime.
export class SessionCoordinator extends DurableObject<SessionWorkerEnv> {
  private mutationTail: Promise<void> = Promise.resolve();

  private config(): SessionConfig {
    return parseSessionConfig(this.env);
  }

  private sandbox() {
    return getSandbox(this.env.Sandbox, SESSION_SANDBOX_ID, {
      normalizeId: true,
      keepAlive: true,
      enableDefaultSession: false,
    });
  }

  private record(): Promise<SessionRecord | undefined> {
    return this.ctx.storage.get<SessionRecord>(SESSION_STORAGE_KEY);
  }

  private storeRecord(record: SessionRecord): Promise<void> {
    return this.ctx.storage.put(SESSION_STORAGE_KEY, record);
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation, operation);
    this.mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async provisionWorkspace(
    sandbox: ReturnType<SessionCoordinator['sandbox']>,
    revision: string,
    config: SessionConfig,
  ): Promise<boolean> {
    const result = await sandbox.exec(buildProvisionCommand(), {
      timeout: SESSION_PROVISION_TIMEOUT_MS,
      env: {
        SESSION_REPOSITORY_URL: config.repositoryUrl,
        SESSION_REVISION: revision,
      },
    });
    if (!result.success) {
      const details = safeErrorMessage(
        `${result.stderr}\n${result.stdout}`,
        500,
      );
      if (result.exitCode === 42) {
        throw new SessionRuntimeError('workspace_conflict', 409, details);
      }
      throw new SessionRuntimeError(
        'workspace_provision_failed',
        502,
        details,
      );
    }

    await sandbox.mkdir(SESSION_RUNTIME_DIR, { recursive: true });
    await sandbox.writeFile(SESSION_ASTRO_CONFIG_PATH, buildAstroConfig(config), {
      encoding: 'utf-8',
    });
    return result.stdout.includes('convergence=created');
  }

  private async processSnapshot(process: Process): Promise<SessionProcessSnapshot> {
    const status = await process.getStatus();
    return {
      id: process.id,
      status,
      ...(process.pid === undefined ? {} : { pid: process.pid }),
      ...(process.exitCode === undefined ? {} : { exitCode: process.exitCode }),
    };
  }

  private async listProcessSnapshots(
    sandbox: ReturnType<SessionCoordinator['sandbox']>,
  ): Promise<SessionProcessSnapshot[]> {
    const processes = await sandbox.listProcesses();
    const selected = processes.filter(
      (process) =>
        process.id === ASTRO_PROCESS_ID || process.id === CODE_SERVER_PROCESS_ID,
    );
    return Promise.all(selected.map((process) => this.processSnapshot(process)));
  }

  private async ensureProcess(
    sandbox: ReturnType<SessionCoordinator['sandbox']>,
    processId: string,
    command: string,
    port: number,
    readiness: 'http' | 'tcp',
  ): Promise<EnsureProcessResult> {
    const existing = (await sandbox.listProcesses()).find(
      (process) => process.id === processId,
    );
    if (existing !== undefined && (await existing.getStatus()) === 'running') {
      await existing.waitForPort(port, {
        mode: readiness,
        timeout: SESSION_READY_TIMEOUT_MS,
        ...(readiness === 'http' ? { path: '/', status: { min: 200, max: 399 } } : {}),
      });
      return { process: existing, changed: false };
    }

    if (existing !== undefined) {
      try {
        await existing.kill();
      } catch (error: unknown) {
        console.warn(
          JSON.stringify({
            component: 'session-coordinator',
            operation: 'process-cleanup',
            processId,
            message: safeErrorMessage(error),
          }),
        );
      }
      await sandbox.cleanupCompletedProcesses();
    }

    const process = await sandbox.startProcess(command, {
      cwd: SESSION_WORKTREE,
      processId,
      autoCleanup: false,
    });
    await process.waitForPort(port, {
      mode: readiness,
      timeout: SESSION_READY_TIMEOUT_MS,
      ...(readiness === 'http' ? { path: '/', status: { min: 200, max: 399 } } : {}),
    });
    return { process, changed: true };
  }

  private async reconcile(
    revision: string,
    config: SessionConfig,
  ): Promise<{ changed: boolean; processes: SessionProcessSnapshot[] }> {
    const sandbox = this.sandbox();
    const workspaceChanged = await this.provisionWorkspace(
      sandbox,
      revision,
      config,
    );
    const astro = await this.ensureProcess(
      sandbox,
      ASTRO_PROCESS_ID,
      buildAstroCommand(),
      ASTRO_PORT,
      'http',
    );
    const editor = await this.ensureProcess(
      sandbox,
      CODE_SERVER_PROCESS_ID,
      buildCodeServerCommand(),
      CODE_SERVER_PORT,
      'tcp',
    );
    return {
      changed: workspaceChanged || astro.changed || editor.changed,
      processes: await Promise.all([
        this.processSnapshot(astro.process),
        this.processSnapshot(editor.process),
      ]),
    };
  }

  up(input: SessionUpInput): Promise<SessionOperationResult<UpPayload>> {
    return this.enqueueMutation(async () => {
      const config = this.config();
      const existing = await this.record();
      if (existing !== undefined && existing.revision !== input.revision) {
        return failure(
          409,
          'revision_conflict',
          `session already targets ${existing.revision}; run down before changing revision`,
        );
      }

      const now = new Date().toISOString();
      const provisioning: SessionRecord = {
        version: 1,
        slug: config.slug,
        revision: input.revision,
        phase: 'provisioning',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await this.storeRecord(provisioning);
      console.log(
        JSON.stringify({
          component: 'session-coordinator',
          operation: 'up',
          phase: 'provisioning',
          slug: config.slug,
          revision: input.revision,
        }),
      );

      try {
        const reconciled = await this.reconcile(input.revision, config);
        const ready: SessionRecord = {
          ...provisioning,
          phase: 'ready',
          updatedAt: new Date().toISOString(),
        };
        await this.storeRecord(ready);
        console.log(
          JSON.stringify({
            component: 'session-coordinator',
            operation: 'up',
            phase: 'ready',
            slug: config.slug,
            revision: input.revision,
            changed: reconciled.changed,
          }),
        );
        return success({
          ok: true,
          operation: 'up',
          changed: reconciled.changed,
          session: { ...ready, ...sessionUrls(config) },
          processes: reconciled.processes,
        });
      } catch (error: unknown) {
        const runtimeError =
          error instanceof SessionRuntimeError
            ? error
            : new SessionRuntimeError(
                'session_start_failed',
                502,
                safeErrorMessage(error),
              );
        const failed: SessionRecord = {
          ...provisioning,
          phase: 'failed',
          updatedAt: new Date().toISOString(),
          error: safeErrorMessage(runtimeError),
        };
        await this.storeRecord(failed);
        console.error(
          JSON.stringify({
            component: 'session-coordinator',
            operation: 'up',
            phase: 'failed',
            slug: config.slug,
            revision: input.revision,
            code: runtimeError.code,
            message: safeErrorMessage(runtimeError),
          }),
        );
        return failure(runtimeError.status, runtimeError.code, runtimeError.message);
      }
    });
  }

  async status(): Promise<SessionOperationResult<StatusPayload>> {
    const record = await this.record();
    if (record === undefined) {
      return success({
        ok: true,
        operation: 'status',
        session: null,
        phase: 'idle',
        processes: [],
        placementId: null,
      });
    }

    try {
      const sandbox = this.sandbox();
      const processes = await this.listProcessSnapshots(sandbox);
      const observedPlacement = await sandbox.getContainerPlacementId();
      return success({
        ok: true,
        operation: 'status',
        session: { ...record, ...sessionUrls(this.config()) },
        phase: record.phase,
        processes,
        placementId: observedPlacement ?? null,
      });
    } catch (error: unknown) {
      return failure(503, 'status_unavailable', safeErrorMessage(error));
    }
  }

  async logs(): Promise<SessionOperationResult<LogsPayload>> {
    const record = await this.record();
    if (record === undefined) {
      return success({
        ok: true,
        operation: 'logs',
        session: null,
        processes: [],
      });
    }

    try {
      const sandbox = this.sandbox();
      const processes = await sandbox.listProcesses();
      const selected = [ASTRO_PROCESS_ID, CODE_SERVER_PROCESS_ID];
      const entries = await Promise.all(
        selected.map(async (id): Promise<ProcessLogPayload> => {
          const process = processes.find((candidate) => candidate.id === id);
          if (process === undefined) {
            return {
              id,
              status: 'absent',
              stdout: boundedLog(''),
              stderr: boundedLog(''),
            };
          }
          const [snapshot, output] = await Promise.all([
            this.processSnapshot(process),
            process.getLogs(),
          ]);
          return {
            ...snapshot,
            stdout: boundedLog(output.stdout),
            stderr: boundedLog(output.stderr),
          };
        }),
      );
      return success({
        ok: true,
        operation: 'logs',
        session: { ...record, ...sessionUrls(this.config()) },
        processes: entries,
      });
    } catch (error: unknown) {
      return failure(503, 'logs_unavailable', safeErrorMessage(error));
    }
  }

  down(): Promise<SessionOperationResult<DownPayload>> {
    return this.enqueueMutation(async () => {
      const record = await this.record();
      if (record === undefined) {
        return success({
          ok: true,
          operation: 'down',
          changed: false,
          phase: 'idle',
        });
      }

      await this.storeRecord({
        ...record,
        phase: 'stopping',
        updatedAt: new Date().toISOString(),
      });
      try {
        await this.sandbox().destroy();
        await this.ctx.storage.delete(SESSION_STORAGE_KEY);
        console.log(
          JSON.stringify({
            component: 'session-coordinator',
            operation: 'down',
            phase: 'idle',
            slug: record.slug,
            revision: record.revision,
          }),
        );
        return success({
          ok: true,
          operation: 'down',
          changed: true,
          phase: 'idle',
        });
      } catch (error: unknown) {
        const message = safeErrorMessage(error);
        await this.storeRecord({
          ...record,
          phase: 'failed',
          updatedAt: new Date().toISOString(),
          error: message,
        });
        console.error(
          JSON.stringify({
            component: 'session-coordinator',
            operation: 'down',
            phase: 'failed',
            slug: record.slug,
            revision: record.revision,
            message,
          }),
        );
        return failure(502, 'session_stop_failed', message);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const record = await this.record();
    if (record === undefined || record.phase !== 'ready') {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: 'session_not_ready',
            message: 'run session up and wait for ready before opening this URL',
          },
        },
        { status: 503 },
      );
    }

    const target = request.headers.get(SESSION_PROXY_TARGET_HEADER);
    if (target !== 'preview' && target !== 'editor') {
      return jsonResponse(
        { ok: false, error: { code: 'invalid_proxy_target', message: 'not found' } },
        { status: 404 },
      );
    }

    const processId = target === 'preview' ? ASTRO_PROCESS_ID : CODE_SERVER_PROCESS_ID;
    const port = target === 'preview' ? ASTRO_PORT : CODE_SERVER_PORT;
    const sandbox = this.sandbox();
    const process = (await sandbox.listProcesses()).find(
      (candidate) => candidate.id === processId,
    );
    if (process === undefined || (await process.getStatus()) !== 'running') {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: 'session_runtime_unavailable',
            message: 'session service is not running; run session up to reconcile it',
          },
        },
        { status: 503 },
      );
    }

    const headers = new Headers(request.headers);
    headers.delete(SESSION_PROXY_TARGET_HEADER);
    const forwarded = new Request(request, { headers });
    if (isWebSocketUpgrade(forwarded)) {
      return sandbox.wsConnect(forwarded, port);
    }
    return sandbox.containerFetch(forwarded, port);
  }
}

function operationResponse<T>(result: SessionOperationResult<T>): Response {
  return result.ok
    ? jsonResponse(result.value, { status: result.status })
    : jsonResponse({ ok: false, error: result.error }, { status: result.status });
}

function invalidConfiguration(error: unknown): Response {
  console.error(
    JSON.stringify({
      component: 'session-worker',
      operation: 'configuration',
      message: safeErrorMessage(error),
    }),
  );
  return jsonResponse(
    {
      ok: false,
      error: {
        code: 'session_worker_misconfigured',
        message: safeErrorMessage(error),
      },
    },
    { status: 500 },
  );
}

async function handleControl(
  request: Request,
  coordinator: DurableObjectStub<SessionCoordinator>,
  operation: 'up' | 'status' | 'logs' | 'down',
): Promise<Response> {
  if (operation === 'up') {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > 4096) {
      return operationResponse(
        failure(413, 'request_too_large', 'session up payload must be at most 4096 bytes'),
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return operationResponse(failure(400, 'invalid_json', 'request body must be JSON'));
    }
    const parsed = parseUpInput(body);
    if (!parsed.ok) return operationResponse(parsed);
    return operationResponse(await coordinator.up(parsed.value));
  }
  if (operation === 'status') return operationResponse(await coordinator.status());
  if (operation === 'logs') return operationResponse(await coordinator.logs());
  return operationResponse(await coordinator.down());
}

const handler = {
  async fetch(request: Request, env: SessionWorkerEnv): Promise<Response> {
    let config: SessionConfig;
    try {
      config = parseSessionConfig(env);
    } catch (error: unknown) {
      return invalidConfiguration(error);
    }

    const url = new URL(request.url);
    const control = classifyControlRequest(request.method, url.pathname);
    const coordinator = env.SESSION_COORDINATOR.getByName(SESSION_COORDINATOR_NAME);
    if (control.kind === 'operation') {
      try {
        return await handleControl(request, coordinator, control.operation);
      } catch (error: unknown) {
        console.error(
          JSON.stringify({
            component: 'session-worker',
            operation: control.operation,
            message: safeErrorMessage(error),
          }),
        );
        return jsonResponse(
          {
            ok: false,
            error: { code: 'session_operation_failed', message: safeErrorMessage(error) },
          },
          { status: 502 },
        );
      }
    }
    if (control.kind === 'method-not-allowed') {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: control.allow === '' ? 'unknown_operation' : 'method_not_allowed',
            message: control.allow === '' ? 'unknown session operation' : 'method not allowed',
          },
        },
        {
          status: control.allow === '' ? 404 : 405,
          headers: control.allow === '' ? undefined : { allow: control.allow },
        },
      );
    }

    const proxyTarget: ProxyTarget | null = classifyProxyHost(url.hostname, config);
    if (proxyTarget !== null) {
      const headers = new Headers(request.headers);
      headers.set(SESSION_PROXY_TARGET_HEADER, proxyTarget);
      return coordinator.fetch(new Request(request, { headers }));
    }

    if (request.method === 'GET' && url.pathname === '/') {
      return jsonResponse({ service: 'demo-runway-sessions', status: 'ok' });
    }
    return jsonResponse(
      { ok: false, error: { code: 'not_found', message: 'not found' } },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<SessionWorkerEnv>;

export default handler;
