// @ts-check
import { defineConfig } from 'astro/config';

// Static-first is load-bearing: it delivers no compute cold start and
// effectively free idle hosting (charter P6). This is deployed to Cloudflare
// via wrangler static assets (see wrangler.jsonc) — an assets-only Worker with
// NO Astro SSR adapter. Adopting @astrojs/cloudflare would only be for a future,
// idea-driven SSR need; adding it now would introduce the compute cold start
// this project deliberately avoids. Keep `output: 'static'` explicit.
export default defineConfig({
  output: 'static',
});
