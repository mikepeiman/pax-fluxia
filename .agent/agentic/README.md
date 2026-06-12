# Agentic Context Cache

## Purpose

Provide a small, deterministic, repo-local context/cache layer that reduces repeated stable-context rebuilds without turning cached output into a hidden source of truth.

## Stable vs volatile

### Stable

Stable artifacts are inputs that should stay reusable across many turns until their source files change. In this first cut they include:

- agent instructions
- coding policy and active rule inputs
- compact architecture references
- workflow inventory and installation contract

### Volatile

Volatile artifacts change task-by-task and should be appended later, not baked into stable artifacts. Examples:

- task brief
- current diff summary
- latest validation summary
- latest runtime errors

## What is memoized

- stable artifact outputs under `.agent-harness/context-cache/artifacts/`
- cache metadata in `.agent-harness/context-cache/cache-manifest.json`
- provider-cache prefix and implementation report under `.agent-harness/context-cache/`
- build metrics in `.agent-harness/metrics/context-build.jsonl`

## Invalidation

- each stable artifact is keyed by a deterministic content hash of its configured source files
- normalized source content is used so line-ending drift and trailing whitespace do not force unnecessary regeneration
- if any relevant source hash changes, that artifact is regenerated

## Toggles

Toggles live in `.agent/agentic/config.json`:

- `localMemoization`
- `providerCaching`
- `metricsLogging`

When `providerCaching` is enabled, the builder writes:

- `.agent-harness/context-cache/provider-cache-prefix.md`
  - the exact lean stable prefix to place at the beginning of OpenAI and Anthropic API requests
- `.agent-harness/context-cache/provider-cache-strategy.md`
  - provider-specific request placement, metrics, and cache invalidation guidance

Provider-cache contract:

- The default provider prefix is an artifact index and routing contract, not the full local context bundle.
- OpenAI: keep the generated prefix byte-identical at the start of the request, use a consistent `prompt_cache_key`, and inspect `usage.prompt_tokens_details.cached_tokens`.
- Anthropic: send the generated prefix as a stable system text block with `cache_control: { "type": "ephemeral" }` only when it meets the selected model's minimum cacheable length, then inspect `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`.
- Keep volatile task data after the provider-cache prefix.
- Load full stable artifacts only on demand after the cache breakpoint when a task needs them.

The builder also supports command-line overrides:

- `--no-cache`
- `--no-metrics`
- `--force`
- `--clear-cache`

## Commands

- Build stable artifacts:
  - `bun run agentic:context:build`
- Benchmark cold vs warm behavior:
  - `bun run agentic:context:benchmark`
- Audit provider-prefix size and artifact-bundle drag:
  - `bun run agentic:context:audit`
- Launch the project-local Pi setup:
  - `bun run agentic:pi`

## Pi integration

The repo now carries a project-local Pi configuration under `.pi/`.

- `.pi/settings.json`
  - keeps Pi session state inside the workspace instead of `C:\Users\mikep\.pi\...`
- `.pi/extensions/cli-anything/`
  - project-local CLI-Anything extension bundle copied from upstream during setup
- `.pi/extensions/pax-project/`
  - Pax Fluxia bridge extension for cached-context awareness and context-pack commands

The Pax project extension keeps Pi aware of the repo-local context cache without forcing all stable context into every turn.

Available Pi-side commands:

- `/pax-context:status`
  - show which cached stable artifacts exist
- `/pax-context:rebuild [artifact-id ...] [--force] [--clear-cache]`
  - rebuild the repo-local stable context artifacts from inside Pi
- `/pax-context:inject <artifact-id|all>`
  - inject selected cached stable artifacts into the current Pi session on demand

## Clearing cache

Either:

- run the builder with `--clear-cache`

or delete:

- `.agent-harness/context-cache/`
- `.agent-harness/metrics/`

## Benchmark output

The current benchmark report is written to:

- `.agent-harness/metrics/context-benchmark-latest.md`

The benchmark covers deterministic local artifact reuse and verifies whether the provider-cache prefix is large enough to be useful for provider-side prompt caching. The audit verifies that the provider prefix remains lean compared with the full artifact bundle. Neither command calls OpenAI or Anthropic APIs.
