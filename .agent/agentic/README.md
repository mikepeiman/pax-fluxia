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

## Clearing cache

Either:

- run the builder with `--clear-cache`

or delete:

- `.agent-harness/context-cache/`
- `.agent-harness/metrics/`

## Benchmark output

The current benchmark report is written to:

- `.agent-harness/metrics/context-benchmark-latest.md`
