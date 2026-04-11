# Pi Project Setup

## Purpose

Keep Pi project-local, inspectable, and aligned with the repo-owned context/cache layer.

## Launch

- `bun run agentic:pi`

## Project-local resources

- `.pi/settings.json`
  - keeps Pi sessions inside `.pi/sessions/`
- `.pi/extensions/cli-anything/`
  - project-local CLI-Anything extension bundle
- `.pi/extensions/pax-project/`
  - Pax Fluxia extension for context-cache status, rebuild, and on-demand injection

## Available commands

- `/cli-anything <path-or-repo>`
- `/cli-anything:refine <path> [focus]`
- `/cli-anything:test <path-or-repo>`
- `/cli-anything:validate <path-or-repo>`
- `/cli-anything:list [options]`
- `/pax-context:status`
- `/pax-context:rebuild [artifact-id ...] [--force] [--clear-cache]`
- `/pax-context:inject <artifact-id|all>`

## Notes

- The CLI-Anything project-local extension was copied from the upstream CLI-Anything source during setup so the runtime only depends on the project-local bundle under `.pi/extensions/cli-anything/`.
- The Pax Fluxia extension treats `.agent-harness/context-cache/artifacts/` as the stable context-pack source of truth for Pi.
- `.pi/sessions/` is intentionally gitignored because it is runtime state, not source.
