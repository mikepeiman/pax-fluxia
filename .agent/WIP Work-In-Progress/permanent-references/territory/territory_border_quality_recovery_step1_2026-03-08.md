# Border Quality Recovery - Step 1 (2026-03-08)

## Scope
Commit 1 of the Border Quality Recovery Plan:
- border-engine enum/routing
- compatibility bridge
- default behavior for new sessions

## Implemented
1. Added `DF_BORDER_ENGINE` to config contract:
- Type: `'mesh' | 'legacy_field' | 'legacy_grid'`
- Default: `'mesh'`

2. Added panel/config mapping key:
- `panel.dfBorderEngine` -> `GAME_CONFIG.DF_BORDER_ENGINE`

3. Added renderer normalization + routing bridge:
- `normalizeBorderEngine(rawEngine, legacyVectorBordersEnabled)`
- Compatibility fallback for old saves/themes that do not define `DF_BORDER_ENGINE`:
  - if legacy vector toggle is ON -> `legacy_grid`
  - else -> `legacy_field`

4. Added explicit border engine routing in DF renderer:
- `legacy_field` routes to field border path
- `legacy_grid` routes to geometry path
- `mesh` routes to geometry path during bridge phase

## Important Runtime Contract
- This step does **not** yet introduce the dedicated stroke-mesh backend.
- During bridge phase, both `mesh` and `legacy_grid` intentionally share the existing geometry/vector path to avoid breaking behavior while engine routing is stabilized.

## Why This Step Exists
This separates engine selection semantics from old boolean toggle semantics, so later commits can drop in a true stroke-mesh backend without changing the external control contract or breaking legacy references.

## Verification
- `bun run check` still reports existing project-wide errors/warnings not introduced by this step.
- No diagnostics were reported for:
  - `DistanceFieldTerritoryRenderer.ts`
  - `settingsDefs.ts`
  - `game.config.ts`

## Next Step
Step 2: add centerline graph extraction module with deterministic IDs.
