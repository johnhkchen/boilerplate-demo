# SDK pointer — @fernway/parcel-sdk

What the sponsor booth points at when asked for a client library:

> "There's `@fernway/parcel-sdk` on our internal registry — the public npm
> publish is 'coming soon.' Honestly, for a hackathon just call the REST
> endpoint; the SDK still wraps last year's v0 auth."

So this class is **present but unusable**, on purpose:

- the package is not published anywhere (and, being fictional, never will
  be) — do not add it to `package.json` or invent an install;
- the current, trustworthy interface is `../api-docs/parcel-status-api.md`,
  and the sponsor's own calling idiom is
  `../code-examples/track-parcel.mjs`.

This is a realistic event-day condition, and the playbook already has the
move for it: an input class you can't use is an **unknown** recorded in the
Step 3 intake statement (see `../core-moment.md`), not a blocker and not a
reason to improvise a dependency. A stale-SDK note like this one is exactly
the kind of leftover that becomes a one-line demand signal in Beat 4 if the
demo ever needs the real library.
