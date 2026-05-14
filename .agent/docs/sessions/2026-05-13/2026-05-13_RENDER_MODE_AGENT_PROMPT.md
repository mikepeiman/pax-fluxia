# Render Mode Agent Prompt - 2026-05-13

Use the prompt below when handing a new agent a render-mode implementation task.

---

You are joining Pax Fluxia to develop a new territory rendering mode.

## Purpose

Implement a new territory rendering mode called `[NEW_MODE_ID]` with the visual goal:

`[Describe the desired visual behavior, conquest feel, readability requirements, and whether it is a production mode, experiment, or diagnostic mode.]`

The mode must fit the current project architecture, preserve gameplay readability, and avoid introducing another misleading or duplicated runtime path.

## Read First

Before making changes, read these files in this order:

1. `.agent/AGENT.md`
2. `.agent/docs/game/territory/TERRITORY_RENDER_SYSTEM_CURRENT.md`
3. `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
4. `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
5. `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
6. `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`

Then inspect the most relevant existing implementation that is architecturally closest to the new mode. Common examples:

- direct legacy renderer example:
  `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`
- pipeline/presentation example:
  `pax-fluxia/src/lib/territory/render/TerritoryRenderer.ts`
- render-family path examples:
  `pax-fluxia/src/lib/territory/families/`

## Critical Current-State Context

This repo is not on one fully unified territory runtime yet. It currently has three runtime shapes side by side:

- pipeline runtime
- render-family runtime
- direct legacy renderer runtime

You must explicitly decide which of those three shapes the new mode belongs to.

Default rule:

- if this is intended to be a serious new shipped mode, prefer integrating it as a render family or pipeline-aligned runtime
- do not add another ad hoc direct renderer path from `GameCanvas.svelte` unless you have a clear reason and you document that reason

## Non-Negotiable Constraints

- Use Bun only. No npm/yarn/npx.
- PowerShell only. Do not chain with `&&`.
- Do not use raw `console.log`; use the project telemetry logger.
- Do not use the word `canonical` in docs, comments, or UI.
- Treat user-facing render-mode naming as product language, not private engineering slang.
- Keep ownership -> geometry -> transition -> presentation boundaries intact.
- Do not fabricate geometry or duplicate ownership truth inside a renderer.
- If you introduce or rename a mode id, trace every consumer:
  - catalog
  - settings UI
  - route/dispatch
  - runtime selection
  - labels/tooltips
  - diagnostics
  - docs

## Required Up-Front Decisions

State these explicitly before implementing:

1. What runtime shape is this mode using?
2. Why is that runtime shape the correct one here?
3. What existing mode is the closest reference implementation?
4. What parts of the mode are:
   - ownership
   - geometry
   - transition
   - presentation
5. Whether this mode is:
   - production candidate
   - experimental
   - diagnostic/developer only

## Implementation Expectations

At minimum, handle all of the following coherently:

1. Add the mode id and label to the appropriate catalog/UI selection surface.
2. Wire the mode into the actual runtime dispatch path.
3. Keep the mode’s naming and label text consistent across settings, runtime status, and diagnostics.
4. Reuse an existing architecture path where possible instead of cloning logic.
5. If the mode needs special tunables, surface them in the correct existing settings path rather than inventing an isolated control pattern.
6. Add or update docs so a future agent can understand:
   - what this mode is
   - where it runs
   - whether it is family/pipeline/direct
   - what its special constraints are

## Recommended File Targets

You will probably touch some subset of these:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
- `pax-fluxia/src/lib/territory/contracts/TerritoryModeSelection.ts`
- `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
- one of:
  - `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts`
  - `pax-fluxia/src/lib/territory/render/TerritoryRenderer.ts`
  - `pax-fluxia/src/lib/territory/families/...`

Only add new files where the architecture actually wants them.

## Documentation Requirements

Keep docs current while you work.

At minimum, update or create:

- today’s queue entry if scope changes materially
- a dated session note for the mode work
- a handoff/merge note if you are working in a separate worktree
- any mode-specific architecture note if the new mode introduces a new runtime contract or unusual behavior

If you discover that existing docs are wrong, correct them explicitly rather than silently working around them.

## Validation Requirements

Before calling the work ready:

1. Run targeted tests if they exist.
2. Run `bun run build` in `pax-fluxia/`.
3. If you changed repo-root build-sensitive surfaces, also run repo-root `bun run build`.
4. Verify that the mode is actually selectable and dispatched through the intended path.
5. Report exactly what the user should look at in the UI:
   - where to enable the mode
   - what visual behavior should appear
   - what regressions you specifically checked for

Do not claim “fixed” or “done” without explicit evidence. Prefer “implemented; please verify.”

## Deliverable Format

When you report back:

1. State the runtime shape you used.
2. List the key files changed.
3. State whether the mode is production, experimental, or diagnostic.
4. State what was validated and what still needs user verification.
5. If you had to choose a temporary architecture compromise, say so plainly.

---

If you want a concrete starting point, use `distance_field` as an example of a direct legacy renderer, and use `metaball_grid` family code as the example of the newer family-style route.
