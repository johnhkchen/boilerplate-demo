// The Sandbox Durable Object must be exported by the Worker module for the
// container and migration declarations in wrangler.sessions.jsonc to resolve.
export { Sandbox } from '@cloudflare/sandbox';

const handler = {
  fetch(): Response {
    return Response.json({
      service: 'demo-runway-sessions',
      status: 'ok',
    });
  },
} satisfies ExportedHandler<SessionWorkerEnv>;

export default handler;
