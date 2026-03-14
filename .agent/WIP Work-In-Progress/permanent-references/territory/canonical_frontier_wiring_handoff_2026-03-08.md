# Canonical Frontier Pipeline — Handoff (2026-03-08)

## What Was Done

Wired the **canonical frontier graph pipeline** (Stages 2A + 2B) into the mesh border renderer in `DistanceFieldTerritoryRenderer.ts`, alongside the existing legacy owner-grid centerline path.

## Files Modified

### [frontierGraph.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/frontierGraph.ts) (+101 lines)

Three new exports added at the bottom of the file:

| Export | Purpose |
|--------|---------|
| `OwnerGridInfo` (interface) | Describes a CPU ownership grid: `Int16Array` + grid dimensions + world-space origin/extent |
| `extractFieldFrontiersFromOwnerGrid(info)` | **Stage 2B** — scans adjacent cells in the CPU `ownerGrid` for different owners, emits sub-cell-interpolated `FieldFrontierPoint[]` |
| `buildCanonicalFrontierPolylines(stars, connections, graphView, ownerGridInfo?)` | Convenience orchestrator — runs Stage 2A (`computeLaneFrontiers` → `buildFrontierGraphFromGraph` → `extractPolylinesFromFrontierGraph`) then optionally merges Stage 2B field frontiers → returns `FrontierPolyline[]` |

Pre-existing Stage 2A functions (`computeLaneFrontiers`, `buildFrontierGraphFromGraph`, `extractPolylinesFromFrontierGraph`) were **not modified**.

### [DistanceFieldTerritoryRenderer.ts](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts) (+36 lines net)

| Change | Location |
|--------|----------|
| Import `buildCanonicalFrontierPolylines`, `GraphNativeDistanceView`, `OwnerGridInfo`, `FrontierPolyline` | L35 |
| Extended `BorderFamilyRenderContext` with `connections: StarConnection[]` and `top2ByStar: NodeTop2Pair[]` | L209–223 |
| Populated new fields in `borderCtx` from `canonicalConnections` and `latestTop2ByStar` | ~L4062 |
| Rewrote top of `renderMeshBorderOverlay()` | L2289–2345 |

#### `renderMeshBorderOverlay` flow (post-edit):

```
1. Build GraphNativeDistanceView from ctx.dist + ctx.top2ByStar
2. Build OwnerGridInfo from cachedVectorBuildJob (if available)
3. Call buildCanonicalFrontierPolylines(stars, connections, graphView, ownerGridInfo?)
4. Run legacy renderVectorBorderOverlay() (keeps owner grid warm)
5. Hide legacy Graphics strokes
6. Pick activePolylines = legacy preferred, canonical fallback
7. Feed activePolylines into stroke mesh geometry builder
```

## Current Priority Logic

> **Legacy `cachedVectorPolylines` is preferred.** Canonical frontier polylines are fallback only.

Stage 2A lane frontiers currently produce simplified midpoint-to-midpoint lines along connections — not the rich centerline traces from the legacy owner-grid extraction. When canonical was preferred, borders were visibly misaligned. The priority was inverted to fix this.

## What Still Needs Work

1. **Stage 2A quality** — `computeLaneFrontiers` needs to produce denser, smoother frontier geometry that traces actual ownership boundaries (not just connection midpoints)
2. **Stage 2B field frontiers** — `extractFieldFrontiersFromOwnerGrid` runs but its output isn't yet refined enough to improve on legacy. Needs sub-pixel smoothing and connection to the lane graph for continuity
3. **Flip the priority** — once canonical polylines match or exceed legacy quality, change the priority back to canonical-preferred at L2337–2339
4. **Conquest mode integration** — `Fade Blend` and `Boundary Morph` modes need to consume the canonical frontier data for temporal interpolation

## Key Variables & Data Flow

```
latestTop2ByStar  →  ctx.top2ByStar  →  graphView.top2ByStar
currentDist       →  ctx.dist        →  graphView.distToPlayer
cachedVectorBuildJob.ownerGrid       →  ownerGridInfo
canonicalConnections                 →  ctx.connections
```

## Environment

- `DF_BORDER_ENGINE = 'mesh'` activates this path
- Dev server: `bun run dev -- --host` in `pax-fluxia/`
- Zero TS lint errors in the renderer
