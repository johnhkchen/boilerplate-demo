// @ts-check
import { defineConfig } from 'astro/config';

// Static-first is load-bearing: it delivers no compute cold start and
// effectively free idle hosting (charter P6). Keep this explicit so the
// Cloudflare adapter added in T-001-01-02 sits beside it without silently
// flipping the project to server rendering.
export default defineConfig({
  output: 'static',
});
