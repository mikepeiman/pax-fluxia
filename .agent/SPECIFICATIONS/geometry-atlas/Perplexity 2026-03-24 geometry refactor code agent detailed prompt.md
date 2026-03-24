<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Please do that

Yes — here is the rewritten **architecture-first, compatibility-deprioritized** prompt.

It explicitly prioritizes one authoritative runtime path, one typed output contract per layer, and deletion of obsolete geometry-mode duplication and bridge patterns from the canonical runtime surface.[^1][^2]

***

## Prompt for code-writing agent

You are performing an **architecture-first consolidation refactor** of the territory system.

Your priority is **not backward compatibility**. Your priority is:

- clean architecture,
- clean modular code,
- strict contracts,
- one authoritative runtime path,
- rich canonical outputs,
- and a strong foundation for future development.[^1]

You are allowed to break old internal APIs, delete obsolete classes, rename modules semantically, and update downstream consumers so they obey the correct contracts. Do **not** preserve bad abstractions for convenience.[^2][^1]

***

## Primary objective

Replace the current fragmented vector geometry path with **one authoritative vector geometry compiler and one authoritative vector geometry mode**:

- `compileVectorGeometry(...)`
- `UnifiedVectorGeometryMode`

Then wire the runtime so that:

- the geometry layer uses this as the only canonical vector geometry path,
- transitions and presentation consume the proper canonical outputs,
- obsolete vector geometry modes are removed from the canonical runtime,
- and legacy bridge patterns do not shape the new design.[^2][^1]

***

## Architecture rules

These rules override convenience and migration comfort.

1. There must be **exactly one authoritative runtime path**.[^1]
2. Every layer must expose **one typed output contract**.[^1]
3. Styles must never choose geometry algorithms.[^1]
4. Geometry code must not reach into PIXI, FX, UI state, or renderer-local caches.[^1]
5. Legacy implementations may exist only behind adapters, not in the canonical runtime surface.[^1]
6. Do not preserve obsolete vector mode distinctions as real runtime concepts once unified geometry exists.[^2]
7. Do not preserve `legacyGeometryBridge` as a design constraint. Remove it from the canonical path wherever possible.[^2]

***

## Existing facts you must use

- `computeGeometry0319` is the strongest current polygon compiler foundation. It already handles world-boundary edges, frontier-chain fills, frontier maps, closure diagnostics, and ghost-site support.[^3][^2]
- `PowerVoronoiGeometryMode` and `SeedGraphGeometryMode` are obsolete wrappers around the older incomplete generator and should not survive as first-class canonical modes.[^4][^2]
- `BoundaryAwareFrontierGeometryMode` is the strongest current geometry mode wrapper, but its useful logic should be extracted and the class removed as a concept.[^5][^4]
- FG2 contains the richer topology concepts you ultimately want: half-edges, face walks, shell loops, and owner shell artifacts. These concepts should be absorbed into the unified geometry output, not preserved as a parallel runtime.[^4][^2]
- The render architecture already expects styles to render canonical data and transitions to transform canonical data.[^6]

***

## Required outcome

At the end of this refactor:

- there is **one canonical vector geometry compiler**,
- there is **one active vector geometry mode**,
- the geometry layer coordinator selects it,
- transitions consume canonical geometry/shell data,
- presentation consumes transition/presentation contracts,
- old vector geometry modes are deleted or demoted entirely into migration-only code,
- and no canonical runtime consumer relies on `legacyGeometryBridge`.[^2][^1]

***

## Required implementation steps

### Step 1 — Create the canonical vector compiler

Create file:

`src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`

This file must export:

- `UNIFIED_VECTOR_GEOMETRY_MODE_ID`
- `compileVectorGeometry(input: GeometryLayerInput): CanonicalGeometrySnapshot`

Implementation requirements:

1. Move the actual compile orchestration logic out of `BoundaryAwareFrontierGeometryMode` and into this file:
    - generator settings,
    - version/fingerprint creation,
    - `computeGeometry0319` invocation,
    - compile error handling,
    - geometry-to-canonical mapping.[^3][^5]
2. This file becomes the **only** canonical vector geometry compiler entry point.
3. Do not leave compile orchestration inside mode classes.
4. Do not expose `computeGeometry0319` directly as a selectable mode.

### Step 2 — Make canonical geometry rich enough

