# Demo Runway

The starting line every demo inherits — a public, observable demo on Cloudflare, live before ideation gets deep, with one real server-backed answer already wired in.

**Live:** https://demo.b28.dev

## Use it

```bash
npm run dev        # run it locally
npm run deploy     # one-time: bootstrap the custom domain
git push           # ship: verify gate → promote to demo.b28.dev
npm run rollback   # undo the last promotion, instantly
```

## Hand it off

Two links for a teammate — a live preview and a browser editor on an isolated, editable session, nothing to install:

```bash
npm run session -- up <commit-sha>   # → demo-session.b28.dev + code-session.b28.dev
npm run session -- down              # tear down, keeping their work
```

## Deeper

- `docs/demo-environments.md` — sessions, operator setup, threat model
- `docs/knowledge/charter.md` — what "valuable" means here
