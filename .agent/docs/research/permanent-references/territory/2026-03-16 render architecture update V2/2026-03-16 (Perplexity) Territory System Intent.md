<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Territory System Intent

This system renders RTS territory on a star–lane graph. Territory ownership is determined by **shortest-path distance on the graph**, not by straight-line 2D distance. Borders must be **clean, even-edged, graph-truthful**, and conquest changes must animate smoothly without unrelated shimmer.[^1]

## Non-negotiables

- Ownership is **graph-native**: resolve control by shortest path over stars and lanes.[^1]
- Borders must reflect **graph logic** and lane competition, including midpoint ties.[^1]
- Borders must be **clean, crisp, and even-width** at normal gameplay zoom, with support for straight, curved, and segmented families.[^1]
- Disconnected same-player holdings must remain **visually separate**; no false implied connectivity.[^1]
- Every visible point in the world resolves to **some player**; no neutral voids.[^1]
- Conquest transitions must be **stable, local, and smooth**.[^1]


## Canonical truth

There must be **one territory truth**, not separate fill truth and border truth. The canonical pipeline is:[^1]

`MetricState -> FrontierGraph -> TerritoryRegions -> RenderCaches`

Meaning:

- `MetricState`: graph-distance ownership truth.[^1]
- `FrontierGraph`: the singular shared frontier geometry in world space.[^1]
- `TerritoryRegions`: owned regions derived from those frontiers.[^1]
- `RenderCaches`: border meshes and fill meshes derived from canonical truth, never treated as truth themselves.[^1]


## Core rule

**Borders and fills must both derive from the same canonical frontier/region geometry.**[^1]
Do **not** compute fills from one ownership approximation and borders from another, because that is the main architectural cause of misalignment bugs.[^1]

## Compiler vs renderer

The compiler computes truth only. It must not:[^1]

- render,
- mutate rendering config,
- synthesize fake placeholder geometry,
- own debug stepping,
- or dispatch legacy adapters.

The renderer consumes canonical truth and optional transition plans. A single top-level territory renderer may handle both steady-state and animated presentation, but it must render from the same canonical state model.[^1]

## Required architecture

### Compile layer

Responsible for:

- graph-native metric solve,
- frontier construction,
- region construction,
- transition planning.


### Render layer

Responsible for:

- border mesh cache generation from frontiers,
- fill mesh cache generation from regions,
- steady-state presentation,
- transition presentation.


### Devtools layer

Responsible for:

- tracing,
- stepping,
- diagnostics,
- debug overlays.


### Legacy layer

Temporary bridges only. Must not pollute the compiler.

## File responsibility rule

If a file computes canonical territory truth, it must not call a renderer.[^1]
If a file draws territory, it must not invent or reinterpret ownership truth.[^1]

## Style model

Style is layered on top of truth. The system must support:[^1]

- border family selection: straight / curved / segmented,[^1]
- adjustable width, softness, alpha, color behavior,[^1]
- conquest animation modes that operate on canonical frontier transitions, not on unrelated visual hacks.[^1]

Style changes should be cheap where possible, ideally uniform-only; geometry rebuilds should occur only when geometry actually changes.[^1]

## Correctness standard

A correct implementation satisfies all of these:

- shortest-path graph ownership is respected,[^1]
- ties are stable and deterministic,[^1]
- a shared border exists only once between adjacent players,[^1]
- fill boundaries use the exact same canonical geometry as borders,[^1]
- disconnected holdings remain disconnected visually,[^1]
- no placeholder geometry is ever presented as canonical output.


## Refactor directive

Refactor toward:

- `TerritoryCompiler`
- `metricStage`
- `frontierStage`
- `regionStage`
- `TerritoryTransitionPlanner`
- unified `TerritoryRenderer`
- border/fill cache builders
- separate devtools
- separate legacy bridge

Delete:

- render calls from the compiler,
- render-stage logic inside compile pipeline,
- placeholder geometry generation,
- config mutation inside territory computation.


## Decision principle

When in doubt, prefer:

1. **one canonical geometry model**,
2. **derived render caches**,
3. **strict separation of compile, render, and debug responsibilities**.[^1]

That is the guiding architecture for this project.

<div align="center">⁂</div>

[^1]: TERRITORY_ARCHITECTURE_v3.md