The canonical geometry output from `compileVectorGeometry(...)` must include, at minimum:

- `territoryRegions`
- `frontierPolylines`
- `worldBorderPolylines`
- `sharedFrontierMap`
- `shells`
- `shellLoops`
- provenance
- diagnostics
- strong topology metadata surface where available.[^7][^6][^2]

Use `computeGeometry0319` as the immediate foundation, and absorb richer topology concepts from FG2 into the output model rather than preserving FG2 as a separate runtime path.[^2]

### Step 3 — Create the unified geometry mode

Create file:

`src/lib/territory/layers/geometry/modes/UnifiedVectorGeometryMode.ts`

This file must contain only a tiny delegating `GeometryMode`:

- `id: 'unified_vector'`
- `label: 'Unified Vector Geometry'`
- `compute(input) => compileVectorGeometry(input)`

No geometry compilation logic belongs in this class.

### Step 4 — Replace the geometry registry

Find the geometry registry file in the geometry layer.[^1]

Change it so that:

1. `UnifiedVectorGeometryMode` is the only canonical vector geometry mode.
2. It is the default vector geometry selection.
3. Remove these from the canonical registry:
    - `PowerVoronoiGeometryMode`
    - `SeedGraphGeometryMode`
    - `BoundaryAwareFrontierGeometryMode`
4. If config migration requires aliases, handle them only in a config normalizer or migration shim. Do not register them as real runtime modes.[^2][^1]

### Step 5 — Update mode-selection contracts

Find:

`src/lib/territory/contracts/TerritoryModeSelection.ts`
or equivalent.[^1]

Make these changes:

1. Add `'unified_vector'` to `GeometryModeId`.
2. Remove obsolete vector ids from the canonical type if possible.
3. If temporary migration aliases are unavoidable, isolate them in config normalization code only.
4. Update default selection constants to use `'unified_vector'`.

### Step 6 — Update the GeometryLayerCoordinator

Find:

`src/lib/territory/layers/geometry/GeometryLayerCoordinator.ts`
or equivalent.[^1]

Refactor it so that:

1. It resolves exactly one selected `GeometryMode`.
2. The selected canonical vector mode is `UnifiedVectorGeometryMode`.
3. It caches and fingerprints geometry by the proper geometry-layer inputs.
4. It returns the canonical geometry snapshot as the authoritative geometry-layer output.

Do not preserve geometry-mode-specific branching if that branching exists only to support obsolete vector modes.

### Step 7 — Refactor downstream consumers to the right contract

This is where your earlier prompt was too conservative.

Do **not** contort the new geometry surface to preserve outdated consumers.

Instead:

1. Identify the canonical data shape that transitions should consume.
2. Identify the canonical data shape that presentation/styles should consume.
3. Refactor those consumers to depend on the proper contract.

If a geometry-to-transition adapter is needed, create one explicitly, for example:

`src/lib/territory/layers/geometry/adapters/geometrySnapshotToCanonicalTerritoryData.ts`

But follow these rules:

- The adapter exists to convert one clean contract to another clean contract.
- It must not preserve arbitrary legacy fields.
- It must not expose `legacyGeometryBridge`.
- It must not make transitions or styles aware of `computeGeometry0319` internals.[^6][^1]

If current transitions or styles assume older shapes, update them.

Architectural correctness is more important than avoiding those edits.[^1]

### Step 8 — Remove `legacyGeometryBridge` from the canonical path

Do this aggressively.

1. Remove downstream reads of `legacyGeometryBridge`.
2. Replace them with canonical field reads:
    - `territoryRegions`
    - `frontierPolylines`
    - `worldBorderPolylines`
    - `sharedFrontierMap`
    - `shells`
    - `shellLoops`
3. Keep `legacyGeometryBridge` only if absolutely necessary for a short migration window, and never let it shape the canonical runtime contract.[^7][^2]

### Step 9 — Delete obsolete vector-mode files

Delete these from the canonical runtime path:

- `PowerVoronoiGeometryMode.ts`
- `SeedGraphGeometryMode.ts`
- `BoundaryAwareFrontierGeometryMode.ts`

If a transitional shim is required temporarily, it must live in migration code, not as an authoritative runtime mode.[^4][^2]

### Step 10 — Demote old generators and parallel pipelines

Apply these rules:

