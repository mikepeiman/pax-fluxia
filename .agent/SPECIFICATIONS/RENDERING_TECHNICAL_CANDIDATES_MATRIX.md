# Rendering Technical Candidates Matrix

## Purpose

This matrix combines:

- current implementations
- integrated but incomplete approaches
- documented-but-untested ideas
- external technical candidates

The goal is to decide what belongs in the core path and what should remain optional.

## Evaluation Legend

- `Architecture fit`: how well the candidate fits a clean runtime with clear layer ownership
- `Invariant fit`: how well it preserves fill/border unity, padding, lane legality, and topology correctness
- `Live controls`: how safely it handles runtime geometry-control changes
- `Performance`: expected browser-side cost and scaling behavior
- `Recommendation`: `Core path`, `Support tool`, `Optional branch`, or `Do not use as truth`

## Foundational Geometry Decision

### Winning direction

The winning foundational direction is:

`Canonical Frontier Topology`

Definition:

- compiler-driven frontier and region truth
- boundary-aware and topology-aware
- explicit geometry control set
- transition samples derived from the same canonical frontier authority

Why this wins:

- It is the only direction that can satisfy fill/border unity, hard topology constraints, and live geometry-control updates without forcing presentation to invent geometry.
- It can absorb the best ideas from `Geometry_0319`, corridor/disconnect virtual sites, and clean frontier fitting without inheriting the legacy renderer's mixed responsibilities.

### What this means for `Geometry0319`

`Geometry0319` remains the benchmark candidate and provides critical lessons:

- world-boundary completeness
- frontier-chain closure
- virtual-site corridor and disconnect shaping

But the exact `Geometry_0319.ts` module should not become the final architecture unchanged. Its best logic should be absorbed into the canonical frontier-topology geometry layer.

## Geometry Candidates

| Candidate | Class | Architecture fit | Invariant fit | Live controls | Performance | Recommendation | Notes |
|---|---|---|---|---|---|---|---|
| Canonical frontier topology | Target architecture | High | High | High | Medium | Core path | Compiler-owned frontier truth with explicit control contracts |
| Geometry0319 direct port | Current implementation | Medium | Medium-High | Medium | Medium | Support tool | Strong benchmark; absorb ideas rather than preserve exact shape |
| Raw weighted power-diagram geometry | Current algorithm family | Medium | Medium | Medium | Medium | Support tool | Good for seeded cell generation, weak as final truth without topology layer |
| Unified resampled regions | Current implementation family | Medium | Medium | Medium | Medium | Optional branch | Useful when dense polygon single-path drawing is desired |
| Distance-field canonical geometry | Current experimental family | Low | Low-Medium | Medium | High | Do not use as truth | Great for style, weak for exact border/fill truth |
| Metaball field geometry | Current experimental family | Low | Low | Medium | Medium-High | Do not use as truth | Good style sandbox, poor topology guarantees |
| Pixel or worker raster territory | Current experimental family | Low | Low-Medium | High | Medium | Do not use as truth | Good diagnostics and previews, not authoritative geometry |
| Lane/graph-informed hybrid frontier | Candidate hybrid | Medium-High | High | Medium | Medium | Core-path extension candidate | Best path for flow-aware or force-aware later upgrades |
| Polygon-union validated frontier geometry | External utility candidate | High | High | Medium | Medium | Core-path support candidate | Useful for validation, cleanup, holes, and legality checks |

## Transition Candidates

| Candidate | Class | Architecture fit | Invariant fit | Live controls | Performance | Recommendation | Notes |
|---|---|---|---|---|---|---|---|
| Shared transition envelope with fill and border samplers | Target architecture | High | High | High | Medium | Core path | Required baseline |
| Frontier morph fill transition | Current documented direction | High | High | Medium | Medium | Core path | Most natural fill transition once frontier truth is stable |
| Optimal-transport border transition | Current documented direction | Medium-High | Medium-High | Medium | Medium-High | Core path candidate | Strong for border correspondence if isolated cleanly |
| Rope morph border transition | Current documented direction | Medium | Medium | Medium | Medium | Optional branch | Good style branch after canonical baseline exists |
| Crossfade fill transition | Current implementation family | High | Low-Medium | High | Low | Optional branch | Safe fallback, not frontier-informative |
| Tile-flip fill transition | Documented only | Medium | Low | Medium | Medium | Optional branch | Decorative, not canonical |
| Pressure-wave border transition | Documented only | Medium | Low-Medium | Medium | Medium | Optional branch | Border flourish on top of canonical truth |

## Current And Documented Runtime Candidates

| Candidate | Class | Recommendation | Reason |
|---|---|---|---|
| `TerritoryCompiler` pipeline | Current implementation | Core path | Already expresses clean separation from PIXI |
| `TerritoryEngineController` | Current implementation | Core path | Good runtime seed once config contracts are cleaned up |
| `TerritoryRenderer` steady-state cache draw | Current implementation | Core path after split | Keep drawing behavior, remove geometry and transition mutation |
| `territoryTransitionHandler` singleton store | Current implementation | Rewrite | Bridge intent is good, singleton ownership is not |
| `FXOrchestrator` plus `FXRegistry` plus `VisualStateManager` | Current implementation | Core path | Best current runtime architecture in the project |
| Ship travel behavior registry | Current implementation | Core path | Already mode-like and semantically close to target |
| Conquest strategy registry | Current implementation | Core path | Good model for future semantic mode families |
| `SURGE_ANIMATION_V2.md` | Documented only | Core path candidate | Better lifecycle model than current continuous surge |
| Shared transition clock from clean blueprint | Documented only | Core path | Required to unify fill and border timing |

