# PVV2 Rendering Excavation Plan

> [!IMPORTANT]
> This is the plan for extracting working PVV2 rendering + transitions from the reference commit (`8dce88c`) and reimplementing them within the modular 4-layer pipeline on master. This is a **future session** task — not for the current merge.

## Objective

Extract the proven rendering logic from the monolithic `PowerVoronoiRenderer.ts` (1,271 lines at commit `8dce88c`) and rewrite it as modular components in the canonical pipeline:

**Ownership → Geometry → Transition → Presentation**

> [!IMPORTANT]
> At this commit, **Hybrid mode (HY2 Seed+Delta)** produces the most correct fills — pinned at 3-way junctions and map edges. Pure DY4/PVV2 does NOT pin these. The excavation target should be **Hybrid-quality fills with DY4 transitions**.

## Source Material

| File (at `8dce88c`) | Lines | Contains |
|----------------------|-------|----------|
| `PowerVoronoiRenderer.ts` | 1,271 | Everything: d3-weighted-voronoi, frontier graph, merged territories, shared borders, DY4 optimal transport transitions, PIXI.Graphics rendering |
| `frontierGraph.ts` | ~200 | Frontier edge computation |
| `strokeMeshBorders.ts` | ~150 | Border stroke mesh generation |
| `territoryUtils.ts` | ~100 | Shared helpers |

## Extraction Phases

### Phase 1: Audit & Map
- Read `PowerVoronoiRenderer.ts` at `8dce88c` end-to-end
- Map every function to the appropriate pipeline layer
- Document data flow: inputs → intermediates → outputs
- Identify which logic already exists in master's `geometry/` pipeline vs what's missing

### Phase 2: Geometry Layer
Extract into `territory/compiler/`:
- Power Voronoi cell generation (d3-weighted-voronoi integration)
- Territory merging (same-owner cell fusion)
- Shared border computation (frontier polylines between territories)
- Chaikin smoothing on geometry (NOT on render paths)
- **Output**: `TerritoryGeometryData` typed struct

### Phase 3: Transition Layer
Extract into `territory/transition/`:
- DY4 Optimal Transport morphing (the "sacrosanct" default)
- Frontier loop interpolation between states
- Splice detection for partial territory changes
- **Output**: `TransitionPlan` with per-frame interpolated geometry

### Phase 4: Presentation Layer
Extract into `territory/presentation/` or adapt existing `RefactoredPVV2Renderer.ts`:
- PIXI.Graphics fill rendering from geometry data
- PIXI.Graphics border rendering from shared polylines
- Container lifecycle management
- **Rule**: No geometry computation here — consume only

### Phase 5: Verification
- Side-by-side comparison: worktree at `8dce88c` vs master after rewrite
- Conquest transition visual fidelity check
- Border-fill alignment validation
- Performance benchmark (frame time comparison)

## Critical Constraints

1. **No legacy imports** — rewrite, don't copy-paste
2. **Layer separation** — compiler must NOT touch PIXI. Renderer must NOT compute ownership
3. **DY4 is sacrosanct** — do not alter Optimal Transport behavior
4. **Typed data boundaries** — each layer returns explicit TypeScript interfaces
5. **No module-level mutable state** — class-encapsulated renderer instances only

## Prerequisites

- [ ] Current UI merge completed (this session)
- [ ] Master's `geometry/` pipeline reviewed for overlap
- [ ] `RefactoredPVV2Renderer.ts` audited for reuse potential