- `generateVoronoiTerritoryGeometry()` is no longer a public entry point; keep helper functions only where useful.[^2]
- `computeGeometry0319` remains an internal compiler stage behind `compileVectorGeometry(...)`.[^3][^2]
- FG2’s parallel pipeline infrastructure should not remain a competing canonical runtime; absorb its data structures and concepts into the unified geometry output and retire the parallel engine over time.[^2]


### Step 11 — Rename for semantic clarity

Prefer semantic names from the blueprint rather than archaeology names.[^1]

Examples:

- use `UnifiedVectorGeometryMode`
- use `compileVectorGeometry`
- use `GeometryLayerCoordinator`
- use `TerritoryRuntimeCoordinator`

Do not preserve names solely because they are familiar.

### Step 12 — Update UI/config to match the architecture

Find any UI/config code exposing geometry choices.

Make these changes:

1. Expose one canonical vector geometry option only.
2. Remove separate UI choices for:
    - Power Voronoi
    - Seed Graph
    - Boundary-Aware Frontier
3. Keep compatibility aliases only in migration/config normalization code, never in visible UI.[^1]

***

## Required deletions and reductions

### Delete entirely

- `PowerVoronoiGeometryMode.ts`
- `SeedGraphGeometryMode.ts`


### Delete after extraction

- `BoundaryAwareFrontierGeometryMode.ts`


### Keep as internal implementation detail

- `compiler_Geometry_0319.ts`[^3]


### Keep concepts, not parallel runtime authority

- FG2 topology structures and shell-loop concepts.[^2]


### Remove from canonical runtime surface

- `legacyGeometryBridge` pattern.[^2]

***

## Concrete file operations

### Create

- `src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
- `src/lib/territory/layers/geometry/modes/UnifiedVectorGeometryMode.ts`
- `src/lib/territory/layers/geometry/adapters/geometrySnapshotToCanonicalTerritoryData.ts` (only if a clean contract adapter is truly needed)


### Modify

- `src/lib/territory/contracts/TerritoryModeSelection.ts`
- `src/lib/territory/layers/geometry/registry.ts`
- `src/lib/territory/layers/geometry/GeometryLayerCoordinator.ts`
- `src/lib/territory/runtime/TerritoryConfigNormalizer.ts`
- transition-layer files that consume geometry snapshots
- presentation/style files that consume geometry-derived canonical data
- UI/config files exposing geometry-mode selection


### Delete

- `src/lib/territory/layers/geometry/modes/PowerVoronoiGeometryMode.ts`
- `src/lib/territory/layers/geometry/modes/SeedGraphGeometryMode.ts`
- `src/lib/territory/layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts`

***

## What not to do

- Do not preserve obsolete vector mode distinctions as runtime concepts.[^2]
- Do not keep compatibility wrappers just because they reduce churn.
- Do not let transitions or styles depend on geometry compiler internals.[^6]
- Do not preserve `legacyGeometryBridge` as part of the canonical design.[^2]
- Do not keep multiple canonical vector geometry entry points.[^2]
- Do not leave compile orchestration logic inside mode classes.

***

## Success criteria

The work is complete only when all of the following are true:

1. There is exactly one canonical vector geometry mode in the runtime.[^1][^2]
2. There is exactly one canonical vector geometry compiler entry point.[^2]
3. Geometry compilation logic lives in the geometry layer, not in modes, renderers, or presentation.[^1]
4. Transitions consume canonical geometry/shell data through proper contracts.[^6]
5. Presentation consumes transition/presentation contracts, not geometry compiler internals.[^6][^1]
6. Obsolete vector geometry modes are removed from the canonical runtime surface.[^2]
7. `legacyGeometryBridge` no longer shapes the runtime architecture.[^2]

***

## Output format for your response

Return your implementation in these sections:

1. `Files created`
2. `Files modified`
3. `Files deleted`
4. `Code`
5. `Architectural notes`

Include full TypeScript for all created and modified files.

Do not return pseudocode. Do not ask exploratory questions. Do the refactor.

<div align="center">⁂</div>

[^1]: TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md

[^2]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^3]: compiler_Geometry_0319.txt

[^4]: GEOMETRY_ATLAS.md

[^5]: mode_BoundaryAwareFrontierGeometryMode.txt

[^6]: orchestrator_renderMode.txt

[^7]: contract_GeometryContracts.txt

