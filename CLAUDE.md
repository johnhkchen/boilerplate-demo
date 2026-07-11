# CLAUDE.md

## Project

Demo Runway — an opinionated, Cloudflare-first Astro template and assembly playbook for shipping polished, observable, collaborative API demos before ideation gets deep.



### Directory Conventions

```
docs/active/tickets/    # Ticket files (markdown with YAML frontmatter)
docs/active/stories/    # Story files (same frontmatter pattern)
docs/active/work/       # Work artifacts, one subdirectory per ticket ID
```

### Ticket Agent Routing

Lisa's loop default is Claude/Opus. Leave ordinary tickets without a routing hint. Route work
that benefits from stronger cross-cutting architecture, adversarial/security reasoning, or
async debugging to Codex with optional ticket frontmatter:

```yaml
agent: codex
# model: provider-specific-model-id  # omit to use the configured Codex default
```

Supported `agent` values are `claude` and `codex`. Prefer `agent: codex` without `model:` so
the reusable board follows the machine's current Codex configuration instead of pinning a stale
model slug. Lisa resolves ticket routing at spawn time; tickets without `agent:` continue to use
the loop default.

---

The [RDSPI workflow](docs/knowledge/rdspi-workflow.md) is injected into agent context by Lisa
automatically. Before adding or changing user-facing copy, read and apply the
[copy voice and length standard](docs/knowledge/copy-voice-standard.md).
