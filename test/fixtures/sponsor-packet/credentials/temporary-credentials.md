# Temporary credentials — placeholder

At a real event this class holds what the sponsor booth hands you: a
temporary bearer token for the sandbox, usually on a card or in a DM, valid
for the weekend.

**This packet deliberately contains no token — not even a fake one.** A
committed credential-shaped string is exactly the reflex the playbook
exists to prevent, and the leak check runs over every file here to keep it
that way. The fictional API's local stub accepts any non-empty token, so
for a rehearsal: invent a throwaway string and treat it with full
production discipline.

## Where the value goes (playbook Beat 1, Step 2 — the whole rule)

- **Locally**: copy `.dev.vars.example` to `.dev.vars` (gitignored) and set
  it there — e.g. a `FERNWAY_API_TOKEN=` line. Loaded into the server-side
  runtime env only.
- **Production**: `npx wrangler secret put FERNWAY_API_TOKEN` —
  interactive, non-echoing.
- **Never**: in the repository, a browser bundle, a backstage entry, chat,
  or a screenshot. The backstage door refuses secrets by policy — point
  collaborators at a separate secure exchange.

## What the sponsor would tell you

- Tokens expire when the event ends; nothing you build should assume the
  value is long-lived.
- One token per team; if it leaks, the booth revokes and reissues — plan
  for rotation by reading it from the environment on every request, never
  baking it into code or config that ships.
