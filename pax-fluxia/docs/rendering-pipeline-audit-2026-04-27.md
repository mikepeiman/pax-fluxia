# Rendering Pipeline Audit - 2026-04-27

Purpose: handoff document for external research on performance and visual-quality improvements for the current territory render modes `metaball_grid`, `vs_pvv3`, `pixel`, and `distance_field`.

This audit is code-first. It describes the actual call paths and cost centers in the current repo, points to the functions doing the heavy lifting, and suggests research directions that are likely to matter more than micro-tweaks.

## Scope

Primary dispatch points:

- `src/lib/components/game/GameCanvas.svelte:4528-4785`
- `src/lib/territory/ui/territoryRenderModeCatalog.ts:45-87`

Primary implementation files:

- `src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
- `src/lib/territory/families/metaballGrid/buildGridClassification.ts`
- `src/lib/territory/families/metaballGrid/planGridWave.ts`
- `src/lib/territory/families/metaballGrid/metaballGridPlan.worker.ts`
- `src/lib/renderers/PVV3Renderer.ts`
- `src/lib/territory/orchestrator/engine.ts`
- `src/lib/renderers/PixelTerritoryRenderer.ts`
- `src/lib/renderers/pixelTerritory.worker.ts`
- `src/lib/renderers/DistanceFieldTerritoryRenderer.ts`

## Executive Findings

1. `PVV3` is paying for upstream FG2 pipeline execution before the renderer's own fingerprint early-return can help.
2. `metaball_grid` has the right high-level split (worker for planning, main thread for drawing), but the draw path is still CPU/immediate-mode heavy and allocates/parses too much.
3. `pixel` pushes its expensive solve off-thread, but still does full-frame raster generation and full texture recreation/upload on every accepted update.
4. `distance_field` has the most ambitious quality path, but also the most mixed-domain overhead: CPU graph solve, texture packing, multi-pass GPU work, optional GPU readback, and optional CPU vector/mesh border extraction.
5. Across all four modes, the biggest wins are architectural:
   - move cache gates earlier
   - reduce full-frame rebuild frequency
   - reduce GPU<->CPU synchronization
   - replace immediate-mode drawing with persistent GPU-friendly data
   - replace naive CPU data structures where they sit on critical rebuild paths

## Dispatch Map

### `metaball_grid`

`GameCanvas` -> `createMetaballGridFamily()` -> `MetaballGridFamily.update(input)` -> worker plan build (`metaballGridPlan.worker.ts`) when needed -> per-frame `renderMetaballGridScene()` -> CPU `PIXI.Graphics` cell draw.

Important code:

- `src/lib/components/game/GameCanvas.svelte:4662-4709`
- `src/lib/territory/families/metaballGrid/MetaballGridFamily.ts:832-1750`
- `src/lib/territory/families/metaballGrid/renderMetaballGridScene.ts:56-331`

### `vs_pvv3`

`GameCanvas` -> `runFG2DataPipeline(...)` -> `extractCanonicalData(...)` -> `renderPVV3(...)`.

Important code:

- `src/lib/components/game/GameCanvas.svelte:4528-4547`
- `src/lib/territory/orchestrator/engine.ts:578-605`
- `src/lib/renderers/PVV3Renderer.ts:140-748`

### `pixel`

`GameCanvas` -> `renderPixelTerritory(...)` -> `pixelTerritory.worker.ts` full raster solve -> main-thread canvas upload -> `PIXI.Texture.from(canvas)` -> sprite draw.

Important code:

- `src/lib/components/game/GameCanvas.svelte:4776-4784`
- `src/lib/renderers/PixelTerritoryRenderer.ts:158-355`
- `src/lib/renderers/pixelTerritory.worker.ts:71-441`

### `distance_field`

`GameCanvas` -> `renderDistanceFieldTerritory(...)` -> CPU topology/ownership solve on rebuild -> texture packing -> shader mesh / offscreen ownership pass / JFA boundary pass / fill pass / optional border engine.

Important code:

- `src/lib/components/game/GameCanvas.svelte:4572-4581`
- `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:1338-1429`
- `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:2288-2352`
- `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:3917-4531`
- `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:4630-4937`

## Mode Audit

### 1. `metaball_grid`

What it is:

- A world-anchored grid laid over canonical ownership geometry.
- Each cell resolves `prevOwner` / `nextOwner`, gets a role (`native`, `dispossessed`, `emergent`, `vacating`, `outside`), and may receive a conquest wave flip time.
- The visible output is not a single shader field. It is built as a grid scene and then painted cell-by-cell into `PIXI.Graphics`.

Current compute requirements:

- Classification cost scales roughly with grid cell count and region complexity.
- The code comment in `buildGridClassification.ts` states `O(N_v * N_regions)` worst-case, with spatial bucketing used to reduce candidate checks.
- Grid resolution is effectively `ceil(world.width / spacingPx) * ceil(world.height / spacingPx)`, then coarsened upward if `maxCells` would be exceeded.
- Transition planning adds BFS or Euclidean band ranking over the dispossessed-cell subgraph.
- Rendering cost is then proportional to emitted cells, and can become worse if blended territory edges are enabled because the draw step reconstructs boundary edge adjacency graphs and optionally smooths those chains.

Important implementation details:

- Planning can happen in a worker, but the worker request includes full region arrays, owned-star snapshots, conquest events, and star positions. That is good for responsiveness, but it is also a structured-clone payload worth measuring.
- The family still performs a lot of main-thread work after the worker finishes:
  - scene emission
  - string parsing of `vId`
  - per-cell immediate-mode graphics draws
  - optional blended-edge extraction from the classified grid
  - optional Chaikin smoothing on border chains

Perf/quality implications:

- Quality is strongly tied to `spacingPx`, `distribution`, cell shape, blended-edge mode, border smoothing passes, and inward offsets.
- Performance is strongly tied to cell count, not star count.
- This mode is likely to degrade badly on large worlds or small spacing because it is fundamentally a CPU grid painter today.

Best improvement ideas:

- Replace `PIXI.Graphics` per-cell drawing with persistent instanced geometry or a sprite/mesh atlas per cell shape.
- Stop storing/parsing grid cell ids as strings like `g:${ix}:${iy}` in hot paint paths; keep numeric `ix`, `iy`, and linear indices throughout.
- Cache worker-side region lookup structures keyed by geometry fingerprint so repeated structured clones do not force full rebuilds of region indices.
- Move blended-edge extraction out of the draw pass and into the plan/build stage, or generate it incrementally only when classification changes.
- Consider a shader-driven cell compositor where the CPU only uploads compact cell state buffers.
- Consider zoom-adaptive spacing or resolution tiers if the mode is mostly aesthetic and not required to remain exact under all zoom levels.

### 2. `vs_pvv3`

What it is:

- A frontier-first territory renderer that prefers canonical shell data from FG2.
- If canonical shell data is missing, it falls back to a deprecated local pipeline that still builds a weighted power Voronoi, extracts shared edges, merges same-owner cells, smooths borders, and redraws fills/borders.

Current compute requirements:

- The most important architectural fact is in `GameCanvas.svelte`: `runFG2DataPipeline(...)` is called before `renderPVV3(...)`.
- That means the renderer's local `shapeFp` / `visualFp` early-return does not prevent the upstream FG2 pipeline from running.
- On the fallback path, `renderPVV3(...)` also does local weighted Voronoi and full redraw work.
- On the canonical path, the renderer mostly consumes shell data and redraws shells, but FG2 stage costs have already been paid outside it.

Local fallback stages inside `renderPVV3(...)`:

- build owned-star site list
- inject corridor/disconnect virtual sites
- run `d3-weighted-voronoi`
- convert polygons to `TerritoryCell[]`
- cluster split map
- shared-edge extraction
- same-owner merge
- shared-boundary smoothing / substitution
- fill redraw
- border redraw

Perf/quality implications:

- The canonical path is topologically cleaner and better aligned with the engine architecture.
- The fallback path is much more expensive and also carries quality risk because fills and borders can diverge; the source code explicitly warns about that.
- The current architecture leaves performance on the table by letting FG2 run before the mode-level cache gate.

Best improvement ideas:

- Move the cache/fingerprint gate up so FG2 is not run when stars, connections, and relevant tunables have not changed.
- Split canonical-shell rendering from fallback weighted-Voronoi generation into separate modules so the canonical path does not carry fallback complexity on the hot path.
- If fallback must remain, move weighted Voronoi generation and merge/smoothing work off-main-thread, likely to a worker or WASM geometry module.
- Preserve shell display objects and update only dirty owners rather than clearing and redrawing all territories on every rebuild.
- Research whether canonical shell generation itself can become incremental across conquests instead of full stage replay.

### 3. `pixel`

What it is:

- A worker-based pixel ownership rasterizer.
- Main thread prepares inputs, worker computes an RGBA buffer, main thread converts that buffer into a canvas-backed Pixi texture and displays it as one sprite.

Current compute requirements:

- Canvas dimensions are based on world size plus edge-fade padding, divided by `PIXEL_RESOLUTION`.
- Worker allocates a full `Uint8ClampedArray(canvasW * canvasH * 4)` every solve, plus an optional `ownerGrid`.
- It performs:
  - coarse tile ownership at `TILE_SIZE = 8`
  - boundary tile detection
  - flood fill for interior tiles
  - full per-pixel solve for boundary tiles
  - optional border detection over the full owner grid
  - full pixel buffer transfer back to the main thread
- Main thread then:
  - creates a canvas
  - creates `ImageData`
  - `putImageData`
  - destroys and recreates a `PIXI.Texture`
  - updates a sprite

Perf/quality implications:

- The worker prevents direct main-thread stalls, but total work is still full-frame raster work.
- Quality is controlled by `PIXEL_RESOLUTION`, edge blend, border width, pattern, blur, pressure, and lane constraints.
- The texture upload path is expensive and blunt: it recreates the entire texture from a canvas every time.
- `workerBusy` avoids queue buildup but also means rapid changes can collapse into "latest accepted result" behavior rather than continuous updates.

Best improvement ideas:

- Replace `canvas -> Texture.from(canvas)` recreation with direct texture uploads from typed-array-backed resources, if PixiJS v8 supports the needed source path cleanly for this use case.
- Reuse the same canvas, `ImageData`, and `TextureSource` instead of destroying/recreating them.
- Investigate partial texture updates or dirty-tile uploads instead of rebuilding the full raster.
- Consider a multi-worker or latest-wins cancellation model if this mode needs to stay visually responsive under rapid ownership churn.
- Consider moving border detection into the coarse/boundary pass itself so the final extra full-grid pass disappears.
- Consider a GPU ownership texture path if the pixel look is important enough to justify replacing the worker rasterizer.

### 4. `distance_field`

What it is:

- A hybrid CPU/GPU territory renderer.
- CPU builds per-player star distance data and packs textures.
- GPU renders fill and, in two-pass mode, computes nearest-boundary information using offscreen textures and jump-flood propagation.
- Optional border engines add more CPU or GPU work on top.

Current compute requirements:

- CPU graph solve on geometry/topology change:
  - `computeGraphNativeDistanceResult(...)` builds adjacency and runs a multi-source shortest-path solve for every player.
  - The current implementation uses an array-backed priority queue with `sort`, `shift`, and `splice`.
- CPU texture packing:
  - `buildStarDataTexture(...)` packs up to `MAX_STARS` real + virtual sites into a 4-row RGBA data texture.
- GPU fill mesh:
  - `ensureMesh(...)` creates or rebuilds a world-space mesh covering an expanded bounds rectangle.
- Two-pass border mode:
  - ownership pass into offscreen texture
  - boundary seed pass
  - jump-flood iterations until `jump <= 1`
  - fill pass and optional field border pass
- Optional canonical vector/mesh border extraction:
  - may read the ownership texture back to CPU with `extractor.pixels(...)`
  - then build owner grids, polylines, or stroke meshes from that snapshot
- Optional legacy vector border path:
  - chunked CPU owner-grid fill over time
  - CPU polyline extraction
  - graphics redraw or mesh rebuild

Perf/quality implications:

- This mode has the best path to high-quality continuous borders and fill morphing.
- It also has the highest risk of hidden stalls:
  - repeated CPU shortest-path recomputation
  - GPU readback in canonical border extraction
  - repeated `new Float32Array(...)` allocations in per-pass uniform updates
  - optional CPU vector/mesh border generation
- The field-border path is likely the cheapest high-quality border mode because it stays GPU-local after the ownership pass.
- The canonical vector/mesh border path is visually promising but is exactly where sync and extraction costs show up.

Best improvement ideas:

- Replace the array-backed shortest-path queue with a binary heap or radix/bucket queue.
- Eliminate per-frame `Float32Array` churn by reusing uniform buffers/arrays.
- Avoid GPU readback for canonical border extraction; keep ownership classification and contour extraction GPU-side if possible.
- If GPU-side contour extraction is not practical, move readback-derived contour generation to a worker and aggressively cache by ownership snapshot id.
- Make field borders the default quality/perf baseline, then layer vector/mesh borders only as an adaptive or photo mode.
- Research WebGPU/compute approaches for ownership pass, boundary detection, JFA, and contour extraction as a single tightly coupled pipeline.

## Cross-Mode Opportunities

Ranked by likely impact:

1. Move cache gates earlier in the call chain.
   - Biggest immediate example: `vs_pvv3` should not run FG2 before knowing the input changed.

2. Replace naive critical-path data structures.
   - Biggest immediate example: `distance_field` shortest-path queue.

3. Remove GPU readback from default-quality paths.
   - Biggest immediate example: canonical border extraction in `distance_field`.

4. Replace immediate-mode draw loops with persistent GPU data.
   - Biggest immediate example: `metaball_grid` cell painting.

5. Stop recreating full textures/resources when only contents change.
   - Biggest immediate example: `pixel` canvas texture recreation.

6. Reduce short-lived allocations in per-frame or per-pass uniform updates.
   - Biggest immediate example: repeated `new Float32Array(...)` in `distance_field`.

7. Add zoom-adaptive or quality-tier scheduling.
   - `pixel` resolution
   - `distance_field` HQ border texture sizing
   - `metaball_grid` spacing / border smoothing

8. Push more geometry/polygon work to worker or WASM paths.
   - `PVV3` fallback geometry
   - `metaball_grid` region indexing persistence
   - `distance_field` CPU contour extraction

## Research Handoff Topics

### PixiJS v8 specific

- Direct typed-array-backed texture updates for pixel ownership maps.
- Better use of `BufferImageSource`, custom texture sources, and persistent resources.
- Instanced meshes or batched mesh geometry for large cell fields instead of `PIXI.Graphics`.
- Whether Pixi v8 WebGPU backend materially helps offscreen ownership/JFA style passes.
- Whether Pixi extract/readback APIs can be avoided or replaced in canonical border generation.

### Algorithmic

- Incremental or dirty-region power Voronoi / weighted Voronoi updates.
- GPU or WASM contour extraction from ownership textures.
- Better discrete ownership field solvers than brute per-pixel nearest/influence loops.
- Better shortest-path data structures for repeated multi-source solves.
- Signed-distance or multi-channel distance-field representations for borders that avoid readback/vectorization.
- Temporal reprojection / reuse for ownership textures between frames or conquest ticks.

### Alternate libraries / engines

- Raw WebGL2 or WebGPU for custom territory compute passes.
- `regl` / `luma.gl` if the team wants more direct GPU control without abandoning web deploy targets.
- WASM geometry kernels for Voronoi, contour extraction, or graph ops.
- Alternative game engines are only worth serious migration research if they materially change the compute model; scene management alone will not fix these bottlenecks.

## Full Function Quotes

These are the functions most worth handing to an external researcher because they expose the real computational shape of the current implementation.

### `runFG2DataPipeline`
Source: `src/lib/territory/orchestrator/engine.ts:578-605`

```ts
export function runFG2DataPipeline(input: TerritoryEngineInput): TerritoryPipelineArtifacts {
    // Force FG2 native stages regardless of user's configured method.
    const fg2Method = TERRITORY_METHOD_BY_ID['fg2_seed_graph'];
    const selection: TerritoryMethodSelection = {
        methodId: 'fg2_seed_graph',
        adapter: fg2Method.adapter,
        implementedStages: fg2Method.implementedStages.filter(s => s !== 'render'),
        // backward-compat
        mode: 'static',
        staticMethodId: 'fg2_seed_graph',
        dynamicMethodId: 'fg2_seed_graph',
    };
    const artifacts: TerritoryPipelineArtifacts = {};
    const runtime: TerritoryPipelineRuntime = { input, selection, artifacts };

    for (const stageId of TERRITORY_PIPELINE_STAGE_ORDER) {
        if (stageId === 'render') continue;  // skip - caller handles rendering
        executeStage(stageId, runtime);
    }

    // Also store into lastTraceRun so diagnostic tools can inspect
    const runId = ++traceRunCounter;
    setLastTerritoryTraceRun(
        buildTraceRun(runId, input.gameNowMs, Date.now(), selection, [], artifacts, input),
    );

    return artifacts;
}
```

### `buildGridClassification`
Source: `src/lib/territory/families/metaballGrid/buildGridClassification.ts:381-554`

```ts
export function buildGridClassification(params: BuildGridClassificationParams): GridClassification {
    const {
        world,
        spacingPx: requestedSpacingPx,
        originMode,
        prevGeometry,
        nextGeometry,
        conquestEvents,
        resolveStarPosition,
        prevOwnedStars,
        nextOwnedStars,
        coverageRadiusPx,
        maxCells,
        distribution: distributionArg,
        positionJitter: positionJitterArg,
    } = params;

    if (requestedSpacingPx <= 0) throw new Error('spacingPx must be > 0');
    if (world.width <= 0 || world.height <= 0) throw new Error('world dimensions must be > 0');

    // Coarsen spacing upward if a maxCells cap would otherwise be exceeded.
    // A grid at `s` px has `ceil(w/s) * ceil(h/s)` cells. We approximate the
    // minimum spacing that stays under the cap with
    // `s_eff = max(requested, ceil(sqrt(w*h / maxCells)))`, then iterate once
    // more in case the ceilings push us back over.
    let spacingPx = requestedSpacingPx;
    if (maxCells && maxCells > 0) {
        const floorSpacing = Math.sqrt((world.width * world.height) / maxCells);
        if (requestedSpacingPx < floorSpacing) {
            spacingPx = floorSpacing;
        }
        // Tighten after the ceiling-based cell count is computed; if still
        // over the cap, bump spacing by the sqrt of the overshoot ratio.
        const provCols = Math.ceil(world.width / spacingPx);
        const provRows = Math.ceil(world.height / spacingPx);
        const provCells = provCols * provRows;
        if (provCells > maxCells) {
            spacingPx *= Math.sqrt(provCells / maxCells);
        }
    }

    const cols = Math.ceil(world.width / spacingPx);
    const rows = Math.ceil(world.height / spacingPx);
    const { offsetX, offsetY } = resolveOffset(spacingPx, originMode);
    const distribution = distributionArg ?? 'square';
    // Clamp jitter fraction to [0, 0.5]; > 0.5 lets neighbours swap slots.
    const positionJitter = distribution === 'jittered'
        ? Math.max(0, Math.min(0.5, positionJitterArg ?? 0))
        : 0;

    const coverageRadius = coverageRadiusPx ?? spacingPx * 3;
    const coverageRadiusSq = coverageRadius * coverageRadius;
    const prevRegionLookup = buildRegionLookup(prevGeometry.territoryRegions, spacingPx);
    const nextRegionLookup =
        prevGeometry === nextGeometry
            ? prevRegionLookup
            : buildRegionLookup(nextGeometry.territoryRegions, spacingPx);
    const prevStarById = new Map<string, GridOwnedStar>();
    for (let i = 0; i < (prevOwnedStars?.length ?? 0); i++) {
        const star = prevOwnedStars![i];
        prevStarById.set(star.id, star);
    }
    const nextStarById =
        prevGeometry === nextGeometry && prevOwnedStars === nextOwnedStars
            ? prevStarById
            : (() => {
                const map = new Map<string, GridOwnedStar>();
                for (let i = 0; i < (nextOwnedStars?.length ?? 0); i++) {
                    const star = nextOwnedStars![i];
                    map.set(star.id, star);
                }
                return map;
            })();
    const prevOwnedStarLookup = buildOwnedStarLookup(prevOwnedStars, coverageRadius);
    const nextOwnedStarLookup =
        prevGeometry === nextGeometry && prevOwnedStars === nextOwnedStars
            ? prevOwnedStarLookup
            : buildOwnedStarLookup(nextOwnedStars, coverageRadius);
    const sameSnapshot =
        prevGeometry === nextGeometry &&
        prevRegionLookup === nextRegionLookup &&
        prevOwnedStarLookup === nextOwnedStarLookup;

    // Role bins (string arrays so downstream can skip vstar[] realloc).
    const roleBins: Record<GridVRole, string[]> = {
        native: [],
        dispossessed: [],
        emergent: [],
        vacating: [],
        outside: [],
    };
    const dispossessedByEventId: Record<string, string[]> = {};

    const vstars: GridVStar[] = new Array(cols * rows);
    const emittableVstars: GridVStar[] = [];
    const halfSpacing = spacingPx * 0.5;
    const jitterAmp = positionJitter * spacingPx;

    for (let iy = 0; iy < rows; iy++) {
        // `hex_offset`: shift odd rows by half-spacing for honeycomb packing.
        const rowXShift = distribution === 'hex_offset' && (iy & 1) === 1 ? halfSpacing : 0;
        for (let ix = 0; ix < cols; ix++) {
            let x = ix * spacingPx + offsetX + rowXShift;
            let y = iy * spacingPx + offsetY;
            if (jitterAmp > 0) {
                // Deterministic per-cell scatter. Use two independent hashes
                // so x/y offsets do not correlate diagonally.
                const hx = hash2Int(ix, iy) / 0x1_0000_0000; // [0, 1)
                const hy = hash2Int(ix + 104729, iy + 48611) / 0x1_0000_0000; // [0, 1)
                x += (hx * 2 - 1) * jitterAmp;
                y += (hy * 2 - 1) * jitterAmp;
            }
            const id = `g:${ix}:${iy}`;

            // Polygon-first; nearest-owned-star fallback fills gaps left by
            // explicit margin shaping, including MSR-style moats in the source geometry.
            let prevOwnerId = resolveOwnerAt(x, y, prevRegionLookup, prevStarById);
            if (prevOwnerId === null) {
                prevOwnerId = resolveOwnerByNearestStar(x, y, prevOwnedStarLookup, coverageRadiusSq);
            }
            let nextOwnerId = prevOwnerId;
            if (!sameSnapshot) {
                nextOwnerId = resolveOwnerAt(x, y, nextRegionLookup, nextStarById);
                if (nextOwnerId === null) {
                    nextOwnerId = resolveOwnerByNearestStar(x, y, nextOwnedStarLookup, coverageRadiusSq);
                }
            }
            const role = classifyRole(prevOwnerId, nextOwnerId);

            let eventId: string | null = null;
            if (role !== 'native' && role !== 'outside') {
                eventId = attributeEvent(prevOwnerId, nextOwnerId, x, y, conquestEvents, resolveStarPosition);
                (dispossessedByEventId[eventId] ??= []).push(id);
            }

            const vstar: GridVStar = {
                id,
                ix,
                iy,
                x,
                y,
                prevOwnerId,
                nextOwnerId,
                role,
                eventId,
            };
            vstars[iy * cols + ix] = vstar;
            roleBins[role].push(id);
            if (role !== 'outside') {
                emittableVstars.push(vstar);
            }
        }
    }

    return {
        cols,
        rows,
        spacingPx,
        requestedSpacingPx,
        originMode,
        distribution,
        vstars,
        emittableVstars,
        byRole: {
            native: roleBins.native,
            dispossessed: roleBins.dispossessed,
            emergent: roleBins.emergent,
            vacating: roleBins.vacating,
            outside: roleBins.outside,
        },
        dispossessedByEventId,
        defaultEventId: DEFAULT_EVENT_ID,
    };
}
```

### `planGridWave`
Source: `src/lib/territory/families/metaballGrid/planGridWave.ts:351-421`

```ts
export function planGridWave(params: PlanGridWaveParams): GridWavePlan {
    const { classification, seeding, geometry, adjacency, conquestEvents, resolveStarPosition } = params;
    const index = buildIndex(classification);

    // Build event-id -> cells lookup, then iterate in event order plus the default bucket.
    const eventOrder: Array<{ eventId: string; event?: ConquestEvent }> = conquestEvents.map((e) => ({
        eventId: makeEventId(e),
        event: e,
    }));
    // Include default bucket if present.
    if (classification.dispossessedByEventId[classification.defaultEventId]) {
        eventOrder.push({ eventId: classification.defaultEventId, event: undefined });
    }

    const perEvent: GridWavePlanEvent[] = [];
    const flat = new Map<string, number>();

    for (const { eventId, event } of eventOrder) {
        const dispossessedIds = classification.dispossessedByEventId[eventId];
        if (!dispossessedIds || dispossessedIds.length === 0) continue;

        // Seeds: seeding mode requires a concrete event for winner_natives /
        // winner_nearest_edge / conquered_star_center. For the default bucket
        // (no event), fall back to centroid seed.
        let seeds: string[];
        if (event) {
            seeds = resolveSeeds({
                event,
                dispossessedIds,
                index,
                classification,
                seeding,
                adjacency,
                resolveStarPosition,
            });
        } else {
            seeds = [pickCentroidSeed(dispossessedIds, index)];
        }

        // Rank.
        const ranked =
            geometry === 'grid_bfs'
                ? rankByGridBfs({ seeds, dispossessedIds, index, adjacency })
                : rankByEuclideanBand({
                      seeds,
                      dispossessedIds,
                      index,
                      spacingPx: classification.spacingPx,
                  });

        const flipTimeByVId = assignFlipTimes({
            rank: ranked.rank,
            maxRank: ranked.maxRank,
            dispossessedIds,
            index,
        });

        for (const [id, t] of flipTimeByVId) flat.set(id, t);

        perEvent.push({
            eventId,
            seeding,
            geometry,
            adjacency,
            maxRank: ranked.maxRank,
            flipTimeByVId,
            seedVIds: seeds,
        });
    }

    return { perEvent, flipTimeByVId: flat };
}
```

### `workerScope.onmessage`
Source: `src/lib/territory/families/metaballGrid/metaballGridPlan.worker.ts:24-77`

```ts
workerScope.onmessage = (event: MessageEvent<MetaballGridPlanWorkerRequest>) => {
    const request = event.data;
    const resolveStarPosition = buildStarPositionResolver(request.starPositions);
    const prevGeometry = {
        territoryRegions: request.prevRegions,
    } as CanonicalGeometrySnapshot;
    const nextGeometry = request.sameSnapshot
        ? prevGeometry
        : ({
              territoryRegions: request.nextRegions,
          } as CanonicalGeometrySnapshot);
    const nextOwnedStars = request.sameSnapshot
        ? request.prevOwnedStars
        : request.nextOwnedStars;

    const classificationStartMs = performance.now();
    const classification = buildGridClassification({
        world: request.world,
        spacingPx: request.spacingPx,
        originMode: request.originMode,
        prevGeometry,
        nextGeometry,
        conquestEvents: request.conquestEvents,
        resolveStarPosition,
        prevOwnedStars: request.prevOwnedStars,
        nextOwnedStars,
        maxCells: request.maxCells,
        distribution: request.distribution,
        positionJitter: request.positionJitter,
    });
    const classificationBuildMs = performance.now() - classificationStartMs;

    const wavePlanStartMs = performance.now();
    const wavePlan = planGridWave({
        classification,
        seeding: request.waveSeeding,
        geometry: request.waveGeometry,
        adjacency: request.adjacency,
        conquestEvents: request.conquestEvents,
        resolveStarPosition,
    });
    const wavePlanBuildMs = performance.now() - wavePlanStartMs;

    const response: MetaballGridPlanWorkerResponse = {
        requestId: request.requestId,
        planKey: request.planKey,
        classification,
        wavePlan,
        classificationBuildMs,
        wavePlanBuildMs,
        planBuildMs: classificationBuildMs + wavePlanBuildMs,
    };
    workerScope.postMessage(response);
};
```

### `self.onmessage`
Source: `src/lib/renderers/pixelTerritory.worker.ts:71-441`

```ts
self.onmessage = (e: MessageEvent<WorkerInput>) => {
    const d = e.data;
    const {
        canvasW, canvasH, stars, numOwners, ownerRGB,
        alpha, edgeBlend, corridorBoost, corridorSegs,
        laneConstrain, pressure,
        borderWidth, borderAlpha, borderBrighten,
        pattern, patternScale, patternRotation,
        boardLeft, boardTop, boardRight, boardBottom, fadeDistCanvas,
    } = d;

    // Point-to-line-segment squared distance
    function segDistSq(px: number, py: number, seg: CorridorSeg): number {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) return (px - seg.x1) ** 2 + (py - seg.y1) ** 2;
        let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const cx = seg.x1 + t * dx;
        const cy = seg.y1 + t * dy;
        return (px - cx) ** 2 + (py - cy) ** 2;
    }

    // Corridor capsule ownership check
    // Returns ownerIdx if point is inside any corridor capsule, -1 otherwise
    function corridorOwner(px: number, py: number): number {
        for (let i = 0; i < corridorSegs.length; i++) {
            const seg = corridorSegs[i];
            if (segDistSq(px, py, seg) <= seg.halfW * seg.halfW) {
                return seg.ownerIdx;
            }
        }
        return -1;
    }

    // Effective distance with lane constraint + pressure
    // Returns a modified distSq that penalizes off-lane directions
    // and discounts distance for high-ship-count stars.
    function effectiveDistSq(px: number, py: number, starIdx: number): number {
        const s = stars[starIdx];
        const dx = px - s.x;
        const dy = py - s.y;
        let distSq = dx * dx + dy * dy;

        // Pressure: scale distance inversely with ship count
        // More ships -> smaller effective distance -> larger territory
        if (pressure > 0 && s.ships > 0) {
            // Ships factor: log scale to prevent extreme values
            // A star with 100 ships gets ~2x distance reduction at pressure=1
            const shipFactor = 1 + Math.log2(1 + s.ships) * 0.15 * pressure;
            distSq /= (shipFactor * shipFactor);
        }

        // Lane constraint: penalize pixels NOT in direction of connections
        if (laneConstrain > 0 && s.angles.length > 0 && distSq > 1) {
            const pixelAngle = Math.atan2(dy, dx);

            // Find minimum angular distance to any connection direction
            let minAngleDiff = Math.PI; // worst case: opposite direction
            for (let a = 0; a < s.angles.length; a++) {
                let diff = Math.abs(pixelAngle - s.angles[a]);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;
                if (diff < minAngleDiff) minAngleDiff = diff;
            }

            // Angular penalty: pixels far from any connection get inflated distance
            // At minAngleDiff=0 (on a connection): penalty=1 (no change)
            // At minAngleDiff=PI (opposite all connections): penalty up to 4x at laneConstrain=1
            const angleRatio = minAngleDiff / Math.PI; // 0-1
            const penalty = 1 + angleRatio * angleRatio * 3.0 * laneConstrain;
            distSq *= penalty;
        }

        return distSq;
    }

    const numStars = stars.length;
    const pixels = new Uint8ClampedArray(canvasW * canvasH * 4);

    // Build owner -> star indices
    const starsByOwner: number[][] = [];
    for (let oi = 0; oi < numOwners; oi++) starsByOwner.push([]);
    for (let i = 0; i < numStars; i++) {
        starsByOwner[stars[i].ownerIdx].push(i);
    }

    // Pre-compute per-owner pattern rotation
    const ownerCos = new Float64Array(numOwners);
    const ownerSin = new Float64Array(numOwners);
    for (let oi = 0; oi < numOwners; oi++) {
        const angle = (oi * 137.508 * patternRotation * Math.PI) / 180;
        ownerCos[oi] = Math.cos(angle);
        ownerSin[oi] = Math.sin(angle);
    }

    // Hierarchical adaptive resolution
    const TILE_SIZE = 8;
    const tilesW = Math.ceil(canvasW / TILE_SIZE);
    const tilesH = Math.ceil(canvasH / TILE_SIZE);

    // Pass 1: Coarse ownership
    const tileOwner = new Uint8Array(tilesW * tilesH);
    const tileR = new Uint8Array(tilesW * tilesH);
    const tileG = new Uint8Array(tilesW * tilesH);
    const tileB = new Uint8Array(tilesW * tilesH);

    for (let ty = 0; ty < tilesH; ty++) {
        const centerY = (ty + 0.5) * TILE_SIZE;
        for (let tx = 0; tx < tilesW; tx++) {
            const centerX = (tx + 0.5) * TILE_SIZE;
            const tIdx = ty * tilesW + tx;
            let winnerOi = 0;

            // Check capsule corridors first (guaranteed connectivity)
            const cOwner = corridorSegs.length > 0 ? corridorOwner(centerX, centerY) : -1;
            if (cOwner >= 0) {
                winnerOi = cOwner;
            } else if (corridorBoost > 0 && numOwners > 1) {
                let bestInfluence = -1;
                for (let oi = 0; oi < numOwners; oi++) {
                    const indices = starsByOwner[oi];
                    let influence = 0;
                    let ownerMinDist = Infinity;
                    for (let j = 0; j < indices.length; j++) {
                        const distSq = effectiveDistSq(centerX, centerY, indices[j]);
                        if (distSq < ownerMinDist) ownerMinDist = distSq;
                        influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                    }
                    const score = Math.pow(influence, corridorBoost) *
                        Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                    if (score > bestInfluence) {
                        bestInfluence = score;
                        winnerOi = oi;
                    }
                }
            } else {
                let nearestDistSq = Infinity;
                for (let i = 0; i < numStars; i++) {
                    const dist = effectiveDistSq(centerX, centerY, i);
                    if (dist < nearestDistSq) {
                        nearestDistSq = dist;
                        winnerOi = stars[i].ownerIdx;
                    }
                }
            }

            tileOwner[tIdx] = winnerOi;
            tileR[tIdx] = ownerRGB[winnerOi * 3];
            tileG[tIdx] = ownerRGB[winnerOi * 3 + 1];
            tileB[tIdx] = ownerRGB[winnerOi * 3 + 2];
        }
    }

    // Pass 2: Detect boundary tiles
    const isBoundary = new Uint8Array(tilesW * tilesH);
    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const my = tileOwner[tIdx];
            if (tx > 0 && tileOwner[tIdx - 1] !== my) { isBoundary[tIdx] = 1; continue; }
            if (tx < tilesW - 1 && tileOwner[tIdx + 1] !== my) { isBoundary[tIdx] = 1; continue; }
            if (ty > 0 && tileOwner[tIdx - tilesW] !== my) { isBoundary[tIdx] = 1; continue; }
            if (ty < tilesH - 1 && tileOwner[tIdx + tilesW] !== my) { isBoundary[tIdx] = 1; continue; }
        }
    }

    // Pass 3 & 4: Fill pixels
    const ownerGrid = borderWidth > 0 ? new Uint8Array(canvasW * canvasH) : null;

    for (let ty = 0; ty < tilesH; ty++) {
        for (let tx = 0; tx < tilesW; tx++) {
            const tIdx = ty * tilesW + tx;
            const startX = tx * TILE_SIZE;
            const startY = ty * TILE_SIZE;
            const endX = Math.min(startX + TILE_SIZE, canvasW);
            const endY = Math.min(startY + TILE_SIZE, canvasH);

            if (!isBoundary[tIdx]) {
                // Interior tile: flood fill
                const r = tileR[tIdx], g = tileG[tIdx], b = tileB[tIdx];
                const oi = tileOwner[tIdx];
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let pa = alpha;

                        // Edge fade
                        if (fadeDistCanvas > 0) {
                            let fm = 1.0;
                            if (px < boardLeft) fm = Math.min(fm, px / fadeDistCanvas);
                            else if (px > boardRight) fm = Math.min(fm, (canvasW - px) / fadeDistCanvas);
                            if (py < boardTop) fm = Math.min(fm, py / fadeDistCanvas);
                            else if (py > boardBottom) fm = Math.min(fm, (canvasH - py) / fadeDistCanvas);
                            pa *= Math.max(0, fm);
                        }

                        // Pattern
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            const rpx = px * ownerCos[oi] - py * ownerSin[oi];
                            const rpy = px * ownerSin[oi] + py * ownerCos[oi];
                            if (pattern === 'stripes') {
                                pa *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pa *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pa *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            } else if (pattern === 'hex') {
                                const d2e = hexDistToEdge(px, py, ps);
                                if (d2e < 1.5) pa *= 0.05;
                                else if (d2e < 3.0) pa = Math.min(1.0, pa * 2.5);
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = oi;
                    }
                }
            } else {
                // Boundary tile: full per-pixel computation
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        let winnerOi = 0;
                        let nearestDistSq = Infinity;

                        // Check capsule corridors first
                        const cOwner = corridorSegs.length > 0 ? corridorOwner(px, py) : -1;
                        if (cOwner >= 0) {
                            winnerOi = cOwner;
                            // Still need nearestDistSq for edge blend
                            for (let i = 0; i < numStars; i++) {
                                if (stars[i].ownerIdx !== cOwner) continue;
                                const ddx = px - stars[i].x;
                                const ddy = py - stars[i].y;
                                const d = ddx * ddx + ddy * ddy;
                                if (d < nearestDistSq) nearestDistSq = d;
                            }
                        } else if (corridorBoost > 0 && numOwners > 1) {
                            let bestInfluence = -1;
                            let bestNearestDistSq = Infinity;
                            for (let oi = 0; oi < numOwners; oi++) {
                                const indices = starsByOwner[oi];
                                let influence = 0;
                                let ownerMinDist = Infinity;
                                for (let j = 0; j < indices.length; j++) {
                                    const distSq = effectiveDistSq(px, py, indices[j]);
                                    if (distSq < ownerMinDist) ownerMinDist = distSq;
                                    influence += distSq < 1 ? 1e12 : 1.0 / distSq;
                                }
                                const score = Math.pow(influence, corridorBoost) *
                                    Math.pow(ownerMinDist < 1 ? 1e-12 : 1.0 / ownerMinDist, 1.0 - corridorBoost);
                                if (score > bestInfluence) {
                                    bestInfluence = score;
                                    winnerOi = oi;
                                    bestNearestDistSq = ownerMinDist;
                                }
                            }
                            nearestDistSq = bestNearestDistSq;
                        } else {
                            for (let i = 0; i < numStars; i++) {
                                const dist = effectiveDistSq(px, py, i);
                                if (dist < nearestDistSq) {
                                    nearestDistSq = dist;
                                    winnerOi = stars[i].ownerIdx;
                                }
                            }
                        }

                        const r = ownerRGB[winnerOi * 3];
                        const g = ownerRGB[winnerOi * 3 + 1];
                        const b = ownerRGB[winnerOi * 3 + 2];
                        let pa = alpha;

                        // Edge fade
                        if (fadeDistCanvas > 0) {
                            let fm = 1.0;
                            if (px < boardLeft) fm = Math.min(fm, px / fadeDistCanvas);
                            else if (px > boardRight) fm = Math.min(fm, (canvasW - px) / fadeDistCanvas);
                            if (py < boardTop) fm = Math.min(fm, py / fadeDistCanvas);
                            else if (py > boardBottom) fm = Math.min(fm, (canvasH - py) / fadeDistCanvas);
                            pa *= Math.max(0, fm);
                        }

                        // Edge blend (enemy boundaries only)
                        if (edgeBlend > 0) {
                            let secondMinDist = Infinity;
                            for (let i = 0; i < numStars; i++) {
                                if (stars[i].ownerIdx === winnerOi) continue;
                                const dx = px - stars[i].x;
                                const dy = py - stars[i].y;
                                const dist = dx * dx + dy * dy;
                                if (dist < secondMinDist) secondMinDist = dist;
                            }
                            if (secondMinDist < Infinity) {
                                const d1 = Math.sqrt(nearestDistSq);
                                const d2 = Math.sqrt(secondMinDist);
                                const edgeDist = (d2 - d1) / (d1 + d2 + 0.001);
                                const blendFactor = Math.min(1, edgeDist / (edgeBlend * 0.05));
                                pa *= blendFactor;
                            }
                        }

                        // Pattern
                        if (pattern !== 'none') {
                            const ps = patternScale;
                            const rpx = px * ownerCos[winnerOi] - py * ownerSin[winnerOi];
                            const rpy = px * ownerSin[winnerOi] + py * ownerCos[winnerOi];
                            if (pattern === 'stripes') {
                                pa *= ((Math.floor((rpx + rpy) / ps)) % 2 === 0) ? 1.0 : 0.35;
                            } else if (pattern === 'crosshatch') {
                                pa *= ((((rpx % ps) + ps) % ps) < 1 || (((rpy % ps) + ps) % ps) < 1) ? 1.0 : 0.3;
                            } else if (pattern === 'dots') {
                                const gx = ((((rpx % ps) + ps) % ps) - ps / 2);
                                const gy = ((((rpy % ps) + ps) % ps) - ps / 2);
                                pa *= (Math.sqrt(gx * gx + gy * gy) / (ps / 2)) < 0.5 ? 1.0 : 0.25;
                            } else if (pattern === 'hex') {
                                const d2e = hexDistToEdge(px, py, ps);
                                if (d2e < 1.5) pa *= 0.05;
                                else if (d2e < 3.0) pa = Math.min(1.0, pa * 2.5);
                            }
                        }

                        const idx = (py * canvasW + px) * 4;
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = Math.round(pa * 255);
                        if (ownerGrid) ownerGrid[py * canvasW + px] = winnerOi;
                    }
                }
            }
        }
    }

    // Border detection pass
    if (borderWidth > 0 && ownerGrid) {
        const bw = Math.max(1, Math.round(borderWidth));
        for (let py = bw; py < canvasH - bw; py++) {
            for (let px = bw; px < canvasW - bw; px++) {
                const gridIdx = py * canvasW + px;
                const myOwner = ownerGrid[gridIdx];
                let isBdr = false;
                for (let dd = 1; dd <= bw && !isBdr; dd++) {
                    if (px + dd < canvasW && ownerGrid[gridIdx + dd] !== myOwner) isBdr = true;
                    if (px - dd >= 0 && ownerGrid[gridIdx - dd] !== myOwner) isBdr = true;
                    if (py + dd < canvasH && ownerGrid[gridIdx + dd * canvasW] !== myOwner) isBdr = true;
                    if (py - dd >= 0 && ownerGrid[gridIdx - dd * canvasW] !== myOwner) isBdr = true;
                }
                if (isBdr) {
                    const idx = (py * canvasW + px) * 4;
                    pixels[idx] = Math.min(255, pixels[idx] + borderBrighten);
                    pixels[idx + 1] = Math.min(255, pixels[idx + 1] + borderBrighten);
                    pixels[idx + 2] = Math.min(255, pixels[idx + 2] + borderBrighten);
                    pixels[idx + 3] = Math.round(borderAlpha * 255);
                }
            }
        }
    }

    // Transfer pixel buffer back (zero-copy)
    (self as any).postMessage(
        { pixels: pixels.buffer, canvasW, canvasH },
        [pixels.buffer],
    );
};
```

### `computeGraphNativeDistanceResult`
Source: `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:1338-1416`

```ts
function computeGraphNativeDistanceResult(
    stars: StarState[],
    connections: StarConnection[],
    playerIds: string[],
    metric: 'hops' | 'length',
): GraphNativeDistanceResult {
    const nStars = stars.length;
    const nPlayers = playerIds.length;
    const playerIdx = new Map<string, number>();
    for (let i = 0; i < nPlayers; i++) playerIdx.set(playerIds[i], i);

    // Build adjacency
    const starIdx = new Map<string, number>();
    for (let i = 0; i < nStars; i++) starIdx.set(stars[i].id, i);

    const adj: { neighbor: number; cost: number }[][] = new Array(nStars);
    for (let i = 0; i < nStars; i++) adj[i] = [];

    for (const conn of connections) {
        const a = starIdx.get(conn.sourceId);
        const b = starIdx.get(conn.targetId);
        if (a === undefined || b === undefined) continue;
        const cost = metric === 'hops' ? 1 : (conn.distance || 1);
        adj[a].push({ neighbor: b, cost });
        adj[b].push({ neighbor: a, cost });
    }

    // Compatibility matrix used by existing ownership/rendering code.
    const distToPlayer: number[][] = new Array(nStars);
    for (let s = 0; s < nStars; s++) {
        distToPlayer[s] = new Array(nPlayers).fill(Infinity);
    }

    // Priority queue: [distance, starIdx, playerIdx]
    const pq: [number, number, number][] = [];

    // Seed: each owned star has distance 0 to its own player
    for (let s = 0; s < nStars; s++) {
        const ownerId = stars[s].ownerId;
        if (!ownerId) continue;
        const pi = playerIdx.get(ownerId);
        if (pi === undefined) continue;
        distToPlayer[s][pi] = 0;
        pq.push([0, s, pi]);
    }

    pq.sort((a, b) => a[0] - b[0]);

    while (pq.length > 0) {
        const [d, si, pi] = pq.shift()!;
        if (d > distToPlayer[si][pi]) continue;

        for (const { neighbor, cost } of adj[si]) {
            const nd = d + cost;
            if (nd < distToPlayer[neighbor][pi]) {
                distToPlayer[neighbor][pi] = nd;
                let inserted = false;
                for (let i = 0; i < pq.length; i++) {
                    if (nd < pq[i][0]) {
                        pq.splice(i, 0, [nd, neighbor, pi]);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) pq.push([nd, neighbor, pi]);
            }
        }
    }

    const top2ByStar: NodeTop2Pair[] = new Array(nStars);
    for (let i = 0; i < nStars; i++) {
        top2ByStar[i] = rankTop2Owners(distToPlayer[i]);
    }

    return {
        distToPlayer,
        top2ByStar,
    };
}
```

### `renderBoundaryDistancePass`
Source: `src/lib/renderers/DistanceFieldTerritoryRenderer.ts:4367-4417`

```ts
function renderBoundaryDistancePass(renderer: PIXI.Renderer): boolean {
    if (
        !cachedOwnershipTexture
        || !cachedBoundarySeedShader
        || !cachedBoundarySeedMesh
        || !cachedJumpFloodShader
        || !cachedJumpFloodMesh
        || !cachedJumpFloodTextureA
        || !cachedJumpFloodTextureB
    ) {
        return false;
    }

    const boundaryUniforms = cachedBoundarySeedShader.resources.boundarySeedUniforms.uniforms;
    boundaryUniforms.uOwnershipTexSize = new Float32Array([Math.max(1, cachedOwnershipTexW), Math.max(1, cachedOwnershipTexH)]);
    cachedBoundarySeedShader.resources.uOwnershipTex = cachedOwnershipTexture.source;
    const boundaryGroup = cachedBoundarySeedShader.resources.boundarySeedUniforms as any;
    if (boundaryGroup && typeof boundaryGroup.update === 'function') boundaryGroup.update();

    (renderer as any).render({ container: cachedBoundarySeedMesh, target: cachedJumpFloodTextureA, clear: true });

    let jump = 1;
    const maxDim = Math.max(cachedOwnershipTexW, cachedOwnershipTexH);
    while (jump < maxDim) jump *= 2;
    jump = Math.max(1, Math.floor(jump / 2));

    let inputTex = cachedJumpFloodTextureA;
    let outputTex = cachedJumpFloodTextureB;

    while (true) {
        const jumpUniforms = cachedJumpFloodShader.resources.jumpFloodUniforms.uniforms;
        jumpUniforms.uSeedTexSize = new Float32Array([Math.max(1, cachedOwnershipTexW), Math.max(1, cachedOwnershipTexH)]);
        jumpUniforms.uJump = jump;
        cachedJumpFloodShader.resources.uSeedTex = inputTex.source;

        const jumpGroup = cachedJumpFloodShader.resources.jumpFloodUniforms as any;
        if (jumpGroup && typeof jumpGroup.update === 'function') jumpGroup.update();

        (renderer as any).render({ container: cachedJumpFloodMesh, target: outputTex, clear: true });

        const nextInput = outputTex;
        outputTex = inputTex;
        inputTex = nextInput;

        if (jump <= 1) break;
        jump = Math.floor(jump / 2);
    }

    cachedBoundaryDistanceTexture = inputTex;
    return true;
}
```

## Final Recommendation

If the goal is maximum performance without giving up visual quality, the strongest near-term bet is:

1. Keep `distance_field` as the high-quality baseline, but bias research toward keeping the whole border path GPU-local.
2. Treat `metaball_grid` as a candidate for a GPU/instancing rewrite, because its current CPU cell painter is the core limiter.
3. Treat `pixel` as a candidate for direct GPU texture updates or a shader ownership texture path, because the worker solve is only half the cost story.
4. Treat `PVV3` as an architectural cleanup target first: remove redundant upstream FG2 work, then decide whether the fallback path still deserves investment.
