# Pipeline Trace: FG2 Seed Graph to Canvas Render

This document traces the complete code path from the FG2 Seed Graph geometry generation to the screen render, explaining how these files interrelate and identifying the likely cause of the "Ghost Border" misalignment on Tick 1.

## The Bug Context
The user observed sub-pixel rendering misalignment between territory fills and borders on tick 1. The screenshot UI shows the following configuration active:
- **Geometry Engine:** "FG2 Seed Graph" (`fg2_seed_graph`)
- **Territory Style:** "Territory Engine (DY4)" or "Vector Stroke (PVV3)" (`territory_engine` / `vs_pvv3`)
- **Fill Transition:** "Frontier Morph" (`frontier_morph`)
- **Border Transition:** "Smooth Morph" (`optimal_transport`)

## Pipeline Execution Trace

### 1. UI Selection & Configuration (`ControlsSection-Territory.svelte`)
The UI dropdowns configure the active methods in `game.config.ts`.
- `TERRITORY_RENDER_MODE` determines the presentation style (e.g., `territory_canonical`, `vs_pvv3`).
- `Geometry` is hardcoded to `fg2_seed_graph`.

### 2. Main Game Loop Dispatch (`GameCanvas.svelte`)
In the render loop (around line 1140+), `GameCanvas` routes the rendering based on the active mode:
- If `vs_pvv3`: Calls `runFG2DataPipeline(input)` then `renderPVV3Module(extractCanonicalData(artifacts))`.
- If `territory_engine`: Calls `renderTerritoryEngine(input)`.

### 3. Territory Engine Routing (`engine.ts` & `registry.ts`)
`renderTerritoryEngine` reads the active method selection (from `registry.ts`).
For `fg2_seed_graph` + `legacy_pvv3`:
- It calls `runFullPipeline()`, which iterates through `TERRITORY_PIPELINE_STAGE_ORDER`.
- The pipeline executes all stages implemented by the method (metric, topology, geometry, loop, animation, **render**).

### 4. Geometry Generation & Native Render (`fg2SeedGraph.ts`)
This is the core geometry compiler for the `fg2_seed_graph` method.
- **Computation:** Builds pair-topology graphs, extracts disjoint frontier chains, and builds owner shells.
- **Native Render Hook:** In the `executeFG2StageRender` function (around line 4900+), the method directly draws lines and fills onto a `diagnosticGraphics` container layer to visualize the FG2 network (seeds, pairs, boundaries, loops).
- **The Ghost Border Culprit:** `executeFG2StageRender` draws `quadraticCurveTo` and `bezierCurveTo` geometry mapping the analytical frontiers. **This native stage rendering overlays on top of the actual game canvas renderers (PVV3 / DY4), causing two sets of geometrically different lines to draw simultaneously.**

### 5. Canvas Style Render (`PVV3Renderer.ts`)
After `runFG2DataPipeline` completes, `GameCanvas.svelte` calls the explicit style renderer (`PVV3Renderer` for `vs_pvv3`).
- `PVV3Renderer` consumes the canonical `ownerShells` from the pipeline artifacts.
- It iterates through the shells, applies `chaikinSmoothPolygon`, and draws the fill + stroke via the single-path method (Zero-Divergence fix).
- However, because `engine.ts` already allowed `fg2SeedGraph.ts` to draw its own diagnostic/native borders onto the container, the user sees both the PVV3 smoothed border AND the raw `fg2SeedGraph` native border overlapping, creating the misalignment.

## Files Copied to this Directory
1. **`GameCanvas.svelte`** - Top-level render loop dispatch.
2. **`ControlsSection-Territory.svelte`** - UI dropdown mappings.
3. **`registry.ts`** - Method definitions and legacy adapter routings.
4. **`engine.ts`** - Pipeline orchestrator and stage execution runner.
5. **`fg2SeedGraph.ts`** - Geometry compiler which also contains the native render stage creating the overlapping dual-render anomaly.
6. **`PVV3Renderer.ts`** - Primary style renderer trying to cleanly draw the canonical geometry over the native diagnostic lines.

## Solution Vector
To solve the overlapping border visually, the delegated native `render` stage inside `fg2SeedGraph.ts` (`executeFG2StageRender`) needs to be disabled, hidden, or conditionally gated behind a diagnostic toggle (e.g., `TERRITORY_ENGINE_TRACE_MODE`) so it doesn't draw concurrently with the canonical style renderers like `PVV3Renderer` or `TerritoryRenderer`.
