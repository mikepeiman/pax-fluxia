# Territory Clean Architecture Rename Ledger

Date: 2026-03-21  
Scope: Clean-architecture scaffold in `codex/territory-clean-arch` worktree

## Name Changes

This ledger tracks canonical names added during scaffolding so other agents can
use stable, semantically clear terminology while legacy names remain intact.

| Current implementation name | Canonical clean-arch name | Realization in scaffold |
| --- | --- | --- |
| `integration/GameCanvasTerritoryBridge.ts` | `integration/GameCanvasBridge.ts` | Alias file added (`export { ... as ... }`) |
| `integration/TerritoryFxBridge.ts` | `integration/TerritoryVFXBridge.ts` | Canonical bridge class added |
| `layers/ownership/modes/StarOwnershipSnapshotMode.ts` | `layers/ownership/modes/VirtualStarOwnershipMode.ts` | Alias file added |
| `layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts` | `layers/geometry/modes/BoundaryAwareFrontierMode.ts` | Alias file added |
| `layers/presentation/modes/CanonicalTerritoryStyle.ts` | `layers/presentation/modes/CanonicalVectorStyle.ts` | Alias file added |
| `adapters/legacy/PowerVoronoiLegacyAdapter.ts` | `adapters/legacy/PowerVoronoiAdapter.ts` | Alias file added |
| `adapters/legacy/PVV3LegacyAdapter.ts` | `adapters/legacy/SeedGraphAdapter.ts` | Alias file added |
| _(no prior file)_ | `runtime/TerritoryWorker.ts` | New file added |
| _(no prior file)_ | `runtime/LayerCache.ts` | New file added |
| _(no prior file)_ | `vfx/VFXBus.ts` and `vfx/handlers/ConquestParticles.ts` | New files added |
| `layers/geometry/modes/PowerVoronoiGeometryMode.ts` | `layers/geometry/modes/WeightedPowerVoronoiGeometryMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/geometry/modes/BoundaryAwareFrontierGeometryMode.ts` | `layers/geometry/modes/BoundaryConstrainedFrontierGeometryMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/geometry/modes/SeedGraphGeometryMode.ts` | `layers/geometry/modes/SeedGraphClusterSplitGeometryMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/transition/modes/FrontierMorphFillMode.ts` | `layers/transition/modes/FrontierTopologyMorphFillMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/transition/modes/CrossfadeFillMode.ts` | `layers/transition/modes/AlphaCrossfadeFillMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | `layers/transition/modes/OptimalTransportCorrespondenceBorderMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/transition/modes/RopeMorphBorderMode.ts` | `layers/transition/modes/RopeInterpolatedBorderMode.ts` | Alias file added + registry now imports descriptive alias |
| `layers/presentation/modes/CanonicalTerritoryStyle.ts` | `layers/presentation/modes/VectorPolygonMeshStyle.ts` | Alias file added + registry now imports descriptive alias |
| `layers/presentation/modes/DistanceFieldStyle.ts` | `layers/presentation/modes/SignedDistanceFieldMeshStyle.ts` | Alias file added + registry now imports descriptive alias |
| `layers/presentation/modes/PixelTerritoryStyle.ts` | `layers/presentation/modes/PixelQuantizedMeshStyle.ts` | Alias file added + registry now imports descriptive alias |

## Notes for Follow-On Agents

- Most changes are additive aliases. Selected labels/registries were edited to
  make active mode names behavior-explicit.
- Clean-architecture registries now import descriptive alias class names, while
  mode IDs stay stable for compatibility.
- Full cutover should be done in a later integration pass once teams align on
  mode IDs and runtime selection wiring.
