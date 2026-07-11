import { getSandbox, type Process } from '@cloudflare/sandbox';
import { DurableObject } from 'cloudflare:workers';

import {
  ASTRO_PORT,
  ASTRO_PROCESS_ID,
  CODE_SERVER_PORT,
  CODE_SERVER_PROCESS_ID,
  SESSION_ASTRO_CONFIG_PATH,
  SESSION_COORDINATOR_NAME,
  SESSION_PATCH_LIMIT_BYTES,
  SESSION_PRESERVATION_PATH,
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
  buildPreservationCommand,
  classifyControlRequest,
  classifyProxyHost,
  failure,
  isWebSocketUpgrade,
  jsonResponse,
  parseSessionConfig,
  parseDownInput,
  parsePreservationInspection,
  parseRuntimeSecrets,
  parseUpInput,
  readBoundedJson,
  redactSecrets,
  safeErrorMessage,
  safePublicError,
  sessionUrls,
  success,
  type ProxyTarget,
  type RuntimeSecrets,
  type SessionConfig,
  type SessionDownInput,
  type SessionOperationResult,
  type SessionProcessSnapshot,
  type SessionPatch,
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
  phase: SessionRecord['phase'] | 'idle';
  forced?: boolean;
  preservation?: SessionPatch;
  preservationSha256?: string;
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

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
    runtimeSecrets: RuntimeSecrets,
  ): Promise<boolean> {
    const result = await sandbox.exec(buildProvisionCommand(), {
      timeout: SESSION_PROVISION_TIMEOUT_MS,
      env: {
        SESSION_REPOSITORY_URL: config.repositoryUrl,
        SESSION_REVISION: revision,
      },
    });
    if (!result.success) {
      const details = safePublicError(
        `${result.stderr}\n${result.stdout}`,
        runtimeSecrets,
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
    runtimeSecrets: RuntimeSecrets,
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
            message: safePublicError(error, runtimeSecrets),
          }),
        );
      }
      await sandbox.cleanupCompletedProcesses();
    }

    const process = await sandbox.startProcess(command, {
      cwd: SESSION_WORKTREE,
      processId,
      autoCleanup: false,
      env: runtimeSecrets,
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
    runtimeSecrets: RuntimeSecrets,
  ): Promise<{ changed: boolean; processes: SessionProcessSnapshot[] }> {
    const sandbox = this.sandbox();
    const workspaceChanged = await this.provisionWorkspace(
      sandbox,
      revision,
      config,
      runtimeSecrets,
    );
    const astro = await this.ensureProcess(
      sandbox,
      ASTRO_PROCESS_ID,
      buildAstroCommand(),
      ASTRO_PORT,
      'http',
      runtimeSecrets,
    );
    const editor = await this.ensureProcess(
      sandbox,
      CODE_SERVER_PROCESS_ID,
      buildCodeServerCommand(),
      CODE_SERVER_PORT,
      'tcp',
      runtimeSecrets,
    );
    return {
      changed: workspaceChanged || astro.changed || editor.changed,
      processes: await Promise.all([
        this.processSnapshot(astro.process),
        this.processSnapshot(editor.process),
      ]),
    };
  }

  up(input: SessionUpInput, runtimeSecrets: RuntimeSecrets): Promise<SessionOperationResult<UpPayload>> {
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
        const reconciled = await this.reconcile(input.revision, config, runtimeSecrets);
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
                safePublicError(error, runtimeSecrets),
              );
        const failed: SessionRecord = {
          ...provisioning,
          phase: 'failed',
          updatedAt: new Date().toISOString(),
          error: safePublicError(runtimeError, runtimeSecrets),
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
            message: safePublicError(runtimeError, runtimeSecrets),
          }),
        );
        return failure(
          runtimeError.status,
          runtimeError.code,
          safePublicError(runtimeError, runtimeSecrets),
        );
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

  async logs(runtimeSecrets: RuntimeSecrets): Promise<SessionOperationResult<LogsPayload>> {
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
            stdout: boundedLog(redactSecrets(output.stdout, runtimeSecrets)),
            stderr: boundedLog(redactSecrets(output.stderr, runtimeSecrets)),
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
      return failure(503, 'logs_unavailable', safePublicError(error, runtimeSecrets));
    }
  }

  private async inspectPreservation(
    record: SessionRecord,
    runtimeSecrets: RuntimeSecrets,
  ): Promise<SessionOperationResult<{ patch: SessionPatch | null }>> {
    const sandbox = this.sandbox();
    const result = await sandbox.exec(buildPreservationCommand(), {
      timeout: SESSION_READY_TIMEOUT_MS,
    });
    if (!result.success) {
      return failure(
        502,
        'preservation_failed',
        safePublicError(`${result.stderr}\n${result.stdout}`, runtimeSecrets),
      );
    }

    let inspection: ReturnType<typeof parsePreservationInspection>;
    try {
      inspection = parsePreservationInspection(result.stdout);
    } catch (error: unknown) {
      return failure(502, 'preservation_failed', safePublicError(error, runtimeSecrets));
    }
    if (inspection.baseRevision !== record.revision) {
      return failure(
        409,
        'workspace_revision_changed',
        'workspace revision changed; session was retained',
      );
    }
    if (inspection.state === 'clean') return success({ patch: null });
    if (inspection.bytes > SESSION_PATCH_LIMIT_BYTES) {
      return failure(
        409,
        'preservation_too_large',
        `uncommitted patch exceeds ${SESSION_PATCH_LIMIT_BYTES} bytes; commit it manually or use explicit force`,
      );
    }

    try {
      const file = await sandbox.readFile(SESSION_PRESERVATION_PATH, { encoding: 'base64' });
      if (!file.success) throw new Error('patch read failed');
      const bytes = decodeBase64(file.content);
      const sha256 = await sha256Hex(bytes);
      if (bytes.byteLength !== inspection.bytes || sha256 !== inspection.sha256) {
        throw new Error('patch verification failed');
      }
      return success({
        patch: {
          baseRevision: inspection.baseRevision,
          sha256,
          bytes: bytes.byteLength,
          contentBase64: file.content,
        },
      });
    } catch (error: unknown) {
      return failure(502, 'preservation_failed', safePublicError(error, runtimeSecrets));
    }
  }

  down(
    input: SessionDownInput,
    runtimeSecrets: RuntimeSecrets,
  ): Promise<SessionOperationResult<DownPayload>> {
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

      const forced = input.mode === 'destroy' && 'force' in input;
      let preservationSha256: string | undefined;
      if (!forced) {
        const preservation = await this.inspectPreservation(record, runtimeSecrets);
        if (!preservation.ok) return preservation;
        if (input.mode === 'preserve' && preservation.value.patch !== null) {
          return success({
            ok: true,
            operation: 'down',
            changed: false,
            phase: record.phase,
            preservation: preservation.value.patch,
          });
        }
        if (input.mode === 'destroy') {
          if (preservation.value.patch === null) {
            return failure(
              409,
              'workspace_changed',
              'workspace is now clean and no longer matches the exported patch; rerun down',
            );
          }
          if (preservation.value.patch.sha256 !== input.preservationSha256) {
            return failure(
              409,
              'workspace_changed',
              'workspace changed after export; the session was retained and must be exported again',
            );
          }
          preservationSha256 = preservation.value.patch.sha256;
        }
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
            forced,
            ...(preservationSha256 === undefined ? {} : { preservationSha256 }),
          }),
        );
        return success({
          ok: true,
          operation: 'down',
          changed: true,
          phase: 'idle',
          ...(forced ? { forced: true } : {}),
          ...(preservationSha256 === undefined ? {} : { preservationSha256 }),
        });
      } catch (error: unknown) {
        const message = safePublicError(error, runtimeSecrets);
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

function invalidConfiguration(): Response {
  console.error(
    JSON.stringify({
      component: 'session-worker',
      operation: 'configuration',
      message: 'session Worker configuration is invalid',
    }),
  );
  return jsonResponse(
    {
      ok: false,
      error: {
        code: 'session_worker_misconfigured',
        message: 'session Worker configuration is invalid',
      },
    },
    { status: 500 },
  );
}

async function handleControl(
  request: Request,
  coordinator: DurableObjectStub<SessionCoordinator>,
  operation: 'up' | 'status' | 'logs' | 'down',
  runtimeSecrets: RuntimeSecrets,
): Promise<Response> {
  if (operation === 'up') {
    const body = await readBoundedJson(request);
    if (!body.ok) return operationResponse(body);
    const parsed = parseUpInput(body.value);
    if (!parsed.ok) return operationResponse(parsed);
    return operationResponse(await coordinator.up(parsed.value, runtimeSecrets));
  }
  if (operation === 'status') return operationResponse(await coordinator.status());
  if (operation === 'logs') return operationResponse(await coordinator.logs(runtimeSecrets));
  const body = await readBoundedJson(request);
  if (!body.ok) return operationResponse(body);
  const parsed = parseDownInput(body.value);
  if (!parsed.ok) return operationResponse(parsed);
  return operationResponse(await coordinator.down(parsed.value, runtimeSecrets));
}

const handler = {
  async fetch(request: Request, env: SessionWorkerEnv): Promise<Response> {
    let config: SessionConfig;
    let runtimeSecrets: RuntimeSecrets;
    try {
      config = parseSessionConfig(env);
      runtimeSecrets = parseRuntimeSecrets(env.SESSION_RUNTIME_SECRETS);
    } catch {
      return invalidConfiguration();
    }

    const url = new URL(request.url);
    const control = classifyControlRequest(request.method, url.pathname);
    const coordinator = env.SESSION_COORDINATOR.getByName(SESSION_COORDINATOR_NAME);
    if (control.kind === 'operation') {
      try {
        return await handleControl(request, coordinator, control.operation, runtimeSecrets);
      } catch (error: unknown) {
        console.error(
          JSON.stringify({
            component: 'session-worker',
            operation: control.operation,
            message: safePublicError(error, runtimeSecrets),
          }),
        );
        return jsonResponse(
          {
            ok: false,
            error: {
              code: 'session_operation_failed',
              message: safePublicError(error, runtimeSecrets),
            },
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
