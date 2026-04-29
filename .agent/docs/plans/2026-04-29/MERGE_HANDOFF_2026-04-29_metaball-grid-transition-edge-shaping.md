# Merge Handoff - Metaball Grid Transition And Edge Shaping

Date: 2026-04-29
Branch: `codex/metaball-grid-transition-edge-shaping`
Baseline commit before this handoff note: `f9a58a6c` (`stabilize metaball-grid transitions and edge shaping`)
Merge target: `master`

## Scope

This branch lands the current `metaball_grid` transition work in the live render-family path:

- phase-field conquest timing in `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.ts`
- tick-scoped transition sessions in `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.ts`
- upstream geometry tuning contract wiring for `CX` / `CP` / `DX` / `MSR`
- transition fill parity fix so active transition cells are not painted twice
- first-pass metaball-grid edge-shaping controls

User status at handoff: overall result is now good, but there may still be a small intermittent disjoint on back-to-back conquest ticks.

## Required Defaults For Master

The merge agent should set the shipped `metaball_grid` defaults to the following:

- Borders: `Territory edge`
  - `METABALL_GRID_BORDER_MODE = 'territory_edge'`
- Centered-blended borders: `On`
  - `METABALL_GRID_BORDER_BLEND = true`
- Chaikin: `4`
  - Prefer `METABALL_GRID_BORDER_CHAIKIN_PASSES = 4`
  - Important: the effective centered-blended border smoothing today is `METABALL_GRID_EDGE_SMOOTHING_PASSES + METABALL_GRID_BORDER_CHAIKIN_PASSES`, clamped in `MetaballGridFamily.ts`
  - Unless intentionally changing the visual language, keep `METABALL_GRID_EDGE_SMOOTHING_PASSES = 0` and use the border-specific knob to reach the requested total of 4
- DX: `On`
  - `MODIFIED_VORONOI_DISCONNECT_ENABLED = true`
- DX distance: `295`
  - `MODIFIED_VORONOI_DISCONNECT_DISTANCE = 295`

Important: this branch does not currently bake those border defaults into `pax-fluxia/src/lib/territory/families/metaballGrid/config.ts`. The merge agent should treat the list above as a required finishing step before shipping to `master`.

## DX Weight Audit

User observation: DX weight seems to have little or no visible effect.

Current state:

- The DX weight is wired end-to-end in the shared upstream geometry path.
- Read path:
  - `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
  - `readTerritoryGeometryTunables()` reads `TERRITORY_DX_WEIGHT`
  - `buildTerritoryGeneratorSettingsFromTunables()` passes it as `dxWeight`
  - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts` forwards `dxWeight` into `computeDisconnectVirtuals(...)`
- The resulting disconnect virtual-site weight is consumed by the geometry compiler path, not just the legacy renderer path.

Open problem:

- `normalizeTerritoryGeometryTunables()` clamps `disconnectWeight` to `0..1`
- config comments and generator comments still describe the semantic range as `0.0..2.0`
- that range mismatch is a plausible reason the knob feels weak or non-obvious in practice

Merge instruction:

- do not assume the current DX weight magnitude is trustworthy
- audit range semantics and real visual impact before relying on the control as a tuning surface

## Known Broken Or Misleading Controls

### Shared Edge Trim

User observation is correct: at present, `Shared Edge Trim` is not a useful production control. It mostly creates small visible gaps, especially at 3-way junctions, and some settings adjustments can cause transition fills to fail.

Symbol:

- `METABALL_GRID_EDGE_TRIM_PX`

Original intention:

- create a shared boundary band so fill shaping, centered-blended borders, and future edge VFX would operate on a coherent trimmed frontier instead of three unrelated geometries
- in other words, reserve geometric space for border and VFX treatment without shrinking the whole territory body

What it actually does now:

- increases boundary/in-transition inset on grid cells
- reads mostly as a subtraction of fill area rather than as a convincing coupled fill-border treatment
- is especially weak at 3-way junctions, where it produces tiny gaps instead of a useful stylized edge band

Merge instruction:

- keep the default at `0`
- do not present this as a finished user-facing tuning control
- either redesign it as a true topology-aware boundary-band / FX-width control, or remove it from the merged settings surface

### Territory Fill Toggle

User observation: the territory fill toggle currently does nothing.

Likely contributing drift:

- `pax-fluxia/src/lib/config/game.config.ts` types `TERRITORY_FILL_TRANSITION_MODE` as clean-arch values only
- `pax-fluxia/src/lib/config/territory.config.ts` still defaults it to `'topology_fill_rebuild'`
- imported themes still contain legacy values such as `'legacy_fill_active_front'`
- `TerritorySettingsBridge.ts` is carrying compatibility behavior across old and new naming

Merge instruction:

- do not trust the current fill toggle semantics without a small audit
- verify `TERRITORY_FILL_MODE`, `TERRITORY_FILL_TRANSITION_MODE`, settings defs, and panel wiring together before shipping the control

### Other Settings

Assume there are still other broken or stale settings in this area until proven otherwise. The user explicitly called out the fill toggle as one example, not the only one.

## Settings Panel Integration Note

There is separate in-flight Settings Panels work in another worktree:

- ontology/refactor
- custom dropdown

That work supersedes the current panel implementation in:

- `pax-fluxia/src/lib/components/ui/settings/MetaballGridTuning.svelte`

Merge instruction:

- do not blindly port this branch's current panel structure if the other settings-panel work lands first
- do port the new variables coherently into the new ontology and dropdown system

Variables added or expanded here that must be reviewed during that port:

- `METABALL_GRID_WAVE_GEOMETRY`
- `METABALL_GRID_WAVE_SEEDING`
- `METABALL_GRID_FLIP_TRANSITION`
- `METABALL_GRID_FLIP_WINDOW`
- `METABALL_GRID_WAVE_EASE`
- `METABALL_GRID_FLIP_WINDOW_JITTER`
- `METABALL_GRID_EDGE_SMOOTHING_PASSES`
- `METABALL_GRID_EDGE_TRIM_PX`

Existing border variables that also need coherent handling:

- `METABALL_GRID_BORDER_MODE`
- `METABALL_GRID_BORDER_BLEND`
- `METABALL_GRID_BORDER_CHAIKIN_PASSES`

Recommendation:

- if `Shared Edge Trim` is judged not worth keeping, remove it cleanly during the panel port instead of preserving a broken knob for consistency's sake

## Validation Snapshot

Focused tests previously passed on this branch:

- `pax-fluxia/src/lib/territory/families/metaballGrid/buildGridClassification.test.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/planGridWave.test.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/metaballGridRuntime.test.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/renderMetaballGridScene.test.ts`
- `pax-fluxia/src/lib/territory/families/metaballGrid/edgeShaping.test.ts`
- `pax-fluxia/src/lib/territory/transitions/renderFamilyTransitionLifecycle.test.ts`
- `pax-fluxia/src/lib/territory/geometry/geometryTuning.test.ts`

Result:

- 65 passing tests

Known non-signal:

- repo-wide typecheck is still red from existing broad issues
- during prior validation, the only filtered hit in a touched file was the existing config-shape mismatch around territory config typing

## Merge Recommendation

This branch is close enough for a controlled merge, but not as a blind settings/UI promotion.

Before merging to `master`, the merge agent should:

1. apply the required metaball-grid defaults listed above
2. keep `Shared Edge Trim` at `0` and treat it as unfinished
3. audit DX weight magnitude/range semantics
4. audit the territory fill toggle wiring and legacy value drift
5. port the new variables into the superseding Settings Panels work coherently rather than copying this panel verbatim
