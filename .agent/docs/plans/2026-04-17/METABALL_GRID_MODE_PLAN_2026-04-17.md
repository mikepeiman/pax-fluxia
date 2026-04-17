# metaball-grid Mode — Implementation Plan (2026-04-17)

## Purpose

Verbatim user goal:

> New algo for conquest. Star A->B conquest:
>
> 1. GRID. Terms: dispossessed vstars exist inside another player's ownership region (assessed after a conquest is decided based on NEXT state). Native vstars are those which still reside in owned territory after a conquest.
>     1. Using correct underlying geometry
>     2. Fill entire map with Vstars of relevant player ownership, on a consistent grid
>     3. this allows us to easily and deterministically identify changed vs unchanged
>     4. on a conquest, you will determine which vstars are now dispossessed and which are still native
>     5. For dispossessed vstars in Player X's territory: They switch ownership in a wave, from whichever is nearest to a native Vstar, cascading out, with the ownership flips sequenced based on `numberDispossessedVs / transitionFrames`

This mode is a new, additive rendering family. It is not a replacement for `perimeter_field`, and the perimeter_field engine is explicitly out of scope here.

## Architecture: two layers

- **Ownership-geometry truth underlayer.** A tuned Power-Voronoi generator (e.g. `Geometry_0319`) produces per-owner territory regions. This is the authority for who owns what.
- **Visual-truth grid layer.** A fixed, world-anchored grid of vstars. Each grid vstar carries a `prevOwnerId` and `nextOwnerId` resolved by point-in-polygon against the PREV and NEXT ownership snapshots. A wave planner assigns each dispossessed vstar a `flipTime ∈ [0, 1]` during a conquest. A metaball scene builder emits the effective `{colorIdx, alpha, strength}` per grid vstar per frame.

Invariant: the underlayer is not mutated by the grid layer. The grid layer is a pure function of `(world, spacing, originMode, prevGeometry, nextGeometry, events, progress)`.

## Grid-V classification algorithm

Given `world`, `spacing`, `originMode`, `prevGeometry`, `nextGeometry`, `conquestEvents`:

1. **Grid point set.** `cols = ceil(width / spacing)`, `rows = ceil(height / spacing)`. `(ix, iy) → (ix * spacing + offsetX, iy * spacing + offsetY)` where `offset = spacing/2` when `originMode === 'centered'` else `0`. Stable id `g:<ix>:<iy>`. Positions are fixed for the session.
2. **Resolve PREV owner.** For each grid point, test point-in-polygon (even-odd ray cast) against each `prevGeometry.territoryRegions[i].points` in array order. First match wins; none → `prevOwnerId = null`.
3. **Resolve NEXT owner.** Same procedure against `nextGeometry.territoryRegions`.
4. **Role classification:**
    - `native` — `prevOwnerId === nextOwnerId`, non-null.
    - `dispossessed` — both defined, `prevOwnerId !== nextOwnerId`.
    - `emergent` — `prevOwnerId === null`, `nextOwnerId !== null`.
    - `vacating` — `prevOwnerId !== null`, `nextOwnerId === null`.
    - `outside` — both null.
5. **Event attribution for dispossessed V's.** Match `(prevOwnerId, nextOwnerId)` against `conquestEvents[].{previousOwner, newOwner}`. On multiple matches, tiebreak by nearest `event.starPosition` (Euclidean). Unmatched → synthetic default event.
6. **Emit `GridClassification`.** Contains the full `GridVStar[]`, by-role bins, and `dispossessedByEventId`.

Determinism: region iteration is array order; generator output is already deterministic. Grid id is position-derived.

Complexity: `O(N_v * N_regions)` per transition start. For 1920×1080 @ 24 px and ~10 regions ≈ 72 k point-in-polygon tests, one-shot per conquest.

## Wave planning per event

Each dispossessed V gets a `flipTime ∈ [0, 1]` via:

- **Seeding** (`METABALL_GRID_WAVE_SEEDING`):
  - `winner_natives` — seeds are native V's of `event.newOwner` adjacent to any dispossessed V of this event.
  - `conquered_star_center` — seed is the conquered star's world position; distances measured from it.
  - `winner_nearest_edge` — seeds are native V's of `event.newOwner` that share a grid edge with a dispossessed V.
- **Wave geometry** (`METABALL_GRID_WAVE_GEOMETRY`):
  - `grid_bfs` — multi-source BFS, per-V rank = BFS depth.
  - `euclidean_band` — per-V rank by min Euclidean distance to any seed.
- **Adjacency** (`METABALL_GRID_ADJACENCY`): `4-connected` or `8-connected`, used only by `grid_bfs`.
- **Flip-time assignment:** `flipTime = rank(V) / maxRank(event)`. Ties broken by `(gridIy, gridIx)`.

## Per-frame rendering

At `progress ∈ [0, 1]`, each grid-V contributes `{colorIdx, alpha, strength}` to the metaball field:

