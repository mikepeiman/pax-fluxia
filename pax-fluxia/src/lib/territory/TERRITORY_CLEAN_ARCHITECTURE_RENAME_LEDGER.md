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

## Notes for Follow-On Agents

- Existing files were not edited in this pass; all changes are additive.
- Registries currently still reference prior names; consumers can start
  importing canonical alias files immediately.
- Full cutover should be done in a later integration pass once teams align on
  mode IDs and runtime selection wiring.
