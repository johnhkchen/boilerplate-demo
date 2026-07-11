import { DurableObject } from 'cloudflare:workers';

// The Sandbox Durable Object must be exported by the Worker module for the
// container and migration declarations in wrangler.sessions.jsonc to resolve.
export { Sandbox } from '@cloudflare/sandbox';

// One strongly consistent coordinator owns the desired state for the MVP's
// single session. Lifecycle behavior is added in the next implementation unit.
export class SessionCoordinator extends DurableObject<SessionWorkerEnv> {
  health(): { status: 'idle' } {
    return { status: 'idle' };
  }
}

const handler = {
  fetch(): Response {
    return Response.json({
      service: 'demo-runway-sessions',
      status: 'ok',
    });
  },
} satisfies ExportedHandler<SessionWorkerEnv>;

export default handler;