## External Technical Candidates

| Candidate | Best use | Strength | Caveat | Recommendation | Source |
|---|---|---|---|---|---|
| `d3-delaunay` | star adjacency, triangulation, neighborhood logic | Stable and already aligned with map generation needs | Not enough by itself for final territory truth | Core-path support | https://d3js.org/d3-delaunay |
| `d3-weighted-voronoi` | weighted site partitioning for early geometry stages | Direct fit for power-cell style generation | Maintenance age and topology cleanup burden | Support tool | https://github.com/Kcnarf/d3-weighted-voronoi |
| `flubber` | decorative shape morphing | Good best-effort path interpolation for arbitrary 2D shapes | Not topology-aware enough for canonical borders | Optional branch | https://github.com/veltman/flubber |
| `w8r/martinez` polygon clipping | polygon union, intersection, legality cleanup | Strong boolean polygon operations for complex region cleanup | Adds geometry complexity and coordinate-format overhead | Core-path support candidate | https://github.com/w8r/martinez |
| `JSTS` style topology utilities | robust validation and topology repair | Useful when legality and ring correctness become priority | Heavier dependency and object-model overhead | Support tool | https://github.com/bjornharrtell/jsts |
| `mapbox/earcut` | triangulation for fill meshes | Fast triangulation for polygon fills | Not a region-truth system | Core-path support | https://github.com/mapbox/earcut |
| `polylabel` | stable interior anchor points | Good for labels, territory anchor effects, region centers | Utility only | Support tool | https://github.com/mapbox/polylabel |
| `fit-curve` | bezier fitting of frontiers | Helpful when converting sampled frontiers into smoother fitted curves | Can overfit or change topology if misused | Optional branch | https://www.npmjs.com/package/fit-curve |
| `Paper.js` smoothing and simplify tools | path smoothing, simplify, flatten | Mature path tooling and useful comparative reference | Must stay on geometry side if it changes frontier points | Optional branch | https://paperjs.org/tutorials/paths/smoothing-simplifying-flattening/ |
| PixiJS render loop and performance guidance | disciplined scene updates and draw scheduling | Native fit for current stack and useful baseline for scene-graph hygiene | Guidance, not an algorithm | Core-path support | https://pixijs.com/8.x/guides/concepts/render-loop ; https://pixijs.com/8.x/guides/concepts/performance-tips |
| `OffscreenCanvas` | worker-side raster or preprocessing passes | Lets expensive preprocessing move off the main thread | Browser and integration complexity | Support tool | https://developer.mozilla.org/docs/Web/API/OffscreenCanvas |
| WebAssembly | geometry kernels, clipping, triangulation, validation | Good for CPU-heavy geometry without leaving browser | Tooling and debugging cost | Optional advanced branch | https://developer.mozilla.org/docs/WebAssembly |
| WebGPU and WGSL | compute-style ownership fields, distance transforms, particles | Strong long-term route for advanced field and particle work, including workers | Browser support and implementation cost still matter | Optional advanced branch | https://developer.mozilla.org/docs/Web/API/GPU ; https://gpuweb.github.io/gpuweb/wgsl/ |
| Jump Flooding Algorithm | GPU Voronoi and distance-transform approximation | Promising for fast field previews and stylized borders | Approximate and therefore risky as canonical truth | Optional advanced branch | https://www.comp.nus.edu.sg/~tants/jfa/i3d06-submitted.pdf |

## Research Notes By Concern

### Geometry generation

Most promising:

- canonical frontier topology
- weighted Voronoi or power cells as an early partition stage, not the final truth stage
- polygon clipping and validation tools as support utilities

### Path smoothing and fitting

Most promising:

- geometry-owned resampling and smoothing rules
- optional fit-curve style bezier fitting when the mode explicitly allows fitted frontiers
- Paper.js style smoothing as reference or tool, never as hidden presentation mutation

### Border rendering

Most promising:

- PIXI mesh-based border presentation driven by canonical frontier samples
- optional rope or energy-border style branches after the canonical border path is complete

### Fill rendering

Most promising:

- mesh or triangulated fills derived from canonical region polygons
- style layers may vary color, glow, blend, or texture, but not geometry truth

### Ship and combat FX

Most promising:

- keep the event-driven FX runtime
- formalize lifecycle-specific mode families
- move missing damage, repair, and destruction FX into first-class modules

## Final Recommendation Stack

### Core path

- Canonical frontier topology
- explicit geometry control contracts
- shared transition envelope
- PIXI mesh-based fill and border presentation
- FXOrchestrator plus VSM plus semantic ship mode families

### Support tools

- `Geometry0319` logic extraction
- `d3-delaunay`
- `d3-weighted-voronoi`
- polygon clipping and triangulation utilities
- `polylabel`

### Optional branches

- flubber-style decorative morphs
- Paper.js or fit-curve inspired smoothing alternatives
- rope borders, cinematic conquest branches, ship trails
- WebGPU and GPU field experiments

### Do not use as canonical truth

- distance fields
- metaballs
- pixel territory
- purely decorative morphing libraries without topology discipline