- `native` → owner color, full alpha, base strength.
- `dispossessed` under `METABALL_GRID_FLIP_TRANSITION`:
  - `hard` — color flips at `progress >= flipTime`. Alpha constant.
  - `lerp_per_cell` — color lerps PREV→NEXT over `[flipTime - W, flipTime + W]` with `W = METABALL_GRID_FLIP_WINDOW`. Outside this range behaves as `hard`.
  - `dual_pass_blend` — render two fields (PREV field, NEXT field) in one frame; PREV-side alpha per V = `1 - smoothstep01(flipTime, progress)`, NEXT-side alpha = complement. Compositor sums both.
- `emergent` → treated as dispossessed with PREV alpha = 0.
- `vacating` → treated as dispossessed with NEXT alpha = 0.
- `outside` → not emitted.

## Config surface

All keys live in the `METABALL_GRID_*` namespace. No changes to any existing `PERIMETER_FIELD_*` or other family keys.

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `METABALL_GRID_ENABLED` | boolean | `false` | Mode gate |
| `METABALL_GRID_SPACING_PX` | number | `24` | Grid spacing; tunable, perf-sensitive |
| `METABALL_GRID_ORIGIN_MODE` | `'centered' \| 'corner'` | `'centered'` | Grid origin offset |
| `METABALL_GRID_ADJACENCY` | `'4' \| '8'` | `'8'` | BFS adjacency |
| `METABALL_GRID_WAVE_GEOMETRY` | `'grid_bfs' \| 'euclidean_band'` | `'grid_bfs'` | Wave rank source |
| `METABALL_GRID_WAVE_SEEDING` | `'winner_natives' \| 'conquered_star_center' \| 'winner_nearest_edge'` | `'winner_natives'` | Wave seed set |
| `METABALL_GRID_FLIP_TRANSITION` | `'hard' \| 'lerp_per_cell' \| 'dual_pass_blend'` | `'hard'` | Per-cell flip style |
| `METABALL_GRID_FLIP_WINDOW` | number | `0.06` | Lerp window half-width (0-1) |
| `METABALL_GRID_STRENGTH` | number | `1.35` | Per-vstar metaball influence strength |
| `METABALL_GRID_INWARD_OFFSET_PX` | number | `0` | Optional inward offset applied to edge cells (0 = none) |

## File plan

All additive. New code under `pax-fluxia/src/lib/territory/families/metaballGrid/`. No existing file rewritten.

| Path | Role |
|------|------|
| `metaballGrid/metaballGridTypes.ts` | `GridVStar`, `GridClassification`, `GridWavePlan`, `GridMetaballTransitionTruth`, enums |
| `metaballGrid/buildGridClassification.ts` | Grid construction + PREV/NEXT resolution + event attribution |
| `metaballGrid/planGridWave.ts` | Seeding + wave geometry + flip-time assignment |
| `metaballGrid/renderMetaballGridScene.ts` | Per-frame scene builder emitting renderable vstars |
| `metaballGrid/MetaballGridFamily.ts` | `RenderFamily` impl wiring the above |
| `metaballGrid/buildGridClassification.test.ts` | MG2 tests |
| `metaballGrid/planGridWave.test.ts` | MG3 tests |
| `metaballGrid/renderMetaballGridScene.test.ts` | MG4 tests |
| `metaballGrid/MetaballGridFamily.test.ts` | MG5 tests |

Reused read-only from existing modes:
- `powerVoronoiTerritoryGeometryGenerator` / `computeGeometry0319` — underlayer source.
- `MetaballRenderer` — extended via adapter only if its input contract needs widening (separate small commit if so).
- Point-in-polygon helper from `buildPerimeterFieldScene` may be lifted to a shared utility in a separate commit if needed.

## Checkpoint ledger

One atomic commit per checkpoint. Prefix `docs|feat|test|perf(metaball-grid): …`.

| # | Deliverable |
|---|-------------|
| MG0 | This plan doc + daily queue entry |
| MG1 | Config keys + types |
| MG2 | Classification + tests |
| MG3 | Wave planner with all seedings, adjacencies, geometries + tests |
| MG4 | Scene builder with all flip styles + tests |
| MG5 | `MetaballGridFamily` + canvas truth-capture hook block |
| MG6 | Registry + settings panel |
| MG7 | Acceptance tests: terminal parity, native invariance, wave ordering per option, classification purity, event attribution |
| MG8 | Perf bench + calibrated spacing default |
| MG9 | Paused debug overlay |

## Sequencing

- **Gate 1 (pure logic):** MG0 → MG1 → MG2 → MG3 → MG4.
- **Gate 2 (integration):** MG5 → MG6.
- **Gate 3 (validation + polish):** MG7 → MG8 → MG9.

Estimated end-to-end effort with every option axis landed: ~5 engineering days.

## Acceptance invariants

- **Terminal parity.** At `progress = 1`, every grid vstar's effective color equals its `nextOwnerId`-derived color.
- **Native invariance.** Any grid vstar with `prevOwnerId === nextOwnerId` never changes effective color or alpha during a transition.
- **Wave ordering.** For any event, dispossessed V's flip in rank order under the selected `WAVE_GEOMETRY`.
- **Classification purity.** `buildGridClassification` with identical inputs produces identical outputs across calls.
- **Event attribution correctness.** Under simultaneous multi-event conquests, each dispossessed V is attributed deterministically.
- **No leakage into `perimeter_field`.** No file under `perimeterField/` is modified by this work.
